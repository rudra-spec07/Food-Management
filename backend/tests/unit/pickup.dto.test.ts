import {
  startPickupSchema,
  completePickupSchema,
  failPickupSchema,
  workerPickupQuerySchema,
  adminPickupQuerySchema,
} from '../../src/modules/pickup/dto/pickup.dto';
import { PickupStatus } from '@prisma/client';

describe('Module 05 — Pickup DTO Unit Tests', () => {
  describe('startPickupSchema', () => {
    it('should pass for empty object', () => {
      expect(() => startPickupSchema.parse({})).not.toThrow();
    });

    it('should reject unexpected extra fields (strict DTO)', () => {
      expect(() => startPickupSchema.parse({ extraField: 'bad' })).toThrow();
    });
  });

  describe('completePickupSchema', () => {
    it('should pass with empty object', () => {
      const parsed = completePickupSchema.parse({});
      expect(parsed).toEqual({});
    });

    it('should pass and trim valid completionNotes', () => {
      const parsed = completePickupSchema.parse({ completionNotes: '  Delivered safely  ' });
      expect(parsed.completionNotes).toBe('Delivered safely');
    });

    it('should reject completionNotes over 2000 characters', () => {
      const longNotes = 'a'.repeat(2001);
      expect(() => completePickupSchema.parse({ completionNotes: longNotes })).toThrow();
    });

    it('should reject extra unexpected fields', () => {
      expect(() =>
        completePickupSchema.parse({ completionNotes: 'ok', workerId: 'hacked' })
      ).toThrow();
    });
  });

  describe('failPickupSchema', () => {
    it('should pass and trim valid failure reason', () => {
      const parsed = failPickupSchema.parse({ reason: '  Food spoiled  ' });
      expect(parsed.reason).toBe('Food spoiled');
    });

    it('should reject missing reason', () => {
      expect(() => failPickupSchema.parse({})).toThrow();
    });

    it('should reject empty or whitespace reason', () => {
      expect(() => failPickupSchema.parse({ reason: '   ' })).toThrow();
    });

    it('should reject reason exceeding 2000 characters', () => {
      const longReason = 'x'.repeat(2001);
      expect(() => failPickupSchema.parse({ reason: longReason })).toThrow();
    });

    it('should reject extra unexpected fields (mass assignment protection)', () => {
      expect(() =>
        failPickupSchema.parse({ reason: 'Reason text', timestamp: 'client-time' })
      ).toThrow();
    });
  });

  describe('workerPickupQuerySchema', () => {
    it('should use default page=1 and limit=20', () => {
      const parsed = workerPickupQuerySchema.parse({});
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(20);
    });

    it('should accept valid PickupStatus filter', () => {
      const parsed = workerPickupQuerySchema.parse({ status: PickupStatus.IN_PROGRESS });
      expect(parsed.status).toBe(PickupStatus.IN_PROGRESS);
    });

    it('should reject invalid status filter', () => {
      expect(() => workerPickupQuerySchema.parse({ status: 'INVALID_STATUS' })).toThrow();
    });

    it('should parse string query params for page and limit', () => {
      const parsed = workerPickupQuerySchema.parse({ page: '2', limit: '50' });
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(50);
    });
  });

  describe('adminPickupQuerySchema', () => {
    it('should parse valid uuid workerId and donationId', () => {
      const workerId = '11111111-1111-4111-a111-111111111111';
      const donationId = '22222222-2222-4222-a222-222222222222';
      const parsed = adminPickupQuerySchema.parse({ workerId, donationId });
      expect(parsed.workerId).toBe(workerId);
      expect(parsed.donationId).toBe(donationId);
    });

    it('should reject invalid workerId uuid', () => {
      expect(() => adminPickupQuerySchema.parse({ workerId: 'not-a-uuid' })).toThrow();
    });
  });
});
