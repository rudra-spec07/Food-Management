import { z } from 'zod';
import { AssignmentStatus } from '@prisma/client';

export const assignmentQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.nativeEnum(AssignmentStatus).optional(),
});

export type AssignmentQueryDtoParsed = z.infer<typeof assignmentQuerySchema>;
