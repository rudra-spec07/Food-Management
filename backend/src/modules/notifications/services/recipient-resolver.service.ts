import { Prisma, UserRole, UserStatus, AssignmentStatus } from '@prisma/client';

export class RecipientResolverService {
  private async getActiveAdmins(tx: Prisma.TransactionClient): Promise<string[]> {
    const activeAdmins = await tx.user.findMany({
      where: {
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    });
    return activeAdmins.map((a) => a.id);
  }

  public async resolveRecipients(
    eventType: string,
    payload: Record<string, any>,
    tx: Prisma.TransactionClient
  ): Promise<string[]> {
    const recipients: Set<string> = new Set();

    switch (eventType) {
      case 'DONATION_SUBMITTED': {
        // All Active Admin users ONLY (donor does NOT receive self-notification)
        const adminIds = await this.getActiveAdmins(tx);
        for (const adminId of adminIds) {
          recipients.add(adminId);
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

        // 2. Assigned Worker
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

      case 'PICKUP_STARTED': {
        // 1. Donor
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

        // 2. All Active Admin users (Worker who started pickup is NOT notified)
        const adminIds = await this.getActiveAdmins(tx);
        for (const adminId of adminIds) {
          recipients.add(adminId);
        }
        break;
      }

      case 'PICKUP_COMPLETED':
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
        } else if (payload.pickupId) {
          const pickup = await tx.pickup.findUnique({
            where: { id: String(payload.pickupId) },
            select: { donation: { select: { donorId: true } } },
          });
          if (pickup?.donation?.donorId) recipients.add(pickup.donation.donorId);
        }

        // 2. Assigned Worker
        if (payload.workerId) {
          recipients.add(String(payload.workerId));
        } else if (payload.pickupId) {
          const pickup = await tx.pickup.findUnique({
            where: { id: String(payload.pickupId) },
            select: { workerId: true },
          });
          if (pickup?.workerId) recipients.add(pickup.workerId);
        }

        // 3. All Active Admin users
        const adminIds = await this.getActiveAdmins(tx);
        for (const adminId of adminIds) {
          recipients.add(adminId);
        }
        break;
      }

      case 'INVENTORY_DISTRIBUTED': {
        // 1. Resolve Item details for Donor & Worker
        if (payload.inventoryId) {
          const item = await tx.inventoryItem.findUnique({
            where: { id: String(payload.inventoryId) },
            select: {
              pickup: { select: { workerId: true } },
              donation: {
                select: {
                  donorId: true,
                  assignments: {
                    where: { status: AssignmentStatus.ACCEPTED },
                    orderBy: { createdAt: 'desc' },
                    select: { workerId: true },
                    take: 1,
                  },
                },
              },
            },
          });

          // Original Donor
          if (item?.donation?.donorId) {
            recipients.add(item.donation.donorId);
          } else if (payload.donorId) {
            recipients.add(String(payload.donorId));
          }

          // Assigned Worker (from Pickup or Assignment)
          if (item?.pickup?.workerId) {
            recipients.add(item.pickup.workerId);
          } else if (item?.donation?.assignments?.[0]?.workerId) {
            recipients.add(item.donation.assignments[0].workerId);
          }
        } else {
          if (payload.donorId) recipients.add(String(payload.donorId));
          if (payload.workerId) recipients.add(String(payload.workerId));
        }

        // 2. All Active Admin users
        const adminIds = await this.getActiveAdmins(tx);
        for (const adminId of adminIds) {
          recipients.add(adminId);
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
