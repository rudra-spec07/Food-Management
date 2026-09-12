import { createDistributionSchema, distributionQuerySchema } from '../../src/modules/distribution/dto/create-distribution.dto';
import { DonationQuantityUnit } from '@prisma/client';

describe('Distribution DTO Validation Tests', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';

  describe('createDistributionSchema', () => {
    it('1. accepts valid create distribution payload', () => {
      const payload = {
        inventoryId: validUUID,
        recipientName: 'Hope Community Shelter',
        quantity: 25.5,
        unit: DonationQuantityUnit.PORTIONS,
        notes: 'Delivered to main kitchen',
      };

      const result = createDistributionSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.recipientName).toBe('Hope Community Shelter');
        expect(result.data.quantity).toBe(25.5);
      }
    });

    it('2. rejects invalid UUID for inventoryId', () => {
      const payload = {
        inventoryId: 'invalid-uuid-123',
        recipientName: 'City Shelter',
        quantity: 10,
      };

      const result = createDistributionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('3. rejects empty or whitespace-only recipientName', () => {
      const payload = {
        inventoryId: validUUID,
        recipientName: '   ',
        quantity: 10,
      };

      const result = createDistributionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('4. rejects recipientName over 255 chars', () => {
      const payload = {
        inventoryId: validUUID,
        recipientName: 'A'.repeat(256),
        quantity: 10,
      };

      const result = createDistributionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('5. rejects zero or negative quantity', () => {
      const zeroPayload = {
        inventoryId: validUUID,
        recipientName: 'Shelter',
        quantity: 0,
      };
      const negPayload = {
        inventoryId: validUUID,
        recipientName: 'Shelter',
        quantity: -5,
      };

      expect(createDistributionSchema.safeParse(zeroPayload).success).toBe(false);
      expect(createDistributionSchema.safeParse(negPayload).success).toBe(false);
    });

    it('6. rejects non-finite quantity (NaN / Infinity)', () => {
      const nanPayload = {
        inventoryId: validUUID,
        recipientName: 'Shelter',
        quantity: NaN,
      };
      const infPayload = {
        inventoryId: validUUID,
        recipientName: 'Shelter',
        quantity: Infinity,
      };

      expect(createDistributionSchema.safeParse(nanPayload).success).toBe(false);
      expect(createDistributionSchema.safeParse(infPayload).success).toBe(false);
    });

    it('7. rejects notes exceeding 2000 chars', () => {
      const payload = {
        inventoryId: validUUID,
        recipientName: 'Shelter',
        quantity: 10,
        notes: 'X'.repeat(2001),
      };

      const result = createDistributionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('8. rejects mass assignment / unexpected fields', () => {
      const payload = {
        inventoryId: validUUID,
        recipientName: 'Shelter',
        quantity: 10,
        distributedBy: validUUID,
        actorRole: 'ADMIN',
        status: 'COMPLETED',
      };

      const result = createDistributionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('distributionQuerySchema', () => {
    it('1. accepts valid query params with defaults', () => {
      const result = distributionQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('2. coerces string page and limit', () => {
      const result = distributionQuerySchema.safeParse({ page: '2', limit: '50', search: 'shelter' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
        expect(result.data.search).toBe('shelter');
      }
    });
  });
});
