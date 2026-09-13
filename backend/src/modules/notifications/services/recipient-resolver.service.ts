import { Prisma, UserRole, UserStatus } from '@prisma/client';

export class RecipientResolverService {
  public async resolveRecipients(
    eventType: string,
    payload: Record<string, any>,
    tx: Prisma.TransactionClient
  ): Promise<string[]> {
    const recipients: Set<string> = new Set();

    switch (eventType) {
      case 'DONATION_SUBMITTED': {
        if (payload.donorId) {
          recipients.add(String(payload.donorId));
        } else if (payload.donationId) {
          const donation = await tx.donation.findUnique({
            where: { id: String(payload.donationId) },
            select: { donorId: true },
          });
          if (donation?.donorId) recipients.add(donation.donorId);
        }
        break;
      }

      case 'DONATION_APPROVED':
      case 'DONATION_REJECTED': {
        if (payload.donorId) {
          recipients.add(String(payload.donorId));
        } else if (payload.donationId) {
          const donation = await tx.donation.findUnique({
            where: { id: String(payload.donationId) },
            select: { donorId: true },
          });
          if (donation?.donorId) recipients.add(donation.donorId);
        }
        break;
      }

      case 'DONATION_ASSIGNED': {
        if (payload.workerId) {
          recipients.add(String(payload.workerId));
        } else if (payload.assignmentId) {
          const assignment = await tx.assignment.findUnique({
            where: { id: String(payload.assignmentId) },
            select: { workerId: true },
          });
          if (assignment?.workerId) recipients.add(assignment.workerId);
        }
        break;
      }

      case 'ASSIGNMENT_ACCEPTED':
      case 'ASSIGNMENT_REJECTED': {
        if (payload.assignedBy) {
          recipients.add(String(payload.assignedBy));
        } else if (payload.assignmentId) {
          const assignment = await tx.assignment.findUnique({
            where: { id: String(payload.assignmentId) },
            select: { assignedBy: true },
          });
          if (assignment?.assignedBy) recipients.add(assignment.assignedBy);
        }
        break;
      }

      case 'PICKUP_STARTED':
      case 'PICKUP_COMPLETED': {
        if (payload.donorId) {
          recipients.add(String(payload.donorId));
        } else if (payload.donationId) {
          const donation = await tx.donation.findUnique({
            where: { id: String(payload.donationId) },
            select: { donorId: true },
          });
          if (donation?.donorId) recipients.add(donation.donorId);
        } else if (payload.pickupId) {
          const pickup = await tx.pickup.findUnique({
            where: { id: String(payload.pickupId) },
            select: { donation: { select: { donorId: true } } },
          });
          if (pickup?.donation?.donorId) recipients.add(pickup.donation.donorId);
        }
        break;
      }

      case 'PICKUP_FAILED': {
        // 1. Donor
        if (payload.donorId) {
          recipients.add(String(payload.donorId));
        } else if (payload.donationId) {
          const donation = await tx.donation.findUnique({
            where: { id: String(payload.donationId) },
            select: { donorId: true },
          });
          if (donation?.donorId) recipients.add(donation.donorId);
        }

        // 2. All Active Admin users
        const activeAdmins = await tx.user.findMany({
          where: {
            role: UserRole.ADMIN,
            status: UserStatus.ACTIVE,
          },
          select: { id: true },
        });

        for (const admin of activeAdmins) {
          recipients.add(admin.id);
        }
        break;
      }

      default:
        break;
    }

    if (recipients.size === 0) {
      throw new Error(`Unable to resolve authoritative recipient(s) for event ${eventType}`);
    }

    return Array.from(recipients);
  }
}
