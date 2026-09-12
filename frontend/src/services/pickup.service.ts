import { apiClient } from './api/apiClient';

export type PickupStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface PickupEvent {
  id: string;
  pickupId: string;
  eventType: string;
  actorId: string;
  notes?: string | null;
  createdAt: string;
  actor?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface PickupDonation {
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
  status: string;
  donor?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    email?: string | null;
  };
}

export interface PickupAssignment {
  id: string;
  assignedAt: string;
  respondedAt?: string | null;
  status: string;
}

export interface PickupItem {
  id: string;
  donationId: string;
  assignmentId: string;
  workerId: string;
  status: PickupStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  completionNotes?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
  donation?: PickupDonation;
  assignment?: PickupAssignment;
  events?: PickupEvent[];
}

export interface CompletePickupPayload {
  completionNotes?: string;
}

export interface FailPickupPayload {
  reason: string;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

export const pickupService = {
  // Worker: Get worker pickups list
  getWorkerPickups: async (page = 1, limit = 20, status?: PickupStatus) => {
    const params: Record<string, any> = { page, limit };
    if (status) params.status = status;
    const response = await apiClient.get<ApiResponse<{ items: PickupItem[]; pagination: any }>>(
      '/worker/pickups',
      { params }
    );
    return response.data.data;
  },

  // Worker: Get worker pickup detail
  getWorkerPickupDetail: async (pickupId: string): Promise<PickupItem> => {
    const response = await apiClient.get<ApiResponse<PickupItem>>(
      `/worker/pickups/${pickupId}`
    );
    return response.data.data;
  },

  // Worker: Start pickup
  startPickup: async (pickupId: string) => {
    const response = await apiClient.post<ApiResponse<any>>(
      `/worker/pickups/${pickupId}/start`
    );
    return response.data;
  },

  // Worker: Complete pickup
  completePickup: async (pickupId: string, payload: CompletePickupPayload) => {
    const response = await apiClient.post<ApiResponse<any>>(
      `/worker/pickups/${pickupId}/complete`,
      payload
    );
    return response.data;
  },

  // Worker: Fail pickup
  failPickup: async (pickupId: string, payload: FailPickupPayload) => {
    const response = await apiClient.post<ApiResponse<any>>(
      `/worker/pickups/${pickupId}/fail`,
      payload
    );
    return response.data;
  },
};
