import { PrismaClient, Prisma, DonationStatus, AssignmentStatus, AuditEventType, UserRole, UserStatus, PickupStatus, PickupEventType } from '@prisma/client';
import { ConflictError, NotFoundError, BadRequestError } from '../../../shared/errors/app-error';

const globalPrisma = new PrismaClient();

export class AssignmentRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || globalPrisma;
  }

  public get client(): PrismaClient {
    return this.prisma;
  }

  public async findAssignmentQueue(options: {
    page: number;
    limit: number;
  }): Promise<[any[], number]> {
    const skip = (options.page - 1) * options.limit;
    const now = new Date();

    const where: Prisma.DonationWhereInput = {
      status: DonationStatus.APPROVED,
      expiresAt: { gt: now },
      assignments: {
        none: {
          status: {
            in: [AssignmentStatus.PENDING, AssignmentStatus.ACCEPTED],
          },
        },
      },
    };

    const [items, total] = await Promise.all([
      this.prisma.donation.findMany({
        where,
        skip,
        take: options.limit,
        orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          category: true,
          description: true,
          quantity: true,
          quantityUnit: true,
          preparedAt: true,
          expiresAt: true,
          pickupAddress: true,
          pickupLatitude: true,
          pickupLongitude: true,
          contactName: true,
          contactPhone: true,
          photoUrl: true,
          notes: true,
          status: true,
          createdAt: true,
          updatedAt: true,
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
      }),
      this.prisma.donation.count({ where }),
    ]);

    return [items, total];
  }

  public async findAssignmentHistoryByDonationId(donationId: string): Promise<any[]> {
    const donation = await this.prisma.donation.findUnique({
      where: { id: donationId },
      select: { id: true },
    });

    if (!donation) {
      throw new NotFoundError('Donation not found', 'DONATION_NOT_FOUND');
    }

    return this.prisma.assignment.findMany({
      where: { donationId },
      orderBy: { createdAt: 'desc' },
      include: {
        worker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        assigner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  public async findAdminAssignments(options: {
    page: number;
    limit: number;
    status?: AssignmentStatus;
  }): Promise<[any[], number]> {
    const skip = (options.page - 1) * options.limit;
    const where: Prisma.AssignmentWhereInput = {};

    if (options.status) {
      where.status = options.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.assignment.findMany({
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
              pickupLatitude: true,
              pickupLongitude: true,
              contactName: true,
              contactPhone: true,
              photoUrl: true,
              notes: true,
              status: true,
              createdAt: true,
              updatedAt: true,
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
          assigner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.assignment.count({ where }),
    ]);

    return [items, total];
  }

  public async findWorkerAssignments(
    workerId: string,
    options: { page: number; limit: number }
  ): Promise<[any[], number]> {
    const skip = (options.page - 1) * options.limit;
    const where: Prisma.AssignmentWhereInput = { workerId };

    const [items, total] = await Promise.all([
      this.prisma.assignment.findMany({
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
          pickup: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.assignment.count({ where }),
    ]);

    return [items, total];
  }

  public async findWorkerAssignmentDetail(
    assignmentId: string,
    workerId: string
  ): Promise<any | null> {
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
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
        assigner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        pickup: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    return assignment;
  }

  public async executeAssignWorkerTransaction(params: {
    donationId: string;
    workerId: string;
    adminId: string;
  }): Promise<{ assignment: any; updatedDonation: any }> {
    return this.prisma.$transaction(async (tx) => {
      // 1. PostgreSQL row-level lock on donation
      const lockedDonations = await tx.$queryRaw<Array<{ id: string; status: DonationStatus; expires_at: Date }>>`
        SELECT id, status, expires_at FROM donations WHERE id = ${params.donationId}::uuid FOR UPDATE
      `;

      if (!lockedDonations || lockedDonations.length === 0) {
        throw new NotFoundError('Donation not found', 'DONATION_NOT_FOUND');
      }

      const lockedDonation = lockedDonations[0];

      // 2. Verify donation status = APPROVED
      if (lockedDonation.status !== DonationStatus.APPROVED) {
        throw new ConflictError(
          `Donation is not eligible for assignment. Current status is ${lockedDonation.status}.`,
          'DONATION_NOT_ELIGIBLE_FOR_ASSIGNMENT'
        );
      }

      // 3. Verify donation expiry
      const now = new Date();
      if (new Date(lockedDonation.expires_at).getTime() <= now.getTime()) {
        throw new ConflictError('Donation has expired and cannot be assigned.', 'DONATION_EXPIRED');
      }

      // 4. Verify no active assignment exists for this donation
      const activeAssignment = await tx.assignment.findFirst({
        where: {
          donationId: params.donationId,
          status: {
            in: [AssignmentStatus.PENDING, AssignmentStatus.ACCEPTED],
          },
        },
      });

      if (activeAssignment) {
        throw new ConflictError(
          'Donation already has an active worker assignment.',
          'DONATION_ALREADY_ASSIGNED'
        );
      }

      // 5. Verify worker existence, role, and status INSIDE transaction
      const worker = await tx.user.findUnique({
        where: { id: params.workerId },
      });

      if (!worker) {
        throw new NotFoundError('Assigned worker user not found.', 'ASSIGNMENT_WORKER_NOT_FOUND');
      }

      if (worker.role !== UserRole.WORKER) {
        throw new BadRequestError('Assigned user must have WORKER role.', 'ASSIGNMENT_INVALID_WORKER_ROLE');
      }

      if (worker.status !== UserStatus.ACTIVE) {
        throw new BadRequestError('Assigned worker is inactive.', 'ASSIGNMENT_WORKER_INACTIVE');
      }

      // 6. Create Assignment record (PENDING)
      const assignment = await tx.assignment.create({
        data: {
          donationId: params.donationId,
          workerId: params.workerId,
          assignedBy: params.adminId,
          status: AssignmentStatus.PENDING,
          assignedAt: now,
        },
      });

      // 7. Update Donation status to ASSIGNED
      const updatedDonation = await tx.donation.update({
        where: { id: params.donationId },
        data: { status: DonationStatus.ASSIGNED },
      });

      // 8. Create DonationStatusHistory
      await tx.donationStatusHistory.create({
        data: {
          donationId: params.donationId,
          fromStatus: DonationStatus.APPROVED,
          toStatus: DonationStatus.ASSIGNED,
          changedBy: params.adminId,
          reason: `Assigned worker ${params.workerId}`,
        },
      });

      // 9. Create AuditLog
      await tx.auditLog.create({
        data: {
          userId: params.adminId,
          action: AuditEventType.DONATION_ASSIGNED,
          entityType: 'Assignment',
          entityId: assignment.id,
          metadata: {
            donationId: params.donationId,
            workerId: params.workerId,
            assignedBy: params.adminId,
            previousStatus: DonationStatus.APPROVED,
            newStatus: DonationStatus.ASSIGNED,
          },
        },
      });

      // 10. Create OutboxEvent
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'Donation',
          aggregateId: params.donationId,
          eventType: 'DONATION_ASSIGNED',
          payload: {
            assignmentId: assignment.id,
            donationId: params.donationId,
            workerId: params.workerId,
            assignedBy: params.adminId,
            previousStatus: DonationStatus.APPROVED,
            newStatus: DonationStatus.ASSIGNED,
            timestamp: now.toISOString(),
          },
        },
      });

      return { assignment, updatedDonation };
    });
  }

  public async executeAcceptAssignmentTransaction(params: {
    assignmentId: string;
    workerId: string;
  }): Promise<{ updatedAssignment: any; updatedDonation: any }> {
    return this.prisma.$transaction(async (tx) => {
      // 1. PostgreSQL row-level lock on assignment
      const lockedAssignments = await tx.$queryRaw<
        Array<{ id: string; donation_id: string; worker_id: string; status: AssignmentStatus }>
      >`
        SELECT id, donation_id, worker_id, status FROM assignments WHERE id = ${params.assignmentId}::uuid FOR UPDATE
      `;

      if (!lockedAssignments || lockedAssignments.length === 0) {
        throw new NotFoundError('Assignment not found', 'ASSIGNMENT_NOT_FOUND');
      }

      const lockedAssignment = lockedAssignments[0];

      // 2. Security check: verify worker ownership
      if (lockedAssignment.worker_id !== params.workerId) {
        throw new NotFoundError('Assignment not found', 'ASSIGNMENT_NOT_FOUND');
      }

      // 3. Verify assignment status = PENDING
      if (lockedAssignment.status !== AssignmentStatus.PENDING) {
        throw new ConflictError(
          `Assignment has already been responded to. Current status is ${lockedAssignment.status}.`,
          'ASSIGNMENT_ALREADY_RESPONDED'
        );
      }

      // 4. PostgreSQL row-level lock on donation
      const lockedDonations = await tx.$queryRaw<Array<{ id: string; status: DonationStatus; expires_at: Date }>>`
        SELECT id, status, expires_at FROM donations WHERE id = ${lockedAssignment.donation_id}::uuid FOR UPDATE
      `;

      if (!lockedDonations || lockedDonations.length === 0) {
        throw new NotFoundError('Donation not found', 'DONATION_NOT_FOUND');
      }

      const lockedDonation = lockedDonations[0];

      // 5. Verify donation status = ASSIGNED
      if (lockedDonation.status !== DonationStatus.ASSIGNED) {
        throw new ConflictError(
          `Donation is not in ASSIGNED state. Current status is ${lockedDonation.status}.`,
          'DONATION_INVALID_STATE'
        );
      }

      // 6. Expiry check
      const now = new Date();
      if (new Date(lockedDonation.expires_at).getTime() <= now.getTime()) {
        throw new ConflictError('Donation has expired and cannot be accepted.', 'DONATION_EXPIRED');
      }

      // 7. Update Assignment to ACCEPTED
      const updatedAssignment = await tx.assignment.update({
        where: { id: params.assignmentId },
        data: {
          status: AssignmentStatus.ACCEPTED,
          respondedAt: now,
        },
      });

      // 8. Update Donation to ACCEPTED
      const updatedDonation = await tx.donation.update({
        where: { id: lockedAssignment.donation_id },
        data: { status: DonationStatus.ACCEPTED },
      });

      // 9. Create DonationStatusHistory
      await tx.donationStatusHistory.create({
        data: {
          donationId: lockedAssignment.donation_id,
          fromStatus: DonationStatus.ASSIGNED,
          toStatus: DonationStatus.ACCEPTED,
          changedBy: params.workerId,
          reason: 'Worker accepted donation assignment',
        },
      });

      // 10. Create AuditLog
      await tx.auditLog.create({
        data: {
          userId: params.workerId,
          action: AuditEventType.ASSIGNMENT_ACCEPTED,
          entityType: 'Assignment',
          entityId: params.assignmentId,
          metadata: {
            donationId: lockedAssignment.donation_id,
            workerId: params.workerId,
            previousStatus: DonationStatus.ASSIGNED,
            newStatus: DonationStatus.ACCEPTED,
          },
        },
      });

      // 11. Create OutboxEvent
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'Donation',
          aggregateId: lockedAssignment.donation_id,
          eventType: 'ASSIGNMENT_ACCEPTED',
          payload: {
            assignmentId: params.assignmentId,
            donationId: lockedAssignment.donation_id,
            workerId: params.workerId,
            previousStatus: DonationStatus.ASSIGNED,
            newStatus: DonationStatus.ACCEPTED,
            timestamp: now.toISOString(),
          },
        },
      });

      // 12. Create Pickup entity (NOT_STARTED) and PickupEvent (PICKUP_CREATED)
      const pickup = await tx.pickup.create({
        data: {
          donationId: lockedAssignment.donation_id,
          assignmentId: params.assignmentId,
          workerId: params.workerId,
          status: PickupStatus.NOT_STARTED,
        },
      });

      await tx.pickupEvent.create({
        data: {
          pickupId: pickup.id,
          eventType: PickupEventType.PICKUP_CREATED,
          actorId: params.workerId,
          actorRole: UserRole.WORKER,
          toStatus: PickupStatus.NOT_STARTED,
          notes: 'Pickup created upon assignment acceptance',
        },
      });

      return { updatedAssignment, updatedDonation, pickup };
    });
  }

  public async executeRejectAssignmentTransaction(params: {
    assignmentId: string;
    workerId: string;
    reason: string;
  }): Promise<{ updatedAssignment: any; updatedDonation: any }> {
    return this.prisma.$transaction(async (tx) => {
      // 1. PostgreSQL row-level lock on assignment
      const lockedAssignments = await tx.$queryRaw<
        Array<{ id: string; donation_id: string; worker_id: string; status: AssignmentStatus }>
      >`
        SELECT id, donation_id, worker_id, status FROM assignments WHERE id = ${params.assignmentId}::uuid FOR UPDATE
      `;

      if (!lockedAssignments || lockedAssignments.length === 0) {
        throw new NotFoundError('Assignment not found', 'ASSIGNMENT_NOT_FOUND');
      }

      const lockedAssignment = lockedAssignments[0];

      // 2. Security check: verify worker ownership
      if (lockedAssignment.worker_id !== params.workerId) {
        throw new NotFoundError('Assignment not found', 'ASSIGNMENT_NOT_FOUND');
      }

      // 3. Verify assignment status = PENDING
      if (lockedAssignment.status !== AssignmentStatus.PENDING) {
        throw new ConflictError(
          `Assignment has already been responded to. Current status is ${lockedAssignment.status}.`,
          'ASSIGNMENT_ALREADY_RESPONDED'
        );
      }

      // 4. PostgreSQL row-level lock on donation
      const lockedDonations = await tx.$queryRaw<Array<{ id: string; status: DonationStatus }>>`
        SELECT id, status FROM donations WHERE id = ${lockedAssignment.donation_id}::uuid FOR UPDATE
      `;

      if (!lockedDonations || lockedDonations.length === 0) {
        throw new NotFoundError('Donation not found', 'DONATION_NOT_FOUND');
      }

      const lockedDonation = lockedDonations[0];

      // 5. Verify donation status = ASSIGNED
      if (lockedDonation.status !== DonationStatus.ASSIGNED) {
        throw new ConflictError(
          `Donation is not in ASSIGNED state. Current status is ${lockedDonation.status}.`,
          'DONATION_INVALID_STATE'
        );
      }

      const now = new Date();

      // 6. Update Assignment to REJECTED with rejectionReason
      const updatedAssignment = await tx.assignment.update({
        where: { id: params.assignmentId },
        data: {
          status: AssignmentStatus.REJECTED,
          rejectionReason: params.reason,
          respondedAt: now,
        },
      });

      // 7. Update Donation to APPROVED (re-opening for admin reassignment)
      const updatedDonation = await tx.donation.update({
        where: { id: lockedAssignment.donation_id },
        data: { status: DonationStatus.APPROVED },
      });

      // 8. Create DonationStatusHistory
      await tx.donationStatusHistory.create({
        data: {
          donationId: lockedAssignment.donation_id,
          fromStatus: DonationStatus.ASSIGNED,
          toStatus: DonationStatus.APPROVED,
          changedBy: params.workerId,
          reason: `Worker rejected assignment: ${params.reason}`,
        },
      });

      // 9. Create AuditLog
      await tx.auditLog.create({
        data: {
          userId: params.workerId,
          action: AuditEventType.ASSIGNMENT_REJECTED,
          entityType: 'Assignment',
          entityId: params.assignmentId,
          metadata: {
            donationId: lockedAssignment.donation_id,
            workerId: params.workerId,
            reason: params.reason,
            previousStatus: DonationStatus.ASSIGNED,
            newStatus: DonationStatus.APPROVED,
          },
        },
      });

      // 10. Create OutboxEvent
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'Donation',
          aggregateId: lockedAssignment.donation_id,
          eventType: 'ASSIGNMENT_REJECTED',
          payload: {
            assignmentId: params.assignmentId,
            donationId: lockedAssignment.donation_id,
            workerId: params.workerId,
            reason: params.reason,
            previousStatus: DonationStatus.ASSIGNED,
            newStatus: DonationStatus.APPROVED,
            timestamp: now.toISOString(),
          },
        },
      });

      return { updatedAssignment, updatedDonation };
    });
  }
}
