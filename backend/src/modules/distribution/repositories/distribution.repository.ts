import {
  PrismaClient,
  Prisma,
  InventoryStatus,
  MovementType,
  AuditEventType,
  DistributionStatus,
  ReservationStatus,
  UserRole,
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
    const txResult = await this.prisma.$transaction(async (tx) => {
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

      let newAvailable = currentAvailable;
      let newReserved = currentReserved;
      let newDistributed = currentDistributed;

      const now = new Date();

      if (params.reservationId) {
        // MODE B — RESERVED FULFILLMENT
        const lockedReservations = await tx.$queryRaw<
          Array<{
            id: string;
            inventoryId: string;
            reservedBy: string;
            quantity: Prisma.Decimal;
            unit: string;
            status: ReservationStatus;
            expiresAt: Date;
          }>
        >`
          SELECT
            id,
            inventory_id AS "inventoryId",
            reserved_by AS "reservedBy",
            quantity,
            unit,
            status,
            expires_at AS "expiresAt"
          FROM inventory_reservations
          WHERE id = ${params.reservationId}::uuid
          FOR UPDATE
        `;

        if (!lockedReservations || lockedReservations.length === 0) {
          throw new NotFoundError('Reservation not found', 'RESERVATION_NOT_FOUND');
        }

        const lockedReservation = lockedReservations[0];

        if (lockedReservation.inventoryId !== params.inventoryId) {
          throw new BadRequestError(
            'Reservation does not belong to specified inventory batch',
            'RESERVATION_MISMATCH'
          );
        }

        // WORKER IDOR protection
        if (params.actorRole === UserRole.WORKER && lockedReservation.reservedBy !== params.distributedBy) {
          throw new NotFoundError('Reservation not found', 'RESERVATION_NOT_FOUND');
        }

        // Lazy expiration check
        if (
          lockedReservation.status === ReservationStatus.ACTIVE &&
          new Date(lockedReservation.expiresAt) <= now
        ) {
          const resQty = new Prisma.Decimal(lockedReservation.quantity);
          const adjReserved = Prisma.Decimal.max(0, currentReserved.minus(resQty));
          const isFoodExp = (lockedItem as any).expirationDate && new Date((lockedItem as any).expirationDate) <= now;
          let adjAvailable = currentAvailable;
          let adjTotal = currentTotal;
          let adjStatus: InventoryStatus = lockedItem.status as InventoryStatus;

          if (isFoodExp) {
            adjStatus = InventoryStatus.EXPIRED;
            adjTotal = Prisma.Decimal.max(0, currentTotal.minus(resQty));
          } else {
            adjAvailable = currentAvailable.plus(resQty);
            if (adjAvailable.gt(0)) adjStatus = InventoryStatus.AVAILABLE;
          }

          // Invariant check: available + reserved + distributed === total
          const invSum = adjAvailable.plus(adjReserved).plus(currentDistributed);
          if (!invSum.equals(adjTotal)) {
            throw new ConflictError(
              'Inventory quantity invariant violation during lazy expiration in distribution',
              'INVENTORY_INVARIANT_VIOLATION'
            );
          }

          await tx.inventoryReservation.update({
            where: { id: params.reservationId },
            data: { status: ReservationStatus.EXPIRED },
          });

          await tx.inventoryItem.update({
            where: { id: params.inventoryId },
            data: {
              totalQuantity: adjTotal,
              availableQuantity: adjAvailable,
              reservedQuantity: adjReserved,
              status: adjStatus,
            },
          });

          await tx.inventoryMovement.create({
            data: {
              inventoryId: params.inventoryId,
              movementType: isFoodExp ? MovementType.EXPIRATION_DISCARD : MovementType.RELEASE,
              quantity: resQty,
              unit: effectiveUnit,
              previousAvailableQuantity: currentAvailable,
              resultingAvailableQuantity: adjAvailable,
              referenceType: 'RESERVATION_EXPIRATION',
              referenceId: params.reservationId,
              actorId: params.distributedBy,
              actorRole: params.actorRole,
              notes: 'Lazy expiration during distribution attempt',
            },
          });

          return { isExpired: true };
        }

        if (lockedReservation.status !== ReservationStatus.ACTIVE) {
          throw new ConflictError(
            `Reservation is not in ACTIVE state. Current status: ${lockedReservation.status}`,
            'RESERVATION_STATE_CONFLICT'
          );
        }

        const resQuantity = new Prisma.Decimal(lockedReservation.quantity);
        // MVP Exact Fulfillment Rule: request.quantity must equal reservation.quantity
        if (!reqQuantity.equals(resQuantity)) {
          throw new BadRequestError(
            `Distribution quantity (${reqQuantity.toString()}) must equal full reservation quantity (${resQuantity.toString()}) for fulfillment`,
            'INVALID_RESERVATION_FULFILLMENT_QUANTITY'
          );
        }

        newReserved = Prisma.Decimal.max(0, currentReserved.minus(reqQuantity));
        newDistributed = currentDistributed.plus(reqQuantity);

        // Update reservation to FULFILLED
        await tx.inventoryReservation.update({
          where: { id: params.reservationId },
          data: {
            status: ReservationStatus.FULFILLED,
            fulfilledAt: now,
          },
        });
      } else {
        // MODE A — STANDARD DISTRIBUTION
        if (reqQuantity.gt(currentAvailable)) {
          throw new ConflictError(
            `Requested quantity (${reqQuantity.toString()}) exceeds available quantity (${currentAvailable.toString()})`,
            'INSUFFICIENT_INVENTORY'
          );
        }

        newAvailable = currentAvailable.minus(reqQuantity);
        newDistributed = currentDistributed.plus(reqQuantity);
      }

      // Invariant check: available + reserved + distributed = total
      const invariantSum = newAvailable.plus(newReserved).plus(newDistributed);
      if (!invariantSum.equals(currentTotal)) {
        throw new ConflictError(
          'Inventory quantity invariant violation detected',
          'INVENTORY_INVARIANT_VIOLATION'
        );
      }

      // Determine status
      let newStatus: InventoryStatus;
      if (newDistributed.equals(currentTotal)) {
        newStatus = InventoryStatus.DISTRIBUTED;
      } else if (newAvailable.equals(0) && newReserved.gt(0)) {
        newStatus = InventoryStatus.RESERVED;
      } else if (newAvailable.gt(0)) {
        newStatus = InventoryStatus.AVAILABLE;
      } else {
        newStatus = lockedItem.status;
      }

      // Update InventoryItem
      await tx.inventoryItem.update({
        where: { id: params.inventoryId },
        data: {
          availableQuantity: newAvailable,
          reservedQuantity: newReserved,
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

    if (txResult && (txResult as any).isExpired) {
      throw new ConflictError('Reservation has expired', 'RESERVATION_EXPIRED');
    }

    return txResult;
  }
}
