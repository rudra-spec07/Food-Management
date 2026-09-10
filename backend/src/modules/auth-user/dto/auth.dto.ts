import { z } from 'zod';

export const passwordValidationSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(100, 'Password must not exceed 100 characters')
  .refine((val) => /[A-Z]/.test(val), 'Password must contain at least one uppercase letter')
  .refine((val) => /[a-z]/.test(val), 'Password must contain at least one lowercase letter')
  .refine((val) => /[0-9]/.test(val), 'Password must contain at least one digit')
  .refine((val) => /[^A-Za-z0-9]/.test(val), 'Password must contain at least one special character');

export const registerSchema = z.object({
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
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Invalid email address format')
    .transform((val) => val.toLowerCase()),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name cannot be empty')
    .max(100, 'First name must not exceed 100 characters')
    .optional(),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name cannot be empty')
    .max(100, 'Last name must not exceed 100 characters')
    .optional(),
  phone: z
    .string()
    .trim()
    .max(20, 'Phone number must not exceed 20 characters')
    .nullable()
    .optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordValidationSchema,
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
