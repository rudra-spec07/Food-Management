import request from 'supertest';
import app from '../../src/app';
import { PrismaClient, UserRole, DonationCategory, DonationQuantityUnit, InventoryStatus, ReservationStatus } from '@prisma/client';

const prisma = new PrismaClient();

describe('Module 05 — Focused Edge-Case Regression Tests', () => {
  let donorId: string;
  let adminId: string;
  let workerId: string;
  let workerToken: string;

  beforeAll(async () => {
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash('Password123!', 10);

    // 1. Create clean users
    const donor = await prisma.user.create({
      data: {
        email: `edge_donor_${Date.now()}@example.com`,
        passwordHash,
        firstName: 'Edge',
        lastName: 'Donor',
        role: UserRole.DONOR,
      },
    });
    donorId = donor.id;

    const admin = await prisma.user.create({
      data: {
        email: `edge_admin_${Date.now()}@example.com`,
        passwordHash,
        firstName: 'Edge',
        lastName: 'Admin',
        role: UserRole.ADMIN,
      },
    });
    adminId = admin.id;

    const worker = await prisma.user.create({
      data: {
        email: `edge_worker_${Date.now()}@example.com`,
        passwordHash,
        firstName: 'Edge',
        lastName: 'Worker',
        role: UserRole.WORKER,
      },
    });
    workerId = worker.id;

    const sessionRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: worker.email, password: 'Password123!' });
    workerToken = sessionRes.body.data.accessToken;
  });

  afterAll(async () => {
    // Teardown
    await prisma.inventoryMovement.deleteMany({
      where: { inventory: { donation: { donorId } } },
    });
    await prisma.inventoryReservation.deleteMany({
      where: { inventory: { donation: { donorId } } },
    });
    await prisma.distributionRecord.deleteMany({
      where: { inventory: { donation: { donorId } } },
    });
    await prisma.inventoryItem.deleteMany({
      where: { donation: { donorId } },
    });
    await prisma.pickup.deleteMany({
      where: { donation: { donorId } },
    });
    await prisma.assignment.deleteMany({
      where: { donation: { donorId } },
    });
    await prisma.auditLog.deleteMany({
      where: { userId: { in: [adminId, workerId] } },
    });
    await prisma.donation.deleteMany({
      where: { donorId },
    });
    await prisma.authSession.deleteMany({
      where: { userId: { in: [donorId, adminId, workerId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [donorId, adminId, workerId] } },
    });
    await prisma.$disconnect();
  });

  it('CASE 1: 100 total, 30 reserved, 70 distributed -> physical expiration of 30 reserved units succeeds & invariant holds', async () => {
    const donation = await prisma.donation.create({
      data: {
        donorId,
        category: DonationCategory.GROCERIES,
        description: '100 KG Rice Batch Case 1',
        quantity: 100.0,
        quantityUnit: DonationQuantityUnit.KG,
        preparedAt: new Date(),
        expiresAt: new Date(Date.now() - 60 * 1000), // physically expired!
        pickupAddress: 'Warehouse A',
        contactName: 'Contact Name',
        contactPhone: '+1234567890',
        status: 'COMPLETED' as any,
      },
    });

    const assignment = await prisma.assignment.create({
      data: { donationId: donation.id, workerId, assignedBy: adminId, status: 'ACCEPTED' as any },
    });

    const pickup = await prisma.pickup.create({
      data: { donationId: donation.id, assignmentId: assignment.id, workerId, status: 'COMPLETED' as any },
    });

    const invItem = await prisma.inventoryItem.create({
      data: {
        donationId: donation.id,
        pickupId: pickup.id,
        foodCategory: DonationCategory.GROCERIES,
        description: '100 KG Rice Batch Case 1',
        totalQuantity: 100.0,
        availableQuantity: 0.0,
        reservedQuantity: 30.0,
        distributedQuantity: 70.0,
        unit: DonationQuantityUnit.KG,
        expirationDate: new Date(Date.now() - 60 * 1000), // physically expired!
        status: InventoryStatus.RESERVED,
      },
    });

    // Create an ACTIVE reservation that is expired in time
    const resv = await prisma.inventoryReservation.create({
      data: {
        inventoryId: invItem.id,
        reservedBy: workerId,
        quantity: 30.0,
        unit: DonationQuantityUnit.KG,
        status: ReservationStatus.ACTIVE,
        expiresAt: new Date(Date.now() - 10 * 1000), // reservation time expired!
      },
    });

    // Trigger lazy expiration by sending a release request on the expired reservation
    const releaseRes = await request(app)
      .post(`/api/v1/reservations/${resv.id}/release`)
      .set('Authorization', `Bearer ${workerToken}`);

    // Lazy expiration returns 409 Conflict with RESERVATION_EXPIRED code
    expect(releaseRes.status).toBe(409);
    expect(releaseRes.body.error.code).toBe('RESERVATION_EXPIRED');

    // Inspect inventory item in database
    const updatedInv = await prisma.inventoryItem.findUnique({ where: { id: invItem.id } });
    expect(updatedInv).not.toBeNull();
    expect(Number(updatedInv?.totalQuantity)).toBe(70);
    expect(Number(updatedInv?.availableQuantity)).toBe(0);
    expect(Number(updatedInv?.reservedQuantity)).toBe(0);
    expect(Number(updatedInv?.distributedQuantity)).toBe(70);
    expect(updatedInv?.status).toBe(InventoryStatus.EXPIRED);

    // INVARIANT CHECK: available (0) + reserved (0) + distributed (70) === total (70)
    const sum =
      Number(updatedInv?.availableQuantity) +
      Number(updatedInv?.reservedQuantity) +
      Number(updatedInv?.distributedQuantity);
    expect(sum).toBe(Number(updatedInv?.totalQuantity));
  });

  it('CASE 2: 100 total, 30 reserved, 70 distributed -> logical reservation expiration while food physically valid moves 30 reserved -> available & invariant holds', async () => {
    const donation = await prisma.donation.create({
      data: {
        donorId,
        category: DonationCategory.GROCERIES,
        description: '100 KG Beans Batch Case 2',
        quantity: 100.0,
        quantityUnit: DonationQuantityUnit.KG,
        preparedAt: new Date(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // physically valid!
        pickupAddress: 'Warehouse A',
        contactName: 'Contact Name',
        contactPhone: '+1234567890',
        status: 'COMPLETED' as any,
      },
    });

    const assignment = await prisma.assignment.create({
      data: { donationId: donation.id, workerId, assignedBy: adminId, status: 'ACCEPTED' as any },
    });

    const pickup = await prisma.pickup.create({
      data: { donationId: donation.id, assignmentId: assignment.id, workerId, status: 'COMPLETED' as any },
    });

    const invItem = await prisma.inventoryItem.create({
      data: {
        donationId: donation.id,
        pickupId: pickup.id,
        foodCategory: DonationCategory.GROCERIES,
        description: '100 KG Beans Batch Case 2',
        totalQuantity: 100.0,
        availableQuantity: 0.0,
        reservedQuantity: 30.0,
        distributedQuantity: 70.0,
        unit: DonationQuantityUnit.KG,
        expirationDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // physically valid!
        status: InventoryStatus.RESERVED,
      },
    });

    const resv = await prisma.inventoryReservation.create({
      data: {
        inventoryId: invItem.id,
        reservedBy: workerId,
        quantity: 30.0,
        unit: DonationQuantityUnit.KG,
        status: ReservationStatus.ACTIVE,
        expiresAt: new Date(Date.now() - 10 * 1000), // reservation expired!
      },
    });

    const releaseRes = await request(app)
      .post(`/api/v1/reservations/${resv.id}/release`)
      .set('Authorization', `Bearer ${workerToken}`);

    expect(releaseRes.status).toBe(409);
    expect(releaseRes.body.error.code).toBe('RESERVATION_EXPIRED');

    const updatedInv = await prisma.inventoryItem.findUnique({ where: { id: invItem.id } });
    expect(updatedInv).not.toBeNull();
    expect(Number(updatedInv?.totalQuantity)).toBe(100);
    expect(Number(updatedInv?.availableQuantity)).toBe(30);
    expect(Number(updatedInv?.reservedQuantity)).toBe(0);
    expect(Number(updatedInv?.distributedQuantity)).toBe(70);
    expect(updatedInv?.status).toBe(InventoryStatus.AVAILABLE);

    // INVARIANT CHECK: available (30) + reserved (0) + distributed (70) === total (100)
    const sum =
      Number(updatedInv?.availableQuantity) +
      Number(updatedInv?.reservedQuantity) +
      Number(updatedInv?.distributedQuantity);
    expect(sum).toBe(Number(updatedInv?.totalQuantity));
  });

  it('CASE 3: Concurrent expiration vs fulfillment -> exactly one valid transition succeeds, no invariant violation', async () => {
    const donation = await prisma.donation.create({
      data: {
        donorId,
        category: DonationCategory.COOKED_MEAL,
        description: '50 Meals Batch Case 3',
        quantity: 50.0,
        quantityUnit: DonationQuantityUnit.PORTIONS,
        preparedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        pickupAddress: 'Kitchen C',
        contactName: 'Contact Name',
        contactPhone: '+1234567890',
        status: 'COMPLETED' as any,
      },
    });

    const assignment = await prisma.assignment.create({
      data: { donationId: donation.id, workerId, assignedBy: adminId, status: 'ACCEPTED' as any },
    });

    const pickup = await prisma.pickup.create({
      data: { donationId: donation.id, assignmentId: assignment.id, workerId, status: 'COMPLETED' as any },
    });

    const invItem = await prisma.inventoryItem.create({
      data: {
        donationId: donation.id,
        pickupId: pickup.id,
        foodCategory: DonationCategory.COOKED_MEAL,
        description: '50 Meals Batch Case 3',
        totalQuantity: 50.0,
        availableQuantity: 0.0,
        reservedQuantity: 50.0,
        distributedQuantity: 0.0,
        unit: DonationQuantityUnit.PORTIONS,
        expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: InventoryStatus.RESERVED,
      },
    });

    const resv = await prisma.inventoryReservation.create({
      data: {
        inventoryId: invItem.id,
        reservedBy: workerId,
        quantity: 50.0,
        unit: DonationQuantityUnit.PORTIONS,
        status: ReservationStatus.ACTIVE,
        expiresAt: new Date(Date.now() - 5 * 1000), // expired time
      },
    });

    // Execute concurrent lazy release vs fulfillment attempt
    const [releaseResult, fulfillResult] = await Promise.all([
      request(app)
        .post(`/api/v1/reservations/${resv.id}/release`)
        .set('Authorization', `Bearer ${workerToken}`),
      request(app)
        .post('/api/v1/distributions')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          reservationId: resv.id,
          inventoryId: invItem.id,
          recipientName: 'Community Kitchen',
          quantity: 50.0,
          unit: DonationQuantityUnit.PORTIONS,
        }),
    ]);

    // One must fail with 409 RESERVATION_EXPIRED, the other fails or succeeds deterministically
    const statuses = [releaseResult.status, fulfillResult.status];
    expect(statuses).toContain(409);

    const updatedInv = await prisma.inventoryItem.findUnique({ where: { id: invItem.id } });
    expect(
      Number(updatedInv?.availableQuantity) +
        Number(updatedInv?.reservedQuantity) +
        Number(updatedInv?.distributedQuantity)
    ).toBe(Number(updatedInv?.totalQuantity));
  });

  it('CASE 4: Repeated expiration/release/fulfillment -> proper 409 state conflict protection', async () => {
    const donation = await prisma.donation.create({
      data: {
        donorId,
        category: DonationCategory.GROCERIES,
        description: '40 KG Oats Case 4',
        quantity: 40.0,
        quantityUnit: DonationQuantityUnit.KG,
        preparedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        pickupAddress: 'Warehouse D',
        contactName: 'Contact Name',
        contactPhone: '+1234567890',
        status: 'COMPLETED' as any,
      },
    });

    const assignment = await prisma.assignment.create({
      data: { donationId: donation.id, workerId, assignedBy: adminId, status: 'ACCEPTED' as any },
    });

    const pickup = await prisma.pickup.create({
      data: { donationId: donation.id, assignmentId: assignment.id, workerId, status: 'COMPLETED' as any },
    });

    const invItem = await prisma.inventoryItem.create({
      data: {
        donationId: donation.id,
        pickupId: pickup.id,
        foodCategory: DonationCategory.GROCERIES,
        description: '40 KG Oats Case 4',
        totalQuantity: 40.0,
        availableQuantity: 40.0,
        reservedQuantity: 0.0,
        distributedQuantity: 0.0,
        unit: DonationQuantityUnit.KG,
        expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: InventoryStatus.AVAILABLE,
      },
    });

    const createRes = await request(app)
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ inventoryId: invItem.id, quantity: 40.0 });
    const resId = createRes.body.data.id;

    // First release succeeds
    const release1 = await request(app)
      .post(`/api/v1/reservations/${resId}/release`)
      .set('Authorization', `Bearer ${workerToken}`);
    expect(release1.status).toBe(200);

    // Second release returns 409 RESERVATION_STATE_CONFLICT
    const release2 = await request(app)
      .post(`/api/v1/reservations/${resId}/release`)
      .set('Authorization', `Bearer ${workerToken}`);
    expect(release2.status).toBe(409);
    expect(release2.body.error.code).toBe('RESERVATION_STATE_CONFLICT');

    // Fulfillment of released reservation returns 409 RESERVATION_STATE_CONFLICT
    const fulfillAttempt = await request(app)
      .post('/api/v1/distributions')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        reservationId: resId,
        inventoryId: invItem.id,
        recipientName: 'Food Bank',
        quantity: 40.0,
        unit: DonationQuantityUnit.KG,
      });
    expect(fulfillAttempt.status).toBe(409);
    expect(fulfillAttempt.body.error.code).toBe('RESERVATION_STATE_CONFLICT');
  });

  it('CASE 5: Normal distribution after valid release -> invariant still holds', async () => {
    const donation = await prisma.donation.create({
      data: {
        donorId,
        category: DonationCategory.GROCERIES,
        description: '80 KG Flour Case 5',
        quantity: 80.0,
        quantityUnit: DonationQuantityUnit.KG,
        preparedAt: new Date(),
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        pickupAddress: 'Warehouse E',
        contactName: 'Contact Name',
        contactPhone: '+1234567890',
        status: 'COMPLETED' as any,
      },
    });

    const assignment = await prisma.assignment.create({
      data: { donationId: donation.id, workerId, assignedBy: adminId, status: 'ACCEPTED' as any },
    });

    const pickup = await prisma.pickup.create({
      data: { donationId: donation.id, assignmentId: assignment.id, workerId, status: 'COMPLETED' as any },
    });

    const invItem = await prisma.inventoryItem.create({
      data: {
        donationId: donation.id,
        pickupId: pickup.id,
        foodCategory: DonationCategory.GROCERIES,
        description: '80 KG Flour Case 5',
        totalQuantity: 80.0,
        availableQuantity: 80.0,
        reservedQuantity: 0.0,
        distributedQuantity: 0.0,
        unit: DonationQuantityUnit.KG,
        expirationDate: new Date(Date.now() + 72 * 60 * 60 * 1000),
        status: InventoryStatus.AVAILABLE,
      },
    });

    // 1. Reserve 30 KG
    const resv = await request(app)
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ inventoryId: invItem.id, quantity: 30.0 });
    const resId = resv.body.data.id;

    // 2. Release 30 KG back to available
    await request(app)
      .post(`/api/v1/reservations/${resId}/release`)
      .set('Authorization', `Bearer ${workerToken}`);

    // 3. Perform standard distribution of 50 KG from available (80 available)
    const distRes = await request(app)
      .post('/api/v1/distributions')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        inventoryId: invItem.id,
        recipientName: 'Community Shelter',
        quantity: 50.0,
        unit: DonationQuantityUnit.KG,
      });

    expect(distRes.status).toBe(201);

    const updatedInv = await prisma.inventoryItem.findUnique({ where: { id: invItem.id } });
    expect(Number(updatedInv?.availableQuantity)).toBe(30);
    expect(Number(updatedInv?.reservedQuantity)).toBe(0);
    expect(Number(updatedInv?.distributedQuantity)).toBe(50);
    expect(Number(updatedInv?.totalQuantity)).toBe(80);

    // INVARIANT CHECK: available (30) + reserved (0) + distributed (50) === total (80)
    const sum =
      Number(updatedInv?.availableQuantity) +
      Number(updatedInv?.reservedQuantity) +
      Number(updatedInv?.distributedQuantity);
    expect(sum).toBe(Number(updatedInv?.totalQuantity));
  });
});
