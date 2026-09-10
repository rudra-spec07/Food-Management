import { z } from 'zod';

export const rejectDonationSchema = z.object({
  reason: z
    .string({ required_error: 'Rejection reason is required' })
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, { message: 'Rejection reason cannot be empty' })
    .refine((val) => val.length <= 2000, { message: 'Rejection reason cannot exceed 2000 characters' }),
});

export type RejectDonationDto = z.infer<typeof rejectDonationSchema>;
