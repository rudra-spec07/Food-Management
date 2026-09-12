import request from 'supertest';
import app from '../../src/app';
import {
  PrismaClient,
  UserRole,
  DonationCategory,
  DonationQuantityUnit,
  DonationStatus,
  AssignmentStatus,
  PickupStatus,
  InventoryStatus,
  MovementType,
} from '@prisma/client';
import { PasswordService } from '../../src/modules/auth-user/services/password.service';

const prisma = new PrismaClient();

describe('Module 05 — Real API Integration Tests (Inventory & Pickup Inflow)', () => {
  jest.setTimeout(30000);

  let donorId: string;
  let adminId: string;
  let workerId: string;
  let adminToken: string;
  let workerToken: string;

  let donationId: string;
  let assignmentId: string;
  let pickupId: string;
  let inventoryId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    const passwordHash = await PasswordService.hashPassword('Password123!');

    // Create Donor
    const donor = await prisma.user.create({
      data: {
        firstName: 'InvDonor',
        lastName: 'Test',
        email: `invdonor_${timestamp}@test.com`,
        passwordHash,
        role: UserRole.DONOR,
      },
    });
    donorId = donor.id;

    // Create Admin and Login
    const admin = await prisma.user.create({
      data: {
        firstName: 'InvAdmin',
        lastName: 'Test',
        email: `invadmin_${timestamp}@test.com`,
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

    // Create Worker and Login
    const worker = await prisma.user.create({
      data: {
        firstName: 'InvWorker',
        lastName: 'Test',
        email: `invworker_${timestamp}@test.com`,
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

    // Create a Donation ready for review -> approved -> assigned -> accepted -> start -> complete
    const donation = await prisma.donation.create({
      data: {
        donorId,
        category: DonationCategory.COOKED_MEAL,
        description: '50 Hot Meals Batch for Inventory Test',
        quantity: 50.0,
        quantityUnit: DonationQuantityUnit.PORTIONS,
        preparedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        pickupAddress: '123 Shelter Street',
        contactName: 'Donor Contact',
        contactPhone: '+1234567890',
        status: DonationStatus.APPROVED,
      },
    });
    donationId = donation.id;

    // Create Assignment directly in ACCEPTED status to fast forward to Pickup
    const assignment = await prisma.assignment.create({
      data: {
        donationId,
        workerId,
        assignedBy: adminId,
        status: AssignmentStatus.ACCEPTED,
        respondedAt: new Date(),
      },
    });
    assignmentId = assignment.id;

    // Create Pickup in IN_PROGRESS and update donation to PICKED_UP
    const pickup = await prisma.pickup.create({
      data: {
        donationId,
        assignmentId,
        workerId,
        status: PickupStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });
    pickupId = pickup.id;

    await prisma.donation.update({
      where: { id: donationId },
      data: { status: DonationStatus.PICKED_UP },
    });
  });

  afterAll(async () => {
    // Teardown in correct order to avoid FK issues
    await prisma.inventoryMovement.deleteMany({
      where: { inventory: { donationId } },
    });
    await prisma.inventoryItem.deleteMany({
      where: { donationId },
    });
    await prisma.pickupEvent.deleteMany({
      where: { pickupId },
    });
    await prisma.pickup.deleteMany({
      where: { id: pickupId },
    });
    await prisma.assignment.deleteMany({
      where: { id: assignmentId },
    });
    await prisma.donationStatusHistory.deleteMany({
      where: { donationId },
    });
    await prisma.auditLog.deleteMany({
      where: { entityId: { in: [donationId, pickupId, assignmentId] } },
    });
    await prisma.outboxEvent.deleteMany({
      where: { aggregateId: { in: [donationId, pickupId] } },
    });
    await prisma.donation.delete({
      where: { id: donationId },
    });
    await prisma.authSession.deleteMany({
      where: { userId: { in: [donorId, adminId, workerId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [donorId, adminId, workerId] } },
    });
    await prisma.$disconnect();
  });

  describe('Worker Completes Pickup -> Automatic Inventory Inflow Creation', () => {
    it('1. Completes pickup and creates InventoryItem & InventoryMovement atomically', async () => {
      const res = await request(app)
        .post(`/api/v1/worker/pickups/${pickupId}/complete`)
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ completionNotes: 'Hot meals picked up in insulated boxes' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.pickup.status).toBe(PickupStatus.COMPLETED);
      expect(res.body.data.donation.status).toBe(DonationStatus.COMPLETED);
      expect(res.body.data.inventoryItem).toBeDefined();

      inventoryId = res.body.data.inventoryItem.id;

      // Verify InventoryItem in DB
      const dbItem = await prisma.inventoryItem.findUnique({
        where: { id: inventoryId },
        include: { movements: true },
      });

      expect(dbItem).not.toBeNull();
      expect(dbItem?.donationId).toBe(donationId);
      expect(dbItem?.pickupId).toBe(pickupId);
      expect(dbItem?.foodCategory).toBe(DonationCategory.COOKED_MEAL);
      expect(Number(dbItem?.totalQuantity)).toBe(50.0);
      expect(Number(dbItem?.availableQuantity)).toBe(50.0);
      expect(Number(dbItem?.reservedQuantity)).toBe(0);
      expect(Number(dbItem?.distributedQuantity)).toBe(0);
      expect(dbItem?.unit).toBe(DonationQuantityUnit.PORTIONS);
      expect(dbItem?.status).toBe(InventoryStatus.AVAILABLE);

      // Verify InventoryMovement (INFLOW) in DB
      expect(dbItem?.movements.length).toBe(1);
      const movement = dbItem?.movements[0];
      expect(movement?.movementType).toBe(MovementType.INFLOW);
      expect(Number(movement?.quantity)).toBe(50.0);
      expect(movement?.actorId).toBe(workerId);
      expect(movement?.actorRole).toBe(UserRole.WORKER);
    });

    it('2. Retrying pickup complete returns 409 Conflict and does not duplicate inventory', async () => {
      const res = await request(app)
        .post(`/api/v1/worker/pickups/${pickupId}/complete`)
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ completionNotes: 'Duplicate attempt' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);

      const itemsCount = await prisma.inventoryItem.count({
        where: { donationId },
      });
      expect(itemsCount).toBe(1);
    });
  });

  describe('Inventory API Consumption Endpoints', () => {
    it('1. GET /api/v1/inventory/summary returns authoritative metrics', async () => {
      const res = await request(app)
        .get('/api/v1/inventory/summary')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalFoodItems).toBeGreaterThanOrEqual(1);
      expect(res.body.data.availableInventoryCount).toBeGreaterThanOrEqual(1);
      expect(res.body.data.distributedInventoryCount).toBeDefined();
    });

    it('2. GET /api/v1/inventory/items returns paginated items with filters', async () => {
      const res = await request(app)
        .get('/api/v1/inventory/items')
        .query({ status: 'AVAILABLE', foodCategory: 'COOKED_MEAL' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(1);

      const found = res.body.data.items.find((i: any) => i.id === inventoryId);
      expect(found).toBeDefined();
      expect(found.foodCategory).toBe('COOKED_MEAL');
    });

    it('3. GET /api/v1/inventory/items/:inventoryId returns inventory detail', async () => {
      const res = await request(app)
        .get(`/api/v1/inventory/items/${inventoryId}`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(inventoryId);
      expect(res.body.data.availableQuantity).toBe(50);
      expect(res.body.data.unit).toBe('PORTIONS');
    });

    it('4. GET /api/v1/inventory/items/:inventoryId/history returns movement timeline', async () => {
      const res = await request(app)
        .get(`/api/v1/inventory/items/${inventoryId}/history`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].movementType).toBe('INFLOW');
      expect(res.body.data[0].quantity).toBe(50);
      expect(res.body.data[0].actorRole).toBe('WORKER');
    });
  });
});
