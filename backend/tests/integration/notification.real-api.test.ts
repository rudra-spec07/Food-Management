import request from 'supertest';
import { PrismaClient, UserRole, UserStatus, NotificationChannel, NotificationStatus } from '@prisma/client';
import app from '../../src/app';
import { OutboxNotificationWorker } from '../../src/modules/notifications/worker/outbox-notification.worker';
import { PasswordService } from '../../src/modules/auth-user/services/password.service';
import { SessionService } from '../../src/modules/auth-user/services/session.service';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const sessionService = new SessionService();

jest.setTimeout(30000);

describe('Module 06 — Notifications & Communication Integration & Security Tests', () => {
  let donorToken: string;
  let donorId: string;
  let donorEmail: string;

  let donor2Token: string;
  let donor2Id: string;

  let workerToken: string;
  let workerId: string;

  let adminToken: string;
  let adminId: string;

  let notificationWorker: OutboxNotificationWorker;

  beforeAll(async () => {
    notificationWorker = new OutboxNotificationWorker({ prisma });

    // Clear stale unconsumed outbox events to ensure clean test batch processing
    await prisma.outboxEvent.deleteMany({
      where: { publishedAt: null },
    });

    const timestamp = Date.now();
    const passwordHash = await PasswordService.hashPassword('Password123!');

    // 1. Create test Donor 1
    donorEmail = `donor1-${timestamp}@example.test`;
    const donor1 = await prisma.user.create({
      data: {
        firstName: 'Donor',
        lastName: 'One',
        email: donorEmail,
        passwordHash,
        role: UserRole.DONOR,
        status: UserStatus.ACTIVE,
      },
    });
    donorId = donor1.id;
    const donor1Session = await sessionService.createSession(donor1.id, donor1.role);
    donorToken = donor1Session.token;

    // 2. Create test Donor 2 (for IDOR testing)
    const donor2 = await prisma.user.create({
      data: {
        firstName: 'Donor',
        lastName: 'Two',
        email: `donor2-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.DONOR,
        status: UserStatus.ACTIVE,
      },
    });
    donor2Id = donor2.id;
    const donor2Session = await sessionService.createSession(donor2.id, donor2.role);
    donor2Token = donor2Session.token;

    // 3. Create test Worker
    const worker = await prisma.user.create({
      data: {
        firstName: 'Worker',
        lastName: 'One',
        email: `worker1-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.WORKER,
        status: UserStatus.ACTIVE,
      },
    });
    workerId = worker.id;
    const workerSession = await sessionService.createSession(worker.id, worker.role);
    workerToken = workerSession.token;

    // 4. Create test Admin
    const admin = await prisma.user.create({
      data: {
        firstName: 'Admin',
        lastName: 'One',
        email: `admin1-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    adminId = admin.id;
    const adminSession = await sessionService.createSession(admin.id, admin.role);
    adminToken = adminSession.token;

    expect(donor2Id).toBeDefined();
    expect(workerToken).toBeDefined();
    expect(workerId).toBeDefined();
    expect(adminToken).toBeDefined();
    expect(adminId).toBeDefined();
  });

  afterAll(async () => {
    const userIds = [donorId, donor2Id, workerId, adminId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.notificationDelivery.deleteMany({
        where: { notification: { recipientId: { in: userIds } } },
      });
      await prisma.notification.deleteMany({
        where: { recipientId: { in: userIds } },
      });
      await prisma.notificationPreference.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.auditLog.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.authSession.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.donationStatusHistory.deleteMany({
        where: { changedBy: { in: userIds } },
      });
      await prisma.donation.deleteMany({
        where: { donorId: { in: userIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }
    await prisma.$disconnect();
  });

  describe('1. DONATION_SUBMITTED Outbox Event Emission & Outbox Worker Processing', () => {
    let createdDonationId: string;
    let createdOutboxId: string;

    it('should create donation and transactionally emit DONATION_SUBMITTED outbox event', async () => {
      const preparedAt = new Date(Date.now() - 3600000).toISOString();
      const expiresAt = new Date(Date.now() + 86400000).toISOString();

      const res = await request(app)
        .post('/api/v1/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          category: 'COOKED_MEAL',
          description: 'Fresh warm meals for distribution',
          quantity: 25,
          quantityUnit: 'PORTIONS',
          preparedAt,
          expiresAt,
          pickupAddress: '123 Helping St',
          contactName: 'Donor One',
          contactPhone: '+919876543210',
        });

      expect(res.status).toBe(201);
      createdDonationId = res.body.data.id;

      // Verify outbox event exists in database
      const outboxEvent = await prisma.outboxEvent.findFirst({
        where: {
          aggregateId: createdDonationId,
          eventType: 'DONATION_SUBMITTED',
        },
      });

      expect(outboxEvent).not.toBeNull();
      expect(outboxEvent?.publishedAt).toBeNull();
      expect(outboxEvent?.retryCount).toBe(0);
      createdOutboxId = outboxEvent!.id;
    });

    it('should process outbox event via worker, set publishedAt, and create Notification record', async () => {
      const processedCount = await notificationWorker.processOutboxBatch();
      expect(processedCount).toBeGreaterThanOrEqual(1);

      // Outbox event publishedAt must be set
      const updatedOutbox = await prisma.outboxEvent.findUnique({
        where: { id: createdOutboxId },
      });
      expect(updatedOutbox?.publishedAt).not.toBeNull();

      // Notification must exist for Donor 1
      const notification = await prisma.notification.findFirst({
        where: {
          eventId: createdOutboxId,
          recipientId: donorId,
        },
        include: { deliveries: true },
      });

      expect(notification).not.toBeNull();
      expect(notification?.eventType).toBe('DONATION_SUBMITTED');
      expect(notification?.status).toBe(NotificationStatus.UNREAD);

      // Email delivery job must exist in PENDING state
      expect(notification?.deliveries.length).toBe(1);
      expect(notification?.deliveries[0].channel).toBe(NotificationChannel.EMAIL);
      expect(notification?.deliveries[0].status).toBe('PENDING');
    });

    it('should process email delivery batch and transition delivery state to SENT', async () => {
      const deliveredCount = await notificationWorker.processDeliveryBatch();
      expect(deliveredCount).toBeGreaterThanOrEqual(1);

      const delivery = await prisma.notificationDelivery.findFirst({
        where: {
          notification: { recipientId: donorId },
          channel: NotificationChannel.EMAIL,
        },
      });

      expect(delivery?.status).toBe('SENT');
      expect(delivery?.sentAt).not.toBeNull();
    });
  });

  describe('2. User Inbox REST APIs & IDOR Protection', () => {
    let testNotificationId: string;

    beforeAll(async () => {
      // Create a test notification directly for Donor 1
      const notif = await prisma.notification.create({
        data: {
          eventId: uuidv4(),
          recipientId: donorId,
          eventType: 'DONATION_APPROVED',
          title: 'Test Notification',
          message: 'Your donation has been approved',
          status: NotificationStatus.UNREAD,
        },
      });
      testNotificationId = notif.id;
    });

    it('should allow Donor 1 to fetch their notifications list', async () => {
      const res = await request(app)
        .get('/api/v1/notifications?page=1&limit=10')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it('should allow Donor 1 to fetch unread notification count', async () => {
      const res = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.unreadCount).toBeGreaterThanOrEqual(1);
    });

    it('should allow Donor 1 to mark their notification as READ', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${testNotificationId}/read`)
        .set('Authorization', `Bearer ${donorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(NotificationStatus.READ);
      expect(res.body.data.readAt).not.toBeNull();
    });

    it('IDOR SECURITY: should return 404 Not Found when Donor 2 attempts to mark Donor 1 notification as read', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${testNotificationId}/read`)
        .set('Authorization', `Bearer ${donor2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOTIFICATION_NOT_FOUND');
    });

    it('should allow Donor 1 to mark all notifications as READ', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.updatedCount).toBe('number');
    });
  });

  describe('3. Notification Preferences REST APIs & Opt-Out Suppression', () => {
    it('should fetch user preferences (empty by default)', async () => {
      const res = await request(app)
        .get('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.preferences)).toBe(true);
    });

    it('should update preference to disable EMAIL for DONATION_APPROVED', async () => {
      const res = await request(app)
        .patch('/api/v1/notification-preferences')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          eventType: 'DONATION_APPROVED',
          channel: NotificationChannel.EMAIL,
          enabled: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.enabled).toBe(false);
    });

    it('should suppress EMAIL delivery creation when preference is disabled', async () => {
      // Create outbox event for DONATION_APPROVED
      const donationId = uuidv4();
      const outboxEvent = await prisma.outboxEvent.create({
        data: {
          aggregateType: 'Donation',
          aggregateId: donationId,
          eventType: 'DONATION_APPROVED',
          payload: { donationId, donorId },
        },
      });

      // Process outbox batch
      await notificationWorker.processOutboxBatch();

      // Check notification created
      const notification = await prisma.notification.findFirst({
        where: { eventId: outboxEvent.id, recipientId: donorId },
        include: { deliveries: true },
      });

      expect(notification).not.toBeNull();
      // EMAIL delivery must be absent because enabled = false
      expect(notification?.deliveries.length).toBe(0);
    });
  });

  describe('4. Worker Error Handling, Idempotency & Concurrency', () => {
    it('should increment retryCount and keep publishedAt NULL on outbox error', async () => {
      // Create outbox event with corrupt aggregate that fails recipient resolution
      const corruptEvent = await prisma.outboxEvent.create({
        data: {
          aggregateType: 'Unknown',
          aggregateId: 'corrupt-id',
          eventType: 'UNKNOWN_EVENT_TYPE',
          payload: {},
        },
      });

      // Process batch
      await notificationWorker.processOutboxBatch();

      const updated = await prisma.outboxEvent.findUnique({
        where: { id: corruptEvent.id },
      });

      // MUST NOT set publishedAt! MUST increment retryCount!
      expect(updated?.publishedAt).toBeNull();
      expect(updated?.retryCount).toBe(1);
    });

    it('should recover stuck PROCESSING delivery jobs back to PENDING', async () => {
      // Create a stuck PROCESSING delivery record with updatedAt 15 minutes ago
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

      const notif = await prisma.notification.create({
        data: {
          eventId: uuidv4(),
          recipientId: donorId,
          eventType: 'DONATION_APPROVED',
          title: 'Stuck Test',
          message: 'Testing stuck recovery',
        },
      });

      const delivery = await prisma.notificationDelivery.create({
        data: {
          notificationId: notif.id,
          channel: NotificationChannel.EMAIL,
          status: 'PROCESSING',
          updatedAt: fifteenMinAgo,
        },
      });

      const recoveredCount = await notificationWorker.recoverStuckProcessing();
      expect(recoveredCount).toBeGreaterThanOrEqual(1);

      const recovered = await prisma.notificationDelivery.findUnique({
        where: { id: delivery.id },
      });

      expect(recovered?.status).toBe('PENDING');
    });

    it('should enforce database idempotency unique constraints on duplicate notification creation', async () => {
      const eventId = uuidv4();

      await prisma.notification.create({
        data: {
          eventId,
          recipientId: donorId,
          eventType: 'DONATION_APPROVED',
          title: 'Unique 1',
          message: 'Message 1',
        },
      });

      // Attempting to create duplicate (eventId, recipientId) must throw P2002 unique constraint error
      await expect(
        prisma.notification.create({
          data: {
            eventId,
            recipientId: donorId,
            eventType: 'DONATION_APPROVED',
            title: 'Unique 2',
            message: 'Message 2',
          },
        })
      ).rejects.toThrow();
    });
  });
});
