import request from 'supertest';
import app from '../../src/app';
import { PrismaClient, UserRole } from '@prisma/client';
import { PasswordService } from '../../src/modules/auth-user/services/password.service';

const prisma = new PrismaClient();

describe('Module 05 — Security, Auth & RBAC Tests (Inventory)', () => {
  jest.setTimeout(30000);

  let donorToken: string;
  let workerToken: string;
  let adminToken: string;
  let donorId: string;
  let workerId: string;
  let adminId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    const passwordHash = await PasswordService.hashPassword('Password123!');

    // 1. Create donor user and login
    const donor = await prisma.user.create({
      data: {
        firstName: 'InvSecDonor',
        lastName: 'Test',
        email: `invsecdonor_${timestamp}@test.com`,
        passwordHash,
        role: UserRole.DONOR,
      },
    });
    donorId = donor.id;
    const donorRes = await request(app).post('/api/v1/auth/login').send({
      email: donor.email,
      password: 'Password123!',
    });
    donorToken = donorRes.body.data.accessToken;

    // 2. Create worker user and login
    const worker = await prisma.user.create({
      data: {
        firstName: 'InvSecWorker',
        lastName: 'Test',
        email: `invsecworker_${timestamp}@test.com`,
        passwordHash,
        role: UserRole.WORKER,
      },
    });
    workerId = worker.id;
    const workerRes = await request(app).post('/api/v1/auth/login').send({
      email: worker.email,
      password: 'Password123!',
    });
    workerToken = workerRes.body.data.accessToken;

    // 3. Create admin user and login
    const admin = await prisma.user.create({
      data: {
        firstName: 'InvSecAdmin',
        lastName: 'Test',
        email: `invsecadmin_${timestamp}@test.com`,
        passwordHash,
        role: UserRole.ADMIN,
      },
    });
    adminId = admin.id;
    const adminRes = await request(app).post('/api/v1/auth/login').send({
      email: admin.email,
      password: 'Password123!',
    });
    adminToken = adminRes.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany({
      where: { userId: { in: [donorId, workerId, adminId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [donorId, workerId, adminId] } },
    });
    await prisma.$disconnect();
  });

  describe('Unauthenticated & Unauthorized Access Controls (401 & 403)', () => {
    it('1. Returns 401 when no token is provided', async () => {
      const res = await request(app).get('/api/v1/inventory/summary');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('2. Returns 403 when DONOR role accesses inventory summary endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/inventory/summary')
        .set('Authorization', `Bearer ${donorToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('3. Returns 403 when DONOR role accesses inventory list endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/inventory/items')
        .set('Authorization', `Bearer ${donorToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('4. Allows WORKER role to access inventory summary endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/inventory/summary')
        .set('Authorization', `Bearer ${workerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalFoodItems).toBeDefined();
    });

    it('5. Allows ADMIN role to access inventory summary endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/inventory/summary')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Validation & Error Handling (400 & 404)', () => {
    it('1. Returns 400 on malformed UUID for inventory details', async () => {
      const res = await request(app)
        .get('/api/v1/inventory/items/not-a-valid-uuid')
        .set('Authorization', `Bearer ${workerToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_UUID');
    });

    it('2. Returns 404 when requesting nonexistent inventory item detail', async () => {
      const res = await request(app)
        .get('/api/v1/inventory/items/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${workerToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('INVENTORY_NOT_FOUND');
    });
  });
});
