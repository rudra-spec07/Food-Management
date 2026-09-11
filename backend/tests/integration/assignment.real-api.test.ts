import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/database';
import { UserRole, UserStatus, DonationStatus, AssignmentStatus, AuditEventType } from '@prisma/client';
import { PasswordService } from '../../src/modules/auth-user/services/password.service';

jest.setTimeout(30000);

describe('Module 04 — Real Database Integration, Security & Concurrency Tests', () => {
  let adminToken: string;
  let adminId: string;

  let worker1Token: string;
  let worker1Id: string;

  let worker2Token: string;
  let worker2Id: string;

  let donorToken: string;
  let donorId: string;

  let testDonation1Id: string;
  let testDonation2Id: string;
  let testExpiredDonationId: string;

  beforeAll(async () => {
    // Setup test users in Neon DB
    const timestamp = Date.now();
    const passwordHash = await PasswordService.hashPassword('Password123!');

    const admin = await prisma.user.create({
      data: {
        firstName: 'Mod4Admin',
        lastName: 'Tester',
        email: `mod4-admin-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    adminId = admin.id;

    const worker1 = await prisma.user.create({
      data: {
        firstName: 'Mod4Worker1',
        lastName: 'Tester',
        email: `mod4-worker1-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.WORKER,
        status: UserStatus.ACTIVE,
      },
    });
    worker1Id = worker1.id;

    const worker2 = await prisma.user.create({
      data: {
        firstName: 'Mod4Worker2',
        lastName: 'Tester',
        email: `mod4-worker2-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.WORKER,
        status: UserStatus.ACTIVE,
      },
    });
    worker2Id = worker2.id;

    const donor = await prisma.user.create({
      data: {
        firstName: 'Mod4Donor',
        lastName: 'Tester',
        email: `mod4-donor-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.DONOR,
        status: UserStatus.ACTIVE,
      },
    });
    donorId = donor.id;

    // Login users to get JWT tokens
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: admin.email,
      password: 'Password123!',
    });
    adminToken = adminLogin.body.data.accessToken;

    const worker1Login = await request(app).post('/api/v1/auth/login').send({
      email: worker1.email,
      password: 'Password123!',
    });
    worker1Token = worker1Login.body.data.accessToken;

    const worker2Login = await request(app).post('/api/v1/auth/login').send({
      email: worker2.email,
      password: 'Password123!',
    });
    worker2Token = worker2Login.body.data.accessToken;

    const donorLogin = await request(app).post('/api/v1/auth/login').send({
      email: donor.email,
      password: 'Password123!',
    });
    donorToken = donorLogin.body.data.accessToken;

    // Setup Test Donations in APPROVED status
    const now = new Date();
    const futureExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const pastExpiry = new Date(now.getTime() - 60 * 1000);

    const donation1 = await prisma.donation.create({
      data: {
        donorId,
        category: 'COOKED_MEAL',
        description: 'Test Meal for Assignment 1',
        quantity: 20,
        quantityUnit: 'PORTIONS',
        preparedAt: new Date(),
        expiresAt: futureExpiry,
        pickupAddress: '123 Test St',
        contactName: 'Donor Test',
        contactPhone: '1234567890',
        status: DonationStatus.APPROVED,
      },
    });
    testDonation1Id = donation1.id;

    const donation2 = await prisma.donation.create({
      data: {
        donorId,
        category: 'PACKAGED_FOOD',
        description: 'Test Meal for Assignment 2',
        quantity: 10,
        quantityUnit: 'BOXES',
        preparedAt: new Date(),
        expiresAt: futureExpiry,
        pickupAddress: '456 Test St',
        contactName: 'Donor Test',
        contactPhone: '1234567890',
        status: DonationStatus.APPROVED,
      },
    });
    testDonation2Id = donation2.id;

    const expiredDonation = await prisma.donation.create({
      data: {
        donorId,
        category: 'FRUITS',
        description: 'Expired Apples',
        quantity: 5,
        quantityUnit: 'KG',
        preparedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        expiresAt: pastExpiry,
        pickupAddress: '789 Test St',
        contactName: 'Donor Test',
        contactPhone: '1234567890',
        status: DonationStatus.APPROVED,
      },
    });
    testExpiredDonationId = expiredDonation.id;
  });

  afterAll(async () => {
    // Cleanup synthetic test records
    try {
      await prisma.outboxEvent.deleteMany({
        where: { aggregateId: { in: [testDonation1Id, testDonation2Id, testExpiredDonationId] } },
      });
      await prisma.auditLog.deleteMany({
        where: { userId: { in: [adminId, worker1Id, worker2Id, donorId] } },
      });
      await prisma.donationStatusHistory.deleteMany({
        where: { donationId: { in: [testDonation1Id, testDonation2Id, testExpiredDonationId] } },
      });
      await prisma.assignment.deleteMany({
        where: { donationId: { in: [testDonation1Id, testDonation2Id, testExpiredDonationId] } },
      });
      await prisma.donation.deleteMany({
        where: { id: { in: [testDonation1Id, testDonation2Id, testExpiredDonationId] } },
      });
      await prisma.authSession.deleteMany({
        where: { userId: { in: [adminId, worker1Id, worker2Id, donorId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [adminId, worker1Id, worker2Id, donorId] } },
      });
    } catch (e) {
      console.error('Cleanup error:', e);
    }
    await prisma.$disconnect();
  });

  describe('1. Admin Assignment Queue & Eligibility', () => {
    it('should return 403 Forbidden when DONOR attempts to access assignment queue', async () => {
      const res = await request(app)
        .get('/api/v1/admin/donations/assignment-queue')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 Forbidden when DONOR attempts to access worker assignments list', async () => {
      const res = await request(app)
        .get('/api/v1/worker/assignments')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return approved unassigned non-expired donations in queue', async () => {
      const res = await request(app)
        .get('/api/v1/admin/donations/assignment-queue')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();

      const itemIds = res.body.data.items.map((i: any) => i.id);
      expect(itemIds).toContain(testDonation1Id);
      expect(itemIds).toContain(testDonation2Id);
      expect(itemIds).not.toContain(testExpiredDonationId);
    });

    it('should reject assigning an expired donation with 409 Conflict', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/donations/${testExpiredDonationId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ workerId: worker1Id });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DONATION_EXPIRED');
    });

    it('should reject strict DTO validation when unexpected body keys are supplied', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/donations/${testDonation1Id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workerId: worker1Id,
          assignedBy: donorId,
          status: 'ACCEPTED',
          role: 'ADMIN',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('2. Admin Assign Worker & In-Transaction Verification', () => {
    it('should assign active worker to approved donation successfully', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/donations/${testDonation1Id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ workerId: worker1Id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignment.status).toBe(AssignmentStatus.PENDING);
      expect(res.body.data.assignment.workerId).toBe(worker1Id);
      expect(res.body.data.assignment.assignedBy).toBe(adminId);
      expect(res.body.data.updatedDonation.status).toBe(DonationStatus.ASSIGNED);

      // Verify side effects in Neon DB
      const dbDonation = await prisma.donation.findUnique({ where: { id: testDonation1Id } });
      expect(dbDonation?.status).toBe(DonationStatus.ASSIGNED);

      const dbAudit = await prisma.auditLog.findFirst({
        where: { entityId: res.body.data.assignment.id, action: AuditEventType.DONATION_ASSIGNED },
      });
      expect(dbAudit).not.toBeNull();

      const dbOutbox = await prisma.outboxEvent.findFirst({
        where: { aggregateId: testDonation1Id, eventType: 'DONATION_ASSIGNED' },
      });
      expect(dbOutbox).not.toBeNull();
    });

    it('should reject assigning a donation that already has an active assignment', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/donations/${testDonation1Id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ workerId: worker2Id });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DONATION_NOT_ELIGIBLE_FOR_ASSIGNMENT');
    });
  });

  describe('3. Worker Assignment List & IDOR Protection', () => {
    let assignment1Id: string;

    beforeAll(async () => {
      const assignment = await prisma.assignment.findFirst({
        where: { donationId: testDonation1Id, workerId: worker1Id },
      });
      assignment1Id = assignment!.id;
    });

    it('should allow Worker 1 to list their own assignment', async () => {
      const res = await request(app)
        .get('/api/v1/worker/assignments')
        .set('Authorization', `Bearer ${worker1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should allow Worker 1 to view detail of their own assignment', async () => {
      const res = await request(app)
        .get(`/api/v1/worker/assignments/${assignment1Id}`)
        .set('Authorization', `Bearer ${worker1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(assignment1Id);
    });

    it('should prevent Worker 2 from viewing Worker 1 assignment with non-enumerating 404', async () => {
      const res = await request(app)
        .get(`/api/v1/worker/assignments/${assignment1Id}`)
        .set('Authorization', `Bearer ${worker2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should prevent Worker 2 from accepting Worker 1 assignment', async () => {
      const res = await request(app)
        .post(`/api/v1/worker/assignments/${assignment1Id}/accept`)
        .set('Authorization', `Bearer ${worker2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should prevent Worker 2 from rejecting Worker 1 assignment', async () => {
      const res = await request(app)
        .post(`/api/v1/worker/assignments/${assignment1Id}/reject`)
        .set('Authorization', `Bearer ${worker2Token}`)
        .send({ reason: 'Malicious attempt' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Worker Rejection & Reassignment Workflow', () => {
    let assignment1Id: string;

    beforeAll(async () => {
      const assignment = await prisma.assignment.findFirst({
        where: { donationId: testDonation1Id, workerId: worker1Id, status: AssignmentStatus.PENDING },
      });
      assignment1Id = assignment!.id;
    });

    it('should allow Worker 1 to reject assignment and return donation to APPROVED status', async () => {
      const res = await request(app)
        .post(`/api/v1/worker/assignments/${assignment1Id}/reject`)
        .set('Authorization', `Bearer ${worker1Token}`)
        .send({ reason: 'Vehicle issue during scheduled pickup' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.updatedAssignment.status).toBe(AssignmentStatus.REJECTED);
      expect(res.body.data.updatedDonation.status).toBe(DonationStatus.APPROVED);

      // Verify old assignment remains REJECTED in Neon DB (never overwritten)
      const oldAssignment = await prisma.assignment.findUnique({ where: { id: assignment1Id } });
      expect(oldAssignment?.status).toBe(AssignmentStatus.REJECTED);
      expect(oldAssignment?.rejectionReason).toBe('Vehicle issue during scheduled pickup');

      // Verify donation is back to APPROVED
      const dbDonation = await prisma.donation.findUnique({ where: { id: testDonation1Id } });
      expect(dbDonation?.status).toBe(DonationStatus.APPROVED);
    });

    it('should allow Admin to reassign the newly APPROVED donation to Worker 2 (creating a NEW assignment row)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/donations/${testDonation1Id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ workerId: worker2Id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignment.id).not.toBe(assignment1Id);
      expect(res.body.data.assignment.workerId).toBe(worker2Id);

      // Verify Assignment History for donation contains BOTH rows
      const historyRes = await request(app)
        .get(`/api/v1/admin/donations/${testDonation1Id}/assignments`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.data.length).toBe(2);
      expect(historyRes.body.data[0].status).toBe(AssignmentStatus.PENDING);
      expect(historyRes.body.data[1].status).toBe(AssignmentStatus.REJECTED);
    });

    it('should allow Worker 2 to accept their pending assignment', async () => {
      const activeAssignment = await prisma.assignment.findFirst({
        where: { donationId: testDonation1Id, workerId: worker2Id, status: AssignmentStatus.PENDING },
      });

      const res = await request(app)
        .post(`/api/v1/worker/assignments/${activeAssignment!.id}/accept`)
        .set('Authorization', `Bearer ${worker2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.updatedAssignment.status).toBe(AssignmentStatus.ACCEPTED);
      expect(res.body.data.updatedDonation.status).toBe(DonationStatus.ACCEPTED);
    });
  });

  describe('5. Concurrency & Concurrent Accept/Reject Tests', () => {
    it('should serialize concurrent accept and reject by same worker, succeeding exactly once', async () => {
      // Create a fresh approved donation for concurrency test
      const now = new Date();
      const futureExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const donation = await prisma.donation.create({
        data: {
          donorId,
          category: 'COOKED_MEAL',
          description: 'Concurrency Test Meal',
          quantity: 15,
          quantityUnit: 'PORTIONS',
          preparedAt: now,
          expiresAt: futureExpiry,
          pickupAddress: '999 Race St',
          contactName: 'Donor Test',
          contactPhone: '1234567890',
          status: DonationStatus.APPROVED,
        },
      });

      // Admin assigns worker 1
      const assignRes = await request(app)
        .post(`/api/v1/admin/donations/${donation.id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ workerId: worker1Id });

      const assignmentId = assignRes.body.data.assignment.id;

      // Submit simultaneous accept and reject
      const [acceptRes, rejectRes] = await Promise.all([
        request(app)
          .post(`/api/v1/worker/assignments/${assignmentId}/accept`)
          .set('Authorization', `Bearer ${worker1Token}`),
        request(app)
          .post(`/api/v1/worker/assignments/${assignmentId}/reject`)
          .set('Authorization', `Bearer ${worker1Token}`)
          .send({ reason: 'Concurrent rejection attempt' }),
      ]);

      const statuses = [acceptRes.status, rejectRes.status];
      expect(statuses).toContain(200);
      expect(statuses.some((s) => s === 409 || s === 400)).toBe(true);

      // Verify final DB state is valid and consistent
      const dbAssignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
      const dbDonation = await prisma.donation.findUnique({ where: { id: donation.id } });

      if (dbAssignment?.status === AssignmentStatus.ACCEPTED) {
        expect(dbDonation?.status).toBe(DonationStatus.ACCEPTED);
      } else {
        expect(dbAssignment?.status).toBe(AssignmentStatus.REJECTED);
        expect(dbDonation?.status).toBe(DonationStatus.APPROVED);
      }

      // Cleanup
      await prisma.outboxEvent.deleteMany({ where: { aggregateId: donation.id } });
      await prisma.auditLog.deleteMany({ where: { entityId: assignmentId } });
      await prisma.donationStatusHistory.deleteMany({ where: { donationId: donation.id } });
      await prisma.assignment.deleteMany({ where: { donationId: donation.id } });
      await prisma.donation.delete({ where: { id: donation.id } });
    });
  });

  describe('6. PostgreSQL Partial Unique Index Verification', () => {
    it('should verify unique_active_assignment_per_donation index exists on Neon DB', async () => {
      const indexCheck: any[] = await prisma.$queryRawUnsafe(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'assignments' AND indexname = 'unique_active_assignment_per_donation';
      `);

      expect(indexCheck).toBeDefined();
      expect(indexCheck.length).toBe(1);
      expect(indexCheck[0].indexname).toBe('unique_active_assignment_per_donation');
    });
  });

  describe('7. Admin Assigned Tasks Tracking — GET /api/v1/admin/assignments', () => {
    it('should forbid DONOR from accessing admin assignments list with 403', async () => {
      const res = await request(app)
        .get('/api/v1/admin/assignments')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should forbid WORKER from accessing admin assignments list with 403', async () => {
      const res = await request(app)
        .get('/api/v1/admin/assignments')
        .set('Authorization', `Bearer ${worker1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow ADMIN to list assignments with safe worker and donation fields', async () => {
      const res = await request(app)
        .get('/api/v1/admin/assignments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);

      // Verify no sensitive credentials exposed
      res.body.data.items.forEach((item: any) => {
        expect(item.worker).toBeDefined();
        expect(item.worker.passwordHash).toBeUndefined();
        expect(item.worker.password).toBeUndefined();
        if (item.assigner) {
          expect(item.assigner.passwordHash).toBeUndefined();
        }
        if (item.donation?.donor) {
          expect(item.donation.donor.passwordHash).toBeUndefined();
        }
      });
    });

    it('should filter admin assignments by status query parameter', async () => {
      const res = await request(app)
        .get('/api/v1/admin/assignments?status=ACCEPTED')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.items.forEach((item: any) => {
        expect(item.status).toBe(AssignmentStatus.ACCEPTED);
      });
    });
  });
});
