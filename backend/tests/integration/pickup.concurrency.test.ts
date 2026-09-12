import request from 'supertest';
import app from '../../src/app';
import { PrismaClient, UserRole, UserStatus, DonationStatus, PickupStatus } from '@prisma/client';
import { PasswordService } from '../../src/modules/auth-user/services/password.service';

const prisma = new PrismaClient();
jest.setTimeout(30000);

describe('Module 05 — Concurrency, Race Condition & Idempotency Tests', () => {
  let adminToken: string;
  let workerToken: string;
  let workerId: string;
  let donorId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    const passwordHash = await PasswordService.hashPassword('Password123!');

    const admin = await prisma.user.create({
      data: {
        firstName: 'ConcAdmin',
        lastName: 'Test',
        email: `conc-admin-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });

    const worker = await prisma.user.create({
      data: {
        firstName: 'ConcWorker',
        lastName: 'Test',
        email: `conc-worker-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.WORKER,
        status: UserStatus.ACTIVE,
      },
    });
    workerId = worker.id;

    const donor = await prisma.user.create({
      data: {
        firstName: 'ConcDonor',
        lastName: 'Test',
        email: `conc-donor-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.DONOR,
        status: UserStatus.ACTIVE,
      },
    });
    donorId = donor.id;

    const aLog = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: 'Password123!' });
    adminToken = aLog.body.data.accessToken;

    const wLog = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: worker.email, password: 'Password123!' });
    workerToken = wLog.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Double Start Race: Concurrent start calls for the same pickup (1 succeeds, rest get 409)', async () => {
    const d = await prisma.donation.create({
      data: {
        donorId,
        category: 'COOKED_MEAL',
        description: 'Race Donation 1',
        quantity: 10,
        quantityUnit: 'PORTIONS',
        preparedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        pickupAddress: 'Address 1',
        contactName: 'Contact',
        contactPhone: '+123456',
        status: DonationStatus.APPROVED,
      },
    });

    const assign = await request(app)
      .post(`/api/v1/admin/donations/${d.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ workerId });

    await request(app)
      .post(`/api/v1/worker/assignments/${assign.body.data.assignment.id}/accept`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({});

    const pickup = await prisma.pickup.findUnique({
      where: { assignmentId: assign.body.data.assignment.id },
    });
    const pickupId = pickup!.id;

    // Fire 5 concurrent start requests
    const responses = await Promise.all(
      Array.from({ length: 5 }).map(() =>
        request(app)
          .post(`/api/v1/worker/pickups/${pickupId}/start`)
          .set('Authorization', `Bearer ${workerToken}`)
          .send({})
      )
    );

    const successCount = responses.filter((r) => r.status === 200).length;
    const conflictCount = responses.filter((r) => r.status === 409).length;

    expect(successCount).toBe(1);
    expect(conflictCount).toBe(4);

    // Verify DB state is IN_PROGRESS
    const dbPickup = await prisma.pickup.findUnique({ where: { id: pickupId } });
    expect(dbPickup!.status).toBe(PickupStatus.IN_PROGRESS);

    // Verify exactly one PICKUP_STARTED event in DB
    const startEvents = await prisma.pickupEvent.findMany({
      where: { pickupId, eventType: 'PICKUP_STARTED' },
    });
    expect(startEvents.length).toBe(1);
  });

  it('2. Double Complete Race: Concurrent complete calls for the same pickup (1 succeeds, rest get 409)', async () => {
    const d = await prisma.donation.create({
      data: {
        donorId,
        category: 'PACKAGED_FOOD',
        description: 'Race Donation 2',
        quantity: 10,
        quantityUnit: 'BOXES',
        preparedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        pickupAddress: 'Address 2',
        contactName: 'Contact',
        contactPhone: '+123456',
        status: DonationStatus.APPROVED,
      },
    });

    const assign = await request(app)
      .post(`/api/v1/admin/donations/${d.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ workerId });

    await request(app)
      .post(`/api/v1/worker/assignments/${assign.body.data.assignment.id}/accept`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({});

    const pickup = await prisma.pickup.findUnique({
      where: { assignmentId: assign.body.data.assignment.id },
    });
    const pickupId = pickup!.id;

    // Start pickup first
    await request(app)
      .post(`/api/v1/worker/pickups/${pickupId}/start`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({});

    // Fire 5 concurrent complete requests
    const responses = await Promise.all(
      Array.from({ length: 5 }).map(() =>
        request(app)
          .post(`/api/v1/worker/pickups/${pickupId}/complete`)
          .set('Authorization', `Bearer ${workerToken}`)
          .send({ completionNotes: 'Race test notes' })
      )
    );

    const successCount = responses.filter((r) => r.status === 200).length;
    const conflictCount = responses.filter((r) => r.status === 409).length;

    expect(successCount).toBe(1);
    expect(conflictCount).toBe(4);

    // Verify DB state is COMPLETED
    const dbPickup = await prisma.pickup.findUnique({ where: { id: pickupId } });
    expect(dbPickup!.status).toBe(PickupStatus.COMPLETED);

    // Verify exactly one PICKUP_COMPLETED event in DB
    const completeEvents = await prisma.pickupEvent.findMany({
      where: { pickupId, eventType: 'PICKUP_COMPLETED' },
    });
    expect(completeEvents.length).toBe(1);
  });

  it('3. Complete vs Fail Race: Concurrent complete and fail calls (1 succeeds, 1 returns 409)', async () => {
    const d = await prisma.donation.create({
      data: {
        donorId,
        category: 'GROCERIES',
        description: 'Race Donation 3',
        quantity: 5,
        quantityUnit: 'KG',
        preparedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        pickupAddress: 'Address 3',
        contactName: 'Contact',
        contactPhone: '+123456',
        status: DonationStatus.APPROVED,
      },
    });

    const assign = await request(app)
      .post(`/api/v1/admin/donations/${d.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ workerId });

    await request(app)
      .post(`/api/v1/worker/assignments/${assign.body.data.assignment.id}/accept`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({});

    const pickup = await prisma.pickup.findUnique({
      where: { assignmentId: assign.body.data.assignment.id },
    });
    const pickupId = pickup!.id;

    // Start pickup first
    await request(app)
      .post(`/api/v1/worker/pickups/${pickupId}/start`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({});

    // Fire complete and fail concurrently
    const [completeRes, failRes] = await Promise.all([
      request(app)
        .post(`/api/v1/worker/pickups/${pickupId}/complete`)
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ completionNotes: 'Race complete' }),
      request(app)
        .post(`/api/v1/worker/pickups/${pickupId}/fail`)
        .set('Authorization', `Bearer ${workerToken}`)
        .send({ reason: 'Race fail' }),
    ]);

    const statuses = [completeRes.status, failRes.status];
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);
  });
});
