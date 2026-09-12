import { apiClient } from './api/apiClient';

export interface InventoryReservation {
  id: string;
  inventoryId: string;
  reservedBy: string;
  quantity: number | string;
  unit: string;
  status: 'ACTIVE' | 'RELEASED' | 'FULFILLED' | 'EXPIRED' | 'CANCELLED';
  notes?: string | null;
  expiresAt: string;
  fulfilledAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  inventory?: {
    id: string;
    foodCategory: string;
    description: string;
    location?: string | null;
    expirationDate?: string | null;
  };
  reserver?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export interface CreateReservationPayload {
  inventoryId: string;
  quantity: number;
  notes?: string;
  durationHours?: number;
}

export interface ReservationQueryFilter {
  page?: number;
  limit?: number;
  status?: string;
  inventoryId?: string;
}

export interface PaginatedReservationResult {
  items: InventoryReservation[];
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

export const reservationService = {
  createReservation: async (payload: CreateReservationPayload): Promise<InventoryReservation> => {
    const response = await apiClient.post<ApiResponse<InventoryReservation>>('/reservations', payload);
    return response.data.data;
  },

  getReservations: async (
    filters: ReservationQueryFilter = {}
  ): Promise<PaginatedReservationResult> => {
    const response = await apiClient.get<ApiResponse<PaginatedReservationResult>>('/reservations', {
      params: filters,
    });
    return response.data.data;
  },

  getReservationDetail: async (reservationId: string): Promise<InventoryReservation> => {
    const response = await apiClient.get<ApiResponse<InventoryReservation>>(
      `/reservations/${reservationId}`
    );
    return response.data.data;
  },

  releaseReservation: async (
    reservationId: string,
    reason?: string
  ): Promise<InventoryReservation> => {
    const response = await apiClient.post<ApiResponse<InventoryReservation>>(
      `/reservations/${reservationId}/release`,
      { reason }
    );
    return response.data.data;
  },
};
