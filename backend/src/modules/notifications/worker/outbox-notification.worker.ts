import { PrismaClient, NotificationChannel } from '@prisma/client';
import { RecipientResolverService } from '../services/recipient-resolver.service';
import { sanitizeContext, renderTemplate } from '../templates/notification-template.map';
import { IEmailProvider } from '../providers/email-provider.interface';
import { ConsoleEmailProvider } from '../providers/console-email.provider';

export class OutboxNotificationWorker {
  private prisma: PrismaClient;
  private recipientResolver: RecipientResolverService;
  private emailProvider: IEmailProvider;
  private isRunning: boolean = false;
  private outboxTimer?: NodeJS.Timeout;
  private deliveryTimer?: NodeJS.Timeout;

  private outboxPollIntervalMs: number;
  private outboxBatchSize: number;
  private deliveryPollIntervalMs: number;
  private deliveryBatchSize: number;

  constructor(options?: {
    prisma?: PrismaClient;
    emailProvider?: IEmailProvider;
    outboxPollIntervalMs?: number;
    outboxBatchSize?: number;
    deliveryPollIntervalMs?: number;
    deliveryBatchSize?: number;
  }) {
    this.prisma = options?.prisma || new PrismaClient();
    this.recipientResolver = new RecipientResolverService();
    this.emailProvider = options?.emailProvider || new ConsoleEmailProvider();

    this.outboxPollIntervalMs = options?.outboxPollIntervalMs || Number(process.env.OUTBOX_POLL_INTERVAL_MS) || 3000;
    this.outboxBatchSize = options?.outboxBatchSize || Number(process.env.OUTBOX_BATCH_SIZE) || 10;
    this.deliveryPollIntervalMs = options?.deliveryPollIntervalMs || Number(process.env.DELIVERY_POLL_INTERVAL_MS) || 5000;
    this.deliveryBatchSize = options?.deliveryBatchSize || Number(process.env.DELIVERY_BATCH_SIZE) || 10;
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[NotificationWorker] Starting outbox and delivery workers...');

    this.scheduleOutboxPoll();
    this.scheduleDeliveryPoll();
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.outboxTimer) clearTimeout(this.outboxTimer);
    if (this.deliveryTimer) clearTimeout(this.deliveryTimer);
    console.log('[NotificationWorker] Stopped outbox and delivery workers.');
  }

  private scheduleOutboxPoll(): void {
    if (!this.isRunning) return;
    this.outboxTimer = setTimeout(async () => {
      try {
        await this.processOutboxBatch();
      } catch (err: any) {
        console.error('[NotificationWorker] Outbox poll error:', err.message || err);
      } finally {
        this.scheduleOutboxPoll();
      }
    }, this.outboxPollIntervalMs);
  }

  private scheduleDeliveryPoll(): void {
    if (!this.isRunning) return;
    this.deliveryTimer = setTimeout(async () => {
      try {
        await this.recoverStuckProcessing();
        await this.processDeliveryBatch();
      } catch (err: any) {
        console.error('[NotificationWorker] Delivery poll error:', err.message || err);
      } finally {
        this.scheduleDeliveryPoll();
      }
    }, this.deliveryPollIntervalMs);
  }

  public async processOutboxBatch(): Promise<number> {
    let processedCount = 0;

    // 1. SELECT unconsumed OutboxEvents
    const events = await this.prisma.$queryRaw<
      Array<{
        id: string;
        aggregateType: string;
        aggregateId: string;
        eventType: string;
        payload: any;
        retryCount: number;
      }>
    >`
      SELECT
        id,
        aggregate_type AS "aggregateType",
        aggregate_id AS "aggregateId",
        event_type AS "eventType",
        payload,
        retry_count AS "retryCount"
      FROM outbox_events
      WHERE published_at IS NULL AND retry_count < 3
      ORDER BY created_at ASC
      LIMIT ${this.outboxBatchSize}
      FOR UPDATE SKIP LOCKED
    `;

    if (!events || events.length === 0) {
      return 0;
    }

    for (const event of events) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const rawPayload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload || {};
          const recipients = await this.recipientResolver.resolveRecipients(event.eventType, rawPayload, tx);

          for (const recipientId of recipients) {
            // Check preferences
            const inAppPref = await tx.notificationPreference.findUnique({
              where: {
                userId_eventType_channel: {
                  userId: recipientId,
                  eventType: event.eventType,
                  channel: NotificationChannel.IN_APP,
                },
              },
            });

            const emailPref = await tx.notificationPreference.findUnique({
              where: {
                userId_eventType_channel: {
                  userId: recipientId,
                  eventType: event.eventType,
                  channel: NotificationChannel.EMAIL,
                },
              },
            });

            const inAppEnabled = inAppPref ? inAppPref.enabled : true;
            const emailEnabled = emailPref ? emailPref.enabled : true;

            if (!inAppEnabled && !emailEnabled) {
              continue;
            }

            const context = sanitizeContext(rawPayload);
            const rendered = renderTemplate(event.eventType, context);

            let notificationId: string | null = null;

            // Create Notification parent record to anchor deliveries
            const notification = await tx.notification.create({
              data: {
                eventId: event.id,
                recipientId,
                eventType: event.eventType,
                title: rendered.title,
                message: rendered.message,
                data: context as any,
              },
            });
            notificationId = notification.id;

            if (emailEnabled && notificationId) {
              await tx.notificationDelivery.create({
                data: {
                  notificationId,
                  channel: NotificationChannel.EMAIL,
                  status: 'PENDING',
                },
              });
            }
          }

          // Mark OutboxEvent.publishedAt = NOW() ONLY upon successful consumption
          await tx.outboxEvent.update({
            where: { id: event.id },
            data: { publishedAt: new Date() },
          });
        });

        processedCount++;
      } catch (eventErr: any) {
        console.error(`[NotificationWorker] Failed processing event ${event.id}:`, eventErr.message || eventErr);

        // Increment retryCount on failure. Do NOT set publishedAt!
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { retryCount: { increment: 1 } },
        });
      }
    }

    return processedCount;
  }

  public async processDeliveryBatch(): Promise<number> {
    const now = new Date();

    // 1. Claim eligible delivery jobs in a short transaction
    const claimedDeliveries = await this.prisma.$transaction(async (tx) => {
      const eligible = await tx.notificationDelivery.findMany({
        where: {
          channel: NotificationChannel.EMAIL,
          status: 'PENDING',
          OR: [
            { nextAttemptAt: null },
            { nextAttemptAt: { lte: now } },
          ],
        },
        take: this.deliveryBatchSize,
        include: {
          notification: {
            include: {
              recipient: {
                select: { email: true, firstName: true, lastName: true },
              },
            },
          },
        },
      });

      if (!eligible || eligible.length === 0) {
        return [];
      }

      const ids = eligible.map((d) => d.id);

      await tx.notificationDelivery.updateMany({
        where: { id: { in: ids } },
        data: { status: 'PROCESSING' },
      });

      return eligible;
    });

    if (claimedDeliveries.length === 0) {
      return 0;
    }

    let processedCount = 0;

    // 2. Perform external email sending OUTSIDE DB transactions or locks!
    for (const delivery of claimedDeliveries) {
      const recipientEmail = delivery.notification.recipient.email;
      const context = (delivery.notification.data as any) || {};
      const rendered = renderTemplate(delivery.notification.eventType, context);

      try {
        const result = await this.emailProvider.send({
          to: recipientEmail,
          subject: rendered.emailSubject,
          html: rendered.emailHtml,
          text: rendered.message,
        });

        await this.prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'SENT',
            sentAt: result.sentAt,
            lastError: null,
          },
        });

        processedCount++;
      } catch (err: any) {
        const errorMessage = err.message || String(err);
        const newAttemptCount = delivery.attemptCount + 1;
        const maxAttempts = delivery.maxAttempts || 3;

        console.error(`[NotificationWorker] Email delivery failed for deliveryId ${delivery.id} (Attempt ${newAttemptCount}/${maxAttempts}):`, errorMessage);

        if (newAttemptCount >= maxAttempts) {
          await this.prisma.notificationDelivery.update({
            where: { id: delivery.id },
            data: {
              status: 'FAILED',
              attemptCount: newAttemptCount,
              lastError: errorMessage,
            },
          });
        } else {
          // Exponential backoff: +1 min, +2 min, +4 min
          const backoffMinutes = Math.pow(2, newAttemptCount - 1);
          const nextAttemptAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

          await this.prisma.notificationDelivery.update({
            where: { id: delivery.id },
            data: {
              status: 'PENDING',
              attemptCount: newAttemptCount,
              nextAttemptAt,
              lastError: errorMessage,
            },
          });
        }
      }
    }

    return processedCount;
  }

  public async recoverStuckProcessing(): Promise<number> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const result = await this.prisma.notificationDelivery.updateMany({
      where: {
        status: 'PROCESSING',
        updatedAt: { lte: tenMinutesAgo },
      },
      data: {
        status: 'PENDING',
      },
    });

    if (result.count > 0) {
      console.warn(`[NotificationWorker] Recovered ${result.count} stuck PROCESSING delivery records back to PENDING.`);
    }

    return result.count;
  }
}

// Standalone execution script entrypoint if invoked directly (`node dist/modules/notifications/worker/outbox-notification.worker.js`)
if (require.main === module) {
  const worker = new OutboxNotificationWorker();
  worker.start();

  const shutdown = async () => {
    console.log('[NotificationWorker] Gracefully shutting down...');
    await worker.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
