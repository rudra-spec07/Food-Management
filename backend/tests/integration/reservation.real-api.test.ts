import request from 'supertest';
import app from '../../src/app';
import {
  PrismaClient,
  UserRole,
  DonationCategory,
  DonationQuantityUnit,
  InventoryStatus,
  MovementType,
  ReservationStatus,
} from '@prisma/client';
import { PasswordService } from '../../src/modules/auth-user/services/password.service';

const prisma = new PrismaClient();

describe('Module 05 — Real API Integration Tests (Reservation Management)', () => {
  jest.setTimeout(30000);

  let donorId: string;
  let adminId: string;
  let workerId: string;
  let adminToken: string;
  let workerToken: string;

  let donationId: string;
  let pickupId: string;
  let availableInventoryId: string;
  let expiredInventoryId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    const passwordHash = await PasswordService.hashPassword('Password123!');

    // Create Donor
    const donor = await prisma.user.create({
      data: {
        firstName: 'ResDonor',
        lastName: 'Test',
        email: `resdonor_${timestamp}@test.com`,
        passwordHash,
        role: UserRole.DONOR,
      },
    });
    donorId = donor.id;

    // Create Admin
    const admin = await prisma.user.create({
      data: {
        firstName: 'ResAdmin',
        lastName: 'Test',
        email: `resadmin_${timestamp}@test.com`,
        passwordHash,
        role: UserRole.ADMIN,
      },
    });
    adminId = admin.id;

    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: admin.email,
      password: 'Password123!',
    });
    adminToken = adminLogin.body.data.accessToken;

    // Create Worker
    const worker = await prisma.user.create({
      data: {
        firstName: 'ResWorker',
        lastName: 'Test',
        email: `resworker_${timestamp}@test.com`,
        passwordHash,
        role: UserRole.WORKER,
      },
    });
    workerId = worker.id;

    const workerLogin = await request(app).post('/api/v1/auth/login').send({
      email: worker.email,
      password: 'Password123!',
    });
    workerToken = workerLogin.body.data.accessToken;

    // Create Base Donation & Pickup
    const donation = await prisma.donation.create({
      data: {
        donorId,
        category: DonationCategory.GROCERIES,
        description: '100 KG Flour Batch',
        quantity: 100.0,
        quantityUnit: DonationQuantityUnit.KG,
        preparedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        pickupAddress: 'Warehouse A',
        contactName: 'Donor Contact',
        contactPhone: '+1234567890',
        status: 'COMPLETED' as any,
      },
    });
    donationId = donation.id;

    const assignment = await prisma.assignment.create({
      data: {
        donationId,
        workerId,
        assignedBy: adminId,
        status: 'ACCEPTED' as any,
      },
    });

    const pickup = await prisma.pickup.create({
      data: {
        donationId,
        assignmentId: assignment.id,
        workerId,
        status: 'COMPLETED' as any,
      },
    });
    pickupId = pickup.id;

    // Create AVAILABLE InventoryItem (total=100, available=100, reserved=0, distributed=0)
    const inv1 = await prisma.inventoryItem.create({
      data: {
        donationId,
        pickupId,
        foodCategory: DonationCategory.GROCERIES,
        description: '100 KG Flour Batch',
        totalQuantity: 100.0,
        availableQuantity: 100.0,
        reservedQuantity: 0.0,
        distributedQuantity: 0.0,
        unit: DonationQuantityUnit.KG,
        status: InventoryStatus.AVAILABLE,
        location: 'Storage Bay 2',
      },
    });
    availableInventoryId = inv1.id;

    // Create EXPIRED InventoryItem
    const donation2 = await prisma.donation.create({
      data: {
        donorId,
        category: DonationCategory.COOKED_MEAL,
        description: '50 Portions Expired Meal Batch',
        quantity: 50.0,
        quantityUnit: DonationQuantityUnit.PORTIONS,
        preparedAt: new Date(),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        pickupAddress: 'Kitchen B',
        contactName: 'Cook Contact',
        contactPhone: '+1234567890',
        status: 'COMPLETED' as any,
      },
    });

    const assignment2 = await prisma.assignment.create({
      data: {
        donationId: donation2.id,
        workerId,
        assignedBy: adminId,
        status: 'ACCEPTED' as any,
      },
    });

    const pickup2 = await prisma.pickup.create({
      data: {
        donationId: donation2.id,
        assignmentId: assignment2.id,
        workerId,
        status: 'COMPLETED' as any,
      },
    });

    const inv2 = await prisma.inventoryItem.create({
      data: {
        donationId: donation2.id,
        pickupId: pickup2.id,
        foodCategory: DonationCategory.COOKED_MEAL,
        description: '50 Portions Expired Meal Batch',
        totalQuantity: 50.0,
        availableQuantity: 50.0,
        reservedQuantity: 0.0,
        distributedQuantity: 0.0,
        unit: DonationQuantityUnit.PORTIONS,
        expirationDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: InventoryStatus.EXPIRED,
      },
    });
    expiredInventoryId = inv2.id;
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

  describe('GET /api/v1/inventory/available', () => {
    it('1. returns available inventory batches with positive availableQuantity and valid expiration', async () => {
      const res = await request(app)
        .get('/api/v1/inventory/available')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);

      const found = res.body.data.items.find((item: any) => item.id === availableInventoryId);
      expect(found).toBeDefined();
      expect(Number(found.availableQuantity)).toBeGreaterThan(0);

      const expiredFound = res.body.data.items.find((item: any) => item.id === expiredInventoryId);
      expect(expiredFound).toBeUndefined();
    });
  });

  describe('POST /api/v1/reservations', () => {
    let createdReservationId: string;

    it('1. creates active reservation, updates inventory quantities, logs movement and audit event', async () => {
      const res = await request(app)
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          inventoryId: availableInventoryId,
          quantity: 30.0,
          notes: 'Reservation for Shelter A',
          durationHours: 24,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.unit).toBe(DonationQuantityUnit.KG); // unit derived from inventory
      expect(Number(res.body.data.quantity)).toBe(30);
      expect(res.body.data.status).toBe(ReservationStatus.ACTIVE);

      createdReservationId = res.body.data.id;

      // Verify InventoryItem in DB
      const dbItem = await prisma.inventoryItem.findUnique({
        where: { id: availableInventoryId },
        include: { movements: true },
      });

      expect(dbItem).not.toBeNull();
      expect(Number(dbItem?.availableQuantity)).toBe(70);
      expect(Number(dbItem?.reservedQuantity)).toBe(30);
      expect(Number(dbItem?.distributedQuantity)).toBe(0);

      // Quantity Invariant: 70 + 30 + 0 = 100
      expect(
        Number(dbItem?.availableQuantity) +
          Number(dbItem?.reservedQuantity) +
          Number(dbItem?.distributedQuantity)
      ).toBe(Number(dbItem?.totalQuantity));

      // Verify movement
      const movement = dbItem?.movements.find((m) => m.referenceId === createdReservationId);
      expect(movement).toBeDefined();
      expect(movement?.movementType).toBe(MovementType.RESERVATION);
      expect(Number(movement?.quantity)).toBe(30);
    });

    it('2. rejects reservation when requested quantity exceeds available stock -> 409 INSUFFICIENT_INVENTORY', async () => {
      const res = await request(app)
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          inventoryId: availableInventoryId,
          quantity: 80.0, // available is 70
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_INVENTORY');
    });

    it('3. rejects reservation on expired food inventory -> 409 INSUFFICIENT_INVENTORY', async () => {
      const res = await request(app)
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          inventoryId: expiredInventoryId,
          quantity: 10.0,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/reservations & /api/v1/reservations/:id', () => {
    it('1. GET /api/v1/reservations returns list of reservations for worker', async () => {
      const res = await request(app)
        .get('/api/v1/reservations')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    });

    it('2. ADMIN can view any reservation', async () => {
      const listRes = await request(app)
        .get('/api/v1/reservations')
        .set('Authorization', `Bearer ${workerToken}`);

      const reservationId = listRes.body.data.items[0].id;

      const res = await request(app)
        .get(`/api/v1/reservations/${reservationId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(reservationId);
    });
  });

  describe('POST /api/v1/reservations/:id/release', () => {
    it('1. releases active reservation, restores availableQuantity, logs RELEASE movement', async () => {
      // First create a new reservation to release
      const createRes = await request(app)
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          inventoryId: availableInventoryId,
          quantity: 20.0,
        });

      const resId = createRes.body.data.id;

      const releaseRes = await request(app)
        .post(`/api/v1/reservations/${resId}/release`)
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ reason: 'Worker cancelled delivery' });

      expect(releaseRes.status).toBe(200);
      expect(releaseRes.body.success).toBe(true);
      expect(releaseRes.body.data.status).toBe(ReservationStatus.RELEASED);

      // Verify DB state
      const dbItem = await prisma.inventoryItem.findUnique({
        where: { id: availableInventoryId },
      });

      expect(Number(dbItem?.availableQuantity)).toBe(70);
      expect(Number(dbItem?.reservedQuantity)).toBe(30);

      // Quantity Invariant: 70 + 30 + 0 = 100
      expect(
        Number(dbItem?.availableQuantity) +
          Number(dbItem?.reservedQuantity) +
          Number(dbItem?.distributedQuantity)
      ).toBe(Number(dbItem?.totalQuantity));
    });

    it('2. rejects releasing an already released reservation -> 409 RESERVATION_STATE_CONFLICT', async () => {
      // Create and release
      const createRes = await request(app)
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ inventoryId: availableInventoryId, quantity: 10.0 });

      const resId = createRes.body.data.id;

      await request(app)
        .post(`/api/v1/reservations/${resId}/release`)
        .set('Authorization', `Bearer ${workerToken}`);

      // Second release attempt
      const res2 = await request(app)
        .post(`/api/v1/reservations/${resId}/release`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res2.status).toBe(409);
      expect(res2.body.success).toBe(false);
      expect(res2.body.error.code).toBe('RESERVATION_STATE_CONFLICT');
    });
  });

  describe('Distribution Integration (Reserved Mode B Fulfillment)', () => {
    it('1. Mode B fulfillment succeeds when distribution quantity matches reservation exactly', async () => {
      // Create a 30 KG reservation
      const createRes = await request(app)
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ inventoryId: availableInventoryId, quantity: 25.0 });

      const resId = createRes.body.data.id;

      const distRes = await request(app)
        .post('/api/v1/distributions')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          reservationId: resId,
          inventoryId: availableInventoryId,
          recipientName: 'Reserved Beneficiary Shelter',
          quantity: 25.0, // Exact match!
          unit: DonationQuantityUnit.KG,
        });

      expect(distRes.status).toBe(201);
      expect(distRes.body.success).toBe(true);

      // Verify Reservation status -> FULFILLED
      const dbRes = await prisma.inventoryReservation.findUnique({
        where: { id: resId },
      });
      expect(dbRes?.status).toBe(ReservationStatus.FULFILLED);
      expect(dbRes?.fulfilledAt).not.toBeNull();

      // Verify InventoryItem quantities (reserved decreased by 25, distributed increased by 25)
      const dbItem = await prisma.inventoryItem.findUnique({
        where: { id: availableInventoryId },
      });

      expect(Number(dbItem?.reservedQuantity)).toBe(30);
      expect(Number(dbItem?.distributedQuantity)).toBe(25);

      // Quantity Invariant: available + reserved + distributed = total
      expect(
        Number(dbItem?.availableQuantity) +
          Number(dbItem?.reservedQuantity) +
          Number(dbItem?.distributedQuantity)
      ).toBe(Number(dbItem?.totalQuantity));
    });

    it('2. Mode B fulfillment rejects partial quantity -> 400 INVALID_RESERVATION_FULFILLMENT_QUANTITY', async () => {
      // Create a 15 KG reservation
      const createRes = await request(app)
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ inventoryId: availableInventoryId, quantity: 15.0 });

      const resId = createRes.body.data.id;

      const distRes = await request(app)
        .post('/api/v1/distributions')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          reservationId: resId,
          inventoryId: availableInventoryId,
          recipientName: 'Shelter',
          quantity: 10.0, // Mismatched partial quantity!
          unit: DonationQuantityUnit.KG,
        });

      expect(distRes.status).toBe(400);
      expect(distRes.body.success).toBe(false);
      expect(distRes.body.error.code).toBe('INVALID_RESERVATION_FULFILLMENT_QUANTITY');
    });
  });
});
