import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('5000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL environment variable is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  RATE_LIMIT_LOGIN_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_LOGIN_MAX: z.string().transform(Number).default('10'),
  RATE_LIMIT_REGISTER_WINDOW_MS: z.string().transform(Number).default('3600000'),
  RATE_LIMIT_REGISTER_MAX: z.string().transform(Number).default('5'),
  RATE_LIMIT_CHANGE_PASSWORD_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_CHANGE_PASSWORD_MAX: z.string().transform(Number).default('5'),
  CORS_ORIGIN: z.string().default('*'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  RATE_LIMIT_GLOBAL_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_GLOBAL_MAX: z.string().transform(Number).default('300'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default('foodshare_donations'),
  MAX_FILE_SIZE_MB: z.string().transform(Number).default('5'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .transform((val) => Number(val))
    .optional(),
  SMTP_SECURE: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
