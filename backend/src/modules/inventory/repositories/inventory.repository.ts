import { PrismaClient, Prisma, InventoryStatus, DonationCategory } from '@prisma/client';
import { NotFoundError } from '../../../shared/errors/app-error';

const globalPrisma = new PrismaClient();

export class InventoryRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || globalPrisma;
  }

  public async getSummary(): Promise<{
    totalFoodItems: number;
    availableInventoryCount: number;
    reservedInventoryCount: number;
    distributedInventoryCount: number;
    lowAvailabilityCount: number;
  }> {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const [
      totalFoodItems,
      availableInventoryCount,
      reservedInventoryCount,
      distributedInventoryCount,
    ] = await Promise.all([
      this.prisma.inventoryItem.count(),
      this.prisma.inventoryItem.count({ where: { status: InventoryStatus.AVAILABLE } }),
      this.prisma.inventoryItem.count({ where: { status: InventoryStatus.RESERVED } }),
      this.prisma.inventoryItem.count({
        where: {
          OR: [
            { status: InventoryStatus.DISTRIBUTED },
            { distributedQuantity: { gt: 0 } },
          ],
        },
      }),
    ]);

    // Unit-independent low-availability rule: percentage threshold (availableQuantity / totalQuantity <= 0.20) OR expiring within 24h
    let lowAvailabilityCount = 0;
    const allAvailable = await this.prisma.inventoryItem.findMany({
      where: { status: InventoryStatus.AVAILABLE },
      select: { totalQuantity: true, availableQuantity: true, expirationDate: true },
    });

    for (const item of allAvailable) {
      const total = Number(item.totalQuantity);
      const available = Number(item.availableQuantity);
      const isExpiring = item.expirationDate && new Date(item.expirationDate) <= next24Hours;
      const isLowRatio = total > 0 && available / total <= 0.20;

      if (isExpiring || isLowRatio) {
        lowAvailabilityCount++;
      }
    }

    return {
      totalFoodItems,
      availableInventoryCount,
      reservedInventoryCount,
      distributedInventoryCount,
      lowAvailabilityCount,
    };
  }

  public async findItems(options: {
    page: number;
    limit: number;
    search?: string;
    foodCategory?: DonationCategory;
    status?: InventoryStatus;
    availability?: string;
  }): Promise<[any[], number]> {
    const skip = (options.page - 1) * options.limit;
    const where: Prisma.InventoryItemWhereInput = {};

    if (options.status) {
      where.status = options.status;
    }
    if (options.foodCategory) {
      where.foodCategory = options.foodCategory;
    }
    if (options.search) {
      const s = options.search.trim();
      where.OR = [
        { description: { contains: s, mode: 'insensitive' } },
        { location: { contains: s, mode: 'insensitive' } },
        { donorReference: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        skip,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          donation: {
            select: {
              id: true,
              category: true,
              description: true,
              contactName: true,
              contactPhone: true,
              donor: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return [items, total];
  }

  public async findItemDetail(inventoryId: string): Promise<any | null> {
    return this.prisma.inventoryItem.findUnique({
      where: { id: inventoryId },
      include: {
        donation: {
          include: {
            donor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        pickup: {
          select: {
            id: true,
            status: true,
            completedAt: true,
            worker: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        movements: {
          orderBy: { createdAt: 'asc' },
          include: {
            actor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }

  public async findItemHistory(inventoryId: string): Promise<any[]> {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: inventoryId },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundError('Inventory item not found', 'INVENTORY_NOT_FOUND');
    }

    return this.prisma.inventoryMovement.findMany({
      where: { inventoryId },
      orderBy: { createdAt: 'asc' },
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
  }
}
