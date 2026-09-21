import { apiClient } from './api/apiClient';
import { DonationQuantityUnit } from '../modules/donors/types/donor.types';

export interface AiEstimateRequestPayload {
  peopleCount: number;
  foodItems: string[];
}

export interface AiEstimateItem {
  foodItem: string;
  quantity: number;
  unit: DonationQuantityUnit;
  reasoning: string;
}

export interface AiEstimateResponsePayload {
  success: boolean;
  data: {
    estimates: AiEstimateItem[];
  };
}

export const aiEstimatorService = {
  estimateQuantity: async (payload: AiEstimateRequestPayload): Promise<AiEstimateItem[]> => {
    const response = await apiClient.post<AiEstimateResponsePayload>(
      '/ai/estimate-quantity',
      payload
    );
    return response.data.data.estimates;
  },
};
