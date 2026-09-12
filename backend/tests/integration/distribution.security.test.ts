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

describe('Module 05 — Distribution Security & Authorization Tests', () => {
  jest.setTimeout(30000);

  let donorId: string;
  let adminId: string;
  let workerId: string;

  let donorToken: string;
  let adminToken: string;
  let workerToken: string;

  let inventoryId: string;
  let distributionId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    const passwordHash = await PasswordService.hashPassword('Password123!');

    // Create Donor & Login
    const donor = await prisma.user.create({
      data: {
        firstName: 'SecDonor',
        lastName: 'Test',
        email: `secdonor_${timestamp}@test.com`,
        passwordHash,
        role: UserRole.DONOR,
      },
    });
    donorId = donor.id;

    const donorLogin = await request(app).post('/api/v1/auth/login').send({
      email: donor.email,
      password: 'Password123!',
    });
    donorToken = donorLogin.body.data.accessToken;

    // Create Admin & Login
    const admin = await prisma.user.create({
      data: {
        firstName: 'SecAdmin',
        lastName: 'Test',
        email: `secadmin_${timestamp}@test.com`,
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

    // Create Worker & Login
    const worker = await prisma.user.create({
      data: {
        firstName: 'SecWorker',
        lastName: 'Test',
        email: `secworker_${timestamp}@test.com`,
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

    // Create Donation, Pickup, InventoryItem
    const donation = await prisma.donation.create({
      data: {
        donorId,
        category: DonationCategory.COOKED_MEAL,
        description: '30 Portions Lunch',
        quantity: 30.0,
        quantityUnit: DonationQuantityUnit.PORTIONS,
        preparedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        pickupAddress: 'Kitchen 1',
        contactName: 'Donor Contact',
        contactPhone: '+1234567890',
        status: 'COMPLETED' as any,
      },
    });

    const assignment = await prisma.assignment.create({
      data: {
        donationId: donation.id,
        workerId,
        assignedBy: adminId,
        status: 'ACCEPTED' as any,
      },
    });

    const pickup = await prisma.pickup.create({
      data: {
        donationId: donation.id,
        assignmentId: assignment.id,
        workerId,
        status: 'COMPLETED' as any,
      },
    });

    const inv = await prisma.inventoryItem.create({
      data: {
        donationId: donation.id,
        pickupId: pickup.id,
        foodCategory: DonationCategory.COOKED_MEAL,
        description: '30 Portions Lunch',
        totalQuantity: 30.0,
        availableQuantity: 30.0,
        reservedQuantity: 0.0,
        distributedQuantity: 0.0,
        unit: DonationQuantityUnit.PORTIONS,
        status: InventoryStatus.AVAILABLE,
      },
    });
    inventoryId = inv.id;

    // Create 1 initial distribution record
    const dist = await prisma.distributionRecord.create({
      data: {
        inventoryId,
        distributedBy: workerId,
        recipientName: 'Alpha Orphanage',
        quantity: 10.0,
        unit: DonationQuantityUnit.PORTIONS,
        status: 'COMPLETED' as any,
      },
    });
    distributionId = dist.id;
  });

  afterAll(async () => {
    await prisma.inventoryMovement.deleteMany({
      where: { inventoryId },
    });
    await prisma.distributionRecord.deleteMany({
      where: { inventoryId },
    });
    await prisma.inventoryItem.deleteMany({
      where: { id: inventoryId },
    });
    await prisma.pickup.deleteMany({
      where: { donation: { donorId } },
    });
    await prisma.assignment.deleteMany({
      where: { donation: { donorId } },
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

  describe('Authentication Requirements (401 Unauthorized)', () => {
    it('1. POST /api/v1/distributions without token returns 401', async () => {
      const res = await request(app).post('/api/v1/distributions').send({
        inventoryId,
        recipientName: 'Shelter',
        quantity: 5,
      });

      expect(res.status).toBe(401);
    });

    it('2. GET /api/v1/distributions without token returns 401', async () => {
      const res = await request(app).get('/api/v1/distributions');
      expect(res.status).toBe(401);
    });

    it('3. GET /api/v1/distributions/:id without token returns 401', async () => {
      const res = await request(app).get(`/api/v1/distributions/${distributionId}`);
      expect(res.status).toBe(401);
    });
  });

  describe('Role Requirements (403 Forbidden vs Success)', () => {
    it('1. DONOR role cannot create distribution -> 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/distributions')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          inventoryId,
          recipientName: 'Shelter',
          quantity: 5,
        });

      expect(res.status).toBe(403);
    });

    it('2. DONOR role cannot list distributions -> 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/distributions')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(res.status).toBe(403);
    });

    it('3. WORKER role can create distribution -> 201 Created', async () => {
      const res = await request(app)
        .post('/api/v1/distributions')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          inventoryId,
          recipientName: 'Beta Orphanage',
          quantity: 5.0,
          unit: DonationQuantityUnit.PORTIONS,
        });

      expect(res.status).toBe(201);
    });

    it('4. ADMIN role can create distribution -> 201 Created', async () => {
      const res = await request(app)
        .post('/api/v1/distributions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          inventoryId,
          recipientName: 'Gamma Shelter',
          quantity: 5.0,
          unit: DonationQuantityUnit.PORTIONS,
        });

      expect(res.status).toBe(201);
    });
  });

  describe('Data Security & Sensitivity', () => {
    it('1. Detail endpoint does not expose distributor passwordHash', async () => {
      const res = await request(app)
        .get(`/api/v1/distributions/${distributionId}`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.distributor).toBeDefined();
      expect(res.body.data.distributor.passwordHash).toBeUndefined();
    });

    it('2. Detail endpoint with invalid UUID returns 400 INVALID_UUID', async () => {
      const res = await request(app)
        .get('/api/v1/distributions/not-a-valid-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_UUID');
    });
  });
});
