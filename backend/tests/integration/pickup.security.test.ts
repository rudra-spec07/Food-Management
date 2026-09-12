import request from 'supertest';
import app from '../../src/app';
import { PrismaClient, UserRole, UserStatus, DonationStatus } from '@prisma/client';
import { PasswordService } from '../../src/modules/auth-user/services/password.service';

const prisma = new PrismaClient();
jest.setTimeout(30000);

describe('Module 05 — Security, Auth & RBAC Tests', () => {
  let adminToken: string;
  let worker1Token: string;
  let worker1Id: string;
  let worker2Token: string;
  let worker2Id: string;
  let donorToken: string;

  let worker1PickupId: string;
  let worker2PickupId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    const passwordHash = await PasswordService.hashPassword('Password123!');

    const admin = await prisma.user.create({
      data: {
        firstName: 'SecAdmin',
        lastName: 'Test',
        email: `sec-admin-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });

    const worker1 = await prisma.user.create({
      data: {
        firstName: 'SecWorker1',
        lastName: 'Test',
        email: `sec-w1-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.WORKER,
        status: UserStatus.ACTIVE,
      },
    });
    worker1Id = worker1.id;

    const worker2 = await prisma.user.create({
      data: {
        firstName: 'SecWorker2',
        lastName: 'Test',
        email: `sec-w2-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.WORKER,
        status: UserStatus.ACTIVE,
      },
    });
    worker2Id = worker2.id;

    const donor = await prisma.user.create({
      data: {
        firstName: 'SecDonor',
        lastName: 'Test',
        email: `sec-donor-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.DONOR,
        status: UserStatus.ACTIVE,
      },
    });

    // Logins
    const aLog = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: 'Password123!' });
    adminToken = aLog.body.data.accessToken;

    const w1Log = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: worker1.email, password: 'Password123!' });
    worker1Token = w1Log.body.data.accessToken;

    const w2Log = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: worker2.email, password: 'Password123!' });
    worker2Token = w2Log.body.data.accessToken;

    const dLog = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: donor.email, password: 'Password123!' });
    donorToken = dLog.body.data.accessToken;

    // Create donations & assignments for W1 and W2
    const d1 = await prisma.donation.create({
      data: {
        donorId: donor.id,
        category: 'COOKED_MEAL',
        description: 'Sec Meal 1',
        quantity: 5,
        quantityUnit: 'PORTIONS',
        preparedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        pickupAddress: 'Address 1',
        contactName: 'Contact',
        contactPhone: '+1234567',
        status: DonationStatus.APPROVED,
      },
    });

    const d2 = await prisma.donation.create({
      data: {
        donorId: donor.id,
        category: 'PACKAGED_FOOD',
        description: 'Sec Meal 2',
        quantity: 5,
        quantityUnit: 'PACKETS',
        preparedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        pickupAddress: 'Address 2',
        contactName: 'Contact',
        contactPhone: '+1234567',
        status: DonationStatus.APPROVED,
      },
    });

    // Assign & accept for W1
    const assign1 = await request(app)
      .post(`/api/v1/admin/donations/${d1.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ workerId: worker1Id });
    await request(app)
      .post(`/api/v1/worker/assignments/${assign1.body.data.assignment.id}/accept`)
      .set('Authorization', `Bearer ${worker1Token}`)
      .send({});
    const p1 = await prisma.pickup.findUnique({
      where: { assignmentId: assign1.body.data.assignment.id },
    });
    worker1PickupId = p1!.id;

    // Assign & accept for W2
    const assign2 = await request(app)
      .post(`/api/v1/admin/donations/${d2.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ workerId: worker2Id });
    await request(app)
      .post(`/api/v1/worker/assignments/${assign2.body.data.assignment.id}/accept`)
      .set('Authorization', `Bearer ${worker2Token}`)
      .send({});
    const p2 = await prisma.pickup.findUnique({
      where: { assignmentId: assign2.body.data.assignment.id },
    });
    worker2PickupId = p2!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Unauthenticated & Unauthorized Access Controls (401 & 403)', () => {
    it('1. Returns 401 when no token is provided', async () => {
      const res = await request(app).get('/api/v1/worker/pickups');
      expect(res.status).toBe(401);
    });

    it('2. Returns 403 when DONOR accesses worker pickup list', async () => {
      const res = await request(app)
        .get('/api/v1/worker/pickups')
        .set('Authorization', `Bearer ${donorToken}`);
      expect(res.status).toBe(403);
    });

    it('3. Returns 403 when DONOR accesses admin pickup list', async () => {
      const res = await request(app)
        .get('/api/v1/admin/pickups')
        .set('Authorization', `Bearer ${donorToken}`);
      expect(res.status).toBe(403);
    });

    it('4. Returns 403 when ADMIN calls worker start endpoint', async () => {
      const res = await request(app)
        .post(`/api/v1/worker/pickups/${worker1PickupId}/start`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(403);
    });
  });

  describe('IDOR & Cross-Worker Isolation (404 Non-Enumeration)', () => {
    it('1. Worker 1 cannot view Worker 2 pickup detail (returns 404)', async () => {
      const res = await request(app)
        .get(`/api/v1/worker/pickups/${worker2PickupId}`)
        .set('Authorization', `Bearer ${worker1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PICKUP_NOT_FOUND');
    });

    it('2. Worker 1 cannot start Worker 2 pickup (returns 404)', async () => {
      const res = await request(app)
        .post(`/api/v1/worker/pickups/${worker2PickupId}/start`)
        .set('Authorization', `Bearer ${worker1Token}`)
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PICKUP_NOT_FOUND');
    });

    it('3. Worker 1 cannot complete Worker 2 pickup (returns 404)', async () => {
      const res = await request(app)
        .post(`/api/v1/worker/pickups/${worker2PickupId}/complete`)
        .set('Authorization', `Bearer ${worker1Token}`)
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PICKUP_NOT_FOUND');
    });

    it('4. Worker 1 cannot fail Worker 2 pickup (returns 404)', async () => {
      const res = await request(app)
        .post(`/api/v1/worker/pickups/${worker2PickupId}/fail`)
        .set('Authorization', `Bearer ${worker1Token}`)
        .send({ reason: 'Malicious attempt' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PICKUP_NOT_FOUND');
    });
  });

  describe('Mass Assignment & Body Tampering Protection', () => {
    it('1. Rejects start request with extra injected body parameters', async () => {
      const res = await request(app)
        .post(`/api/v1/worker/pickups/${worker1PickupId}/start`)
        .set('Authorization', `Bearer ${worker1Token}`)
        .send({ workerId: worker2Id, status: 'COMPLETED', startedAt: '2000-01-01T00:00:00Z' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('2. Rejects complete request with extra injected body parameters', async () => {
      const res = await request(app)
        .post(`/api/v1/worker/pickups/${worker1PickupId}/complete`)
        .set('Authorization', `Bearer ${worker1Token}`)
        .send({ completionNotes: 'Valid', workerId: worker2Id });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('3. Rejects fail request with extra injected body parameters', async () => {
      const res = await request(app)
        .post(`/api/v1/worker/pickups/${worker1PickupId}/fail`)
        .set('Authorization', `Bearer ${worker1Token}`)
        .send({ reason: 'Valid reason', failedAt: '2000-01-01T00:00:00Z' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
