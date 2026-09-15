import { PrismaClient, Prisma, BeneficiaryStatus, AuditEventType } from '@prisma/client';
import { CreateBeneficiaryParams, UpdateBeneficiaryParams, BeneficiaryFilterOptions } from '../types/beneficiary.types';

const globalPrisma = new PrismaClient();

export class BeneficiaryRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || globalPrisma;
  }

  public async createBeneficiary(params: CreateBeneficiaryParams, actorId: string): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const beneficiary = await tx.beneficiary.create({
        data: {
          name: params.name.trim(),
          contactPerson: params.contactPerson ? params.contactPerson.trim() : null,
          email: params.email ? params.email.trim().toLowerCase() : null,
          phone: params.phone ? params.phone.trim() : null,
          address: params.address.trim(),
          status: params.status || BeneficiaryStatus.ACTIVE,
          notes: params.notes ? params.notes.trim() : null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: AuditEventType.BENEFICIARY_CREATED,
          entityType: 'Beneficiary',
          entityId: beneficiary.id,
          metadata: {
            name: beneficiary.name,
            status: beneficiary.status,
          },
        },
      });

      return beneficiary;
    });
  }

  public async findBeneficiaries(options: BeneficiaryFilterOptions): Promise<[any[], number]> {
    const skip = (options.page - 1) * options.limit;
    const where: Prisma.BeneficiaryWhereInput = {};

    if (options.status) {
      where.status = options.status;
    }

    if (options.search) {
      const s = options.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { contactPerson: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
        { address: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.beneficiary.findMany({
        where,
        skip,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.beneficiary.count({ where }),
    ]);

    return [items, total];
  }

  public async findBeneficiaryById(id: string): Promise<any | null> {
    return this.prisma.beneficiary.findUnique({
      where: { id },
    });
  }

  public async updateBeneficiary(
    id: string,
    params: UpdateBeneficiaryParams,
    actorId: string
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.beneficiary.findUnique({ where: { id } });
      if (!existing) return null;

      const data: Prisma.BeneficiaryUpdateInput = {};
      if (params.name !== undefined) data.name = params.name.trim();
      if (params.contactPerson !== undefined) data.contactPerson = params.contactPerson ? params.contactPerson.trim() : null;
      if (params.email !== undefined) data.email = params.email ? params.email.trim().toLowerCase() : null;
      if (params.phone !== undefined) data.phone = params.phone ? params.phone.trim() : null;
      if (params.address !== undefined) data.address = params.address.trim();
      if (params.status !== undefined) data.status = params.status;
      if (params.notes !== undefined) data.notes = params.notes ? params.notes.trim() : null;

      const updated = await tx.beneficiary.update({
        where: { id },
        data,
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: AuditEventType.BENEFICIARY_UPDATED,
          entityType: 'Beneficiary',
          entityId: updated.id,
          metadata: {
            previousStatus: existing.status,
            newStatus: updated.status,
            updatedFields: Object.keys(data),
          },
        },
      });

      return updated;
    });
  }

  public async findBeneficiaryHistory(
    beneficiaryId: string,
    page: number,
    limit: number
  ): Promise<[any[], number]> {
    const skip = (page - 1) * limit;
    const where: Prisma.DistributionRecordWhereInput = { beneficiaryId };

    const [items, total] = await Promise.all([
      this.prisma.distributionRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { distributedAt: 'desc' },
        include: {
          inventory: {
            select: {
              id: true,
              foodCategory: true,
              description: true,
              unit: true,
            },
          },
          distributor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.distributionRecord.count({ where }),
    ]);

    return [items, total];
  }
}
