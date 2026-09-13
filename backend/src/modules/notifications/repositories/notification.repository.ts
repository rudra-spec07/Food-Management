import { PrismaClient, Prisma, Notification, NotificationStatus } from '@prisma/client';

const globalPrisma = new PrismaClient();

export class NotificationRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || globalPrisma;
  }

  public get client(): PrismaClient {
    return this.prisma;
  }

  public async findUserNotifications(
    recipientId: string,
    page: number,
    limit: number,
    status?: NotificationStatus,
    tx?: Prisma.TransactionClient
  ): Promise<[Notification[], number]> {
    const client = tx || this.prisma;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      recipientId,
      ...(status ? { status } : {}),
    };

    const [items, total] = await Promise.all([
      client.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      client.notification.count({ where }),
    ]);

    return [items, total];
  }

  public async countUnreadUserNotifications(
    recipientId: string,
    tx?: Prisma.TransactionClient
  ): Promise<number> {
    const client = tx || this.prisma;
    return client.notification.count({
      where: {
        recipientId,
        status: NotificationStatus.UNREAD,
      },
    });
  }

  public async findNotificationByIdAndRecipient(
    id: string,
    recipientId: string,
    tx?: Prisma.TransactionClient
  ): Promise<Notification | null> {
    const client = tx || this.prisma;
    return client.notification.findFirst({
      where: {
        id,
        recipientId,
      },
    });
  }

  public async markNotificationAsRead(
    id: string,
    recipientId: string,
    tx?: Prisma.TransactionClient
  ): Promise<Notification | null> {
    const client = tx || this.prisma;
    const existing = await this.findNotificationByIdAndRecipient(id, recipientId, client);

    if (!existing) {
      return null;
    }

    if (existing.status === NotificationStatus.READ) {
      return existing;
    }

    return client.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  public async markAllNotificationsAsRead(
    recipientId: string,
    tx?: Prisma.TransactionClient
  ): Promise<number> {
    const client = tx || this.prisma;
    const result = await client.notification.updateMany({
      where: {
        recipientId,
        status: NotificationStatus.UNREAD,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    return result.count;
  }
}
