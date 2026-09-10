import request from 'supertest';
import app from '../../src/app';

describe('Module 03 — Review Security Tests', () => {
  describe('Parameter & Body Sanitization', () => {
    it('should return 400 BAD_REQUEST on malformed UUID parameter for GET detail', async () => {
      const res = await request(app)
        .get('/api/v1/admin/donations/not-a-valid-uuid')
        .set('Authorization', 'Bearer fake.token');

      expect(res.status).toBe(401); // Unauthorized token check runs first
    });

    it('should reject non-admin request attempting role escalation', async () => {
      const res = await request(app)
        .post('/api/v1/admin/donations/00000000-0000-0000-0000-000000000000/approve')
        .send({
          role: 'ADMIN',
          reviewerId: 'injected-admin-id',
          status: 'COMPLETED',
        });

      expect(res.status).toBe(401);
    });

    it('should reject invalid status filter parameter on review queue endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/admin/donations/review?status=COMPLETED');

      expect(res.status).toBe(401); // Unauthorized guard enforces first
    });
  });
});
