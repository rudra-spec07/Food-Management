export type DonationCategory =
  | 'COOKED_MEAL'
  | 'PACKAGED_FOOD'
  | 'GROCERIES'
  | 'BAKERY'
  | 'FRUITS'
  | 'VEGETABLES'
  | 'OTHER';

export type DonationQuantityUnit =
  | 'PORTIONS'
  | 'KG'
  | 'LITERS'
  | 'PACKETS'
  | 'BOXES'
  | 'ITEMS';

export type DonationStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'PICKED_UP'
  | 'COMPLETED'
  | 'CANCELLED';

export interface DonationStatusHistory {
  id: string;
  donationId: string;
  fromStatus: DonationStatus | null;
  toStatus: DonationStatus;
  changedBy: string;
  changedAt: string;
  reason?: string | null;
}

export interface Donation {
  id: string;
  donorId: string;
  category: DonationCategory;
  description: string;
  quantity: number | string;
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
  status: DonationStatus;
  rejectionReason?: string | null;
  cancelledAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory?: DonationStatusHistory[];
}

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
  status?: DonationStatus | 'ALL';
}

export interface PaginatedDonationResult {
  items: Donation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
