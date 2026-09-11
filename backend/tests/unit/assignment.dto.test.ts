import { assignWorkerSchema } from '../../src/modules/assignment/dto/assign-worker.dto';
import { rejectAssignmentSchema } from '../../src/modules/assignment/dto/reject-assignment.dto';
import { canTransition } from '../../src/modules/donations/state-machine/donation-state-machine';
import { DonationStatus } from '@prisma/client';

describe('Module 04 — DTO & State Machine Unit Tests', () => {
  describe('assignWorkerSchema Strict Validation', () => {
    it('should parse valid workerId UUID successfully', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const result = assignWorkerSchema.safeParse({ workerId: validUuid });
      expect(result.success).toBe(true);
    });

    it('should reject invalid workerId UUID', () => {
      const result = assignWorkerSchema.safeParse({ workerId: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });

    it('should reject unexpected extra fields (mass assignment protection)', () => {
      const payload = {
        workerId: '123e4567-e89b-12d3-a456-426614174000',
        assignedBy: 'hacker-uuid',
        status: 'ACCEPTED',
        role: 'ADMIN',
      };
      const result = assignWorkerSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('rejectAssignmentSchema Strict Validation', () => {
    it('should parse and trim valid rejection reason', () => {
      const result = rejectAssignmentSchema.safeParse({ reason: '  Vehicle break down  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reason).toBe('Vehicle break down');
      }
    });

    it('should reject empty or whitespace reason', () => {
      const result = rejectAssignmentSchema.safeParse({ reason: '   ' });
      expect(result.success).toBe(false);
    });

    it('should reject reason exceeding 2000 characters', () => {
      const longReason = 'a'.repeat(2001);
      const result = rejectAssignmentSchema.safeParse({ reason: longReason });
      expect(result.success).toBe(false);
    });

    it('should reject unexpected extra fields on reject payload', () => {
      const result = rejectAssignmentSchema.safeParse({
        reason: 'Valid reason',
        status: 'APPROVED',
        assignedBy: 'fake',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('DonationStateMachine Extensions', () => {
    it('should allow ASSIGNED -> APPROVED transition for worker rejection', () => {
      expect(canTransition(DonationStatus.ASSIGNED, DonationStatus.APPROVED)).toBe(true);
    });

    it('should allow ASSIGNED -> ACCEPTED transition for worker accept', () => {
      expect(canTransition(DonationStatus.ASSIGNED, DonationStatus.ACCEPTED)).toBe(true);
    });

    it('should forbid REJECTED -> ACCEPTED transition', () => {
      expect(canTransition(DonationStatus.REJECTED, DonationStatus.ACCEPTED)).toBe(false);
    });

    it('should forbid COMPLETED -> ASSIGNED transition', () => {
      expect(canTransition(DonationStatus.COMPLETED, DonationStatus.ASSIGNED)).toBe(false);
    });
  });
});
