import { z } from 'zod';
import { PickupStatus } from '@prisma/client';

export const startPickupSchema = z.object({}).strict();

export const completePickupSchema = z
  .object({
    completionNotes: z
      .string()
      .trim()
      .max(2000, 'Completion notes must not exceed 2000 characters')
      .optional(),
  })
  .strict();

export const failPickupSchema = z
  .object({
    reason: z
      .string({ required_error: 'Failure reason is required' })
      .trim()
      .min(1, 'Failure reason cannot be empty')
      .max(2000, 'Failure reason must not exceed 2000 characters'),
  })
  .strict();

export const workerPickupQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.nativeEnum(PickupStatus).optional(),
});

export const adminPickupQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.nativeEnum(PickupStatus).optional(),
  workerId: z.string().uuid().optional(),
  donationId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
