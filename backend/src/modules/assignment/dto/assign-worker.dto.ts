import { z } from 'zod';

export const assignWorkerSchema = z
  .object({
    workerId: z.string().uuid('Invalid worker ID format'),
  })
  .strict();

export type AssignWorkerDtoParsed = z.infer<typeof assignWorkerSchema>;
