import { z } from 'zod';
import { InventoryStatus, DonationCategory } from '@prisma/client';

export const inventoryQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
    foodCategory: z.nativeEnum(DonationCategory).optional(),
    status: z.nativeEnum(InventoryStatus).optional(),
    availability: z.enum(['AVAILABLE', 'RESERVED', 'LOW', 'DISTRIBUTED', 'EXPIRED']).optional(),
  })
  .strict();

export type InventoryQueryDTO = z.infer<typeof inventoryQuerySchema>;
