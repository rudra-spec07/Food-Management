import { DonationQuantityUnit, UserRole } from '@prisma/client';

export interface CreateDistributionInput {
  inventoryId: string;
  recipientName: string;
  quantity: number | string;
  unit?: DonationQuantityUnit;
  reservationId?: string;
  notes?: string;
}

export interface DistributionFilterOptions {
  page: number;
  limit: number;
  search?: string;
}

export interface DistributionTransactionParams {
  inventoryId: string;
  recipientName: string;
  quantity: number;
  unit?: DonationQuantityUnit;
  reservationId?: string;
  notes?: string;
  distributedBy: string;
  actorRole: UserRole;
}
