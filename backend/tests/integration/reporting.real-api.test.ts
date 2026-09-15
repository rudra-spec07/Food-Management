import request from 'supertest';
import { PrismaClient, UserRole, DonationStatus, DonationCategory, DonationQuantityUnit, AuditEventType } from '@prisma/client';
import app from '../../src/app';

jest.setTimeout(60000);

const prisma = new PrismaClient();

describe('Module 07 — Reporting, Dashboard & Analytics Real API Tests', () => {
  let adminToken: string;
  let adminId: string;
  let workerAToken: string;
  let workerAId: string;
  let workerBId: string;
  let donorToken: string;
  let donorId: string;
  let testDonationId: string;

  beforeAll(async () => {
    const ts = Date.now();

    // 1. Create Admin User
    const adminEmail = `rpt_admin_${ts}@example.test`;
    const adminRes = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Admin',
      lastName: 'Reporter',
      email: adminEmail,
      password: 'Password123!',
    });
    adminId = adminRes.body.data.user.id;
    await prisma.user.update({
      where: { id: adminId },
      data: { role: UserRole.ADMIN },
    });
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: adminEmail,
      password: 'Password123!',
    });
    adminToken = adminLogin.body.data.accessToken;

    // 2. Create Worker A User
    const workerAEmail = `rpt_worker_a_${ts}@example.test`;
    const workerARes = await request(app).post('/api/v1/auth/register').send({
      firstName: 'WorkerA',
      lastName: 'Tester',
      email: workerAEmail,
      password: 'Password123!',
    });
    workerAId = workerARes.body.data.user.id;
    await prisma.user.update({
      where: { id: workerAId },
      data: { role: UserRole.WORKER },
    });
    const workerALogin = await request(app).post('/api/v1/auth/login').send({
      email: workerAEmail,
      password: 'Password123!',
    });
    workerAToken = workerALogin.body.data.accessToken;

    // 3. Create Worker B User
    const workerBEmail = `rpt_worker_b_${ts}@example.test`;
    const workerBRes = await request(app).post('/api/v1/auth/register').send({
      firstName: 'WorkerB',
      lastName: 'Tester',
      email: workerBEmail,
      password: 'Password123!',
    });
    workerBId = workerBRes.body.data.user.id;
    await prisma.user.update({
      where: { id: workerBId },
      data: { role: UserRole.WORKER },
    });
    // Worker B registered for IDOR testing

    // 4. Create Donor User
    const donorEmail = `rpt_donor_${ts}@example.test`;
    const donorRes = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Donor',
      lastName: 'Tester',
      email: donorEmail,
      password: 'Password123!',
    });
    donorId = donorRes.body.data.user.id;
    const donorLogin = await request(app).post('/api/v1/auth/login').send({
      email: donorEmail,
      password: 'Password123!',
    });
    donorToken = donorLogin.body.data.accessToken;

    // 5. Seed Test Data (Donations & Audit Logs)
    const testDonation = await prisma.donation.create({
      data: {
        donorId,
        category: DonationCategory.COOKED_MEAL,
        description: '=FormulaInjectionTest Meal',
        quantity: 50.0,
        quantityUnit: DonationQuantityUnit.PORTIONS,
        preparedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        pickupAddress: '+123 Formula St',
        contactName: 'Donor Contact',
        contactPhone: '555-0100',
        status: DonationStatus.PENDING_REVIEW,
      },
    });
    testDonationId = testDonation.id;

    // Create Audit Logs
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: AuditEventType.DONATION_CREATED,
        entityType: 'DONATION',
        entityId: testDonationId,
        metadata: { secretToken: 'should_be_stripped', sample: 'test_log' },
        ipAddress: '127.0.0.1',
      },
    });
  });

  afterAll(async () => {
    // Cleanup seed objects
    if (testDonationId) {
      await prisma.donation.deleteMany({ where: { id: testDonationId } });
    }
    await prisma.auditLog.deleteMany({
      where: { userId: { in: [adminId, workerAId, workerBId, donorId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminId, workerAId, workerBId, donorId] } },
    });
    await prisma.$disconnect();
  });

  describe('Security & RBAC Enforcement', () => {
    it('returns 401 Unauthorized for unauthenticated request to admin dashboard', async () => {
      const res = await request(app).get('/api/v1/admin/dashboard');
      expect(res.status).toBe(401);
    });

    it('returns 403 Forbidden when DONOR attempts to access admin dashboard', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${donorToken}`);
      expect(res.status).toBe(403);
    });

    it('returns 403 Forbidden when WORKER attempts to access admin dashboard', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${workerAToken}`);
      expect(res.status).toBe(403);
    });

    it('returns 403 Forbidden when DONOR attempts to access worker dashboard', async () => {
      const res = await request(app)
        .get('/api/v1/worker/dashboard')
        .set('Authorization', `Bearer ${donorToken}`);
      expect(res.status).toBe(403);
    });

    it('allows ADMIN to access admin dashboard', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('donations');
      expect(res.body.data).toHaveProperty('pickups');
      expect(res.body.data).toHaveProperty('workers');
      expect(res.body.data).toHaveProperty('inventory');
    });

    it('allows WORKER to access worker dashboard and enforces IDOR protection', async () => {
      // Worker A attempts to query Worker B statistics via query parameter ?workerId=WorkerB
      const res = await request(app)
        .get(`/api/v1/worker/dashboard?workerId=${workerBId}`)
        .set('Authorization', `Bearer ${workerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Response MUST be strictly scoped to Worker A's ID
      expect(res.body.data.workerId).toBe(workerAId);
      expect(res.body.data.workerId).not.toBe(workerBId);
    });
  });

  describe('Date Range & Validation Handling', () => {
    it('returns 400 for invalid date string format', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard?dateFrom=not-a-date')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('REPORT_INVALID_DATE');
    });

    it('returns 400 when dateFrom > dateTo', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard?dateFrom=2026-09-10&dateTo=2026-09-01')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('REPORT_INVALID_DATE_RANGE');
    });

    it('returns 400 when date range exceeds 366 days', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard?dateFrom=2024-01-01&dateTo=2026-01-01')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('REPORT_DATE_RANGE_TOO_LARGE');
    });

    it('correctly handles half-open date interval [dateFrom, dateTo)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/donations?dateFrom=2026-09-01&dateTo=2026-09-15')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('items');
      expect(res.body.data).toHaveProperty('summary');
    });
  });

  describe('Reporting APIs Implementation', () => {
    it('GET /api/v1/admin/reports/donations returns summary & status breakdown', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/donations')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.summary).toHaveProperty('totalQuantity');
      expect(res.body.data.summary).toHaveProperty('statusCounts');
    });

    it('GET /api/v1/admin/reports/donations/trend groups chronologically by DAY, WEEK, MONTH', async () => {
      const resDay = await request(app)
        .get('/api/v1/admin/reports/donations/trend?groupBy=DAY')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resDay.status).toBe(200);
      expect(resDay.body.data.groupBy).toBe('DAY');
      expect(Array.isArray(resDay.body.data.items)).toBe(true);

      const resMonth = await request(app)
        .get('/api/v1/admin/reports/donations/trend?groupBy=MONTH')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resMonth.status).toBe(200);
      expect(resMonth.body.data.groupBy).toBe('MONTH');
    });

    it('GET /api/v1/admin/reports/donations/status-distribution returns all enum values', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/donations/status-distribution')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.distribution).toHaveProperty(DonationStatus.PENDING_REVIEW);
      expect(res.body.data.distribution).toHaveProperty(DonationStatus.COMPLETED);
    });

    it('GET /api/v1/admin/reports/pickups returns operational metrics and avg duration', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/pickups')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('completed');
      expect(res.body.data).toHaveProperty('avgDurationMinutes');
    });

    it('GET /api/v1/admin/reports/workers returns worker performance list', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/workers')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('GET /api/v1/admin/reports/workers/:workerId returns individual worker detail', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/reports/workers/${workerAId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.workerId).toBe(workerAId);
      expect(res.body.data).toHaveProperty('assignedCount');
      expect(res.body.data).toHaveProperty('successRate');
    });

    it('GET /api/v1/admin/activity returns paginated activity feed', async () => {
      const res = await request(app)
        .get('/api/v1/admin/activity')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('GET /api/v1/admin/reports/donations/export generates CSV with formula injection sanitization', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/donations/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');

      const csvText = res.text;
      expect(csvText).toContain('"Donation ID","Donor Name","Donor Email","Category"');
      // Formula injection test: values starting with '=' or '+' must be prefixed with '\''
      expect(csvText).toContain("'=FormulaInjectionTest Meal");
      expect(csvText).toContain("'+123 Formula St");
    });
  });
});
