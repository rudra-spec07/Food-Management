import { PrismaClient, Prisma, Donation, DonationStatus, ReviewDecision, AuditEventType } from '@prisma/client';
import { ConflictError, NotFoundError } from '../../../shared/errors/app-error';

const globalPrisma = new PrismaClient();

export class ReviewRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || globalPrisma;
  }

  public get client(): PrismaClient {
    return this.prisma;
  }

  public async findReviewQueue(options: {
    page: number;
    limit: number;
    status?: DonationStatus;
    category?: any;
    startDate?: string;
    endDate?: string;
  }): Promise<[any[], number]> {
    const skip = (options.page - 1) * options.limit;
    const now = new Date();
    const targetStatus = options.status || DonationStatus.PENDING_REVIEW;

    const where: Prisma.DonationWhereInput = {
      status: targetStatus,
      ...(targetStatus === DonationStatus.PENDING_REVIEW ? { expiresAt: { gt: now } } : {}),
      ...(options.category ? { category: options.category } : {}),
      ...(options.startDate || options.endDate
        ? {
            createdAt: {
              ...(options.startDate ? { gte: new Date(options.startDate) } : {}),
              ...(options.endDate ? { lte: new Date(options.endDate) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.donation.findMany({
        where,
        skip,
        take: options.limit,
        orderBy: { createdAt: 'asc' }, // FIFO queue
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
          notes: true,
          status: true,
          rejectionReason: true,
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

  public async findReviewDetailById(donationId: string): Promise<any | null> {
    return this.prisma.donation.findUnique({
      where: { id: donationId },
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
        review: {
          include: {
            reviewer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: { changedAt: 'asc' },
        },
      },
    });
  }

  public async findReviewsByDonationId(donationId: string): Promise<any> {
    const donation = await this.prisma.donation.findUnique({
      where: { id: donationId },
      select: {
        id: true,
        status: true,
        rejectionReason: true,
        review: {
          include: {
            reviewer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: { changedAt: 'asc' },
          include: {
            user: {
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

    return donation;
  }

  public async executeReviewDecisionTransaction(params: {
    donationId: string;
    reviewerId: string;
    decision: ReviewDecision;
    reason?: string | null;
  }): Promise<{ updatedDonation: Donation; review: any }> {
    return this.prisma.$transaction(async (tx) => {
      // 1. PostgreSQL row-level lock using FOR UPDATE
      const lockedRows = await tx.$queryRaw<Array<{ id: string; status: DonationStatus; expires_at: Date }>>`
        SELECT id, status, expires_at FROM donations WHERE id = ${params.donationId}::uuid FOR UPDATE
      `;

      if (!lockedRows || lockedRows.length === 0) {
        throw new NotFoundError('Donation not found', 'DONATION_NOT_FOUND');
      }

      const locked = lockedRows[0];

      // 2. Validate current status
      if (locked.status !== DonationStatus.PENDING_REVIEW) {
        throw new ConflictError(
          `Donation has already been reviewed or cancelled. Current status is ${locked.status}.`,
          'DONATION_ALREADY_REVIEWED'
        );
      }

      // 3. Validate database uniqueness constraint for DonationReview
      const existingReview = await tx.donationReview.findUnique({
        where: { donationId: params.donationId },
      });

      if (existingReview) {
        throw new ConflictError('A review decision has already been submitted for this donation.', 'DONATION_ALREADY_REVIEWED');
      }

      // 4. Expiry check if approving
      if (params.decision === ReviewDecision.APPROVED) {
        const now = new Date();
        if (new Date(locked.expires_at).getTime() <= now.getTime()) {
          throw new ConflictError('This donation has expired and cannot be approved.', 'DONATION_EXPIRED');
        }
      }

      const targetStatus = params.decision === ReviewDecision.APPROVED ? DonationStatus.APPROVED : DonationStatus.REJECTED;
      const auditAction = params.decision === ReviewDecision.APPROVED ? AuditEventType.DONATION_APPROVED : AuditEventType.DONATION_REJECTED;
      const eventType = params.decision === ReviewDecision.APPROVED ? 'DONATION_APPROVED' : 'DONATION_REJECTED';
      const normalizedReason = params.reason || null;

      // 5. Update Donation status
      const updatedDonation = await tx.donation.update({
        where: { id: params.donationId },
        data: {
          status: targetStatus,
          rejectionReason: params.decision === ReviewDecision.REJECTED ? normalizedReason : null,
        },
      });

      // 6. Insert DonationStatusHistory
      await tx.donationStatusHistory.create({
        data: {
          donationId: params.donationId,
          fromStatus: DonationStatus.PENDING_REVIEW,
          toStatus: targetStatus,
          changedBy: params.reviewerId,
          reason: normalizedReason || `Administrative review decision: ${params.decision}`,
        },
      });

      // 7. Insert DonationReview
      const review = await tx.donationReview.create({
        data: {
          donationId: params.donationId,
          reviewerId: params.reviewerId,
          decision: params.decision,
          reason: normalizedReason,
        },
      });

      // 8. Insert AuditLog
      await tx.auditLog.create({
        data: {
          userId: params.reviewerId,
          action: auditAction,
          entityType: 'Donation',
          entityId: params.donationId,
          metadata: {
            previousStatus: DonationStatus.PENDING_REVIEW,
            newStatus: targetStatus,
            decision: params.decision,
            reason: normalizedReason,
          },
        },
      });

      // 9. Insert OutboxEvent
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'Donation',
          aggregateId: params.donationId,
          eventType,
          payload: {
            donationId: params.donationId,
            reviewerId: params.reviewerId,
            decision: params.decision,
            previousStatus: DonationStatus.PENDING_REVIEW,
            newStatus: targetStatus,
            reason: normalizedReason,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return { updatedDonation, review };
    });
  }
}
