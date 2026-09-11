import { apiClient } from './api/apiClient';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T;
  pagination: Pagination;
}

export interface DonorInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}

export interface WorkerInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}

export interface DonationCandidate {
  id: string;
  category: string;
  description: string;
  quantity: number;
  quantityUnit: string;
  preparedAt: string;
  expiresAt: string;
  pickupAddress: string;
  contactName: string;
  contactPhone: string;
  photoUrl?: string | null;
  notes?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  donor: DonorInfo;
}

export interface Assignment {
  id: string;
  donationId: string;
  workerId: string;
  assignedById: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  assignedAt: string;
  respondedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  donation?: DonationCandidate;
  worker?: WorkerInfo;
  assignedBy?: DonorInfo;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const assignmentService = {
  // Admin: Get Approved Donations Queue waiting for assignment
  getAssignmentQueue: async (page = 1, limit = 20): Promise<PaginatedResult<DonationCandidate[]>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResult<DonationCandidate[]>>>(
      `/admin/donations/assignment-queue`,
      { params: { page, limit } }
    );
    return response.data.data;
  },

  // Admin: Assign worker to donation
  assignWorker: async (donationId: string, workerId: string): Promise<Assignment> => {
    const response = await apiClient.post<ApiResponse<Assignment>>(
      `/admin/donations/${donationId}/assign`,
      { workerId }
    );
    return response.data.data;
  },

  // Admin: Get assignment history for a donation
  getAssignmentHistory: async (donationId: string): Promise<Assignment[]> => {
    const response = await apiClient.get<ApiResponse<Assignment[]>>(
      `/admin/donations/${donationId}/assignments`
    );
    return response.data.data;
  },

  // Worker: Get worker's assigned tasks
  getWorkerAssignments: async (page = 1, limit = 20): Promise<PaginatedResult<Assignment[]>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResult<Assignment[]>>>(
      `/worker/assignments`,
      { params: { page, limit } }
    );
    return response.data.data;
  },

  // Worker: Get worker assignment detail
  getWorkerAssignmentDetail: async (assignmentId: string): Promise<Assignment> => {
    const response = await apiClient.get<ApiResponse<Assignment>>(
      `/worker/assignments/${assignmentId}`
    );
    return response.data.data;
  },

  // Worker: Accept assignment
  acceptAssignment: async (assignmentId: string): Promise<Assignment> => {
    const response = await apiClient.post<ApiResponse<Assignment>>(
      `/worker/assignments/${assignmentId}/accept`
    );
    return response.data.data;
  },

  // Worker: Reject assignment
  rejectAssignment: async (assignmentId: string, reason: string): Promise<Assignment> => {
    const response = await apiClient.post<ApiResponse<Assignment>>(
      `/worker/assignments/${assignmentId}/reject`,
      { reason }
    );
    return response.data.data;
  },
};
