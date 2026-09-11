import { z } from 'zod';

export const assignmentQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type AssignmentQueryDtoParsed = z.infer<typeof assignmentQuerySchema>;
