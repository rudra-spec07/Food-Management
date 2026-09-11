import { z } from 'zod';
import { passwordValidationSchema } from '../../auth-user/dto/auth.dto';

export const createWorkerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, 'First name is required')
      .max(100, 'First name must not exceed 100 characters'),
    lastName: z
      .string()
      .trim()
      .min(1, 'Last name is required')
      .max(100, 'Last name must not exceed 100 characters'),
    email: z
      .string()
      .trim()
      .email('Invalid email address format')
      .max(255, 'Email must not exceed 255 characters')
      .transform((val) => val.toLowerCase()),
    phone: z
      .string()
      .trim()
      .max(20, 'Phone number must not exceed 20 characters')
      .optional()
      .nullable(),
    password: passwordValidationSchema,
  })
  .strict();

export type CreateWorkerDto = z.infer<typeof createWorkerSchema>;
