import { apiClient } from '../../../services/api/apiClient';
import {
  InventoryItem,
  InventoryMovement,
  InventorySummary,
  InventoryQueryFilter,
} from '../types/inventory.types';

export interface PaginatedInventoryResult<T> {
  items: T;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const inventoryService = {
  // Fetch Inventory Dashboard Summary
  getSummary: async (): Promise<InventorySummary | null> => {
    try {
      const response = await apiClient.get<ApiResponse<InventorySummary>>('/inventory/summary');
      return response.data.data;
    } catch (error: any) {
      if (error.statusCode === 404 || error.statusCode === 501) {
        return null; // Signals pending backend module deployment
      }
      throw error;
    }
  },

  // Fetch Paginated Inventory List with Filters
  getItems: async (filters: InventoryQueryFilter = {}): Promise<PaginatedInventoryResult<InventoryItem[]> | null> => {
    try {
      const response = await apiClient.get<ApiResponse<PaginatedInventoryResult<InventoryItem[]>>>(
        '/inventory/items',
        { params: filters }
      );
      return response.data.data;
    } catch (error: any) {
      if (error.statusCode === 404 || error.statusCode === 501) {
        return null;
      }
      throw error;
    }
  },

  // Fetch Inventory Item Details by ID
  getItemDetail: async (inventoryId: string): Promise<InventoryItem | null> => {
    try {
      const response = await apiClient.get<ApiResponse<InventoryItem>>(`/inventory/items/${inventoryId}`);
      return response.data.data;
    } catch (error: any) {
      if (error.statusCode === 404 || error.statusCode === 501) {
        return null;
      }
      throw error;
    }
  },

  // Fetch Inventory Item Movement History
  getItemHistory: async (inventoryId: string): Promise<InventoryMovement[] | null> => {
    try {
      const response = await apiClient.get<ApiResponse<InventoryMovement[]>>(
        `/inventory/items/${inventoryId}/history`
      );
      return response.data.data;
    } catch (error: any) {
      if (error.statusCode === 404 || error.statusCode === 501) {
        return null;
      }
      throw error;
    }
  },
};
