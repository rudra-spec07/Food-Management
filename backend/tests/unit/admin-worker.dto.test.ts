import { createWorkerSchema } from '../../src/modules/admin-workers/dto/create-worker.dto';
import { listWorkersQuerySchema } from '../../src/modules/admin-workers/dto/list-workers-query.dto';

describe('Admin Worker Provisioning DTO — Strict Validation Unit Tests', () => {
  const validPayload = {
    firstName: 'Rahul',
    lastName: 'Kumar',
    email: 'rahul.worker@example.test',
    password: 'TemporaryPassword123!',
    phone: '9876543210',
  };

  it('should parse valid payload successfully', () => {
    const result = createWorkerSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('rahul.worker@example.test');
      expect(result.data.firstName).toBe('Rahul');
    }
  });

  it('should parse valid payload without optional phone', () => {
    const { phone, ...withoutPhone } = validPayload;
    const result = createWorkerSchema.safeParse(withoutPhone);
    expect(result.success).toBe(true);
  });

  it('should normalize email to lowercase', () => {
    const result = createWorkerSchema.safeParse({
      ...validPayload,
      email: 'RAHUL.WORKER@EXAMPLE.TEST',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('rahul.worker@example.test');
    }
  });

  it('should reject payload with role injection attempt (strict DTO)', () => {
    const result = createWorkerSchema.safeParse({
      ...validPayload,
      role: 'ADMIN',
    });
    expect(result.success).toBe(false);
  });

  it('should reject payload with status injection attempt (strict DTO)', () => {
    const result = createWorkerSchema.safeParse({
      ...validPayload,
      status: 'INACTIVE',
    });
    expect(result.success).toBe(false);
  });

  it('should reject payload with id or passwordHash injection (strict DTO)', () => {
    const result = createWorkerSchema.safeParse({
      ...validPayload,
      id: 'custom-uuid-123',
      passwordHash: 'fake-hash',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const result = createWorkerSchema.safeParse({
      lastName: 'Kumar',
      email: 'rahul@example.com',
    });
    expect(result.success).toBe(false);
  });

  it('should reject weak password that fails existing password policy', () => {
    const result = createWorkerSchema.safeParse({
      ...validPayload,
      password: '123',
    });
    expect(result.success).toBe(false);
  });
});

describe('List Workers Query DTO — Validation Unit Tests', () => {
  it('uses page=1 and limit=20 as defaults when no params provided', () => {
    const result = listWorkersQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.status).toBeUndefined();
    }
  });

  it('parses page and limit from string query params', () => {
    const result = listWorkersQuerySchema.safeParse({ page: '2', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it('accepts status=ACTIVE', () => {
    const result = listWorkersQuerySchema.safeParse({ status: 'ACTIVE' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('ACTIVE');
    }
  });

  it('accepts status=INACTIVE', () => {
    const result = listWorkersQuerySchema.safeParse({ status: 'INACTIVE' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('INACTIVE');
    }
  });

  it('rejects page=0', () => {
    const result = listWorkersQuerySchema.safeParse({ page: '0' });
    expect(result.success).toBe(false);
  });

  it('rejects limit=0', () => {
    const result = listWorkersQuerySchema.safeParse({ limit: '0' });
    expect(result.success).toBe(false);
  });

  it('rejects limit=101 (exceeds maximum)', () => {
    const result = listWorkersQuerySchema.safeParse({ limit: '101' });
    expect(result.success).toBe(false);
  });

  it('accepts limit=100 (boundary maximum)', () => {
    const result = listWorkersQuerySchema.safeParse({ limit: '100' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(100);
    }
  });

  it('rejects invalid status string', () => {
    const result = listWorkersQuerySchema.safeParse({ status: 'DONOR' });
    expect(result.success).toBe(false);
  });

  it('rejects non-numeric page', () => {
    const result = listWorkersQuerySchema.safeParse({ page: 'abc' });
    // NaN parsed from 'abc' will fail the min(1) check
    expect(result.success).toBe(false);
  });
});
