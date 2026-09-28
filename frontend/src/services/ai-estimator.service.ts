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
    source?: 'GEMINI' | 'LOCAL_FALLBACK';
  };
}

export interface AiEstimateResult {
  estimates: AiEstimateItem[];
  source?: 'GEMINI' | 'LOCAL_FALLBACK';
}

export const aiEstimatorService = {
  estimateQuantity: async (
    payload: AiEstimateRequestPayload
  ): Promise<AiEstimateResult> => {
    const response = await apiClient.post<AiEstimateResponsePayload>(
      '/ai/estimate-quantity',
      payload
    );
    return response.data.data;
  },
};
