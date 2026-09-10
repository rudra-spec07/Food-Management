import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/database';
import { UserRole, UserStatus, AuditEventType } from '@prisma/client';

describe('Real Neon Database Integration & Deep Security Tests', () => {
  const qaDonor1 = {
    firstName: 'QADonorOne',
    lastName: 'Tester',
    email: 'qa-donor-1-' + Date.now() + '@example.test',
    phone: '1234567890',
    password: 'StrongPassword123!',
  };

  const qaDonor2 = {
    firstName: 'QADonorTwo',
    lastName: 'Tester',
    email: 'qa-donor-2-' + Date.now() + '@example.test',
    phone: '0987654321',
    password: 'StrongPassword123!',
  };

  let tokenDonor1SessionA: string;
  let tokenDonor1SessionB: string;
  let user1Id: string;
  let user2Id: string;

  afterAll(async () => {
    // Clean up synthetic QA records created in Neon DB
    try {
      await prisma.auditLog.deleteMany({
        where: { user: { email: { contains: 'qa-donor-' } } },
      });
      await prisma.authSession.deleteMany({
        where: { user: { email: { contains: 'qa-donor-' } } },
      });
      await prisma.user.deleteMany({
        where: { email: { contains: 'qa-donor-' } },
      });
    } catch (err) {
      console.error('Error cleaning up QA records:', err);
    }
    await prisma.$disconnect();
  });

  describe('1. Real Registration & Role/Mass-Assignment Security', () => {
    it('should register synthetic QA donor and persist correctly in Neon DB', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(qaDonor1);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(qaDonor1.email.toLowerCase());
      expect(res.body.data.user.role).toBe(UserRole.DONOR);
      expect(res.body.data.user.status).toBe(UserStatus.ACTIVE);
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.accessToken).toBeDefined();

      user1Id = res.body.data.user.id;

      // Verify directly in Neon PostgreSQL Database
      const userInDb = await prisma.user.findUnique({ where: { id: user1Id } });
      expect(userInDb).not.toBeNull();
      expect(userInDb?.role).toBe(UserRole.DONOR);
      expect(userInDb?.status).toBe(UserStatus.ACTIVE);
      expect(userInDb?.passwordHash).toBeDefined();
      expect(userInDb?.passwordHash).not.toEqual(qaDonor1.password);

      // Verify audit log in Neon DB
      const auditInDb = await prisma.auditLog.findFirst({
        where: { userId: user1Id, action: AuditEventType.USER_REGISTERED },
      });
      expect(auditInDb).not.toBeNull();
    });

    it('should block role and status tampering during public registration', async () => {
      const attackerPayload = {
        firstName: 'Attacker',
        lastName: 'User',
        email: 'qa-donor-tamper-' + Date.now() + '@example.test',
        password: 'StrongPassword123!',
        role: 'ADMIN',
        status: 'INACTIVE',
      };

      const res = await request(app).post('/api/v1/auth/register').send(attackerPayload);

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe(UserRole.DONOR);
      expect(res.body.data.user.status).toBe(UserStatus.ACTIVE);

      const dbUser = await prisma.user.findUnique({ where: { id: res.body.data.user.id } });
      expect(dbUser?.role).toBe(UserRole.DONOR);
      expect(dbUser?.status).toBe(UserStatus.ACTIVE);
    });

    it('should return 409 Conflict when attempting to register duplicate email', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(qaDonor1);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_EMAIL_ALREADY_EXISTS');
      expect(res.body.error.requestId).toBeDefined();
    });
  });

  describe('2. Real Login & Generic Error Security', () => {
    it('should successfully log in QA donor and persist auth session in Neon DB', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: qaDonor1.email,
        password: qaDonor1.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();

      tokenDonor1SessionA = res.body.data.accessToken;

      // Check session record in Neon DB
      const sessionCount = await prisma.authSession.count({ where: { userId: user1Id } });
      expect(sessionCount).toBeGreaterThan(0);

      // Check audit log
      const auditInDb = await prisma.auditLog.findFirst({
        where: { userId: user1Id, action: AuditEventType.USER_LOGIN_SUCCESS },
      });
      expect(auditInDb).not.toBeNull();
    });

    it('should return generic 401 error for wrong password (prevent account enumeration)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: qaDonor1.email,
        password: 'WrongPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should return generic 401 error for non-existent email', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent-qa-' + Date.now() + '@example.test',
        password: 'StrongPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    });
  });

  describe('3. Real /users/me, Profile Update & IDOR Protection', () => {
    it('should register second user (QA Donor 2) for IDOR checks', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(qaDonor2);
      expect(res.status).toBe(201);
      user2Id = res.body.data.user.id;
    });

    it('should return current user profile derived from authenticated JWT', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${tokenDonor1SessionA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(user1Id);
      expect(res.body.data.email).toBe(qaDonor1.email.toLowerCase());
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('should prevent IDOR/BOLA when user attempts to request User 2 identity via query/body', async () => {
      const res = await request(app)
        .get(`/api/v1/users/me?userId=${user2Id}`)
        .set('Authorization', `Bearer ${tokenDonor1SessionA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(user1Id);
      expect(res.body.data.id).not.toBe(user2Id);
    });

    it('should allow valid profile updates (firstName, lastName, phone)', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${tokenDonor1SessionA}`)
        .send({ firstName: 'UpdatedFirstName', lastName: 'UpdatedLastName', phone: '9998887770' });

      expect(res.status).toBe(200);
      expect(res.body.data.firstName).toBe('UpdatedFirstName');
      expect(res.body.data.lastName).toBe('UpdatedLastName');
      expect(res.body.data.phone).toBe('9998887770');

      const dbUser = await prisma.user.findUnique({ where: { id: user1Id } });
      expect(dbUser?.firstName).toBe('UpdatedFirstName');
    });

    it('should strip/block mass assignment attempts (role, status, id, email)', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${tokenDonor1SessionA}`)
        .send({
          firstName: 'SafeName',
          role: 'ADMIN',
          status: 'INACTIVE',
          id: user2Id,
          email: 'hacked@example.test',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe(UserRole.DONOR);
      expect(res.body.data.status).toBe(UserStatus.ACTIVE);
      expect(res.body.data.id).toBe(user1Id);
      expect(res.body.data.email).toBe(qaDonor1.email.toLowerCase());

      const dbUser = await prisma.user.findUnique({ where: { id: user1Id } });
      expect(dbUser?.role).toBe(UserRole.DONOR);
      expect(dbUser?.status).toBe(UserStatus.ACTIVE);
      expect(dbUser?.id).toBe(user1Id);
    });
  });

  describe('4. Real Logout & Session Revocation', () => {
    it('should logout user and revoke current session in Neon DB', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${tokenDonor1SessionA}`);

      expect(res.status).toBe(200);

      // Verify revoked JWT returns 401 AUTH_SESSION_REVOKED
      const checkRes = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${tokenDonor1SessionA}`);

      expect(checkRes.status).toBe(401);
      expect(checkRes.body.error.code).toBe('AUTH_SESSION_REVOKED');
    });
  });

  describe('5. Multi-Session Password Change & Revocation of All Sessions', () => {
    it('should create two active sessions (Session A and Session B) for QA Donor 1', async () => {
      const loginA = await request(app).post('/api/v1/auth/login').send({
        email: qaDonor1.email,
        password: qaDonor1.password,
      });
      tokenDonor1SessionA = loginA.body.data.accessToken;

      const loginB = await request(app).post('/api/v1/auth/login').send({
        email: qaDonor1.email,
        password: qaDonor1.password,
      });
      tokenDonor1SessionB = loginB.body.data.accessToken;

      expect(tokenDonor1SessionA).toBeDefined();
      expect(tokenDonor1SessionB).toBeDefined();
      expect(tokenDonor1SessionA).not.toEqual(tokenDonor1SessionB);

      // Verify both sessions work
      const resA = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${tokenDonor1SessionA}`);
      const resB = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${tokenDonor1SessionB}`);
      expect(resA.status).toBe(200);
      expect(resB.status).toBe(200);
    });

    it('should change password using Session A and revoke ALL active sessions in Neon DB', async () => {
      const newPassword = 'NewStrongPassword123!';

      const res = await request(app)
        .post('/api/v1/users/me/change-password')
        .set('Authorization', `Bearer ${tokenDonor1SessionA}`)
        .send({
          currentPassword: qaDonor1.password,
          newPassword,
        });

      expect(res.status).toBe(200);

      // Verify BOTH Session A and Session B are now revoked (return 401)
      const resAAfter = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${tokenDonor1SessionA}`);
      const resBAfter = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${tokenDonor1SessionB}`);
      expect(resAAfter.status).toBe(401);
      expect(resAAfter.body.error.code).toBe('AUTH_SESSION_REVOKED');
      expect(resBAfter.status).toBe(401);
      expect(resBAfter.body.error.code).toBe('AUTH_SESSION_REVOKED');

      // Verify old password no longer works for login
      const oldLogin = await request(app).post('/api/v1/auth/login').send({
        email: qaDonor1.email,
        password: qaDonor1.password,
      });
      expect(oldLogin.status).toBe(401);

      // Verify new password works for login
      const newLogin = await request(app).post('/api/v1/auth/login').send({
        email: qaDonor1.email,
        password: newPassword,
      });
      expect(newLogin.status).toBe(200);
    });
  });

  describe('6. Inactive User Status Enforcement', () => {
    it('should prevent inactive users from establishing sessions or accessing APIs', async () => {
      // Deactivate User 2 directly in Neon DB
      await prisma.user.update({
        where: { id: user2Id },
        data: { status: UserStatus.INACTIVE },
      });

      // Login attempt should fail with 401 AUTH_ACCOUNT_INACTIVE
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: qaDonor2.email,
        password: qaDonor2.password,
      });

      expect(loginRes.status).toBe(401);
      expect(loginRes.body.error.code).toBe('AUTH_ACCOUNT_INACTIVE');
    });
  });
});
