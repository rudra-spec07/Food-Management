import { apiClient } from './api/apiClient';

export interface DistributionRecord {
  id: string;
  inventoryId: string;
  distributedBy: string;
  recipientName: string;
  quantity: number | string;
  unit: string;
  status: string;
  notes?: string | null;
  distributedAt: string;
  createdAt: string;
  updatedAt: string;
  inventory?: {
    id: string;
    foodCategory: string;
    description: string;
    location?: string | null;
    donorReference?: string | null;
  };
  distributor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export interface CreateDistributionPayload {
  inventoryId: string;
  recipientName: string;
  quantity: number;
  unit?: string;
  notes?: string;
}

export interface PaginatedDistributionResult {
  items: DistributionRecord[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface DistributionQueryFilter {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const distributionService = {
  getDistributions: async (
    filters: DistributionQueryFilter = {}
  ): Promise<PaginatedDistributionResult> => {
    const response = await apiClient.get<ApiResponse<PaginatedDistributionResult>>('/distributions', {
      params: filters,
    });
    return response.data.data;
  },

  getDistributionDetail: async (distributionId: string): Promise<DistributionRecord> => {
    const response = await apiClient.get<ApiResponse<DistributionRecord>>(`/distributions/${distributionId}`);
    return response.data.data;
  },

  createDistribution: async (payload: CreateDistributionPayload): Promise<DistributionRecord> => {
    const response = await apiClient.post<ApiResponse<DistributionRecord>>('/distributions', payload);
    return response.data.data;
  },
};
