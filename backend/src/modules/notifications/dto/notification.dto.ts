import { z } from 'zod';
import { NotificationChannel, NotificationStatus } from '@prisma/client';

export const NotificationQuerySchema = z.object({
  page: z.preprocess((val) => (val !== undefined && val !== null ? parseInt(String(val), 10) : 1), z.number().int().min(1).default(1)),
  limit: z.preprocess((val) => (val !== undefined && val !== null ? parseInt(String(val), 10) : 20), z.number().int().min(1).max(100).default(20)),
  status: z.nativeEnum(NotificationStatus).optional(),
});

export type NotificationQueryDto = z.infer<typeof NotificationQuerySchema>;

export const UpdatePreferenceSchema = z.object({
  eventType: z.string().min(1, 'eventType is required'),
  channel: z.nativeEnum(NotificationChannel),
  enabled: z.boolean(),
});

export type UpdatePreferenceDto = z.infer<typeof UpdatePreferenceSchema>;
