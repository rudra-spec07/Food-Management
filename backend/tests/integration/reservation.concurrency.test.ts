import request from 'supertest';
import app from '../../src/app';
import {
  PrismaClient,
  UserRole,
  DonationCategory,
  DonationQuantityUnit,
  InventoryStatus,
} from '@prisma/client';
import { PasswordService } from '../../src/modules/auth-user/services/password.service';

const prisma = new PrismaClient();

describe('Module 05 — Reservation Concurrency Tests', () => {
  jest.setTimeout(30000);

  let donorId: string;
  let adminId: string;
  let worker1Id: string;
  let worker2Id: string;
  let worker1Token: string;
  let worker2Token: string;

  let inventoryId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    const passwordHash = await PasswordService.hashPassword('Password123!');

    // Create Donor
    const donor = await prisma.user.create({
      data: {
        firstName: 'ConcDonor',
        lastName: 'Test',
        email: `concdonor_${timestamp}@test.com`,
        passwordHash,
        role: UserRole.DONOR,
      },
    });
    donorId = donor.id;

    // Create Admin
    const admin = await prisma.user.create({
      data: {
        firstName: 'ConcAdmin',
        lastName: 'Test',
        email: `concadmin_${timestamp}@test.com`,
        passwordHash,
        role: UserRole.ADMIN,
      },
    });
    adminId = admin.id;

    // Create Worker 1
    const worker1 = await prisma.user.create({
      data: {
        firstName: 'ConcWorker1',
        lastName: 'Test',
        email: `concworker1_${timestamp}@test.com`,
        passwordHash,
        role: UserRole.WORKER,
      },
    });
    worker1Id = worker1.id;

    const w1Login = await request(app).post('/api/v1/auth/login').send({
      email: worker1.email,
      password: 'Password123!',
    });
    worker1Token = w1Login.body.data.accessToken;

    // Create Worker 2
    const worker2 = await prisma.user.create({
      data: {
        firstName: 'ConcWorker2',
        lastName: 'Test',
        email: `concworker2_${timestamp}@test.com`,
        passwordHash,
        role: UserRole.WORKER,
      },
    });
    worker2Id = worker2.id;

    const w2Login = await request(app).post('/api/v1/auth/login').send({
      email: worker2.email,
      password: 'Password123!',
    });
    worker2Token = w2Login.body.data.accessToken;

    // Create Base Donation & Pickup
    const donation = await prisma.donation.create({
      data: {
        donorId,
        category: DonationCategory.GROCERIES,
        description: '10 KG Limited Stock Batch',
        quantity: 10.0,
        quantityUnit: DonationQuantityUnit.KG,
        preparedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        pickupAddress: 'Warehouse Conc',
        contactName: 'Donor Contact',
        contactPhone: '+1234567890',
        status: 'COMPLETED' as any,
      },
    });

    const assignment = await prisma.assignment.create({
      data: {
        donationId: donation.id,
        workerId: worker1Id,
        assignedBy: adminId,
        status: 'ACCEPTED' as any,
      },
    });

    const pickup = await prisma.pickup.create({
      data: {
        donationId: donation.id,
        assignmentId: assignment.id,
        workerId: worker1Id,
        status: 'COMPLETED' as any,
      },
    });

    // Inventory item with exactly 10.0 KG available stock
    const inv = await prisma.inventoryItem.create({
      data: {
        donationId: donation.id,
        pickupId: pickup.id,
        foodCategory: DonationCategory.GROCERIES,
        description: '10 KG Limited Stock Batch',
        totalQuantity: 10.0,
        availableQuantity: 10.0,
        reservedQuantity: 0.0,
        distributedQuantity: 0.0,
        unit: DonationQuantityUnit.KG,
        status: InventoryStatus.AVAILABLE,
      },
    });
    inventoryId = inv.id;
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
      where: { userId: { in: [adminId, worker1Id, worker2Id] } },
    });
    await prisma.donation.deleteMany({
      where: { donorId },
    });
    await prisma.authSession.deleteMany({
      where: { userId: { in: [donorId, adminId, worker1Id, worker2Id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [donorId, adminId, worker1Id, worker2Id] } },
    });
    await prisma.$disconnect();
  });

  it('1. prevents over-reservation: Worker A and Worker B try to reserve 7 KG concurrently from 10 KG available', async () => {
    const reqA = request(app)
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${worker1Token}`)
      .send({ inventoryId, quantity: 7.0 });

    const reqB = request(app)
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${worker2Token}`)
      .send({ inventoryId, quantity: 7.0 });

    const [resA, resB] = await Promise.all([reqA, reqB]);

    const statuses = [resA.status, resB.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);

    const successRes = resA.status === 201 ? resA : resB;
    const failedRes = resA.status === 409 ? resA : resB;

    expect(successRes.body.success).toBe(true);
    expect(failedRes.body.success).toBe(false);
    expect(failedRes.body.error.code).toBe('INSUFFICIENT_INVENTORY');

    // Verify DB inventory invariant
    const dbItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryId },
    });

    expect(Number(dbItem?.availableQuantity)).toBe(3); // 10 - 7 = 3
    expect(Number(dbItem?.reservedQuantity)).toBe(7);
    expect(Number(dbItem?.availableQuantity)).toBeGreaterThanOrEqual(0);

    // Quantity Invariant: 3 + 7 + 0 = 10
    expect(
      Number(dbItem?.availableQuantity) +
        Number(dbItem?.reservedQuantity) +
        Number(dbItem?.distributedQuantity)
    ).toBe(Number(dbItem?.totalQuantity));
  });

  it('2. prevents double fulfillment: simultaneous fulfillment requests on the same reservation', async () => {
    // Find the successful 7.0 KG reservation
    const res = await prisma.inventoryReservation.findFirst({
      where: { inventoryId, status: 'ACTIVE' },
    });
    expect(res).not.toBeNull();
    const reservationId = res!.id;
    const ownerToken = res!.reservedBy === worker1Id ? worker1Token : worker2Token;

    const fulfillA = request(app)
      .post('/api/v1/distributions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        reservationId,
        inventoryId,
        recipientName: 'Shelter A',
        quantity: 7.0,
        unit: DonationQuantityUnit.KG,
      });

    const fulfillB = request(app)
      .post('/api/v1/distributions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        reservationId,
        inventoryId,
        recipientName: 'Shelter B',
        quantity: 7.0,
        unit: DonationQuantityUnit.KG,
      });

    const [resA, resB] = await Promise.all([fulfillA, fulfillB]);

    const statuses = [resA.status, resB.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);

    const failedRes = resA.status === 409 ? resA : resB;
    expect(failedRes.body.error.code).toBe('RESERVATION_STATE_CONFLICT');

    // Verify DB Reservation status is FULFILLED
    const dbRes = await prisma.inventoryReservation.findUnique({
      where: { id: reservationId },
    });
    expect(dbRes?.status).toBe('FULFILLED');

    // Verify InventoryItem quantities
    const dbItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryId },
    });
    expect(Number(dbItem?.reservedQuantity)).toBe(0);
    expect(Number(dbItem?.distributedQuantity)).toBe(7);
    expect(Number(dbItem?.availableQuantity)).toBe(3);

    // Quantity Invariant: 3 + 0 + 7 = 10
    expect(
      Number(dbItem?.availableQuantity) +
        Number(dbItem?.reservedQuantity) +
        Number(dbItem?.distributedQuantity)
    ).toBe(Number(dbItem?.totalQuantity));
  });
});
