import { apiClient } from '../../../services/api/apiClient';
import { ApiSuccessResponse } from '../../../types/auth.types';
import {
  PaginatedReviewQueueResult,
  ReviewDetailResponse,
  ReviewQueryFilters,
  RejectDonationPayload,
  ReviewRecord,
  ReviewHistoryResponse,
} from '../types/review.types';

export const reviewService = {
  async getReviewQueue(filters?: ReviewQueryFilters): Promise<PaginatedReviewQueueResult> {
    const params: Record<string, any> = {
      page: filters?.page || 1,
      limit: filters?.limit || 20,
    };

    if (filters?.status) {
      params.status = filters.status;
    }

    if (filters?.category) {
      params.category = filters.category;
    }

    if (filters?.startDate) {
      params.startDate = filters.startDate;
    }

    if (filters?.endDate) {
      params.endDate = filters.endDate;
    }

    const response = await apiClient.get<ApiSuccessResponse<PaginatedReviewQueueResult>>(
      '/admin/donations/review',
      { params }
    );
    return response.data.data;
  },

  async getReviewDetail(donationId: string): Promise<ReviewDetailResponse> {
    const response = await apiClient.get<ApiSuccessResponse<{ donation: ReviewDetailResponse }>>(
      `/admin/donations/${donationId}`
    );
    return response.data.data.donation;
  },

  async approveDonation(donationId: string): Promise<{
    donation: ReviewDetailResponse;
    review: ReviewRecord;
  }> {
    const response = await apiClient.post<
      ApiSuccessResponse<{ donation: ReviewDetailResponse; review: ReviewRecord }>
    >(`/admin/donations/${donationId}/approve`, {});
    return response.data.data;
  },

  async rejectDonation(
    donationId: string,
    payload: RejectDonationPayload
  ): Promise<{
    donation: ReviewDetailResponse;
    review: ReviewRecord;
  }> {
    const response = await apiClient.post<
      ApiSuccessResponse<{ donation: ReviewDetailResponse; review: ReviewRecord }>
    >(`/admin/donations/${donationId}/reject`, payload);
    return response.data.data;
  },

  async getReviewHistory(donationId: string): Promise<ReviewHistoryResponse> {
    const response = await apiClient.get<
      ApiSuccessResponse<{ history: ReviewHistoryResponse }>
    >(`/admin/donations/${donationId}/reviews`);
    return response.data.data.history;
  },
};
