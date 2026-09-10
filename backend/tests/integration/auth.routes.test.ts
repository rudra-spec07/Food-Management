import request from 'supertest';
import app from '../../src/app';

describe('Auth & User Routes Integration Tests (HTTP Semantics & Contract Validation)', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should return 400 validation error when body is invalid', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'invalid-email',
        password: '123',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.requestId).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 400 when login parameters are missing', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/users/me', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/users/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_HEADER_MISSING');
    });

    it('should return 401 when Bearer token is malformed', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer malformed-token-string');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AUTH_TOKEN_INVALID');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should return 401 when calling logout unauthenticated', async () => {
      const res = await request(app).post('/api/v1/auth/logout');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/users/me', () => {
    it('should return 401 unauthenticated when updating profile without token', async () => {
      const res = await request(app).patch('/api/v1/users/me').send({ firstName: 'NewName' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/users/me/change-password', () => {
    it('should return 401 when changing password unauthenticated', async () => {
      const res = await request(app).post('/api/v1/users/me/change-password').send({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
