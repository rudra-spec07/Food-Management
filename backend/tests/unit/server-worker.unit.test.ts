import { OutboxNotificationWorker } from '../../src/modules/notifications/worker/outbox-notification.worker';

describe('Server Worker Integration Unit Test', () => {
  it('should instantiate OutboxNotificationWorker with custom options and start/stop cleanly', async () => {
    const mockPrisma = {} as any;
    const worker = new OutboxNotificationWorker({
      prisma: mockPrisma,
      outboxPollIntervalMs: 60000,
      deliveryPollIntervalMs: 60000,
    });

    expect(worker).toBeDefined();

    await worker.start();
    // Verify start is idempotent
    await worker.start();

    await worker.stop();
  });
});
