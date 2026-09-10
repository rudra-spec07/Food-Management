import request from 'supertest';
import app from '../../src/app';
import { PrismaClient, DonationStatus, UserRole, ReviewDecision } from '@prisma/client';

const prisma = new PrismaClient();
jest.setTimeout(30000);

describe('Module 03 — Real Neon Database Integration, Security, Concurrency & Transaction Tests', () => {
  const timestamp = Date.now();
  const donorEmail = `donor-mod3-${timestamp}@example.test`;
  const adminEmail = `admin-mod3-${timestamp}@example.test`;
  const workerEmail = `worker-mod3-${timestamp}@example.test`;
  const password = 'Password123!';

  let donorToken: string;
  let donorId: string;

  let adminToken: string;
  let adminId: string;

  let workerToken: string;
  let workerId: string;

  let createdDonationId: string;
  let rejectedDonationId: string;
  let concurrentDonationId: string;
  let expiredDonationId: string;

  beforeAll(async () => {
    // 1. Register Donor
    const regDonor = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Mod3Donor',
      lastName: 'User',
      email: donorEmail,
      phone: '+919876543301',
      password,
    });
    expect(regDonor.status).toBe(201);
    donorToken = regDonor.body.data.accessToken;
    donorId = regDonor.body.data.user.id;

    // 2. Register Admin
    const regAdmin = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Mod3Admin',
      lastName: 'User',
      email: adminEmail,
      phone: '+919876543302',
      password,
    });
    expect(regAdmin.status).toBe(201);
    adminToken = regAdmin.body.data.accessToken;
    adminId = regAdmin.body.data.user.id;

    // Elevate admin role directly in Neon PostgreSQL database
    await prisma.user.update({
      where: { id: adminId },
      data: { role: UserRole.ADMIN },
    });

    // 3. Register Worker
    const regWorker = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Mod3Worker',
      lastName: 'User',
      email: workerEmail,
      phone: '+919876543303',
      password,
    });
    expect(regWorker.status).toBe(201);
    workerToken = regWorker.body.data.accessToken;
    workerId = regWorker.body.data.user.id;

    await prisma.user.update({
      where: { id: workerId },
      data: { role: UserRole.WORKER },
    });
  });

  afterAll(async () => {
    // Cleanup synthetic test records cleanly in reverse dependency order
    const userIds = [donorId, adminId, workerId].filter(Boolean);
    if (userIds.length > 0) {
      const donationIds = [createdDonationId, rejectedDonationId, concurrentDonationId, expiredDonationId].filter(Boolean);

      if (donationIds.length > 0) {
        await prisma.outboxEvent.deleteMany({
          where: { aggregateId: { in: donationIds } },
        });
        await prisma.donationReview.deleteMany({
          where: { donationId: { in: donationIds } },
        });
        await prisma.donationStatusHistory.deleteMany({
          where: { donationId: { in: donationIds } },
        });
        await prisma.donation.deleteMany({
          where: { id: { in: donationIds } },
        });
      }

      // Delete any other donations created by donorId
      await prisma.donationStatusHistory.deleteMany({
        where: { changedBy: { in: userIds } },
      });
      await prisma.donation.deleteMany({
        where: { donorId: { in: userIds } },
      });
      await prisma.auditLog.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.authSession.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }
    await prisma.$disconnect();
  });

  describe('1. Role Authorization Checks (RBAC Guard)', () => {
    it('should reject DONOR attempting to access review queue with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/donations/review')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject WORKER attempting to access review queue with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/donations/review')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow ADMIN to access review queue with 200 OK', async () => {
      const res = await request(app)
        .get('/api/v1/admin/donations/review')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });
  });

  describe('2. End-to-End Approval Flow & Transaction Atomicity', () => {
    it('should create a donation as DONOR and verify it appears in ADMIN review queue', async () => {
      const now = new Date();
      const preparedAt = new Date(now.getTime() - 1000 * 60 * 10).toISOString();
      const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 12).toISOString();

      const createRes = await request(app)
        .post('/api/v1/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          category: 'COOKED_MEAL',
          description: 'Fresh dinner boxes for review',
          quantity: 25,
          quantityUnit: 'PORTIONS',
          preparedAt,
          expiresAt,
          pickupAddress: '789 Main Street, Indore',
          contactName: 'Donor User',
          contactPhone: '+919876543301',
        });

      expect(createRes.status).toBe(201);
      createdDonationId = createRes.body.data.id;

      // Check review queue
      const queueRes = await request(app)
        .get('/api/v1/admin/donations/review')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(queueRes.status).toBe(200);
      const found = queueRes.body.data.items.find((item: any) => item.id === createdDonationId);
      expect(found).toBeDefined();
    });

    it('should fetch review detail for ADMIN', async () => {
      const detailRes = await request(app)
        .get(`/api/v1/admin/donations/${createdDonationId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.donation.id).toBe(createdDonationId);
      expect(detailRes.body.data.donation.donor.email).toBe(donorEmail);
    });

    it('should approve donation cleanly and record review, status history, audit log, outbox event', async () => {
      const approveRes = await request(app)
        .post(`/api/v1/admin/donations/${createdDonationId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.success).toBe(true);
      expect(approveRes.body.data.donation.status).toBe(DonationStatus.APPROVED);

      // Verify DB records in Neon PostgreSQL
      const dbDonation = await prisma.donation.findUnique({
        where: { id: createdDonationId },
        include: { review: true, statusHistory: true },
      });

      expect(dbDonation?.status).toBe(DonationStatus.APPROVED);
      expect(dbDonation?.review).toBeDefined();
      expect(dbDonation?.review?.decision).toBe(ReviewDecision.APPROVED);
      expect(dbDonation?.review?.reviewerId).toBe(adminId);

      // Check Audit Log
      const audit = await prisma.auditLog.findFirst({
        where: { entityId: createdDonationId, action: 'DONATION_APPROVED' },
      });
      expect(audit).toBeDefined();
      expect(audit?.userId).toBe(adminId);

      // Check Outbox Event
      const outbox = await prisma.outboxEvent.findFirst({
        where: { aggregateId: createdDonationId, eventType: 'DONATION_APPROVED' },
      });
      expect(outbox).toBeDefined();
    });

    it('should reject subsequent review attempts on already approved donation with 409 Conflict', async () => {
      const reApprove = await request(app)
        .post(`/api/v1/admin/donations/${createdDonationId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(reApprove.status).toBe(409);
      expect(reApprove.body.error.code).toBe('DONATION_ALREADY_REVIEWED');

      const reReject = await request(app)
        .post(`/api/v1/admin/donations/${createdDonationId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Try to reject approved' });

      expect(reReject.status).toBe(409);
      expect(reReject.body.error.code).toBe('DONATION_ALREADY_REVIEWED');
    });
  });

  describe('3. Rejection Flow & Reason Validation', () => {
    it('should create a donation and allow ADMIN to reject with valid reason', async () => {
      const now = new Date();
      const preparedAt = new Date(now.getTime() - 1000 * 60 * 10).toISOString();
      const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 12).toISOString();

      const createRes = await request(app)
        .post('/api/v1/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          category: 'BAKERY',
          description: 'Bread loaves',
          quantity: 10,
          quantityUnit: 'PACKETS',
          preparedAt,
          expiresAt,
          pickupAddress: '123 Bakery Lane',
          contactName: 'Donor User',
          contactPhone: '+919876543301',
        });

      expect(createRes.status).toBe(201);
      rejectedDonationId = createRes.body.data.id;

      // Reject with whitespace padding
      const rejectRes = await request(app)
        .post(`/api/v1/admin/donations/${rejectedDonationId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '  Food preparation date is inaccurate.  ' });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.data.donation.status).toBe(DonationStatus.REJECTED);
      expect(rejectRes.body.data.donation.rejectionReason).toBe('Food preparation date is inaccurate.');

      // Check Outbox Event
      const outbox = await prisma.outboxEvent.findFirst({
        where: { aggregateId: rejectedDonationId, eventType: 'DONATION_REJECTED' },
      });
      expect(outbox).toBeDefined();
    });
  });

  describe('4. Concurrency Protection Test (Simultaneous Approve vs. Reject)', () => {
    it('should process simultaneous approve and reject requests and ensure EXACTLY ONE succeeds (200) and the other fails (409)', async () => {
      const now = new Date();
      const preparedAt = new Date(now.getTime() - 1000 * 60 * 10).toISOString();
      const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 12).toISOString();

      const createRes = await request(app)
        .post('/api/v1/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          category: 'FRUITS',
          description: 'Fruit baskets for race condition test',
          quantity: 15,
          quantityUnit: 'BOXES',
          preparedAt,
          expiresAt,
          pickupAddress: 'Race Condition Spot',
          contactName: 'Donor User',
          contactPhone: '+919876543301',
        });

      expect(createRes.status).toBe(201);
      concurrentDonationId = createRes.body.data.id;

      // Trigger concurrent approve and reject
      const reqApprove = request(app)
        .post(`/api/v1/admin/donations/${concurrentDonationId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      const reqReject = request(app)
        .post(`/api/v1/admin/donations/${concurrentDonationId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Concurrent rejection test' });

      const [res1, res2] = await Promise.all([reqApprove, reqReject]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);

      // Verify DB state in Neon PostgreSQL: Exactly 1 DonationReview record
      const reviews = await prisma.donationReview.findMany({
        where: { donationId: concurrentDonationId },
      });
      expect(reviews.length).toBe(1);
    });
  });

  describe('5. Expired Donation Handling', () => {
    it('should exclude expired PENDING_REVIEW donations from normal review queue', async () => {
      // Insert an expired donation directly into database
      const expiredDonation = await prisma.donation.create({
        data: {
          donorId,
          category: 'COOKED_MEAL',
          description: 'Expired meal',
          quantity: 5,
          quantityUnit: 'PORTIONS',
          preparedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
          expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          pickupAddress: 'Expired Address',
          contactName: 'Donor',
          contactPhone: '+919876543301',
          status: DonationStatus.PENDING_REVIEW,
        },
      });
      expiredDonationId = expiredDonation.id;

      const queueRes = await request(app)
        .get('/api/v1/admin/donations/review')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(queueRes.status).toBe(200);
      const found = queueRes.body.data.items.find((item: any) => item.id === expiredDonationId);
      expect(found).toBeUndefined();
    });

    it('should return 409 Conflict when attempting to approve an expired donation', async () => {
      const approveRes = await request(app)
        .post(`/api/v1/admin/donations/${expiredDonationId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(approveRes.status).toBe(409);
      expect(approveRes.body.error.code).toBe('DONATION_EXPIRED');
    });
  });

  describe('6. Transaction Rollback Verification', () => {
    it('should roll back entire transaction if outbox event creation fails (donation status, review, history, audit, outbox)', async () => {
      const rollbackDonation = await prisma.donation.create({
        data: {
          donorId,
          category: 'PACKAGED_FOOD',
          description: 'Rollback test food',
          quantity: 12,
          quantityUnit: 'PACKETS',
          preparedAt: new Date(Date.now() - 1000 * 60 * 10),
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
          pickupAddress: 'Rollback Address',
          contactName: 'Donor',
          contactPhone: '+919876543301',
          status: DonationStatus.PENDING_REVIEW,
        },
      });

      // Execute transaction with a mock failure on outboxEvent.create
      const { ReviewRepository } = await import('../../src/modules/review/repositories/review.repository');
      const repo = new ReviewRepository(prisma);

      // Spy on tx.outboxEvent.create to throw an intentional error during transaction execution
      const original$transaction = prisma.$transaction.bind(prisma);
      jest.spyOn(prisma, '$transaction').mockImplementationOnce(async (callback: any) => {
        return original$transaction(async (tx: any) => {
          jest.spyOn(tx.outboxEvent, 'create').mockRejectedValueOnce(new Error('Simulated Outbox DB Failure'));
          return callback(tx);
        });
      });

      await expect(
        repo.executeReviewDecisionTransaction({
          donationId: rollbackDonation.id,
          reviewerId: adminId,
          decision: ReviewDecision.APPROVED,
        })
      ).rejects.toThrow('Simulated Outbox DB Failure');

      // Verify complete database rollback in Neon PostgreSQL
      const dbDonation = await prisma.donation.findUnique({
        where: { id: rollbackDonation.id },
      });
      expect(dbDonation?.status).toBe(DonationStatus.PENDING_REVIEW);

      const dbReview = await prisma.donationReview.findUnique({
        where: { donationId: rollbackDonation.id },
      });
      expect(dbReview).toBeNull();

      const dbHistory = await prisma.donationStatusHistory.findMany({
        where: { donationId: rollbackDonation.id, toStatus: DonationStatus.APPROVED },
      });
      expect(dbHistory.length).toBe(0);

      const dbAudit = await prisma.auditLog.findFirst({
        where: { entityId: rollbackDonation.id, action: 'DONATION_APPROVED' },
      });
      expect(dbAudit).toBeNull();

      const dbOutbox = await prisma.outboxEvent.findFirst({
        where: { aggregateId: rollbackDonation.id },
      });
      expect(dbOutbox).toBeNull();

      // Cleanup rollback test record
      await prisma.donation.delete({ where: { id: rollbackDonation.id } });
    });
  });
});
