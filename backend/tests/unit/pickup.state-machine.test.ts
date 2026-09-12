import { PickupStatus } from '@prisma/client';
import { canTransitionPickup } from '../../src/modules/pickup/state-machine/pickup-state-machine';

describe('Pickup State Machine Unit Tests', () => {
  describe('canTransitionPickup()', () => {
    it('should allow transition from NOT_STARTED to IN_PROGRESS', () => {
      expect(canTransitionPickup(PickupStatus.NOT_STARTED, PickupStatus.IN_PROGRESS)).toBe(true);
    });

    it('should allow transition from IN_PROGRESS to COMPLETED', () => {
      expect(canTransitionPickup(PickupStatus.IN_PROGRESS, PickupStatus.COMPLETED)).toBe(true);
    });

    it('should allow transition from IN_PROGRESS to FAILED', () => {
      expect(canTransitionPickup(PickupStatus.IN_PROGRESS, PickupStatus.FAILED)).toBe(true);
    });

    it('should forbid transition from NOT_STARTED directly to COMPLETED', () => {
      expect(canTransitionPickup(PickupStatus.NOT_STARTED, PickupStatus.COMPLETED)).toBe(false);
    });

    it('should forbid transition from NOT_STARTED directly to FAILED', () => {
      expect(canTransitionPickup(PickupStatus.NOT_STARTED, PickupStatus.FAILED)).toBe(false);
    });

    it('should forbid transition from COMPLETED to IN_PROGRESS', () => {
      expect(canTransitionPickup(PickupStatus.COMPLETED, PickupStatus.IN_PROGRESS)).toBe(false);
    });

    it('should forbid transition from COMPLETED to FAILED', () => {
      expect(canTransitionPickup(PickupStatus.COMPLETED, PickupStatus.FAILED)).toBe(false);
    });

    it('should forbid transition from FAILED to IN_PROGRESS', () => {
      expect(canTransitionPickup(PickupStatus.FAILED, PickupStatus.IN_PROGRESS)).toBe(false);
    });

    it('should forbid transition from FAILED to COMPLETED', () => {
      expect(canTransitionPickup(PickupStatus.FAILED, PickupStatus.COMPLETED)).toBe(false);
    });

    it('should forbid transition from CANCELLED to any status', () => {
      expect(canTransitionPickup(PickupStatus.CANCELLED, PickupStatus.IN_PROGRESS)).toBe(false);
      expect(canTransitionPickup(PickupStatus.CANCELLED, PickupStatus.COMPLETED)).toBe(false);
    });

    it('should forbid transition to same status', () => {
      expect(canTransitionPickup(PickupStatus.NOT_STARTED, PickupStatus.NOT_STARTED)).toBe(false);
      expect(canTransitionPickup(PickupStatus.IN_PROGRESS, PickupStatus.IN_PROGRESS)).toBe(false);
      expect(canTransitionPickup(PickupStatus.COMPLETED, PickupStatus.COMPLETED)).toBe(false);
      expect(canTransitionPickup(PickupStatus.FAILED, PickupStatus.FAILED)).toBe(false);
    });
  });
});
