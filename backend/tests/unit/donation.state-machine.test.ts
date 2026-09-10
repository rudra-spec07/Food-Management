import { DonationStatus } from '@prisma/client';
import { canTransition, isDonationEditableByDonor, isDonationCancellableByDonor } from '../../src/modules/donations/state-machine/donation-state-machine';

describe('Donation State Machine Unit Tests', () => {
  describe('canTransition()', () => {
    it('should allow transition from PENDING_REVIEW to CANCELLED', () => {
      expect(canTransition(DonationStatus.PENDING_REVIEW, DonationStatus.CANCELLED)).toBe(true);
    });

    it('should allow transition from PENDING_REVIEW to APPROVED', () => {
      expect(canTransition(DonationStatus.PENDING_REVIEW, DonationStatus.APPROVED)).toBe(true);
    });

    it('should allow transition from PENDING_REVIEW to REJECTED', () => {
      expect(canTransition(DonationStatus.PENDING_REVIEW, DonationStatus.REJECTED)).toBe(true);
    });

    it('should allow transition from APPROVED to CANCELLED', () => {
      expect(canTransition(DonationStatus.APPROVED, DonationStatus.CANCELLED)).toBe(true);
    });

    it('should forbid transition from COMPLETED to CANCELLED', () => {
      expect(canTransition(DonationStatus.COMPLETED, DonationStatus.CANCELLED)).toBe(false);
    });

    it('should forbid transition from PICKED_UP to CANCELLED', () => {
      expect(canTransition(DonationStatus.PICKED_UP, DonationStatus.CANCELLED)).toBe(false);
    });

    it('should forbid any transition from CANCELLED', () => {
      expect(canTransition(DonationStatus.CANCELLED, DonationStatus.PENDING_REVIEW)).toBe(false);
      expect(canTransition(DonationStatus.CANCELLED, DonationStatus.APPROVED)).toBe(false);
    });

    it('should forbid transition to same status', () => {
      expect(canTransition(DonationStatus.PENDING_REVIEW, DonationStatus.PENDING_REVIEW)).toBe(false);
    });
  });

  describe('isDonationEditableByDonor()', () => {
    it('should return true ONLY for PENDING_REVIEW status', () => {
      expect(isDonationEditableByDonor(DonationStatus.PENDING_REVIEW)).toBe(true);
      expect(isDonationEditableByDonor(DonationStatus.APPROVED)).toBe(false);
      expect(isDonationEditableByDonor(DonationStatus.REJECTED)).toBe(false);
      expect(isDonationEditableByDonor(DonationStatus.ASSIGNED)).toBe(false);
      expect(isDonationEditableByDonor(DonationStatus.ACCEPTED)).toBe(false);
      expect(isDonationEditableByDonor(DonationStatus.PICKED_UP)).toBe(false);
      expect(isDonationEditableByDonor(DonationStatus.COMPLETED)).toBe(false);
      expect(isDonationEditableByDonor(DonationStatus.CANCELLED)).toBe(false);
    });
  });

  describe('isDonationCancellableByDonor()', () => {
    it('should return true for PENDING_REVIEW and APPROVED statuses', () => {
      expect(isDonationCancellableByDonor(DonationStatus.PENDING_REVIEW)).toBe(true);
      expect(isDonationCancellableByDonor(DonationStatus.APPROVED)).toBe(true);
      expect(isDonationCancellableByDonor(DonationStatus.PICKED_UP)).toBe(false);
      expect(isDonationCancellableByDonor(DonationStatus.COMPLETED)).toBe(false);
      expect(isDonationCancellableByDonor(DonationStatus.CANCELLED)).toBe(false);
    });
  });
});
