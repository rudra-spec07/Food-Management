import { createReservationSchema, reservationQuerySchema, releaseReservationSchema } from '../../src/modules/reservation/dto/create-reservation.dto';

describe('Reservation DTO Validation Tests', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';

  describe('createReservationSchema', () => {
    it('1. accepts valid create reservation payload with defaults', () => {
      const payload = {
        inventoryId: validUUID,
        quantity: 15.5,
        notes: 'Reserved for community shelter delivery',
        durationHours: 24,
      };

      const result = createReservationSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.inventoryId).toBe(validUUID);
        expect(result.data.quantity).toBe(15.5);
        expect(result.data.durationHours).toBe(24);
      }
    });

    it('2. rejects invalid UUID for inventoryId', () => {
      const payload = {
        inventoryId: 'not-a-valid-uuid',
        quantity: 10,
      };

      const result = createReservationSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('3. rejects zero or negative quantity', () => {
      const zeroPayload = { inventoryId: validUUID, quantity: 0 };
      const negPayload = { inventoryId: validUUID, quantity: -5 };

      expect(createReservationSchema.safeParse(zeroPayload).success).toBe(false);
      expect(createReservationSchema.safeParse(negPayload).success).toBe(false);
    });

    it('4. rejects non-finite quantity (NaN / Infinity)', () => {
      const nanPayload = { inventoryId: validUUID, quantity: NaN };
      const infPayload = { inventoryId: validUUID, quantity: Infinity };

      expect(createReservationSchema.safeParse(nanPayload).success).toBe(false);
      expect(createReservationSchema.safeParse(infPayload).success).toBe(false);
    });

    it('5. rejects notes exceeding 2000 chars', () => {
      const payload = {
        inventoryId: validUUID,
        quantity: 10,
        notes: 'A'.repeat(2001),
      };

      const result = createReservationSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('6. rejects durationHours outside 1-72 range', () => {
      const lowPayload = { inventoryId: validUUID, quantity: 10, durationHours: 0 };
      const highPayload = { inventoryId: validUUID, quantity: 10, durationHours: 100 };

      expect(createReservationSchema.safeParse(lowPayload).success).toBe(false);
      expect(createReservationSchema.safeParse(highPayload).success).toBe(false);
    });

    it('7. rejects mass assignment / client unit injection / unexpected fields', () => {
      const payload = {
        inventoryId: validUUID,
        quantity: 10,
        unit: 'KG', // unit must NOT be accepted from client
        reservedBy: validUUID,
        status: 'FULFILLED',
      };

      const result = createReservationSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('reservationQuerySchema', () => {
    it('1. accepts valid query params with defaults', () => {
      const result = reservationQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('2. coerces string page, limit and validates status filter', () => {
      const result = reservationQuerySchema.safeParse({ page: '2', limit: '50', status: 'ACTIVE' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
        expect(result.data.status).toBe('ACTIVE');
      }
    });

    it('3. rejects invalid reservation status filter', () => {
      const result = reservationQuerySchema.safeParse({ status: 'INVALID_STATUS' });
      expect(result.success).toBe(false);
    });
  });

  describe('releaseReservationSchema', () => {
    it('1. accepts optional reason or empty body', () => {
      expect(releaseReservationSchema.safeParse({}).success).toBe(true);
      expect(releaseReservationSchema.safeParse({ reason: 'No longer needed' }).success).toBe(true);
    });

    it('2. rejects reason exceeding 1000 chars', () => {
      expect(releaseReservationSchema.safeParse({ reason: 'X'.repeat(1001) }).success).toBe(false);
    });

    it('3. rejects unexpected fields (strict schema)', () => {
      expect(releaseReservationSchema.safeParse({ reason: 'Valid', status: 'RELEASED' }).success).toBe(false);
    });
  });
});
