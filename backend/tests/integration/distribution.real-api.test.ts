import request from 'supertest';
import app from '../../src/app';
import {
  PrismaClient,
  UserRole,
  DonationCategory,
  DonationQuantityUnit,
  InventoryStatus,
  MovementType,
  DistributionStatus,
} from '@prisma/client';
import { PasswordService } from '../../src/modules/auth-user/services/password.service';

const prisma = new PrismaClient();

describe('Module 05 — Real API Integration Tests (Distribution Management)', () => {
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
        firstName: 'DistDonor',
        lastName: 'Test',
        email: `distdonor_${timestamp}@test.com`,
        passwordHash,
        role: UserRole.DONOR,
      },
    });
    donorId = donor.id;

    // Create Admin
    const admin = await prisma.user.create({
      data: {
        firstName: 'DistAdmin',
        lastName: 'Test',
        email: `distadmin_${timestamp}@test.com`,
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
        firstName: 'DistWorker',
        lastName: 'Test',
        email: `distworker_${timestamp}@test.com`,
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

    // Create a base donation & pickup for FK relationships
    const donation = await prisma.donation.create({
      data: {
        donorId,
        category: DonationCategory.GROCERIES,
        description: '100 KG Rice Batch',
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
        description: '100 KG Rice Batch',
        totalQuantity: 100.0,
        availableQuantity: 100.0,
        reservedQuantity: 0.0,
        distributedQuantity: 0.0,
        unit: DonationQuantityUnit.KG,
        status: InventoryStatus.AVAILABLE,
        location: 'Section 4B',
      },
    });
    availableInventoryId = inv1.id;

    // Create EXPIRED InventoryItem
    const donation2 = await prisma.donation.create({
      data: {
        donorId,
        category: DonationCategory.BAKERY,
        description: '20 Boxes Bread Batch Expired',
        quantity: 20.0,
        quantityUnit: DonationQuantityUnit.BOXES,
        preparedAt: new Date(),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        pickupAddress: 'Warehouse B',
        contactName: 'Bakery Contact',
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
        foodCategory: DonationCategory.BAKERY,
        description: '20 Boxes Bread Batch Expired',
        totalQuantity: 20.0,
        availableQuantity: 20.0,
        reservedQuantity: 0.0,
        distributedQuantity: 0.0,
        unit: DonationQuantityUnit.BOXES,
        status: InventoryStatus.EXPIRED,
      },
    });
    expiredInventoryId = inv2.id;
  });

  afterAll(async () => {
    // Teardown in correct order
    await prisma.inventoryMovement.deleteMany({
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
    await prisma.outboxEvent.deleteMany({
      where: { payload: { path: ['distributedBy'], equals: adminId } },
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

  describe('POST /api/v1/distributions', () => {
    let createdDistributionId: string;

    it('1. Partial distribution succeeds: updates available/distributed quantities, status remains AVAILABLE, creates OUTFLOW movement', async () => {
      const res = await request(app)
        .post('/api/v1/distributions')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          inventoryId: availableInventoryId,
          recipientName: 'Hope Community Shelter',
          quantity: 40.0,
          unit: DonationQuantityUnit.KG,
          notes: 'First partial dispatch',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.recipientName).toBe('Hope Community Shelter');
      expect(Number(res.body.data.quantity)).toBe(40);
      expect(res.body.data.status).toBe(DistributionStatus.COMPLETED);

      createdDistributionId = res.body.data.id;

      // Verify InventoryItem state in DB
      const dbItem = await prisma.inventoryItem.findUnique({
        where: { id: availableInventoryId },
        include: { movements: true },
      });

      expect(dbItem).not.toBeNull();
      expect(Number(dbItem?.totalQuantity)).toBe(100);
      expect(Number(dbItem?.availableQuantity)).toBe(60);
      expect(Number(dbItem?.distributedQuantity)).toBe(40);
      expect(Number(dbItem?.reservedQuantity)).toBe(0);
      expect(dbItem?.status).toBe(InventoryStatus.AVAILABLE);

      // Verify invariant: 60 + 0 + 40 = 100
      expect(
        Number(dbItem?.availableQuantity) +
          Number(dbItem?.reservedQuantity) +
          Number(dbItem?.distributedQuantity)
      ).toBe(Number(dbItem?.totalQuantity));

      // Verify OUTFLOW movement created
      const outflow = dbItem?.movements.find((m) => m.referenceId === createdDistributionId);
      expect(outflow).toBeDefined();
      expect(outflow?.movementType).toBe(MovementType.OUTFLOW);
      expect(Number(outflow?.quantity)).toBe(40);
      expect(Number(outflow?.previousAvailableQuantity)).toBe(100);
      expect(Number(outflow?.resultingAvailableQuantity)).toBe(60);
      expect(outflow?.referenceType).toBe('DISTRIBUTION');
      expect(outflow?.actorId).toBe(workerId);
    });

    it('2. Full distribution succeeds: remaining 60 KG distributed, status transitions to DISTRIBUTED', async () => {
      const res = await request(app)
        .post('/api/v1/distributions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          inventoryId: availableInventoryId,
          recipientName: 'City Central Food Bank',
          quantity: 60.0,
          unit: DonationQuantityUnit.KG,
          notes: 'Final batch clearance',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify InventoryItem in DB
      const dbItem = await prisma.inventoryItem.findUnique({
        where: { id: availableInventoryId },
      });

      expect(Number(dbItem?.availableQuantity)).toBe(0);
      expect(Number(dbItem?.distributedQuantity)).toBe(100);
      expect(dbItem?.status).toBe(InventoryStatus.DISTRIBUTED);

      // Invariant: 0 + 0 + 100 = 100
      expect(
        Number(dbItem?.availableQuantity) +
          Number(dbItem?.reservedQuantity) +
          Number(dbItem?.distributedQuantity)
      ).toBe(Number(dbItem?.totalQuantity));
    });

    it('3. Rejects distribution when quantity exceeds available inventory -> 409 INSUFFICIENT_INVENTORY', async () => {
      const res = await request(app)
        .post('/api/v1/distributions')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          inventoryId: availableInventoryId,
          recipientName: 'Extra Shelter',
          quantity: 10.0,
          unit: DonationQuantityUnit.KG,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_INVENTORY');
    });

    it('4. Rejects unit mismatch -> 400 UNIT_MISMATCH', async () => {
      const res = await request(app)
        .post('/api/v1/distributions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          inventoryId: availableInventoryId,
          recipientName: 'Shelter',
          quantity: 5.0,
          unit: DonationQuantityUnit.PORTIONS, // Mismatched unit!
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNIT_MISMATCH');
    });

    it('5. Rejects distribution from EXPIRED inventory -> 409 INSUFFICIENT_INVENTORY', async () => {
      const res = await request(app)
        .post('/api/v1/distributions')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          inventoryId: expiredInventoryId,
          recipientName: 'Shelter',
          quantity: 5.0,
          unit: DonationQuantityUnit.BOXES,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_INVENTORY');
    });
  });

  describe('GET /api/v1/distributions & /api/v1/distributions/:distributionId', () => {
    it('1. GET /api/v1/distributions returns paginated list of distribution records', async () => {
      const res = await request(app)
        .get('/api/v1/distributions')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.pagination.totalItems).toBeGreaterThanOrEqual(2);
    });

    it('2. GET /api/v1/distributions with search filter works', async () => {
      const res = await request(app)
        .get('/api/v1/distributions')
        .query({ search: 'Hope Community' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].recipientName).toBe('Hope Community Shelter');
    });

    it('3. GET /api/v1/distributions/:distributionId returns distribution detail', async () => {
      // Find created distribution record ID
      const listRes = await request(app)
        .get('/api/v1/distributions')
        .query({ search: 'Hope Community' })
        .set('Authorization', `Bearer ${workerToken}`);

      const recordId = listRes.body.data.items[0].id;

      const res = await request(app)
        .get(`/api/v1/distributions/${recordId}`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(recordId);
      expect(res.body.data.recipientName).toBe('Hope Community Shelter');
      expect(res.body.data.inventory).toBeDefined();
      expect(res.body.data.distributor).toBeDefined();
    });

    it('4. GET /api/v1/distributions/:distributionId returns 404 for non-existent ID', async () => {
      const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';
      const res = await request(app)
        .get(`/api/v1/distributions/${nonExistentId}`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
