import {
  PrismaClient,
  Prisma,
  InventoryStatus,
  MovementType,
  AuditEventType,
  ReservationStatus,
  UserRole,
} from '@prisma/client';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from '../../../shared/errors/app-error';
import {
  CreateReservationParams,
  ReservationFilterOptions,
} from '../types/reservation.types';

const globalPrisma = new PrismaClient();

export class ReservationRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || globalPrisma;
  }

  public async findReservations(
    options: ReservationFilterOptions,
    user: { id: string; role: UserRole }
  ): Promise<[any[], number]> {
    const skip = (options.page - 1) * options.limit;
    const where: Prisma.InventoryReservationWhereInput = {};

    // WORKER can only see their own reservations
    if (user.role === UserRole.WORKER) {
      where.reservedBy = user.id;
    } else if (options.reservedBy) {
      where.reservedBy = options.reservedBy;
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.inventoryId) {
      where.inventoryId = options.inventoryId;
    }

    const [items, total] = await Promise.all([
      this.prisma.inventoryReservation.findMany({
        where,
        skip,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          inventory: {
            select: {
              id: true,
              foodCategory: true,
              description: true,
              location: true,
              expirationDate: true,
            },
          },
          reserver: {
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
      this.prisma.inventoryReservation.count({ where }),
    ]);

    return [items, total];
  }

  public async findReservationDetail(
    reservationId: string,
    user: { id: string; role: UserRole }
  ): Promise<any | null> {
    const reservation = await this.prisma.inventoryReservation.findUnique({
      where: { id: reservationId },
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
        reserver: {
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

    if (!reservation) {
      return null;
    }

    // WORKER IDOR protection: cannot access another worker's reservation
    if (user.role === UserRole.WORKER && reservation.reservedBy !== user.id) {
      return null;
    }

    return reservation;
  }

  public async executeCreateReservationTransaction(
    params: CreateReservationParams
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
          expirationDate?: Date;
        }>
      >`
        SELECT
          id,
          total_quantity AS "totalQuantity",
          available_quantity AS "availableQuantity",
          reserved_quantity AS "reservedQuantity",
          distributed_quantity AS "distributedQuantity",
          unit,
          status,
          expiration_date AS "expirationDate"
        FROM inventory_items
        WHERE id = ${params.inventoryId}::uuid
        FOR UPDATE
      `;

      if (!lockedItems || lockedItems.length === 0) {
        throw new NotFoundError('Inventory item not found', 'INVENTORY_NOT_FOUND');
      }

      const lockedItem = lockedItems[0];
      const now = new Date();

      // 2. Check inventory status
      if (
        lockedItem.status === InventoryStatus.EXPIRED ||
        lockedItem.status === InventoryStatus.DISCARDED
      ) {
        throw new ConflictError(
          `Cannot reserve from inventory batch with status ${lockedItem.status}`,
          'INSUFFICIENT_INVENTORY'
        );
      }

      // 3. Check physical food expiration
      if (lockedItem.expirationDate && new Date(lockedItem.expirationDate) <= now) {
        throw new ConflictError(
          'Cannot reserve from physically expired food batch',
          'INSUFFICIENT_INVENTORY'
        );
      }

      const reqQuantity = new Prisma.Decimal(params.quantity);
      if (reqQuantity.lte(0)) {
        throw new BadRequestError('Reservation quantity must be greater than 0', 'INVALID_QUANTITY');
      }

      const currentAvailable = new Prisma.Decimal(lockedItem.availableQuantity);
      const currentReserved = new Prisma.Decimal(lockedItem.reservedQuantity);
      const currentDistributed = new Prisma.Decimal(lockedItem.distributedQuantity);
      const currentTotal = new Prisma.Decimal(lockedItem.totalQuantity);

      // 4. Quantity availability check
      if (reqQuantity.gt(currentAvailable)) {
        throw new ConflictError(
          `Requested quantity (${reqQuantity.toString()}) exceeds available quantity (${currentAvailable.toString()})`,
          'INSUFFICIENT_INVENTORY'
        );
      }

      // 5. Calculate expiration: Default 24h, max 72h, capped by food expirationDate
      const requestedDuration = params.durationHours || 24;
      const durationMs = Math.min(requestedDuration, 72) * 60 * 60 * 1000;
      let expiresAt = new Date(now.getTime() + durationMs);

      if (lockedItem.expirationDate) {
        const foodExpiry = new Date(lockedItem.expirationDate);
        if (foodExpiry < expiresAt) {
          expiresAt = foodExpiry;
        }
      }

      // 6. Mutate quantities
      const newAvailable = currentAvailable.minus(reqQuantity);
      const newReserved = currentReserved.plus(reqQuantity);

      // Invariant check: available + reserved + distributed = total
      const invariantSum = newAvailable.plus(newReserved).plus(currentDistributed);
      if (!invariantSum.equals(currentTotal)) {
        throw new ConflictError(
          'Inventory quantity invariant violation detected during reservation',
          'INVENTORY_INVARIANT_VIOLATION'
        );
      }

      // 7. Determine status
      let newStatus: InventoryStatus;
      if (newAvailable.equals(0) && newReserved.gt(0)) {
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
          status: newStatus,
        },
      });

      // 8. Create InventoryReservation
      const effectiveUnit = lockedItem.unit as any;
      const reservation = await tx.inventoryReservation.create({
        data: {
          inventoryId: params.inventoryId,
          reservedBy: params.reservedBy,
          quantity: reqQuantity,
          unit: effectiveUnit,
          status: ReservationStatus.ACTIVE,
          notes: params.notes ? params.notes.trim() : null,
          expiresAt,
        },
      });

      // 9. Create InventoryMovement (RESERVATION)
      await tx.inventoryMovement.create({
        data: {
          inventoryId: params.inventoryId,
          movementType: MovementType.RESERVATION,
          quantity: reqQuantity,
          unit: effectiveUnit,
          previousAvailableQuantity: currentAvailable,
          resultingAvailableQuantity: newAvailable,
          referenceType: 'RESERVATION',
          referenceId: reservation.id,
          actorId: params.reservedBy,
          actorRole: params.actorRole,
          notes: params.notes
            ? `Reserved ${reqQuantity.toString()} ${effectiveUnit}: ${params.notes.trim()}`
            : `Reserved ${reqQuantity.toString()} ${effectiveUnit}`,
        },
      });

      // 10. Record Audit Log
      await tx.auditLog.create({
        data: {
          userId: params.reservedBy,
          action: AuditEventType.INVENTORY_RESERVED,
          entityType: 'InventoryReservation',
          entityId: reservation.id,
          metadata: {
            inventoryId: params.inventoryId,
            quantity: reqQuantity.toString(),
            unit: effectiveUnit,
            previousAvailableQuantity: currentAvailable.toString(),
            resultingAvailableQuantity: newAvailable.toString(),
            expiresAt: expiresAt.toISOString(),
          },
        },
      });

      // 11. Record Outbox Event
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'InventoryReservation',
          aggregateId: reservation.id,
          eventType: 'RESERVATION_CREATED',
          payload: {
            reservationId: reservation.id,
            inventoryId: params.inventoryId,
            reservedBy: params.reservedBy,
            quantity: reqQuantity.toString(),
            unit: effectiveUnit,
            expiresAt: expiresAt.toISOString(),
            timestamp: now.toISOString(),
          },
        },
      });

      return reservation;
    });
  }

  public async executeReleaseReservationTransaction(params: {
    reservationId: string;
    user: { id: string; role: UserRole };
    reason?: string;
  }): Promise<any> {
    const txResult = await this.prisma.$transaction(async (tx) => {
      // 1. Discover inventoryId first
      const rawRes = await tx.inventoryReservation.findUnique({
        where: { id: params.reservationId },
        select: { id: true, inventoryId: true, reservedBy: true, status: true },
      });

      if (!rawRes) {
        throw new NotFoundError('Reservation not found', 'RESERVATION_NOT_FOUND');
      }

      // WORKER IDOR protection
      if (params.user.role === UserRole.WORKER && rawRes.reservedBy !== params.user.id) {
        throw new NotFoundError('Reservation not found', 'RESERVATION_NOT_FOUND');
      }

      // Lock Order: Lock InventoryItem first, then InventoryReservation second
      const lockedItems = await tx.$queryRaw<
        Array<{
          id: string;
          totalQuantity: Prisma.Decimal;
          availableQuantity: Prisma.Decimal;
          reservedQuantity: Prisma.Decimal;
          distributedQuantity: Prisma.Decimal;
          unit: string;
          status: InventoryStatus;
          expirationDate?: Date;
        }>
      >`
        SELECT
          id,
          total_quantity AS "totalQuantity",
          available_quantity AS "availableQuantity",
          reserved_quantity AS "reservedQuantity",
          distributed_quantity AS "distributedQuantity",
          unit,
          status,
          expiration_date AS "expirationDate"
        FROM inventory_items
        WHERE id = ${rawRes.inventoryId}::uuid
        FOR UPDATE
      `;

      if (!lockedItems || lockedItems.length === 0) {
        throw new NotFoundError('Inventory item not found', 'INVENTORY_NOT_FOUND');
      }

      const lockedItem = lockedItems[0];

      // Lock Reservation second
      const lockedReservations = await tx.$queryRaw<
        Array<{
          id: string;
          inventoryId: string;
          reservedBy: string;
          quantity: Prisma.Decimal;
          unit: string;
          status: ReservationStatus;
          expiresAt: Date;
          notes?: string | null;
        }>
      >`
        SELECT
          id,
          inventory_id AS "inventoryId",
          reserved_by AS "reservedBy",
          quantity,
          unit,
          status,
          expires_at AS "expiresAt",
          notes
        FROM inventory_reservations
        WHERE id = ${params.reservationId}::uuid
        FOR UPDATE
      `;

      if (!lockedReservations || lockedReservations.length === 0) {
        throw new NotFoundError('Reservation not found', 'RESERVATION_NOT_FOUND');
      }

      const lockedReservation = lockedReservations[0];

      // WORKER IDOR validation: workers can only release their own reservation
      if (params.user.role === UserRole.WORKER && lockedReservation.reservedBy !== params.user.id) {
        throw new NotFoundError('Reservation not found', 'RESERVATION_NOT_FOUND');
      }

      const now = new Date();

      // Check lazy expiration
      if (
        lockedReservation.status === ReservationStatus.ACTIVE &&
        new Date(lockedReservation.expiresAt) <= now
      ) {
        const resQuantity = new Prisma.Decimal(lockedReservation.quantity);
        const currentAvailable = new Prisma.Decimal(lockedItem.availableQuantity);
        const currentReserved = new Prisma.Decimal(lockedItem.reservedQuantity);
        const currentDistributed = new Prisma.Decimal(lockedItem.distributedQuantity);
        const currentTotal = new Prisma.Decimal(lockedItem.totalQuantity);

        const newReserved = Prisma.Decimal.max(0, currentReserved.minus(resQuantity));
        const isFoodExpired =
          (lockedItem as any).expirationDate && new Date((lockedItem as any).expirationDate) <= now;
        let newAvailable = currentAvailable;
        let newTotal = currentTotal;
        let newStatus: InventoryStatus = lockedItem.status as InventoryStatus;

        if (isFoodExpired) {
          newStatus = InventoryStatus.EXPIRED;
          newTotal = Prisma.Decimal.max(0, currentTotal.minus(resQuantity));
        } else {
          newAvailable = currentAvailable.plus(resQuantity);
          if (newAvailable.gt(0)) newStatus = InventoryStatus.AVAILABLE;
        }

        // Invariant check: available + reserved + distributed === total
        const invariantSum = newAvailable.plus(newReserved).plus(currentDistributed);
        if (!invariantSum.equals(newTotal)) {
          throw new ConflictError(
            'Inventory quantity invariant violation during lazy expiration',
            'INVENTORY_INVARIANT_VIOLATION'
          );
        }

        // Update reservation to EXPIRED
        await tx.inventoryReservation.update({
          where: { id: params.reservationId },
          data: { status: ReservationStatus.EXPIRED },
        });

        // Update inventory item
        await tx.inventoryItem.update({
          where: { id: rawRes.inventoryId },
          data: {
            totalQuantity: newTotal,
            availableQuantity: newAvailable,
            reservedQuantity: newReserved,
            status: newStatus,
          },
        });

        // Create movement (RELEASE or EXPIRATION_DISCARD)
        await tx.inventoryMovement.create({
          data: {
            inventoryId: rawRes.inventoryId,
            movementType: isFoodExpired ? MovementType.EXPIRATION_DISCARD : MovementType.RELEASE,
            quantity: resQuantity,
            unit: lockedReservation.unit as any,
            previousAvailableQuantity: currentAvailable,
            resultingAvailableQuantity: newAvailable,
            referenceType: 'RESERVATION_EXPIRATION',
            referenceId: params.reservationId,
            actorId: params.user.id,
            actorRole: params.user.role,
            notes: 'Lazy expiration of reservation',
          },
        });

        await tx.auditLog.create({
          data: {
            userId: params.user.id,
            action: AuditEventType.INVENTORY_RELEASED,
            entityType: 'InventoryReservation',
            entityId: params.reservationId,
            metadata: {
              reason: 'Lazy expiration',
              isFoodExpired,
            },
          },
        });

        return { isExpired: true };
      }

      // Check reservation status
      if (lockedReservation.status !== ReservationStatus.ACTIVE) {
        throw new ConflictError(
          `Reservation is not in ACTIVE state. Current status: ${lockedReservation.status}`,
          'RESERVATION_STATE_CONFLICT'
        );
      }

      // Process normal manual release
      const resQuantity = new Prisma.Decimal(lockedReservation.quantity);
      const currentAvailable = new Prisma.Decimal(lockedItem.availableQuantity);
      const currentReserved = new Prisma.Decimal(lockedItem.reservedQuantity);
      const currentDistributed = new Prisma.Decimal(lockedItem.distributedQuantity);
      const currentTotal = new Prisma.Decimal(lockedItem.totalQuantity);

      const newReserved = Prisma.Decimal.max(0, currentReserved.minus(resQuantity));
      const newAvailable = currentAvailable.plus(resQuantity);

      const invariantSum = newAvailable.plus(newReserved).plus(currentDistributed);
      if (!invariantSum.equals(currentTotal)) {
        throw new ConflictError(
          'Inventory quantity invariant violation during reservation release',
          'INVENTORY_INVARIANT_VIOLATION'
        );
      }

      let newStatus: InventoryStatus;
      if (newAvailable.gt(0)) {
        newStatus = InventoryStatus.AVAILABLE;
      } else {
        newStatus = lockedItem.status;
      }

      // Update Reservation
      const updatedReservation = await tx.inventoryReservation.update({
        where: { id: params.reservationId },
        data: {
          status: ReservationStatus.RELEASED,
          cancelledAt: now,
          notes: params.reason ? params.reason.trim() : lockedReservation.notes,
        },
      });

      // Update InventoryItem
      await tx.inventoryItem.update({
        where: { id: rawRes.inventoryId },
        data: {
          availableQuantity: newAvailable,
          reservedQuantity: newReserved,
          status: newStatus,
        },
      });

      // Create InventoryMovement (RELEASE)
      await tx.inventoryMovement.create({
        data: {
          inventoryId: rawRes.inventoryId,
          movementType: MovementType.RELEASE,
          quantity: resQuantity,
          unit: lockedReservation.unit as any,
          previousAvailableQuantity: currentAvailable,
          resultingAvailableQuantity: newAvailable,
          referenceType: 'RESERVATION_RELEASE',
          referenceId: params.reservationId,
          actorId: params.user.id,
          actorRole: params.user.role,
          notes: params.reason
            ? `Reservation released: ${params.reason.trim()}`
            : 'Reservation released by user',
        },
      });

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          userId: params.user.id,
          action: AuditEventType.INVENTORY_RELEASED,
          entityType: 'InventoryReservation',
          entityId: params.reservationId,
          metadata: {
            inventoryId: rawRes.inventoryId,
            quantity: resQuantity.toString(),
            reason: params.reason || null,
          },
        },
      });

      // Record Outbox Event
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'InventoryReservation',
          aggregateId: params.reservationId,
          eventType: 'RESERVATION_RELEASED',
          payload: {
            reservationId: params.reservationId,
            inventoryId: rawRes.inventoryId,
            releasedBy: params.user.id,
            quantity: resQuantity.toString(),
            timestamp: now.toISOString(),
          },
        },
      });

      return updatedReservation;
    });

    if (txResult && (txResult as any).isExpired) {
      throw new ConflictError('Reservation has expired', 'RESERVATION_EXPIRED');
    }

    return txResult;
  }
}
