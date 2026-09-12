import { ReservationStatus } from '@prisma/client';

describe('Reservation State Machine Unit Tests', () => {
  // Allowed explicit transitions from ACTIVE
  const allowedFromActive: ReservationStatus[] = [ReservationStatus.RELEASED, ReservationStatus.FULFILLED, ReservationStatus.EXPIRED];

  const canTransitionReservation = (from: ReservationStatus, to: ReservationStatus): boolean => {
    if (from === ReservationStatus.ACTIVE) {
      return allowedFromActive.includes(to);
    }
    // Terminal states cannot transition to any state
    return false;
  };

  const calculateReservationExpiry = (
    createdAt: Date,
    durationHours?: number,
    inventoryExpirationDate?: Date | null
  ): Date => {
    const hours = Math.min(Math.max(durationHours || 24, 1), 72);
    const calculatedExpiry = new Date(createdAt.getTime() + hours * 60 * 60 * 1000);

    if (inventoryExpirationDate && inventoryExpirationDate < calculatedExpiry) {
      return inventoryExpirationDate;
    }
    return calculatedExpiry;
  };

  describe('Reservation State Transitions', () => {
    it('1. allows ACTIVE to transition to RELEASED, FULFILLED, or EXPIRED', () => {
      expect(canTransitionReservation(ReservationStatus.ACTIVE, ReservationStatus.RELEASED)).toBe(true);
      expect(canTransitionReservation(ReservationStatus.ACTIVE, ReservationStatus.FULFILLED)).toBe(true);
      expect(canTransitionReservation(ReservationStatus.ACTIVE, ReservationStatus.EXPIRED)).toBe(true);
    });

    it('2. forbids transition from FULFILLED to any status', () => {
      expect(canTransitionReservation(ReservationStatus.FULFILLED, ReservationStatus.ACTIVE)).toBe(false);
      expect(canTransitionReservation(ReservationStatus.FULFILLED, ReservationStatus.RELEASED)).toBe(false);
    });

    it('3. forbids transition from RELEASED to any status', () => {
      expect(canTransitionReservation(ReservationStatus.RELEASED, ReservationStatus.ACTIVE)).toBe(false);
      expect(canTransitionReservation(ReservationStatus.RELEASED, ReservationStatus.FULFILLED)).toBe(false);
    });

    it('4. forbids transition from EXPIRED to any status', () => {
      expect(canTransitionReservation(ReservationStatus.EXPIRED, ReservationStatus.ACTIVE)).toBe(false);
    });

    it('5. forbids transition from CANCELLED to any status', () => {
      expect(canTransitionReservation(ReservationStatus.CANCELLED, ReservationStatus.ACTIVE)).toBe(false);
    });
  });

  describe('Reservation Expiry Calculation Rules', () => {
    it('1. defaults to 24 hours if duration is not provided', () => {
      const now = new Date('2026-09-12T10:00:00Z');
      const expiry = calculateReservationExpiry(now, undefined, null);
      expect(expiry.toISOString()).toBe(new Date('2026-09-13T10:00:00Z').toISOString());
    });

    it('2. caps maximum requested duration at 72 hours', () => {
      const now = new Date('2026-09-12T10:00:00Z');
      const expiry = calculateReservationExpiry(now, 120, null);
      expect(expiry.toISOString()).toBe(new Date('2026-09-15T10:00:00Z').toISOString());
    });

    it('3. caps expiry date at physical food expiration date if sooner than duration', () => {
      const now = new Date('2026-09-12T10:00:00Z');
      const foodExpiration = new Date('2026-09-12T18:00:00Z'); // 8 hours from now
      const expiry = calculateReservationExpiry(now, 24, foodExpiration);
      expect(expiry.toISOString()).toBe(foodExpiration.toISOString());
    });
  });
});
