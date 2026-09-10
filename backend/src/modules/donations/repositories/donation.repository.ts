import { PrismaClient, Prisma, Donation, DonationStatus, AuditEventType } from '@prisma/client';

const globalPrisma = new PrismaClient();

export class DonationRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || globalPrisma;
  }

  public get client(): PrismaClient {
    return this.prisma;
  }

  public async create(
    data: Prisma.DonationCreateInput,
    tx?: Prisma.TransactionClient
  ): Promise<Donation> {
    const client = tx || this.prisma;
    return client.donation.create({
      data,
    });
  }

  public async findById(
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<Donation | null> {
    const client = tx || this.prisma;
    return client.donation.findUnique({
      where: { id },
      include: {
        statusHistory: {
          orderBy: { changedAt: 'asc' },
        },
      },
    });
  }

  public async findByIdAndDonor(
    id: string,
    donorId: string,
    tx?: Prisma.TransactionClient
  ): Promise<Donation | null> {
    const client = tx || this.prisma;
    return client.donation.findFirst({
      where: {
        id,
        donorId,
      },
      include: {
        statusHistory: {
          orderBy: { changedAt: 'asc' },
        },
      },
    });
  }

  public async findManyByDonor(
    donorId: string,
    page: number,
    limit: number,
    status?: DonationStatus,
    tx?: Prisma.TransactionClient
  ): Promise<[Donation[], number]> {
    const client = tx || this.prisma;
    const skip = (page - 1) * limit;

    const where: Prisma.DonationWhereInput = {
      donorId,
      ...(status ? { status } : {}),
    };

    const [items, total] = await Promise.all([
      client.donation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      client.donation.count({ where }),
    ]);

    return [items, total];
  }

  public async update(
    id: string,
    data: Prisma.DonationUpdateInput,
    tx?: Prisma.TransactionClient
  ): Promise<Donation> {
    const client = tx || this.prisma;
    return client.donation.update({
      where: { id },
      data,
    });
  }

  public async createStatusHistory(
    data: Prisma.DonationStatusHistoryCreateInput,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = tx || this.prisma;
    await client.donationStatusHistory.create({
      data,
    });
  }

  public async createAuditLog(
    data: {
      userId: string;
      action: AuditEventType;
      entityType: string;
      entityId: string;
      metadata?: Prisma.InputJsonValue;
    },
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = tx || this.prisma;
    await client.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: data.metadata ?? Prisma.JsonNull,
      },
    });
  }
}
