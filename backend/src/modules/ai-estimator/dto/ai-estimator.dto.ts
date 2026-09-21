import { z } from 'zod';
import { DonationQuantityUnit } from '@prisma/client';

export const aiEstimateRequestSchema = z.object({
  peopleCount: z
    .number({
      required_error: 'peopleCount is required',
      invalid_type_error: 'peopleCount must be a number',
    })
    .int('peopleCount must be an integer')
    .min(1, 'peopleCount must be at least 1')
    .max(1000, 'peopleCount cannot exceed 1000'),

  foodItems: z
    .array(
      z
        .string({
          required_error: 'Food item name must be a string',
          invalid_type_error: 'Food item name must be a string',
        })
        .transform((val) => val.trim())
        .refine((val) => val.length >= 1, { message: 'Food item name cannot be empty' })
        .refine((val) => val.length <= 50, { message: 'Food item name cannot exceed 50 characters' }),
      {
        required_error: 'foodItems is required',
        invalid_type_error: 'foodItems must be an array of strings',
      }
    )
    .min(1, 'At least 1 food item is required')
    .max(10, 'Cannot estimate more than 10 food items at once'),
});

export type AiEstimateRequestDto = z.infer<typeof aiEstimateRequestSchema>;

export const aiEstimateItemSchema = z.object({
  foodItem: z.string().trim().min(1).max(100),
  quantity: z
    .number()
    .positive('Quantity must be greater than 0')
    .max(5000, 'Quantity exceeds reasonable bound'),
  unit: z.nativeEnum(DonationQuantityUnit, {
    errorMap: () => ({ message: 'Invalid donation quantity unit' }),
  }),
  reasoning: z.string().trim().max(500).default(''),
});

export const aiEstimateResponseSchema = z.object({
  estimates: z.array(aiEstimateItemSchema).min(1, 'At least 1 estimate required'),
});

export type AiEstimateItemDto = z.infer<typeof aiEstimateItemSchema>;
export type AiEstimateResponseDto = z.infer<typeof aiEstimateResponseSchema>;
