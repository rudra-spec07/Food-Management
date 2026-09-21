import {
  aiEstimateRequestSchema,
  aiEstimateResponseSchema,
} from '../../src/modules/ai-estimator/dto/ai-estimator.dto';
import { DonationQuantityUnit } from '@prisma/client';

describe('AiEstimator DTO Schemas', () => {
  describe('aiEstimateRequestSchema', () => {
    it('should validate valid request data and trim food items', () => {
      const validPayload = {
        peopleCount: 50,
        foodItems: ['  Rice ', 'Dal  ', ' Vegetable curry '],
      };

      const result = aiEstimateRequestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.peopleCount).toBe(50);
        expect(result.data.foodItems).toEqual(['Rice', 'Dal', 'Vegetable curry']);
      }
    });

    it('should reject peopleCount < 1', () => {
      const payload = { peopleCount: 0, foodItems: ['Rice'] };
      const result = aiEstimateRequestSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject peopleCount > 1000', () => {
      const payload = { peopleCount: 1001, foodItems: ['Rice'] };
      const result = aiEstimateRequestSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer peopleCount', () => {
      const payload = { peopleCount: 12.5, foodItems: ['Rice'] };
      const result = aiEstimateRequestSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject empty foodItems array', () => {
      const payload = { peopleCount: 10, foodItems: [] };
      const result = aiEstimateRequestSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject > 10 food items', () => {
      const payload = {
        peopleCount: 10,
        foodItems: Array(11).fill('Item'),
      };
      const result = aiEstimateRequestSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject food item string > 50 characters', () => {
      const payload = {
        peopleCount: 10,
        foodItems: ['a'.repeat(51)],
      };
      const result = aiEstimateRequestSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('aiEstimateResponseSchema', () => {
    it('should validate valid AI response payload', () => {
      const validResponse = {
        estimates: [
          {
            foodItem: 'Rice',
            quantity: 5,
            unit: DonationQuantityUnit.KG,
            reasoning: 'Estimated for 50 people.',
          },
          {
            foodItem: 'Dal',
            quantity: 4,
            unit: DonationQuantityUnit.LITERS,
            reasoning: 'Standard portion.',
          },
        ],
      };

      const result = aiEstimateResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should reject invalid unit enum', () => {
      const invalidResponse = {
        estimates: [
          {
            foodItem: 'Rice',
            quantity: 5,
            unit: 'TONS', // Invalid
            reasoning: 'Test',
          },
        ],
      };

      const result = aiEstimateResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('should reject zero or negative quantity', () => {
      const invalidResponse = {
        estimates: [
          {
            foodItem: 'Rice',
            quantity: 0,
            unit: DonationQuantityUnit.KG,
            reasoning: 'Test',
          },
        ],
      };

      const result = aiEstimateResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });
});
