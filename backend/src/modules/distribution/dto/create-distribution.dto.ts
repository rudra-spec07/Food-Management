import { z } from 'zod';
import { DonationQuantityUnit } from '@prisma/client';

export const createDistributionSchema = z
  .object({
    inventoryId: z.string().uuid({ message: 'Invalid inventoryId format' }),
    recipientName: z
      .string()
      .trim()
      .min(1, { message: 'Recipient name is required' })
      .max(255, { message: 'Recipient name must not exceed 255 characters' }),
    quantity: z
      .number({ invalid_type_error: 'Quantity must be a number' })
      .positive({ message: 'Quantity must be greater than 0' })
      .finite({ message: 'Quantity must be a finite number' }),
    unit: z.nativeEnum(DonationQuantityUnit).optional(),
    notes: z
      .string()
      .trim()
      .max(2000, { message: 'Notes must not exceed 2000 characters' })
      .optional(),
  })
  .strict();

export type CreateDistributionDTO = z.infer<typeof createDistributionSchema>;

export const distributionQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
  })
  .strict();

export type DistributionQueryDTO = z.infer<typeof distributionQuerySchema>;
