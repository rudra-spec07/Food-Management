import dotenv from 'dotenv';
import path from 'path';

// 1. Force NODE_ENV to 'test'
process.env.NODE_ENV = 'test';

// 2. Load .env.test if present, fallback to .env
const envTestPath = path.resolve(process.cwd(), '.env.test');
dotenv.config({ path: envTestPath });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const devDbUrl = process.env.DATABASE_URL;
const testDbUrl = process.env.TEST_DATABASE_URL;

// 3. MANDATORY SAFETY GUARD: Refuse to run tests against development DATABASE_URL
if (!testDbUrl || !testDbUrl.trim()) {
  throw new Error(
    'TEST_DATABASE_URL is required for integration tests. Refusing to run against DATABASE_URL.'
  );
}

if (devDbUrl && devDbUrl.trim() === testDbUrl.trim()) {
  throw new Error(
    'TEST_DATABASE_URL is required for integration tests. Refusing to run against DATABASE_URL.'
  );
}

// 4. Override DATABASE_URL with TEST_DATABASE_URL for all Prisma & app modules during test execution
process.env.DATABASE_URL = testDbUrl.trim();

// 5. SMTP SAFETY GUARD: Prevent tests from sending real emails via SmtpEmailProvider
delete process.env.SMTP_HOST;
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;
delete process.env.SMTP_FROM;
