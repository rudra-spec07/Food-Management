import {
  DonationCategory,
  DonationQuantityUnit,
  DonationStatus,
} from '../../donors/types/donor.types';

export type ReviewDecision = 'APPROVED' | 'REJECTED';

export interface ReviewDonorInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

export interface ReviewerInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ReviewRecord {
  id: string;
  reviewerId: string;
  decision: ReviewDecision;
  reason: string | null;
  reviewedAt: string;
  reviewer?: ReviewerInfo;
}

export interface StatusHistoryUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface StatusHistoryRecord {
  id: string;
  fromStatus: DonationStatus | null;
  toStatus: DonationStatus;
  changedBy: string;
  changedAt: string;
  reason: string | null;
  user?: StatusHistoryUser;
}

export interface ReviewHistoryResponse {
  id: string;
  status: DonationStatus;
  rejectionReason: string | null;
  review: ReviewRecord | null;
  statusHistory: StatusHistoryRecord[];
}

export interface ReviewQueueItem {
  id: string;
  donorId: string;
  donor: ReviewDonorInfo;
  category: DonationCategory;
  description: string;
  quantity: string | number;
  quantityUnit: DonationQuantityUnit;
  preparedAt: string;
  expiresAt: string;
  pickupAddress: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  contactName: string;
  contactPhone: string;
  photoUrl: string | null;
  notes: string | null;
  status: DonationStatus;
  rejectionReason: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedReviewQueueResult {
  items: ReviewQueueItem[];
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
  donor: ReviewDonorInfo;
  category: DonationCategory;
  description: string;
  quantity: string | number;
  quantityUnit: DonationQuantityUnit;
  preparedAt: string;
  expiresAt: string;
  pickupAddress: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  contactName: string;
  contactPhone: string;
  photoUrl: string | null;
  notes: string | null;
  status: DonationStatus;
  rejectionReason: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  review: ReviewRecord | null;
  statusHistory: StatusHistoryRecord[];
}

export interface ReviewQueryFilters {
  page?: number;
  limit?: number;
  status?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  category?: DonationCategory;
  startDate?: string;
  endDate?: string;
}

export interface RejectDonationPayload {
  reason: string;
}
