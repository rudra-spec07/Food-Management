import {
  PrismaClient,
  Prisma,
  PickupStatus,
  PickupEventType,
  DonationStatus,
  AssignmentStatus,
  AuditEventType,
  UserRole,
  DonationCategory,
  DonationQuantityUnit,
  InventoryStatus,
  MovementType,
} from '@prisma/client';
import { ConflictError, NotFoundError } from '../../../shared/errors/app-error';

const globalPrisma = new PrismaClient();

export class PickupRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || globalPrisma;
  }

  public get client(): PrismaClient {
    return this.prisma;
  }

  public async findWorkerPickups(
    workerId: string,
    options: { page: number; limit: number; status?: PickupStatus }
  ): Promise<[any[], number]> {
    const skip = (options.page - 1) * options.limit;
    const where: Prisma.PickupWhereInput = { workerId };

    if (options.status) {
      where.status = options.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.pickup.findMany({
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
              quantity: true,
              quantityUnit: true,
              preparedAt: true,
              expiresAt: true,
              pickupAddress: true,
              contactName: true,
              contactPhone: true,
              photoUrl: true,
              status: true,
              donor: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.pickup.count({ where }),
    ]);

    return [items, total];
  }

  public async findWorkerPickupDetail(pickupId: string, workerId: string): Promise<any | null> {
    return this.prisma.pickup.findFirst({
      where: {
        id: pickupId,
        workerId,
      },
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
        assignment: {
          select: {
            id: true,
            assignedAt: true,
            respondedAt: true,
            status: true,
          },
        },
        events: {
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

  public async findAdminPickups(options: {
    page: number;
    limit: number;
    status?: PickupStatus;
    workerId?: string;
    donationId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<[any[], number]> {
    const skip = (options.page - 1) * options.limit;
    const where: Prisma.PickupWhereInput = {};

    if (options.status) {
      where.status = options.status;
    }
    if (options.workerId) {
      where.workerId = options.workerId;
    }
    if (options.donationId) {
      where.donationId = options.donationId;
    }
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = new Date(options.startDate);
      }
      if (options.endDate) {
        where.createdAt.lte = new Date(options.endDate);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.pickup.findMany({
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
              status: true,
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
          worker: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          assignment: {
            select: {
              id: true,
              status: true,
              assignedAt: true,
            },
          },
        },
      }),
      this.prisma.pickup.count({ where }),
    ]);

    return [items, total];
  }

  public async findAdminPickupDetail(pickupId: string): Promise<any | null> {
    return this.prisma.pickup.findUnique({
      where: { id: pickupId },
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
        worker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            status: true,
          },
        },
        assignment: {
          select: {
            id: true,
            status: true,
            assignedAt: true,
            respondedAt: true,
          },
        },
        events: {
          orderBy: { createdAt: 'asc' },
          include: {
            actor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }

  public async findPickupEvents(pickupId: string): Promise<any[]> {
    const pickup = await this.prisma.pickup.findUnique({
      where: { id: pickupId },
      select: { id: true },
    });

    if (!pickup) {
      throw new NotFoundError('Pickup not found', 'PICKUP_NOT_FOUND');
    }

    return this.prisma.pickupEvent.findMany({
      where: { pickupId },
      orderBy: { createdAt: 'asc' },
      include: {
        actor: {
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

  public async executeStartPickupTransaction(params: {
    pickupId: string;
    workerId: string;
  }): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock Hierarchy: Lock donation first, then assignment, then pickup
      // A. Lock pickup row first to discover donation_id & assignment_id
      const lockedPickups = await tx.$queryRaw<
        Array<{
          id: string;
          donationId?: string;
          donation_id?: string;
          assignmentId?: string;
          assignment_id?: string;
          workerId?: string;
          worker_id?: string;
          status: PickupStatus;
        }>
      >`
        SELECT id, donation_id AS "donationId", assignment_id AS "assignmentId", worker_id AS "workerId", status FROM pickups WHERE id = ${params.pickupId}::uuid FOR UPDATE
      `;

      if (!lockedPickups || lockedPickups.length === 0) {
        throw new NotFoundError('Pickup not found', 'PICKUP_NOT_FOUND');
      }

      const lockedPickup = lockedPickups[0];
      const pWorkerId = lockedPickup.workerId || lockedPickup.worker_id;
      const pDonationId = lockedPickup.donationId || lockedPickup.donation_id;
      const pAssignmentId = lockedPickup.assignmentId || lockedPickup.assignment_id;

      if (pWorkerId !== params.workerId) {
        throw new NotFoundError('Pickup not found', 'PICKUP_NOT_FOUND');
      }

      if (lockedPickup.status === PickupStatus.IN_PROGRESS) {
        throw new ConflictError('Pickup has already been started', 'PICKUP_ALREADY_STARTED');
      }

      if (lockedPickup.status !== PickupStatus.NOT_STARTED) {
        throw new ConflictError(
          `Pickup cannot be started from current status ${lockedPickup.status}`,
          'PICKUP_INVALID_STATE'
        );
      }

      // B. Lock donation
      const lockedDonations = await tx.$queryRaw<Array<{ id: string; status: DonationStatus }>>`
        SELECT id, status FROM donations WHERE id = ${pDonationId}::uuid FOR UPDATE
      `;

      if (!lockedDonations || lockedDonations.length === 0) {
        throw new NotFoundError('Donation not found', 'DONATION_NOT_FOUND');
      }

      const lockedDonation = lockedDonations[0];

      if (lockedDonation.status !== DonationStatus.ACCEPTED) {
        throw new ConflictError(
          `Donation must be in ACCEPTED state to start pickup. Current state: ${lockedDonation.status}`,
          'PICKUP_DONATION_INVALID_STATE'
        );
      }

      // C. Lock assignment
      const lockedAssignments = await tx.$queryRaw<Array<{ id: string; status: AssignmentStatus }>>`
        SELECT id, status FROM assignments WHERE id = ${pAssignmentId}::uuid FOR UPDATE
      `;

      if (!lockedAssignments || lockedAssignments.length === 0) {
        throw new NotFoundError('Assignment not found', 'ASSIGNMENT_NOT_FOUND');
      }

      const lockedAssignment = lockedAssignments[0];

      if (lockedAssignment.status !== AssignmentStatus.ACCEPTED) {
        throw new ConflictError(
          `Assignment must be ACCEPTED to start pickup. Current state: ${lockedAssignment.status}`,
          'PICKUP_ASSIGNMENT_NOT_ACCEPTED'
        );
      }

      const now = new Date();

      // Perform updates
      const updatedPickup = await tx.pickup.update({
        where: { id: params.pickupId },
        data: {
          status: PickupStatus.IN_PROGRESS,
          startedAt: now,
        },
      });

      const updatedDonation = await tx.donation.update({
        where: { id: pDonationId },
        data: { status: DonationStatus.PICKED_UP },
      });

      await tx.donationStatusHistory.create({
        data: {
          donationId: pDonationId!,
          fromStatus: DonationStatus.ACCEPTED,
          toStatus: DonationStatus.PICKED_UP,
          changedBy: params.workerId,
          reason: 'Worker started food pickup',
        },
      });

      await tx.pickupEvent.create({
        data: {
          pickupId: params.pickupId,
          eventType: PickupEventType.PICKUP_STARTED,
          actorId: params.workerId,
          actorRole: UserRole.WORKER,
          fromStatus: PickupStatus.NOT_STARTED,
          toStatus: PickupStatus.IN_PROGRESS,
          notes: 'Pickup started by worker',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: params.workerId,
          action: AuditEventType.PICKUP_STARTED,
          entityType: 'Pickup',
          entityId: params.pickupId,
          metadata: {
            donationId: pDonationId,
            assignmentId: pAssignmentId,
            workerId: params.workerId,
            previousStatus: PickupStatus.NOT_STARTED,
            newStatus: PickupStatus.IN_PROGRESS,
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          aggregateType: 'Pickup',
          aggregateId: params.pickupId,
          eventType: 'PICKUP_STARTED',
          payload: {
            pickupId: params.pickupId,
            donationId: pDonationId,
            assignmentId: pAssignmentId,
            workerId: params.workerId,
            previousStatus: PickupStatus.NOT_STARTED,
            newStatus: PickupStatus.IN_PROGRESS,
            timestamp: now.toISOString(),
          },
        },
      });

      return { pickup: updatedPickup, donation: updatedDonation };
    });
  }

  public async executeCompletePickupTransaction(params: {
    pickupId: string;
    workerId: string;
    completionNotes?: string;
  }): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock pickup row
      const lockedPickups = await tx.$queryRaw<
        Array<{
          id: string;
          donationId?: string;
          donation_id?: string;
          assignmentId?: string;
          assignment_id?: string;
          workerId?: string;
          worker_id?: string;
          status: PickupStatus;
        }>
      >`
        SELECT id, donation_id AS "donationId", assignment_id AS "assignmentId", worker_id AS "workerId", status FROM pickups WHERE id = ${params.pickupId}::uuid FOR UPDATE
      `;

      if (!lockedPickups || lockedPickups.length === 0) {
        throw new NotFoundError('Pickup not found', 'PICKUP_NOT_FOUND');
      }

      const lockedPickup = lockedPickups[0];
      const pWorkerId = lockedPickup.workerId || lockedPickup.worker_id;
      const pDonationId = lockedPickup.donationId || lockedPickup.donation_id;
      const pAssignmentId = lockedPickup.assignmentId || lockedPickup.assignment_id;

      if (pWorkerId !== params.workerId) {
        throw new NotFoundError('Pickup not found', 'PICKUP_NOT_FOUND');
      }

      if (lockedPickup.status === PickupStatus.COMPLETED) {
        throw new ConflictError('Pickup has already been completed', 'PICKUP_ALREADY_COMPLETED');
      }

      if (lockedPickup.status !== PickupStatus.IN_PROGRESS) {
        throw new ConflictError(
          `Pickup is not in IN_PROGRESS state. Current status: ${lockedPickup.status}`,
          'PICKUP_INVALID_STATE'
        );
      }

      // 2. Lock donation
      const lockedDonations = await tx.$queryRaw<
        Array<{
          id: string;
          status: DonationStatus;
          foodCategory: DonationCategory;
          description: string;
          quantity: Prisma.Decimal;
          unit: DonationQuantityUnit;
          expirationDate?: Date;
          location?: string;
        }>
      >`
        SELECT id, status, category AS "foodCategory", description, quantity, quantity_unit AS "unit", expires_at AS "expirationDate", pickup_address AS "location" FROM donations WHERE id = ${pDonationId}::uuid FOR UPDATE
      `;

      if (!lockedDonations || lockedDonations.length === 0) {
        throw new NotFoundError('Donation not found', 'DONATION_NOT_FOUND');
      }

      const lockedDonation = lockedDonations[0];

      // STRICT CHECK: Completion requires Donation = PICKED_UP
      if (lockedDonation.status !== DonationStatus.PICKED_UP) {
        throw new ConflictError(
          `Donation must be in PICKED_UP state to complete pickup. Current state: ${lockedDonation.status}`,
          'PICKUP_DONATION_INVALID_STATE'
        );
      }

      // 3. Lock assignment
      const lockedAssignments = await tx.$queryRaw<Array<{ id: string; status: AssignmentStatus }>>`
        SELECT id, status FROM assignments WHERE id = ${pAssignmentId}::uuid FOR UPDATE
      `;

      if (!lockedAssignments || lockedAssignments.length === 0) {
        throw new NotFoundError('Assignment not found', 'ASSIGNMENT_NOT_FOUND');
      }

      const lockedAssignment = lockedAssignments[0];

      if (lockedAssignment.status !== AssignmentStatus.ACCEPTED) {
        throw new ConflictError(
          `Assignment must be ACCEPTED to complete pickup. Current state: ${lockedAssignment.status}`,
          'PICKUP_ASSIGNMENT_NOT_ACCEPTED'
        );
      }

      const now = new Date();
      const normalizedNotes = params.completionNotes?.trim() || null;

      // Updates
      const updatedPickup = await tx.pickup.update({
        where: { id: params.pickupId },
        data: {
          status: PickupStatus.COMPLETED,
          completedAt: now,
          completionNotes: normalizedNotes,
        },
      });

      const updatedDonation = await tx.donation.update({
        where: { id: pDonationId },
        data: {
          status: DonationStatus.COMPLETED,
          completedAt: now,
        },
      });

      // Create InventoryItem (status = AVAILABLE)
      const inventoryItem = await tx.inventoryItem.create({
        data: {
          donationId: pDonationId!,
          pickupId: params.pickupId,
          foodCategory: lockedDonation.foodCategory,
          description: lockedDonation.description,
          totalQuantity: lockedDonation.quantity,
          availableQuantity: lockedDonation.quantity,
          reservedQuantity: 0,
          distributedQuantity: 0,
          unit: lockedDonation.unit,
          status: InventoryStatus.AVAILABLE,
          location: lockedDonation.location || null,
          expirationDate: lockedDonation.expirationDate || null,
          donorReference: `Donation Batch ${pDonationId?.slice(0, 8)}`,
        },
      });

      // Create InventoryMovement (INFLOW)
      await tx.inventoryMovement.create({
        data: {
          inventoryId: inventoryItem.id,
          movementType: MovementType.INFLOW,
          quantity: lockedDonation.quantity,
          unit: lockedDonation.unit,
          previousAvailableQuantity: 0,
          resultingAvailableQuantity: lockedDonation.quantity,
          referenceType: 'PICKUP',
          referenceId: params.pickupId,
          actorId: params.workerId,
          actorRole: UserRole.WORKER,
          notes: normalizedNotes
            ? `Inventory inflow upon pickup completion: ${normalizedNotes}`
            : 'Automatic inventory inflow upon worker pickup completion',
        },
      });

      await tx.donationStatusHistory.create({
        data: {
          donationId: pDonationId!,
          fromStatus: DonationStatus.PICKED_UP,
          toStatus: DonationStatus.COMPLETED,
          changedBy: params.workerId,
          reason: normalizedNotes
            ? `Worker completed pickup: ${normalizedNotes}`
            : 'Worker completed pickup',
        },
      });

      await tx.pickupEvent.create({
        data: {
          pickupId: params.pickupId,
          eventType: PickupEventType.PICKUP_COMPLETED,
          actorId: params.workerId,
          actorRole: UserRole.WORKER,
          fromStatus: PickupStatus.IN_PROGRESS,
          toStatus: PickupStatus.COMPLETED,
          notes: normalizedNotes,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: params.workerId,
          action: AuditEventType.PICKUP_COMPLETED,
          entityType: 'Pickup',
          entityId: params.pickupId,
          metadata: {
            donationId: pDonationId,
            assignmentId: pAssignmentId,
            workerId: params.workerId,
            completionNotes: normalizedNotes,
            previousStatus: PickupStatus.IN_PROGRESS,
            newStatus: PickupStatus.COMPLETED,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: params.workerId,
          action: AuditEventType.DONATION_COMPLETED,
          entityType: 'Donation',
          entityId: pDonationId!,
          metadata: {
            pickupId: params.pickupId,
            workerId: params.workerId,
            previousStatus: DonationStatus.PICKED_UP,
            newStatus: DonationStatus.COMPLETED,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: params.workerId,
          action: AuditEventType.INVENTORY_CREATED,
          entityType: 'InventoryItem',
          entityId: inventoryItem.id,
          metadata: {
            donationId: pDonationId,
            pickupId: params.pickupId,
            workerId: params.workerId,
            quantity: lockedDonation.quantity.toString(),
            unit: lockedDonation.unit,
            status: InventoryStatus.AVAILABLE,
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          aggregateType: 'Pickup',
          aggregateId: params.pickupId,
          eventType: 'PICKUP_COMPLETED',
          payload: {
            pickupId: params.pickupId,
            donationId: pDonationId,
            assignmentId: pAssignmentId,
            inventoryId: inventoryItem.id,
            workerId: params.workerId,
            completionNotes: normalizedNotes,
            previousStatus: PickupStatus.IN_PROGRESS,
            newStatus: PickupStatus.COMPLETED,
            timestamp: now.toISOString(),
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          aggregateType: 'InventoryItem',
          aggregateId: inventoryItem.id,
          eventType: 'INVENTORY_CREATED',
          payload: {
            inventoryId: inventoryItem.id,
            donationId: pDonationId,
            pickupId: params.pickupId,
            quantity: lockedDonation.quantity.toString(),
            unit: lockedDonation.unit,
            foodCategory: lockedDonation.foodCategory,
            status: InventoryStatus.AVAILABLE,
            timestamp: now.toISOString(),
          },
        },
      });

      return { pickup: updatedPickup, donation: updatedDonation, inventoryItem };
    });
  }

  public async executeFailPickupTransaction(params: {
    pickupId: string;
    workerId: string;
    reason: string;
  }): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock pickup row
      const lockedPickups = await tx.$queryRaw<
        Array<{
          id: string;
          donationId?: string;
          donation_id?: string;
          assignmentId?: string;
          assignment_id?: string;
          workerId?: string;
          worker_id?: string;
          status: PickupStatus;
        }>
      >`
        SELECT id, donation_id AS "donationId", assignment_id AS "assignmentId", worker_id AS "workerId", status FROM pickups WHERE id = ${params.pickupId}::uuid FOR UPDATE
      `;

      if (!lockedPickups || lockedPickups.length === 0) {
        throw new NotFoundError('Pickup not found', 'PICKUP_NOT_FOUND');
      }

      const lockedPickup = lockedPickups[0];
      const pWorkerId = lockedPickup.workerId || lockedPickup.worker_id;
      const pDonationId = lockedPickup.donationId || lockedPickup.donation_id;
      const pAssignmentId = lockedPickup.assignmentId || lockedPickup.assignment_id;

      if (pWorkerId !== params.workerId) {
        throw new NotFoundError('Pickup not found', 'PICKUP_NOT_FOUND');
      }

      if (lockedPickup.status === PickupStatus.FAILED) {
        throw new ConflictError('Pickup has already been failed', 'PICKUP_ALREADY_FAILED');
      }

      if (lockedPickup.status !== PickupStatus.IN_PROGRESS) {
        throw new ConflictError(
          `Only IN_PROGRESS pickups can be failed. Current status: ${lockedPickup.status}`,
          'PICKUP_INVALID_STATE'
        );
      }

      // 2. Lock donation
      const lockedDonations = await tx.$queryRaw<Array<{ id: string; status: DonationStatus }>>`
        SELECT id, status FROM donations WHERE id = ${pDonationId}::uuid FOR UPDATE
      `;

      if (!lockedDonations || lockedDonations.length === 0) {
        throw new NotFoundError('Donation not found', 'DONATION_NOT_FOUND');
      }

      // 3. Lock assignment
      const lockedAssignments = await tx.$queryRaw<Array<{ id: string; status: AssignmentStatus }>>`
        SELECT id, status FROM assignments WHERE id = ${pAssignmentId}::uuid FOR UPDATE
      `;

      if (!lockedAssignments || lockedAssignments.length === 0) {
        throw new NotFoundError('Assignment not found', 'ASSIGNMENT_NOT_FOUND');
      }

      const now = new Date();
      const normalizedReason = params.reason.trim();

      // Update Pickup to FAILED
      const updatedPickup = await tx.pickup.update({
        where: { id: params.pickupId },
        data: {
          status: PickupStatus.FAILED,
          failedAt: now,
          failureReason: normalizedReason,
        },
      });

      // Note: Donation status remains as-is (no automatic reassignment per Correction #2)

      await tx.pickupEvent.create({
        data: {
          pickupId: params.pickupId,
          eventType: PickupEventType.PICKUP_FAILED,
          actorId: params.workerId,
          actorRole: UserRole.WORKER,
          fromStatus: PickupStatus.IN_PROGRESS,
          toStatus: PickupStatus.FAILED,
          notes: normalizedReason,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: params.workerId,
          action: AuditEventType.PICKUP_FAILED,
          entityType: 'Pickup',
          entityId: params.pickupId,
          metadata: {
            donationId: pDonationId,
            assignmentId: pAssignmentId,
            workerId: params.workerId,
            failureReason: normalizedReason,
            previousStatus: PickupStatus.IN_PROGRESS,
            newStatus: PickupStatus.FAILED,
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          aggregateType: 'Pickup',
          aggregateId: params.pickupId,
          eventType: 'PICKUP_FAILED',
          payload: {
            pickupId: params.pickupId,
            donationId: pDonationId,
            assignmentId: pAssignmentId,
            workerId: params.workerId,
            failureReason: normalizedReason,
            previousStatus: PickupStatus.IN_PROGRESS,
            newStatus: PickupStatus.FAILED,
            timestamp: now.toISOString(),
          },
        },
      });

      return { pickup: updatedPickup };
    });
  }
}
