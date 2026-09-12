import { PickupStatus } from '@prisma/client';

const ALLOWED_PICKUP_TRANSITIONS: Record<PickupStatus, PickupStatus[]> = {
  [PickupStatus.NOT_STARTED]: [PickupStatus.IN_PROGRESS],
  [PickupStatus.IN_PROGRESS]: [PickupStatus.COMPLETED, PickupStatus.FAILED],
  [PickupStatus.COMPLETED]: [],
  [PickupStatus.FAILED]: [],
  [PickupStatus.CANCELLED]: [],
};

export const canTransitionPickup = (
  fromStatus: PickupStatus,
  toStatus: PickupStatus
): boolean => {
  if (fromStatus === toStatus) return false;
  const allowed = ALLOWED_PICKUP_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
};
