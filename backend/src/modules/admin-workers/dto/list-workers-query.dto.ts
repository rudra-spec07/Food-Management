import { z } from 'zod';
import { UserStatus } from '@prisma/client';

/**
 * Query DTO for GET /api/v1/admin/workers
 *
 * Follows the same pattern as review-query.dto.ts:
 *  - Query params arrive as strings; transform to correct types before validation.
 *  - Maximum limit enforced at DTO level (100).
 *  - Role is NOT a query parameter — the controller forces role = WORKER at DB level.
 */
export const listWorkersQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1, 'Page must be at least 1')),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(
      z
        .number()
        .int()
        .min(1, 'Limit must be at least 1')
        .max(100, 'Limit maximum is 100')
    ),
  status: z
    .enum([UserStatus.ACTIVE, UserStatus.INACTIVE], {
      errorMap: () => ({ message: 'Status filter must be ACTIVE or INACTIVE' }),
    })
    .optional(),
});

export type ListWorkersQueryDto = z.infer<typeof listWorkersQuerySchema>;
