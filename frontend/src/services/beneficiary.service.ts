import { apiClient } from './api/apiClient';
import {
  Beneficiary,
  CreateBeneficiaryInput,
  UpdateBeneficiaryInput,
  BeneficiaryFilterParams,
} from '../types/beneficiary.types';
import { DistributionRecord } from './distribution.service';

export interface PaginatedBeneficiariesResult {
  items: Beneficiary[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface PaginatedBeneficiaryHistoryResult {
  items: DistributionRecord[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const beneficiaryService = {
  getBeneficiaries: async (
    params: BeneficiaryFilterParams = {}
  ): Promise<PaginatedBeneficiariesResult> => {
    const response = await apiClient.get<ApiResponse<PaginatedBeneficiariesResult>>('/beneficiaries', {
      params,
    });
    return response.data.data;
  },

  getBeneficiary: async (id: string): Promise<Beneficiary> => {
    const response = await apiClient.get<ApiResponse<Beneficiary>>(`/beneficiaries/${id}`);
    return response.data.data;
  },

  createBeneficiary: async (payload: CreateBeneficiaryInput): Promise<Beneficiary> => {
    const response = await apiClient.post<ApiResponse<Beneficiary>>('/beneficiaries', payload);
    return response.data.data;
  },

  updateBeneficiary: async (id: string, payload: UpdateBeneficiaryInput): Promise<Beneficiary> => {
    const response = await apiClient.patch<ApiResponse<Beneficiary>>(`/beneficiaries/${id}`, payload);
    return response.data.data;
  },

  getBeneficiaryHistory: async (
    id: string,
    params: { page?: number; limit?: number } = {}
  ): Promise<PaginatedBeneficiaryHistoryResult> => {
    const response = await apiClient.get<ApiResponse<PaginatedBeneficiaryHistoryResult>>(
      `/beneficiaries/${id}/history`,
      { params }
    );
    return response.data.data;
  },
};
