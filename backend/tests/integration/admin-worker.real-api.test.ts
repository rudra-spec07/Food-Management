import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/database';
import { UserRole, UserStatus, AuditEventType } from '@prisma/client';
import { PasswordService } from '../../src/modules/auth-user/services/password.service';

jest.setTimeout(30000);

describe('Admin Worker Provisioning — E2E Real Database Integration Tests', () => {
  let adminToken: string;
  let adminId: string;

  let inactiveAdminToken: string;
  let donorToken: string;
  let workerToken: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    const passwordHash = await PasswordService.hashPassword('Password123!');

    // 1. Active Admin
    const admin = await prisma.user.create({
      data: {
        firstName: 'ProvisionAdmin',
        lastName: 'Tester',
        email: `prov-admin-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    adminId = admin.id;

    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: admin.email,
      password: 'Password123!',
    });
    adminToken = adminLogin.body.data.accessToken;

    // 2. Inactive Admin
    const inactiveAdmin = await prisma.user.create({
      data: {
        firstName: 'InactiveAdmin',
        lastName: 'Tester',
        email: `inactive-admin-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.INACTIVE,
      },
    });

    const inactiveLogin = await request(app).post('/api/v1/auth/login').send({
      email: inactiveAdmin.email,
      password: 'Password123!',
    });
    inactiveAdminToken = inactiveLogin.body?.data?.accessToken || '';

    // 3. Donor
    const donor = await prisma.user.create({
      data: {
        firstName: 'ProvDonor',
        lastName: 'Tester',
        email: `prov-donor-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.DONOR,
        status: UserStatus.ACTIVE,
      },
    });

    const donorLogin = await request(app).post('/api/v1/auth/login').send({
      email: donor.email,
      password: 'Password123!',
    });
    donorToken = donorLogin.body.data.accessToken;

    // 4. Existing Worker
    const worker = await prisma.user.create({
      data: {
        firstName: 'ProvWorker',
        lastName: 'Tester',
        email: `prov-worker-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.WORKER,
        status: UserStatus.ACTIVE,
      },
    });

    const workerLogin = await request(app).post('/api/v1/auth/login').send({
      email: worker.email,
      password: 'Password123!',
    });
    workerToken = workerLogin.body.data.accessToken;
  });

  describe('Authorization Controls', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).post('/api/v1/admin/workers').send({
        firstName: 'Rahul',
        lastName: 'Kumar',
        email: 'unauth-wrk@example.test',
        password: 'TemporaryPassword123!',
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should forbid DONOR with 403', async () => {
      const res = await request(app)
        .post('/api/v1/admin/workers')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          firstName: 'Rahul',
          lastName: 'Kumar',
          email: 'donor-wrk@example.test',
          password: 'TemporaryPassword123!',
        });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should forbid WORKER with 403', async () => {
      const res = await request(app)
        .post('/api/v1/admin/workers')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          firstName: 'Rahul',
          lastName: 'Kumar',
          email: 'worker-wrk@example.test',
          password: 'TemporaryPassword123!',
        });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject inactive admin user according to auth guard', async () => {
      if (!inactiveAdminToken) {
        expect(true).toBe(true);
        return;
      }
      const res = await request(app)
        .post('/api/v1/admin/workers')
        .set('Authorization', `Bearer ${inactiveAdminToken}`)
        .send({
          firstName: 'Rahul',
          lastName: 'Kumar',
          email: 'inactive-admin-wrk@example.test',
          password: 'TemporaryPassword123!',
        });
      expect([401, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Strict DTO Mass Assignment Protection', () => {
    it('should reject request containing role = ADMIN', async () => {
      const res = await request(app)
        .post('/api/v1/admin/workers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Rahul',
          lastName: 'Kumar',
          email: 'inject-admin@example.test',
          password: 'TemporaryPassword123!',
          role: 'ADMIN',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject request containing role = WORKER', async () => {
      const res = await request(app)
        .post('/api/v1/admin/workers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Rahul',
          lastName: 'Kumar',
          email: 'inject-worker@example.test',
          password: 'TemporaryPassword123!',
          role: 'WORKER',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject request containing status = INACTIVE', async () => {
      const res = await request(app)
        .post('/api/v1/admin/workers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Rahul',
          lastName: 'Kumar',
          email: 'inject-status@example.test',
          password: 'TemporaryPassword123!',
          status: 'INACTIVE',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Successful Worker Provisioning & Security Guarantees', () => {
    let createdWorkerId: string;
    const workerEmail = `created-worker-${Date.now()}@example.test`;
    const plainPassword = 'TemporaryPassword123!';

    it('should successfully create worker account when requested by active admin', async () => {
      const res = await request(app)
        .post('/api/v1/admin/workers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Rahul',
          lastName: 'Kumar',
          email: workerEmail,
          password: plainPassword,
          phone: '9876543210',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      const workerData = res.body.data;
      createdWorkerId = workerData.id;

      expect(workerData.firstName).toBe('Rahul');
      expect(workerData.lastName).toBe('Kumar');
      expect(workerData.email).toBe(workerEmail.toLowerCase());
      expect(workerData.role).toBe(UserRole.WORKER);
      expect(workerData.status).toBe(UserStatus.ACTIVE);

      // Security check: password and passwordHash MUST NOT be returned in API response
      expect(workerData.password).toBeUndefined();
      expect(workerData.passwordHash).toBeUndefined();
    });

    it('should store password as a secure hash in the database', async () => {
      const dbUser = await prisma.user.findUnique({
        where: { id: createdWorkerId },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.passwordHash).toBeDefined();
      expect(dbUser?.passwordHash).not.toBe(plainPassword);

      const isValidPassword = await PasswordService.verifyPassword(
        plainPassword,
        dbUser!.passwordHash
      );
      expect(isValidPassword).toBe(true);
    });

    it('should create a WORKER_CREATED audit log event identifying the admin actor and worker target', async () => {
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: AuditEventType.WORKER_CREATED,
          userId: adminId,
          entityId: createdWorkerId,
        },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog?.entityType).toBe('user');

      // Verify audit log metadata does not leak plaintext password or hash
      const metadataStr = JSON.stringify(auditLog?.metadata || {});
      expect(metadataStr).not.toContain(plainPassword);
      expect(metadataStr).not.toContain('passwordHash');
    });

    it('should allow newly created worker to log in via POST /api/v1/auth/login', async () => {
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: workerEmail,
        password: plainPassword,
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data.accessToken).toBeDefined();
      expect(loginRes.body.data.user.role).toBe(UserRole.WORKER);
      expect(loginRes.body.data.user.email).toBe(workerEmail.toLowerCase());
    });
  });

  describe('Duplicate Email Handling & Database Concurrency', () => {
    it('should return 409 Conflict when attempting to create worker with existing email', async () => {
      const existingEmail = `dup-check-${Date.now()}@example.test`;

      // 1. Create first worker
      const res1 = await request(app)
        .post('/api/v1/admin/workers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Worker',
          lastName: 'One',
          email: existingEmail,
          password: 'Password123!',
        });
      expect(res1.status).toBe(201);

      // 2. Attempt duplicate worker creation
      const res2 = await request(app)
        .post('/api/v1/admin/workers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Worker',
          lastName: 'Two',
          email: existingEmail,
          password: 'Password123!',
        });
      expect(res2.status).toBe(409);
      expect(res2.body.success).toBe(false);
      expect(res2.body.error.code).toBe('AUTH_EMAIL_ALREADY_EXISTS');
    });

    it('should handle concurrent duplicate email creation safely (database unique constraint is final authority)', async () => {
      const concurrentEmail = `concurrent-email-${Date.now()}@example.test`;

      const req1 = request(app)
        .post('/api/v1/admin/workers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Concurrent1',
          lastName: 'Tester',
          email: concurrentEmail,
          password: 'Password123!',
        });

      const req2 = request(app)
        .post('/api/v1/admin/workers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Concurrent2',
          lastName: 'Tester',
          email: concurrentEmail,
          password: 'Password123!',
        });

      const [res1, res2] = await Promise.all([req1, req2]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 409]);

      const createdUsers = await prisma.user.findMany({
        where: { email: concurrentEmail.toLowerCase() },
      });
      expect(createdUsers.length).toBe(1);
    });
  });
});

