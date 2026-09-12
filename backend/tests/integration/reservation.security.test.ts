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

describe('Module 05 — Reservation Security & IDOR Tests', () => {
  jest.setTimeout(30000);

  let donorId: string;
  let adminId: string;
  let worker1Id: string;
  let worker2Id: string;

  let donorToken: string;
  let adminToken: string;
  let worker1Token: string;
  let worker2Token: string;

  let inventoryId: string;
  let worker1ReservationId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    const passwordHash = await PasswordService.hashPassword('Password123!');

    // Create Donor
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

    // Create Admin
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

    // Create Worker 1
    const worker1 = await prisma.user.create({
      data: {
        firstName: 'SecWorker1',
        lastName: 'Test',
        email: `secworker1_${timestamp}@test.com`,
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
        firstName: 'SecWorker2',
        lastName: 'Test',
        email: `secworker2_${timestamp}@test.com`,
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

    // Base donation & pickup
    const donation = await prisma.donation.create({
      data: {
        donorId,
        category: DonationCategory.PACKAGED_FOOD,
        description: '50 Packets Cereal Batch',
        quantity: 50.0,
        quantityUnit: DonationQuantityUnit.PACKETS,
        preparedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        pickupAddress: 'Warehouse Sec',
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

    const inv = await prisma.inventoryItem.create({
      data: {
        donationId: donation.id,
        pickupId: pickup.id,
        foodCategory: DonationCategory.PACKAGED_FOOD,
        description: '50 Packets Cereal Batch',
        totalQuantity: 50.0,
        availableQuantity: 50.0,
        reservedQuantity: 0.0,
        distributedQuantity: 0.0,
        unit: DonationQuantityUnit.PACKETS,
        status: InventoryStatus.AVAILABLE,
      },
    });
    inventoryId = inv.id;

    // Create reservation owned by Worker 1
    const createRes = await request(app)
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${worker1Token}`)
      .send({ inventoryId, quantity: 10.0 });

    worker1ReservationId = createRes.body.data.id;
  });

  afterAll(async () => {
    // Teardown
    await prisma.inventoryMovement.deleteMany({
      where: { inventory: { donation: { donorId } } },
    });
    await prisma.inventoryReservation.deleteMany({
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

  describe('Unauthenticated Access (401)', () => {
    it('1. rejects GET /api/v1/reservations without token', async () => {
      const res = await request(app).get('/api/v1/reservations');
      expect(res.status).toBe(401);
    });

    it('2. rejects POST /api/v1/reservations without token', async () => {
      const res = await request(app).post('/api/v1/reservations').send({ inventoryId, quantity: 5 });
      expect(res.status).toBe(401);
    });
  });

  describe('DONOR Access Control (403)', () => {
    it('1. rejects DONOR creating reservation -> 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ inventoryId, quantity: 5.0 });

      expect(res.status).toBe(403);
    });

    it('2. rejects DONOR listing reservations -> 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/reservations')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(res.status).toBe(403);
    });

    it('3. rejects DONOR releasing reservation -> 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post(`/api/v1/reservations/${worker1ReservationId}/release`)
        .set('Authorization', `Bearer ${donorToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('WORKER IDOR & Ownership Verification', () => {
    it('1. Worker 2 cannot view Worker 1 reservation -> 404 RESERVATION_NOT_FOUND (anti-enumeration)', async () => {
      const res = await request(app)
        .get(`/api/v1/reservations/${worker1ReservationId}`)
        .set('Authorization', `Bearer ${worker2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('RESERVATION_NOT_FOUND');
    });

    it('2. Worker 2 cannot release Worker 1 reservation -> 404 RESERVATION_NOT_FOUND', async () => {
      const res = await request(app)
        .post(`/api/v1/reservations/${worker1ReservationId}/release`)
        .set('Authorization', `Bearer ${worker2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('3. ADMIN can view and release Worker 1 reservation', async () => {
      const viewRes = await request(app)
        .get(`/api/v1/reservations/${worker1ReservationId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(viewRes.status).toBe(200);
      expect(viewRes.body.data.id).toBe(worker1ReservationId);

      const releaseRes = await request(app)
        .post(`/api/v1/reservations/${worker1ReservationId}/release`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(releaseRes.status).toBe(200);
      expect(releaseRes.body.data.status).toBe('RELEASED');
    });
  });
});
