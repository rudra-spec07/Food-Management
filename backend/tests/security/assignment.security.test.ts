import request from 'supertest';
import app from '../../src/app';
import { requireRole } from '../../src/shared/middleware/role.guard';
import { UserRole } from '@prisma/client';

describe('Module 04 — Security & RBAC Guard Unit Tests', () => {
  describe('RBAC Route Guards for Module 04', () => {
    it('should reject unauthenticated access with 401 on admin assignment queue', async () => {
      const res = await request(app).get('/api/v1/admin/donations/assignment-queue');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_HEADER_MISSING');
    });

    it('should reject unauthenticated access with 401 on admin assign worker', async () => {
      const res = await request(app)
        .post('/api/v1/admin/donations/123e4567-e89b-12d3-a456-426614174000/assign')
        .send({ workerId: '123e4567-e89b-12d3-a456-426614174001' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated access with 401 on worker assignment list', async () => {
      const res = await request(app).get('/api/v1/worker/assignments');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated access with 401 on worker accept assignment', async () => {
      const res = await request(app).post(
        '/api/v1/worker/assignments/123e4567-e89b-12d3-a456-426614174000/accept'
      );
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should forbid DONOR from accessing admin assignment queue', () => {
      const req: any = { user: { id: 'user-donor', role: UserRole.DONOR } };
      const res: any = {};
      const next = jest.fn();

      const guard = requireRole(UserRole.ADMIN);
      expect(() => guard(req, res, next)).toThrow();
    });

    it('should forbid WORKER from accessing admin assign worker endpoint', () => {
      const req: any = { user: { id: 'user-worker', role: UserRole.WORKER } };
      const res: any = {};
      const next = jest.fn();

      const guard = requireRole(UserRole.ADMIN);
      expect(() => guard(req, res, next)).toThrow();
    });

    it('should forbid ADMIN from accessing worker accept endpoint', () => {
      const req: any = { user: { id: 'user-admin', role: UserRole.ADMIN } };
      const res: any = {};
      const next = jest.fn();

      const guard = requireRole(UserRole.WORKER);
      expect(() => guard(req, res, next)).toThrow();
    });
  });
});
