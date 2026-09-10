import { z } from 'zod';
import { DonationCategory, DonationStatus } from '@prisma/client';

export const reviewQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1, 'Page must be at least 1')),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit maximum is 100')),
  status: z
    .enum([DonationStatus.PENDING_REVIEW, DonationStatus.APPROVED, DonationStatus.REJECTED], {
      errorMap: () => ({ message: 'Review queue status filter can only be PENDING_REVIEW, APPROVED, or REJECTED' }),
    })
    .optional(),
  category: z.nativeEnum(DonationCategory).optional(),
  startDate: z.string().datetime({ message: 'startDate must be a valid ISO date string' }).optional(),
  endDate: z.string().datetime({ message: 'endDate must be a valid ISO date string' }).optional(),
});

export type ReviewQueryDto = z.infer<typeof reviewQuerySchema>;
