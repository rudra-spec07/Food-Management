import { apiClient } from '../../../services/api/apiClient';
import { ApiSuccessResponse } from '../../../types/auth.types';
import {
  Donation,
  CreateDonationPayload,
  UpdateDonationPayload,
  CancelDonationPayload,
  DonationQueryFilters,
  PaginatedDonationResult,
} from '../types/donor.types';

export const donationService = {
  async getMyDonations(filters?: DonationQueryFilters): Promise<PaginatedDonationResult> {
    const params: Record<string, any> = {
      page: filters?.page || 1,
      limit: filters?.limit || 20,
    };

    if (filters?.status && filters.status !== 'ALL') {
      params.status = filters.status;
    }

    const response = await apiClient.get<ApiSuccessResponse<PaginatedDonationResult>>('/donations/my', {
      params,
    });
    return response.data.data;
  },

  async getDonationById(donationId: string): Promise<Donation> {
    const response = await apiClient.get<ApiSuccessResponse<Donation>>(`/donations/${donationId}`);
    return response.data.data;
  },

  async createDonation(payload: CreateDonationPayload): Promise<Donation> {
    const response = await apiClient.post<ApiSuccessResponse<Donation>>('/donations', payload);
    return response.data.data;
  },

  async updateDonation(donationId: string, payload: UpdateDonationPayload): Promise<Donation> {
    const response = await apiClient.patch<ApiSuccessResponse<Donation>>(`/donations/${donationId}`, payload);
    return response.data.data;
  },

  async cancelDonation(donationId: string, payload?: CancelDonationPayload): Promise<Donation> {
    const response = await apiClient.post<ApiSuccessResponse<Donation>>(`/donations/${donationId}/cancel`, payload || {});
    return response.data.data;
  },
};
