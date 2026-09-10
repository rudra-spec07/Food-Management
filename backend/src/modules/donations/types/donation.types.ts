import { DonationCategory, DonationQuantityUnit, DonationStatus } from '@prisma/client';

export interface CreateDonationPayload {
  category: DonationCategory;
  description: string;
  quantity: number;
  quantityUnit: DonationQuantityUnit;
  preparedAt: string;
  expiresAt: string;
  pickupAddress: string;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  contactName: string;
  contactPhone: string;
  photoUrl?: string | null;
  notes?: string | null;
}

export interface UpdateDonationPayload {
  category?: DonationCategory;
  description?: string;
  quantity?: number;
  quantityUnit?: DonationQuantityUnit;
  preparedAt?: string;
  expiresAt?: string;
  pickupAddress?: string;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  contactName?: string;
  contactPhone?: string;
  photoUrl?: string | null;
  notes?: string | null;
}

export interface CancelDonationPayload {
  reason?: string;
}

export interface DonationQueryFilters {
  page?: number;
  limit?: number;
  status?: DonationStatus;
}

export interface PaginatedDonationResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
