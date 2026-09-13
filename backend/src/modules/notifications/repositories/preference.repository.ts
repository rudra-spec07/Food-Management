import { PrismaClient, Prisma, NotificationPreference, NotificationChannel } from '@prisma/client';

const globalPrisma = new PrismaClient();

export class PreferenceRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || globalPrisma;
  }

  public get client(): PrismaClient {
    return this.prisma;
  }

  public async findUserPreferences(
    userId: string,
    tx?: Prisma.TransactionClient
  ): Promise<NotificationPreference[]> {
    const client = tx || this.prisma;
    return client.notificationPreference.findMany({
      where: { userId },
      orderBy: [{ eventType: 'asc' }, { channel: 'asc' }],
    });
  }

  public async findUserPreference(
    userId: string,
    eventType: string,
    channel: NotificationChannel,
    tx?: Prisma.TransactionClient
  ): Promise<NotificationPreference | null> {
    const client = tx || this.prisma;
    return client.notificationPreference.findUnique({
      where: {
        userId_eventType_channel: {
          userId,
          eventType,
          channel,
        },
      },
    });
  }

  public async upsertPreference(
    userId: string,
    eventType: string,
    channel: NotificationChannel,
    enabled: boolean,
    tx?: Prisma.TransactionClient
  ): Promise<NotificationPreference> {
    const client = tx || this.prisma;

    const pref = await client.notificationPreference.upsert({
      where: {
        userId_eventType_channel: {
          userId,
          eventType,
          channel,
        },
      },
      create: {
        userId,
        eventType,
        channel,
        enabled,
      },
      update: {
        enabled,
      },
    });

    return pref;
  }
}
