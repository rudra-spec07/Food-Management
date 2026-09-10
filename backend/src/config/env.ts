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
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
