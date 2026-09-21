import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/database';
import { UserRepository } from '../../src/modules/auth-user/repositories/user.repository';
import { SessionService } from '../../src/modules/auth-user/services/session.service';
import { PasswordService } from '../../src/modules/auth-user/services/password.service';
import { UserRole, UserStatus } from '@prisma/client';
import { env } from '../../src/config/env';

describe('POST /api/v1/ai/estimate-quantity Integration Tests', () => {
  const userRepository = new UserRepository();
  const sessionService = new SessionService();

  let donorToken: string;
  let adminToken: string;
  let workerToken: string;

  let donorUser: any;
  let adminUser: any;
  let workerUser: any;

  let originalFetch: typeof global.fetch;

  beforeAll(async () => {
    originalFetch = global.fetch;
    const pwdHash = await PasswordService.hashPassword('Password123!');
    const timestamp = Date.now();

    donorUser = await userRepository.create({
      firstName: 'AI',
      lastName: 'Donor',
      email: `ai-donor-${timestamp}@example.com`,
      passwordHash: pwdHash,
      role: UserRole.DONOR,
      status: UserStatus.ACTIVE,
    });

    adminUser = await userRepository.create({
      firstName: 'AI',
      lastName: 'Admin',
      email: `ai-admin-${timestamp}@example.com`,
      passwordHash: pwdHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });

    workerUser = await userRepository.create({
      firstName: 'AI',
      lastName: 'Worker',
      email: `ai-worker-${timestamp}@example.com`,
      passwordHash: pwdHash,
      role: UserRole.WORKER,
      status: UserStatus.ACTIVE,
    });

    donorToken = (await sessionService.createSession(donorUser.id, donorUser.role)).token;
    adminToken = (await sessionService.createSession(adminUser.id, adminUser.role)).token;
    workerToken = (await sessionService.createSession(workerUser.id, workerUser.role)).token;
  });

  beforeEach(() => {
    (env as any).FOOD_ANALYZER_ENABLED = true;
    (env as any).GEMINI_API_KEY = 'test-secret-key';
    (env as any).GEMINI_MODEL = 'gemini-2.5-flash-lite';
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    if (donorUser?.id) {
      await prisma.authSession.deleteMany({ where: { userId: donorUser.id } });
      await prisma.user.delete({ where: { id: donorUser.id } });
    }
    if (adminUser?.id) {
      await prisma.authSession.deleteMany({ where: { userId: adminUser.id } });
      await prisma.user.delete({ where: { id: adminUser.id } });
    }
    if (workerUser?.id) {
      await prisma.authSession.deleteMany({ where: { userId: workerUser.id } });
      await prisma.user.delete({ where: { id: workerUser.id } });
    }
  });

  it('1: should return 401 Unauthorized when unauthenticated', async () => {
    const res = await request(app)
      .post('/api/v1/ai/estimate-quantity')
      .send({ peopleCount: 50, foodItems: ['Rice'] });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('2: should return 403 Forbidden when user is a WORKER', async () => {
    const res = await request(app)
      .post('/api/v1/ai/estimate-quantity')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ peopleCount: 50, foodItems: ['Rice'] });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('3: should return 400 Bad Request for invalid request payload (e.g. peopleCount <= 0)', async () => {
    const res = await request(app)
      .post('/api/v1/ai/estimate-quantity')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ peopleCount: 0, foodItems: ['Rice'] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  it('4: should return 200 OK with valid estimation for DONOR role', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    estimates: [
                      {
                        foodItem: 'Rice',
                        quantity: 5,
                        unit: 'KG',
                        reasoning: 'Calculated for 50 people.',
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      }),
    });

    const res = await request(app)
      .post('/api/v1/ai/estimate-quantity')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ peopleCount: 50, foodItems: ['Rice'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.estimates).toHaveLength(1);
    expect(res.body.data.estimates[0]).toEqual({
      foodItem: 'Rice',
      quantity: 5,
      unit: 'KG',
      reasoning: 'Calculated for 50 people.',
    });
  });

  it('5: should return 200 OK for ADMIN role', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    estimates: [
                      {
                        foodItem: 'Dal',
                        quantity: 4,
                        unit: 'LITERS',
                        reasoning: 'Standard portion for 50 people.',
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      }),
    });

    const res = await request(app)
      .post('/api/v1/ai/estimate-quantity')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ peopleCount: 50, foodItems: ['Dal'] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.estimates[0].foodItem).toBe('Dal');
  });

  it('6: should return 503 Service Unavailable when FOOD_ANALYZER_ENABLED is false', async () => {
    (env as any).FOOD_ANALYZER_ENABLED = false;

    const res = await request(app)
      .post('/api/v1/ai/estimate-quantity')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ peopleCount: 50, foodItems: ['Rice'] });

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AI_SERVICE_DISABLED');
  });
});
