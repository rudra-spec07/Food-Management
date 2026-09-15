import request from 'supertest';
import app from '../../src/app';
import { requireRole } from '../../src/shared/middleware/role.guard';
import { UserRole } from '@prisma/client';
import { ForbiddenError } from '../../src/shared/errors/app-error';

describe('Security & RBAC Enforcement Tests', () => {
  describe('RBAC Guard Unit Logic', () => {
    it('should allow user with matching role to proceed', () => {
      const req: any = { user: { id: 'uuid-1', role: UserRole.ADMIN, sessionId: 'jti-1' } };
      const res: any = {};
      const next = jest.fn();

      const guard = requireRole(UserRole.ADMIN);
      guard(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should throw ForbiddenError when user role does not match allowed roles', () => {
      const req: any = { user: { id: 'uuid-1', role: UserRole.DONOR, sessionId: 'jti-1' } };
      const res: any = {};
      const next = jest.fn();

      const guard = requireRole(UserRole.ADMIN);
      expect(() => guard(req, res, next)).toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError when WORKER attempts ADMIN-only route', () => {
      const req: any = { user: { id: 'uuid-1', role: UserRole.WORKER, sessionId: 'jti-1' } };
      const res: any = {};
      const next = jest.fn();

      const guard = requireRole(UserRole.ADMIN);
      expect(() => guard(req, res, next)).toThrow(ForbiddenError);
    });
  });

  describe('Security Headers & Request Tracing', () => {
    it('should set security headers via helmet and attach X-Request-ID', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.headers['x-dns-prefetch-control']).toBe('off');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['strict-transport-security']).toBeDefined();
    });
  });

  describe('Module 08 Health, Liveness & Readiness Probes', () => {
    it('GET /health should return 200 UP status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.timestamp).toBeDefined();
    });

    it('GET /live should return 200 ALIVE status without DB dependency', async () => {
      const res = await request(app).get('/live');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ALIVE');
      expect(res.body.data.timestamp).toBeDefined();
    });

    it('GET /ready should return 200 READY when database ping succeeds', async () => {
      const res = await request(app).get('/ready');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('READY');
      expect(res.body.data.database).toBe('HEALTHY');
    });
  });

  describe('Module 08 Inactive User Session & Audit Immutability Tests', () => {
    it('SessionService.validateSession should throw UnauthorizedError for INACTIVE user status', async () => {
      const { SessionService } = require('../../src/modules/auth-user/services/session.service');
      const sessionService = new SessionService();

      // Mock user repository to return an INACTIVE user
      jest.spyOn((sessionService as any).authSessionRepository, 'findByTokenJti').mockResolvedValueOnce({
        id: 'session-id-1',
        userId: 'inactive-user-id',
        tokenJti: 'jti-inactive',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
      });

      jest.spyOn((sessionService as any).userRepository, 'findById').mockResolvedValueOnce({
        id: 'inactive-user-id',
        role: UserRole.DONOR,
        status: 'INACTIVE',
      });

      await expect(sessionService.validateSession('jti-inactive')).rejects.toThrow(
        expect.objectContaining({
          statusCode: 401,
          code: 'AUTH_USER_INACTIVE',
        })
      );
    });

    it('Audit Log Immutability — API should reject mutation/deletion requests on audit logs', async () => {
      const resDelete = await request(app).delete('/api/v1/audit-logs/some-id');
      expect(resDelete.status).toBe(404);
      expect(resDelete.body.error.code).toBe('ROUTE_NOT_FOUND');

      const resPatch = await request(app).patch('/api/v1/audit-logs/some-id');
      expect(resPatch.status).toBe(404);
      expect(resPatch.body.error.code).toBe('ROUTE_NOT_FOUND');
    });
  });
});
