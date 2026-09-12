import {
  PrismaClient,
  Prisma,
  InventoryStatus,
  MovementType,
  AuditEventType,
  DistributionStatus,
} from '@prisma/client';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from '../../../shared/errors/app-error';
import { DistributionTransactionParams, DistributionFilterOptions } from '../types/distribution.types';

const globalPrisma = new PrismaClient();

export class DistributionRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || globalPrisma;
  }

  public async findDistributions(options: DistributionFilterOptions): Promise<[any[], number]> {
    const skip = (options.page - 1) * options.limit;
    const where: Prisma.DistributionRecordWhereInput = {};

    if (options.search) {
      const s = options.search.trim();
      where.OR = [
        { recipientName: { contains: s, mode: 'insensitive' } },
        { notes: { contains: s, mode: 'insensitive' } },
        {
          inventory: {
            description: { contains: s, mode: 'insensitive' },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.distributionRecord.findMany({
        where,
        skip,
        take: options.limit,
        orderBy: { distributedAt: 'desc' },
        include: {
          inventory: {
            select: {
              id: true,
              foodCategory: true,
              description: true,
              location: true,
              donorReference: true,
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

  public async findDistributionDetail(id: string): Promise<any | null> {
    return this.prisma.distributionRecord.findUnique({
      where: { id },
      include: {
        inventory: {
          include: {
            donation: {
              select: {
                id: true,
                category: true,
                description: true,
                pickupAddress: true,
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
    });
  }

  public async executeCreateDistributionTransaction(
    params: DistributionTransactionParams
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock InventoryItem row using FOR UPDATE
      const lockedItems = await tx.$queryRaw<
        Array<{
          id: string;
          totalQuantity: Prisma.Decimal;
          availableQuantity: Prisma.Decimal;
          reservedQuantity: Prisma.Decimal;
          distributedQuantity: Prisma.Decimal;
          unit: string;
          status: InventoryStatus;
        }>
      >`
        SELECT 
          id, 
          total_quantity AS "totalQuantity", 
          available_quantity AS "availableQuantity", 
          reserved_quantity AS "reservedQuantity", 
          distributed_quantity AS "distributedQuantity", 
          unit, 
          status 
        FROM inventory_items 
        WHERE id = ${params.inventoryId}::uuid 
        FOR UPDATE
      `;

      if (!lockedItems || lockedItems.length === 0) {
        throw new NotFoundError('Inventory item not found', 'INVENTORY_NOT_FOUND');
      }

      const lockedItem = lockedItems[0];

      // 2. Check if inventory status allows distribution
      if (
        lockedItem.status === InventoryStatus.EXPIRED ||
        lockedItem.status === InventoryStatus.DISCARDED
      ) {
        throw new ConflictError(
          `Cannot distribute from inventory batch with status ${lockedItem.status}`,
          'INSUFFICIENT_INVENTORY'
        );
      }

      // 3. Unit validation
      if (params.unit && params.unit !== lockedItem.unit) {
        throw new BadRequestError(
          `Requested unit '${params.unit}' does not match inventory unit '${lockedItem.unit}'`,
          'UNIT_MISMATCH'
        );
      }

      const effectiveUnit = lockedItem.unit as any;
      const reqQuantity = new Prisma.Decimal(params.quantity);

      if (reqQuantity.lte(0)) {
        throw new BadRequestError('Distribution quantity must be greater than 0', 'INVALID_QUANTITY');
      }

      const currentAvailable = new Prisma.Decimal(lockedItem.availableQuantity);
      const currentReserved = new Prisma.Decimal(lockedItem.reservedQuantity);
      const currentDistributed = new Prisma.Decimal(lockedItem.distributedQuantity);
      const currentTotal = new Prisma.Decimal(lockedItem.totalQuantity);

      // 4. Quantity check
      if (reqQuantity.gt(currentAvailable)) {
        throw new ConflictError(
          `Requested quantity (${reqQuantity.toString()}) exceeds available quantity (${currentAvailable.toString()})`,
          'INSUFFICIENT_INVENTORY'
        );
      }

      // 5. Deduct available & increase distributed
      const newAvailable = currentAvailable.minus(reqQuantity);
      const newDistributed = currentDistributed.plus(reqQuantity);

      // 6. Invariant check: available + reserved + distributed = total
      const invariantSum = newAvailable.plus(currentReserved).plus(newDistributed);
      if (!invariantSum.equals(currentTotal)) {
        throw new ConflictError(
          'Inventory quantity invariant violation detected',
          'INVENTORY_INVARIANT_VIOLATION'
        );
      }

      // 7. Determine status
      let newStatus: InventoryStatus;
      if (newDistributed.equals(currentTotal)) {
        newStatus = InventoryStatus.DISTRIBUTED;
      } else if (newAvailable.equals(0) && currentReserved.gt(0)) {
        newStatus = InventoryStatus.RESERVED;
      } else if (newAvailable.gt(0)) {
        newStatus = InventoryStatus.AVAILABLE;
      } else {
        newStatus = lockedItem.status;
      }

      // 8. Update InventoryItem
      await tx.inventoryItem.update({
        where: { id: params.inventoryId },
        data: {
          availableQuantity: newAvailable,
          distributedQuantity: newDistributed,
          status: newStatus,
        },
      });

      // 9. Create DistributionRecord
      const distributionRecord = await tx.distributionRecord.create({
        data: {
          inventoryId: params.inventoryId,
          distributedBy: params.distributedBy,
          recipientName: params.recipientName.trim(),
          quantity: reqQuantity,
          unit: effectiveUnit,
          status: DistributionStatus.COMPLETED,
          notes: params.notes ? params.notes.trim() : null,
        },
      });

      // 10. Create immutable InventoryMovement (OUTFLOW)
      const movementNotes = params.notes
        ? `Distributed to ${params.recipientName.trim()}: ${params.notes.trim()}`
        : `Distributed to ${params.recipientName.trim()}`;

      await tx.inventoryMovement.create({
        data: {
          inventoryId: params.inventoryId,
          movementType: MovementType.OUTFLOW,
          quantity: reqQuantity,
          unit: effectiveUnit,
          previousAvailableQuantity: currentAvailable,
          resultingAvailableQuantity: newAvailable,
          referenceType: 'DISTRIBUTION',
          referenceId: distributionRecord.id,
          actorId: params.distributedBy,
          actorRole: params.actorRole,
          notes: movementNotes,
        },
      });

      // 11. Record Audit Log
      await tx.auditLog.create({
        data: {
          userId: params.distributedBy,
          action: AuditEventType.INVENTORY_DISTRIBUTED,
          entityType: 'DistributionRecord',
          entityId: distributionRecord.id,
          metadata: {
            inventoryId: params.inventoryId,
            recipientName: params.recipientName.trim(),
            quantity: reqQuantity.toString(),
            unit: effectiveUnit,
            previousAvailableQuantity: currentAvailable.toString(),
            resultingAvailableQuantity: newAvailable.toString(),
            newStatus,
          },
        },
      });

      // 12. Record Outbox Event
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'DistributionRecord',
          aggregateId: distributionRecord.id,
          eventType: 'INVENTORY_DISTRIBUTED',
          payload: {
            distributionId: distributionRecord.id,
            inventoryId: params.inventoryId,
            recipientName: params.recipientName.trim(),
            quantity: reqQuantity.toString(),
            unit: effectiveUnit,
            distributedBy: params.distributedBy,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return distributionRecord;
    });
  }
}
