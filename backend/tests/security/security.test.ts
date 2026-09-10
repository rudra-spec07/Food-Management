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
});
