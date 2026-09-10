import request from 'supertest';
import app from '../../src/app';

describe('Module 03 — Review Routes Integration Tests (HTTP & RBAC Guards)', () => {
  const invalidUUID = '00000000-0000-0000-0000-000000000000';

  describe('GET /api/v1/admin/donations/review', () => {
    it('should return 401 Unauthorized when no token is provided', async () => {
      const res = await request(app).get('/api/v1/admin/donations/review');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_HEADER_MISSING');
    });

    it('should return 401 Unauthorized when Bearer token is malformed', async () => {
      const res = await request(app)
        .get('/api/v1/admin/donations/review')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/donations/:donationId', () => {
    it('should return 401 Unauthorized when unauthenticated', async () => {
      const res = await request(app).get(`/api/v1/admin/donations/${invalidUUID}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/admin/donations/:donationId/approve', () => {
    it('should return 401 Unauthorized when unauthenticated', async () => {
      const res = await request(app).post(`/api/v1/admin/donations/${invalidUUID}/approve`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/admin/donations/:donationId/reject', () => {
    it('should return 401 Unauthorized when unauthenticated', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/donations/${invalidUUID}/reject`)
        .send({ reason: 'Invalid food' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/donations/:donationId/reviews', () => {
    it('should return 401 Unauthorized when unauthenticated', async () => {
      const res = await request(app).get(`/api/v1/admin/donations/${invalidUUID}/reviews`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
