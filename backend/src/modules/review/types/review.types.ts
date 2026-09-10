import { DonationCategory, DonationQuantityUnit, DonationStatus, ReviewDecision } from '@prisma/client';

export interface PaginatedReviewQueueResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReviewDetailResponse {
  id: string;
  donorId: string;
  donor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  category: DonationCategory;
  description: string;
  quantity: string;
  quantityUnit: DonationQuantityUnit;
  preparedAt: Date;
  expiresAt: Date;
  pickupAddress: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  contactName: string;
  contactPhone: string;
  photoUrl: string | null;
  notes: string | null;
  status: DonationStatus;
  rejectionReason: string | null;
  cancelledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  review: {
    id: string;
    reviewerId: string;
    decision: ReviewDecision;
    reason: string | null;
    reviewedAt: Date;
    reviewer?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  } | null;
  statusHistory: Array<{
    id: string;
    fromStatus: DonationStatus | null;
    toStatus: DonationStatus;
    changedBy: string;
    changedAt: Date;
    reason: string | null;
  }>;
}
