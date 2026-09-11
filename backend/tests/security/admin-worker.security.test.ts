import request from 'supertest';
import app from '../../src/app';
import { requireRole } from '../../src/shared/middleware/role.guard';
import { UserRole } from '@prisma/client';

describe('Admin Worker Provisioning — Security & Authorization Unit/RBAC Tests', () => {
  describe('RBAC Route Guards for POST /api/v1/admin/workers', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app)
        .post('/api/v1/admin/workers')
        .send({
          firstName: 'Rahul',
          lastName: 'Kumar',
          email: 'unauth-worker@example.test',
          password: 'Password123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_HEADER_MISSING');
    });

    it('should forbid DONOR from provisioning workers', () => {
      const req: any = { user: { id: 'donor-id', role: UserRole.DONOR, status: 'ACTIVE' } };
      const res: any = {};
      const next = jest.fn();

      const guard = requireRole(UserRole.ADMIN);
      expect(() => guard(req, res, next)).toThrow();
    });

    it('should forbid WORKER from provisioning workers', () => {
      const req: any = { user: { id: 'worker-id', role: UserRole.WORKER, status: 'ACTIVE' } };
      const res: any = {};
      const next = jest.fn();

      const guard = requireRole(UserRole.ADMIN);
      expect(() => guard(req, res, next)).toThrow();
    });

    it('should allow ADMIN through requireRole guard', () => {
      const req: any = { user: { id: 'admin-id', role: UserRole.ADMIN, status: 'ACTIVE' } };
      const res: any = {};
      const next = jest.fn();

      const guard = requireRole(UserRole.ADMIN);
      guard(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Public Registration Security Regression Check', () => {
    it('should ensure POST /api/v1/auth/register does not grant WORKER or ADMIN role when role is injected', async () => {
      const timestamp = Date.now();
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Malicious',
          lastName: 'User',
          email: `malicious-${timestamp}@example.test`,
          password: 'Password123!',
          role: 'WORKER',
        });

      if (res.status === 201) {
        // If registration succeeded, verify server ignored role injection and created DONOR
        expect(res.body.data.user.role).toBe(UserRole.DONOR);
        expect(res.body.data.user.role).not.toBe(UserRole.WORKER);
      } else {
        // If validation rejected extra field role, that's also safe
        expect(res.status).toBe(400);
      }
    });

    it('should ensure POST /api/v1/auth/register with role=ADMIN does not create ADMIN', async () => {
      const timestamp = Date.now();
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Malicious2',
          lastName: 'User',
          email: `malicious-admin-${timestamp}@example.test`,
          password: 'Password123!',
          role: 'ADMIN',
        });

      if (res.status === 201) {
        expect(res.body.data.user.role).toBe(UserRole.DONOR);
        expect(res.body.data.user.role).not.toBe(UserRole.ADMIN);
      } else {
        expect(res.status).toBe(400);
      }
    });
  });
});
