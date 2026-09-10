import { createDonationSchema, updateDonationSchema } from '../../src/modules/donations/dto/donation.dto';
import { DonationCategory, DonationQuantityUnit } from '@prisma/client';

describe('Donation DTO Validation Unit Tests', () => {
  const getValidPayload = () => {
    const now = new Date();
    const preparedAt = new Date(now.getTime() - 1000 * 60 * 30).toISOString(); // 30 mins ago
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 12).toISOString(); // 12 hours from now

    return {
      category: DonationCategory.COOKED_MEAL,
      description: 'Fresh vegetarian meals for 50 people',
      quantity: 50,
      quantityUnit: DonationQuantityUnit.PORTIONS,
      preparedAt,
      expiresAt,
      pickupAddress: '123 Main Road, Indore',
      pickupLatitude: 22.7196,
      pickupLongitude: 75.8577,
      contactName: 'Rahul Sharma',
      contactPhone: '+919999999999',
      photoUrl: 'https://images.example.com/meal.jpg',
      notes: 'Please pick up near main entrance',
    };
  };

  it('should parse valid create donation payload successfully', () => {
    const valid = getValidPayload();
    const result = createDonationSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  describe('Quantity Validation', () => {
    it('should reject zero quantity', () => {
      const payload = { ...getValidPayload(), quantity: 0 };
      const result = createDonationSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject negative quantity', () => {
      const payload = { ...getValidPayload(), quantity: -10 };
      const result = createDonationSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('Date Validation', () => {
    it('should reject when expiresAt is earlier than preparedAt', () => {
      const now = new Date();
      const preparedAt = new Date(now.getTime() + 1000 * 60 * 60 * 5).toISOString();
      const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 2).toISOString(); // earlier than preparedAt

      const payload = { ...getValidPayload(), preparedAt, expiresAt };
      const result = createDonationSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject preparedAt in the future', () => {
      const now = new Date();
      const preparedAt = new Date(now.getTime() + 1000 * 60 * 60 * 2).toISOString(); // 2 hrs in future
      const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 10).toISOString();

      const payload = { ...getValidPayload(), preparedAt, expiresAt };
      const result = createDonationSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('Coordinates Validation', () => {
    it('should reject when latitude is provided but longitude is missing', () => {
      const payload = { ...getValidPayload(), pickupLatitude: 22.7196, pickupLongitude: undefined };
      const result = createDonationSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject latitude out of range (-95)', () => {
      const payload = { ...getValidPayload(), pickupLatitude: -95.0, pickupLongitude: 75.8577 };
      const result = createDonationSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should accept when both coordinates are omitted', () => {
      const payload = { ...getValidPayload(), pickupLatitude: undefined, pickupLongitude: undefined };
      const result = createDonationSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('Photo URL Security Validation', () => {
    it('should reject executable file extensions in photoUrl', () => {
      const payload = { ...getValidPayload(), photoUrl: 'https://example.com/script.exe' };
      const result = createDonationSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should accept valid image URLs', () => {
      const payload = { ...getValidPayload(), photoUrl: 'https://images.example.com/photo.png' };
      const result = createDonationSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('Update Donation DTO Validation', () => {
    it('should parse valid partial update payload', () => {
      const result = updateDonationSchema.safeParse({ description: 'Updated food description', quantity: 25 });
      expect(result.success).toBe(true);
    });

    it('should reject invalid photoUrl extension on update', () => {
      const result = updateDonationSchema.safeParse({ photoUrl: 'https://example.com/malicious.bat' });
      expect(result.success).toBe(false);
    });
  });
});
