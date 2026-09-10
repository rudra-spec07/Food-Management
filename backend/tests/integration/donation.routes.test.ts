import request from 'supertest';
import app from '../../src/app';

describe('Donation Routes Integration Tests (HTTP Semantics & RBAC)', () => {
  describe('POST /api/v1/donations', () => {
    it('should return 401 Unauthorized when no Authorization header is provided', async () => {
      const res = await request(app).post('/api/v1/donations').send({});

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_HEADER_MISSING');
    });

    it('should return 401 Unauthorized when Bearer token is malformed', async () => {
      const res = await request(app)
        .post('/api/v1/donations')
        .set('Authorization', 'Bearer invalid.token.here')
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/donations/my', () => {
    it('should return 401 Unauthorized when calling list without token', async () => {
      const res = await request(app).get('/api/v1/donations/my');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/donations/:donationId', () => {
    it('should return 401 Unauthorized when accessing without token', async () => {
      const res = await request(app).get('/api/v1/donations/00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/donations/:donationId', () => {
    it('should return 401 Unauthorized when updating without token', async () => {
      const res = await request(app)
        .patch('/api/v1/donations/00000000-0000-0000-0000-000000000000')
        .send({ description: 'Updated' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/donations/:donationId/cancel', () => {
    it('should return 401 Unauthorized when cancelling without token', async () => {
      const res = await request(app).post('/api/v1/donations/00000000-0000-0000-0000-000000000000/cancel');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
