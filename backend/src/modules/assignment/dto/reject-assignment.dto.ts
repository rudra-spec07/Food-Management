import { z } from 'zod';

export const rejectAssignmentSchema = z
  .object({
    reason: z
      .string({ required_error: 'Rejection reason is required' })
      .transform((val) => val.trim())
      .refine((val) => val.length > 0, { message: 'Rejection reason cannot be empty or whitespace' })
      .refine((val) => val.length <= 2000, { message: 'Rejection reason cannot exceed 2000 characters' }),
  })
  .strict();

export type RejectAssignmentDtoParsed = z.infer<typeof rejectAssignmentSchema>;
