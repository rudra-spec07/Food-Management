import { DonationStatus } from '@prisma/client';

const ALLOWED_TRANSITIONS: Record<DonationStatus, DonationStatus[]> = {
  [DonationStatus.PENDING_REVIEW]: [
    DonationStatus.APPROVED,
    DonationStatus.REJECTED,
    DonationStatus.CANCELLED,
  ],
  [DonationStatus.APPROVED]: [
    DonationStatus.ASSIGNED,
    DonationStatus.CANCELLED,
  ],
  [DonationStatus.REJECTED]: [],
  [DonationStatus.ASSIGNED]: [
    DonationStatus.ACCEPTED,
    DonationStatus.CANCELLED,
  ],
  [DonationStatus.ACCEPTED]: [
    DonationStatus.PICKED_UP,
    DonationStatus.CANCELLED,
  ],
  [DonationStatus.PICKED_UP]: [
    DonationStatus.COMPLETED,
  ],
  [DonationStatus.COMPLETED]: [],
  [DonationStatus.CANCELLED]: [],
};

export const canTransition = (fromStatus: DonationStatus, toStatus: DonationStatus): boolean => {
  if (fromStatus === toStatus) return false;
  const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
};

export const isDonationEditableByDonor = (status: DonationStatus): boolean => {
  return status === DonationStatus.PENDING_REVIEW;
};

export const isDonationCancellableByDonor = (status: DonationStatus): boolean => {
  return status === DonationStatus.PENDING_REVIEW || status === DonationStatus.APPROVED;
};