// ============================================================
// GET /api/v1/admin/workers — Worker List E2E Tests
// ============================================================

describe('Admin Worker List — GET /api/v1/admin/workers', () => {
  let adminToken: string;
  let donorToken: string;
  let workerToken: string;
  let inactiveAdminToken: string;

  // Workers created specifically for list verification
  let activeWorkerId: string;
  let inactiveWorkerId: string;
  let donorId: string;

  beforeAll(async () => {
    const ts = Date.now();
    const hash = await PasswordService.hashPassword('Password123!');

    // Active admin
    const admin = await prisma.user.create({
      data: {
        firstName: 'ListAdmin',
        lastName: 'Tester',
        email: `list-admin-${ts}@example.test`,
        passwordHash: hash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: admin.email,
      password: 'Password123!',
    });
    adminToken = adminLogin.body.data.accessToken;

    // Inactive admin (should be blocked by auth)
    const inactiveAdmin = await prisma.user.create({
      data: {
        firstName: 'InactiveListAdmin',
        lastName: 'Tester',
        email: `inactive-list-admin-${ts}@example.test`,
        passwordHash: hash,
        role: UserRole.ADMIN,
        status: UserStatus.INACTIVE,
      },
    });
    const inactiveLogin = await request(app).post('/api/v1/auth/login').send({
      email: inactiveAdmin.email,
      password: 'Password123!',
    });
    inactiveAdminToken = inactiveLogin.body?.data?.accessToken || '';

    // Donor
    const donor = await prisma.user.create({
      data: {
        firstName: 'ListDonor',
        lastName: 'Tester',
        email: `list-donor-${ts}@example.test`,
        passwordHash: hash,
        role: UserRole.DONOR,
        status: UserStatus.ACTIVE,
      },
    });
    donorId = donor.id;
    const donorLogin = await request(app).post('/api/v1/auth/login').send({
      email: donor.email,
      password: 'Password123!',
    });
    donorToken = donorLogin.body.data.accessToken;

    // Active worker
    const activeWorker = await prisma.user.create({
      data: {
        firstName: 'ActiveList',
        lastName: 'Worker',
        email: `active-list-worker-${ts}@example.test`,
        passwordHash: hash,
        role: UserRole.WORKER,
        status: UserStatus.ACTIVE,
      },
    });
    activeWorkerId = activeWorker.id;

    const workerLogin = await request(app).post('/api/v1/auth/login').send({
      email: activeWorker.email,
      password: 'Password123!',
    });
    workerToken = workerLogin.body.data.accessToken;

    // Inactive worker
    const inactiveWorker = await prisma.user.create({
      data: {
        firstName: 'InactiveList',
        lastName: 'Worker',
        email: `inactive-list-worker-${ts}@example.test`,
        passwordHash: hash,
        role: UserRole.WORKER,
        status: UserStatus.INACTIVE,
      },
    });
    inactiveWorkerId = inactiveWorker.id;
  });

  describe('Authorization Controls', () => {
    it('401 — unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/admin/workers');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('403 — DONOR cannot access worker list', async () => {
      const res = await request(app)
        .get('/api/v1/admin/workers')
        .set('Authorization', `Bearer ${donorToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('403 — WORKER cannot access worker list', async () => {
      const res = await request(app)
        .get('/api/v1/admin/workers')
        .set('Authorization', `Bearer ${workerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('blocks inactive admin according to existing auth behavior', async () => {
      if (!inactiveAdminToken) {
        expect(true).toBe(true);
        return;
      }
      const res = await request(app)
        .get('/api/v1/admin/workers')
        .set('Authorization', `Bearer ${inactiveAdminToken}`);
      expect([401, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Successful Response & Data Shape', () => {
    it('200 — active ADMIN receives paginated worker list', async () => {
      const res = await request(app)
        .get('/api/v1/admin/workers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);
      expect(typeof res.body.data.pagination.total).toBe('number');
      expect(typeof res.body.data.pagination.totalPages).toBe('number');
    });

    it('returns only WORKER role users — DONOR users are excluded', async () => {
      const res = await request(app)
        .get('/api/v1/admin/workers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const items = res.body.data.items as any[];
      // Every returned item must be a WORKER
      items.forEach((item) => {
        expect(item.role).toBe(UserRole.WORKER);
      });
      // The donor we created must NOT appear
      const donorInList = items.find((item) => item.id === donorId);
      expect(donorInList).toBeUndefined();
    });

    it('includes the active worker we created', async () => {
      const res = await request(app)
        .get('/api/v1/admin/workers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const items = res.body.data.items as any[];
      const found = items.find((item) => item.id === activeWorkerId);
      expect(found).toBeDefined();
      expect(found.firstName).toBe('ActiveList');
      expect(found.role).toBe(UserRole.WORKER);
    });

    it('NEVER returns passwordHash in the response', async () => {
      const res = await request(app)
        .get('/api/v1/admin/workers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const responseBody = JSON.stringify(res.body);
      expect(responseBody).not.toContain('passwordHash');
      expect(responseBody).not.toContain('password');
    });

    it('each worker record has expected safe fields', async () => {
      const res = await request(app)
        .get('/api/v1/admin/workers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const items = res.body.data.items as any[];
      if (items.length > 0) {
        const worker = items[0];
        expect(worker).toHaveProperty('id');
        expect(worker).toHaveProperty('firstName');
        expect(worker).toHaveProperty('lastName');
        expect(worker).toHaveProperty('email');
        expect(worker).toHaveProperty('role');
        expect(worker).toHaveProperty('status');
        expect(worker).toHaveProperty('createdAt');
        expect(worker.passwordHash).toBeUndefined();
      }
    });
  });

  describe('Pagination', () => {
    it('respects limit=1 — returns exactly 1 item', async () => {
      const res = await request(app)
        .get('/api/v1/admin/workers?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.pagination.limit).toBe(1);
    });

    it('page=1 and page=2 with limit=1 return different workers', async () => {
      const page1 = await request(app)
        .get('/api/v1/admin/workers?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);
      const page2 = await request(app)
        .get('/api/v1/admin/workers?page=2&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);

      if (page1.body.data.pagination.total >= 2) {
        expect(page1.body.data.items[0].id).not.toBe(page2.body.data.items[0]?.id);
      }
    });

    it('totalPages is correctly computed', async () => {
      const res = await request(app)
        .get('/api/v1/admin/workers?limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const { total, totalPages, limit } = res.body.data.pagination;
      expect(totalPages).toBe(Math.ceil(total / limit));
    });
  });

  describe('Status Filter', () => {
    it('status=ACTIVE returns only ACTIVE workers', async () => {
      const res = await request(app)
        .get('/api/v1/admin/workers?status=ACTIVE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const items = res.body.data.items as any[];
      items.forEach((item) => {
        expect(item.status).toBe(UserStatus.ACTIVE);
      });
      // Inactive worker should NOT appear
      const inactive = items.find((item) => item.id === inactiveWorkerId);
      expect(inactive).toBeUndefined();
    });

    it('status=INACTIVE returns only INACTIVE workers', async () => {
      const res = await request(app)
        .get('/api/v1/admin/workers?status=INACTIVE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const items = res.body.data.items as any[];
      items.forEach((item) => {
        expect(item.status).toBe(UserStatus.INACTIVE);
      });
      // Active worker should NOT appear
      const active = items.find((item) => item.id === activeWorkerId);
      expect(active).toBeUndefined();
    });

    it('no status filter returns both ACTIVE and INACTIVE workers', async () => {
      const res = await request(app)
        .get('/api/v1/admin/workers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const items = res.body.data.items as any[];
      const hasActive = items.some((item) => item.status === UserStatus.ACTIVE);
      const hasInactive = items.some((item) => item.status === UserStatus.INACTIVE);
      expect(hasActive).toBe(true);
      expect(hasInactive).toBe(true);
    });
  });

  describe('Query Validation', () => {
    it('rejects page=0 with 400', async () => {
      const res = await request(app)
        .get('/api/v1/admin/workers?page=0')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('rejects limit=0 with 400', async () => {
      const res = await request(app)
        .get('/api/v1/admin/workers?limit=0')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('rejects limit=101 with 400 (exceeds maximum)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/workers?limit=101')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('rejects invalid status value with 400', async () => {
      const res = await request(app)
        .get('/api/v1/admin/workers?status=DONOR')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });
  });

  describe('Security — Role Injection', () => {
    it('ignores role=DONOR query param — still returns only WORKER users', async () => {
      const res = await request(app)
        .get('/api/v1/admin/workers?role=DONOR')
        .set('Authorization', `Bearer ${adminToken}`);

      // Should succeed (unknown query params are ignored by the strict DTO)
      // OR fail with 400 if strict schema is set. Either is acceptable.
      if (res.status === 200) {
        const items = res.body.data.items as any[];
        items.forEach((item) => {
          expect(item.role).toBe(UserRole.WORKER);
        });
        const donorInList = items.find((item) => item.id === donorId);
        expect(donorInList).toBeUndefined();
      } else {
        // If strict DTO rejects unknown params, 400 is also acceptable
        expect([400, 200]).toContain(res.status);
      }
    });
  });
});
