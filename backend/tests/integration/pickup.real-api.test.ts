import request from 'supertest';
import app from '../../src/app';
import {
  PrismaClient,
  UserRole,
  UserStatus,
  DonationStatus,
  PickupStatus,
  PickupEventType,
  AuditEventType,
} from '@prisma/client';
import { PasswordService } from '../../src/modules/auth-user/services/password.service';

const prisma = new PrismaClient();
jest.setTimeout(30000);

describe('Module 05 — Real API Integration Tests (Pickup & Donation Completion)', () => {
  let adminToken: string;

  let worker1Token: string;
  let worker1Id: string;

  let worker2Token: string;
  let worker2Id: string;

  let donorId: string;

  let donation1Id: string;
  let assignment1Id: string;
  let pickup1Id: string;

  let donation2Id: string;
  let assignment2Id: string;
  let pickup2Id: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    const passwordHash = await PasswordService.hashPassword('Password123!');

    // Create test users
    const admin = await prisma.user.create({
      data: {
        firstName: 'Mod5Admin',
        lastName: 'Tester',
        email: `mod5-admin-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });

    const worker1 = await prisma.user.create({
      data: {
        firstName: 'Mod5Worker1',
        lastName: 'Tester',
        email: `mod5-worker1-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.WORKER,
        status: UserStatus.ACTIVE,
      },
    });
    worker1Id = worker1.id;

    const worker2 = await prisma.user.create({
      data: {
        firstName: 'Mod5Worker2',
        lastName: 'Tester',
        email: `mod5-worker2-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.WORKER,
        status: UserStatus.ACTIVE,
      },
    });
    worker2Id = worker2.id;

    const donor = await prisma.user.create({
      data: {
        firstName: 'Mod5Donor',
        lastName: 'Tester',
        email: `mod5-donor-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.DONOR,
        status: UserStatus.ACTIVE,
      },
    });
    donorId = donor.id;

    // Login users
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: 'Password123!' });
    adminToken = adminLogin.body.data.accessToken;

    const worker1Login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: worker1.email, password: 'Password123!' });
    worker1Token = worker1Login.body.data.accessToken;

    const worker2Login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: worker2.email, password: 'Password123!' });
    worker2Token = worker2Login.body.data.accessToken;

    // Create test donation 1 (APPROVED)
    const d1 = await prisma.donation.create({
      data: {
        donorId,
        category: 'COOKED_MEAL',
        description: 'Hot meals for 20 people',
        quantity: 20,
        quantityUnit: 'PORTIONS',
        preparedAt: new Date(Date.now() - 3600000),
        expiresAt: new Date(Date.now() + 86400000),
        pickupAddress: '123 Main St',
        contactName: 'Donor 1',
        contactPhone: '+1234567890',
        status: DonationStatus.APPROVED,
      },
    });
    donation1Id = d1.id;

    // Create test donation 2 (APPROVED)
    const d2 = await prisma.donation.create({
      data: {
        donorId,
        category: 'PACKAGED_FOOD',
        description: '10 boxes of cereal',
        quantity: 10,
        quantityUnit: 'BOXES',
        preparedAt: new Date(Date.now() - 7200000),
        expiresAt: new Date(Date.now() + 172800000),
        pickupAddress: '456 Oak Ave',
        contactName: 'Donor 2',
        contactPhone: '+0987654321',
        status: DonationStatus.APPROVED,
      },
    });
    donation2Id = d2.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Worker Pickup Lifecycle — Happy Path (Start & Complete)', () => {
    it('1. Admin assigns donation 1 to Worker 1', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/donations/${donation1Id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ workerId: worker1Id });

      expect(res.status).toBe(200);
      expect(res.body.data.assignment.status).toBe('PENDING');
      assignment1Id = res.body.data.assignment.id;
    });

    it('2. Worker 1 accepts assignment 1 and Pickup is created in NOT_STARTED status', async () => {
      const res = await request(app)
        .post(`/api/v1/worker/assignments/${assignment1Id}/accept`)
        .set('Authorization', `Bearer ${worker1Token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.updatedDonation.status).toBe('ACCEPTED');

      // Verify Pickup row exists and is NOT_STARTED
      const pickup = await prisma.pickup.findUnique({
        where: { assignmentId: assignment1Id },
      });
      expect(pickup).not.toBeNull();
      expect(pickup!.status).toBe(PickupStatus.NOT_STARTED);
      expect(pickup!.workerId).toBe(worker1Id);
      expect(pickup!.donationId).toBe(donation1Id);
      pickup1Id = pickup!.id;

      // Verify PickupEvent PICKUP_CREATED exists
      const events = await prisma.pickupEvent.findMany({
        where: { pickupId: pickup1Id },
      });
      expect(events.length).toBe(1);
      expect(events[0].eventType).toBe(PickupEventType.PICKUP_CREATED);
    });

    it('3. Worker 1 lists pickups and gets detail', async () => {
      const listRes = await request(app)
        .get('/api/v1/worker/pickups')
        .set('Authorization', `Bearer ${worker1Token}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.items.some((p: any) => p.id === pickup1Id)).toBe(true);

      const detailRes = await request(app)
        .get(`/api/v1/worker/pickups/${pickup1Id}`)
        .set('Authorization', `Bearer ${worker1Token}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.id).toBe(pickup1Id);
      expect(detailRes.body.data.status).toBe('NOT_STARTED');
    });

    it('4. Worker 1 starts pickup 1', async () => {
      const res = await request(app)
        .post(`/api/v1/worker/pickups/${pickup1Id}/start`)
        .set('Authorization', `Bearer ${worker1Token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.pickup.status).toBe('IN_PROGRESS');
      expect(res.body.data.pickup.startedAt).not.toBeNull();
      expect(res.body.data.donation.status).toBe('PICKED_UP');

      // Verify database records
      const dbPickup = await prisma.pickup.findUnique({ where: { id: pickup1Id } });
      expect(dbPickup!.status).toBe(PickupStatus.IN_PROGRESS);

      const dbDonation = await prisma.donation.findUnique({ where: { id: donation1Id } });
      expect(dbDonation!.status).toBe(DonationStatus.PICKED_UP);

      // Verify audit log & outbox
      const audit = await prisma.auditLog.findFirst({
        where: { action: AuditEventType.PICKUP_STARTED, entityId: pickup1Id },
      });
      expect(audit).not.toBeNull();

      const outbox = await prisma.outboxEvent.findFirst({
        where: { eventType: 'PICKUP_STARTED', aggregateId: pickup1Id },
      });
      expect(outbox).not.toBeNull();
    });

    it('5. Worker 1 completes pickup 1', async () => {
      const res = await request(app)
        .post(`/api/v1/worker/pickups/${pickup1Id}/complete`)
        .set('Authorization', `Bearer ${worker1Token}`)
        .send({ completionNotes: 'Delivered to community kitchen' });

      expect(res.status).toBe(200);
      expect(res.body.data.pickup.status).toBe('COMPLETED');
      expect(res.body.data.pickup.completedAt).not.toBeNull();
      expect(res.body.data.pickup.completionNotes).toBe('Delivered to community kitchen');
      expect(res.body.data.donation.status).toBe('COMPLETED');
      expect(res.body.data.donation.completedAt).not.toBeNull();

      // Verify DB donation completed
      const dbDonation = await prisma.donation.findUnique({ where: { id: donation1Id } });
      expect(dbDonation!.status).toBe(DonationStatus.COMPLETED);

      // Verify audit & outbox
      const audit = await prisma.auditLog.findFirst({
        where: { action: AuditEventType.PICKUP_COMPLETED, entityId: pickup1Id },
      });
      expect(audit).not.toBeNull();

      const donationAudit = await prisma.auditLog.findFirst({
        where: { action: AuditEventType.DONATION_COMPLETED, entityId: donation1Id },
      });
      expect(donationAudit).not.toBeNull();

      const outbox = await prisma.outboxEvent.findFirst({
        where: { eventType: 'PICKUP_COMPLETED', aggregateId: pickup1Id },
      });
      expect(outbox).not.toBeNull();
    });

    it('6. Admin can view pickup details and event audit trail', async () => {
      const adminList = await request(app)
        .get('/api/v1/admin/pickups?status=COMPLETED')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminList.status).toBe(200);
      expect(adminList.body.data.items.some((p: any) => p.id === pickup1Id)).toBe(true);

      const adminDetail = await request(app)
        .get(`/api/v1/admin/pickups/${pickup1Id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminDetail.status).toBe(200);
      expect(adminDetail.body.data.id).toBe(pickup1Id);

      const adminEvents = await request(app)
        .get(`/api/v1/admin/pickups/${pickup1Id}/events`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminEvents.status).toBe(200);
      expect(adminEvents.body.data.length).toBe(3); // PICKUP_CREATED, PICKUP_STARTED, PICKUP_COMPLETED
    });
  });

  describe('Worker Pickup Lifecycle — Failure Path', () => {
    it('1. Admin assigns donation 2 to Worker 2 and Worker 2 accepts', async () => {
      const assignRes = await request(app)
        .post(`/api/v1/admin/donations/${donation2Id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ workerId: worker2Id });
      assignment2Id = assignRes.body.data.assignment.id;

      await request(app)
        .post(`/api/v1/worker/assignments/${assignment2Id}/accept`)
        .set('Authorization', `Bearer ${worker2Token}`)
        .send({});

      const pickup = await prisma.pickup.findUnique({
        where: { assignmentId: assignment2Id },
      });
      pickup2Id = pickup!.id;
    });

    it('2. Worker 2 starts pickup 2', async () => {
      const startRes = await request(app)
        .post(`/api/v1/worker/pickups/${pickup2Id}/start`)
        .set('Authorization', `Bearer ${worker2Token}`)
        .send({});

      expect(startRes.status).toBe(200);
      expect(startRes.body.data.pickup.status).toBe('IN_PROGRESS');
      expect(startRes.body.data.donation.status).toBe('PICKED_UP');
    });

    it('3. Worker 2 fails pickup 2 with reason', async () => {
      const failRes = await request(app)
        .post(`/api/v1/worker/pickups/${pickup2Id}/fail`)
        .set('Authorization', `Bearer ${worker2Token}`)
        .send({ reason: 'Food was spoiled upon arrival' });

      expect(failRes.status).toBe(200);
      expect(failRes.body.data.pickup.status).toBe('FAILED');
      expect(failRes.body.data.pickup.failedAt).not.toBeNull();
      expect(failRes.body.data.pickup.failureReason).toBe('Food was spoiled upon arrival');

      // Verify Donation remains in PICKED_UP (Correction #2)
      const dbDonation = await prisma.donation.findUnique({ where: { id: donation2Id } });
      expect(dbDonation!.status).toBe(DonationStatus.PICKED_UP);

      // Verify audit & outbox for failure
      const audit = await prisma.auditLog.findFirst({
        where: { action: AuditEventType.PICKUP_FAILED, entityId: pickup2Id },
      });
      expect(audit).not.toBeNull();

      const outbox = await prisma.outboxEvent.findFirst({
        where: { eventType: 'PICKUP_FAILED', aggregateId: pickup2Id },
      });
      expect(outbox).not.toBeNull();
    });
  });
});
