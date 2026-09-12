import { z } from 'zod';
import { ReservationStatus } from '@prisma/client';

export const createReservationSchema = z
  .object({
    inventoryId: z.string().uuid({ message: 'Invalid inventoryId format' }),
    quantity: z
      .number({ invalid_type_error: 'Quantity must be a number' })
      .positive({ message: 'Quantity must be greater than 0' })
      .finite({ message: 'Quantity must be a finite number' }),
    notes: z
      .string()
      .trim()
      .max(2000, { message: 'Notes must not exceed 2000 characters' })
      .optional(),
    durationHours: z
      .number({ invalid_type_error: 'Duration hours must be a number' })
      .int({ message: 'Duration hours must be an integer' })
      .min(1, { message: 'Duration must be at least 1 hour' })
      .max(72, { message: 'Duration cannot exceed 72 hours' })
      .optional(),
  })
  .strict();

export type CreateReservationDTO = z.infer<typeof createReservationSchema>;

export const reservationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.nativeEnum(ReservationStatus).optional(),
    inventoryId: z.string().uuid().optional(),
  })
  .strict();

export type ReservationQueryDTO = z.infer<typeof reservationQuerySchema>;

export const releaseReservationSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .max(1000, { message: 'Reason must not exceed 1000 characters' })
      .optional(),
  })
  .strict();

export type ReleaseReservationDTO = z.infer<typeof releaseReservationSchema>;
