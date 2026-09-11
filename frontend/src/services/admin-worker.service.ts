import { apiClient } from './api/apiClient';

export interface CreateWorkerPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface WorkerUserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: 'WORKER';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface WorkerListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface WorkerListResult {
  items: WorkerUserResponse[];
  pagination: WorkerListPagination;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const adminWorkerService = {
  createWorker: async (payload: CreateWorkerPayload): Promise<WorkerUserResponse> => {
    const response = await apiClient.post<ApiResponse<WorkerUserResponse>>(
      '/admin/workers',
      payload
    );
    return response.data.data;
  },

  /**
   * Paginated list of WORKER users.
   * @param page   Page number (1-indexed)
   * @param limit  Items per page (max 100)
   * @param status Optional status filter — 'ACTIVE' | 'INACTIVE'
   */
  listWorkers: async (
    page = 1,
    limit = 20,
    status?: 'ACTIVE' | 'INACTIVE'
  ): Promise<WorkerListResult> => {
    const params: Record<string, string | number> = { page, limit };
    if (status) {
      params.status = status;
    }
    const response = await apiClient.get<ApiResponse<WorkerListResult>>(
      '/admin/workers',
      { params }
    );
    return response.data.data;
  },
};
