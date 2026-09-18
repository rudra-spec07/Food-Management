import { registerSchema, updateProfileSchema } from '../../src/modules/auth-user/dto/auth.dto';
import { createWorkerSchema } from '../../src/modules/admin-workers/dto/create-worker.dto';
import { createBeneficiarySchema, updateBeneficiarySchema } from '../../src/modules/beneficiary/dto/beneficiary.dto';
import { createDonationSchema } from '../../src/modules/donations/dto/donation.dto';
import { DonationCategory, DonationQuantityUnit } from '@prisma/client';

describe('Indian Mobile Number Validation Unit Tests (Format Rules)', () => {
  const validMobileNumbers = ['9876543210', '9123456789', '8999999999', '7012345678', '6123456789'];
  const invalidMobileNumbers = [
    '1234567890', // starts with 1
    '5123456789', // starts with 5
    '987654321',  // 9 digits
    '98765432101',// 11 digits
    '98765abc10', // contains alphabetic characters
    '+919876543210', // contains country code
    '09876543210', // leading zero
    '98765 43210', // contains space
    '98765-43210', // contains hyphen
  ];

  describe('User Registration & Profile Update DTOs', () => {
    it('accepts valid 10-digit Indian mobile numbers in registerSchema', () => {
      for (const phone of validMobileNumbers) {
        const payload = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone,
          password: 'Password123!',
        };
        const result = registerSchema.safeParse(payload);
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid mobile numbers in registerSchema', () => {
      for (const phone of invalidMobileNumbers) {
        const payload = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone,
          password: 'Password123!',
        };
        const result = registerSchema.safeParse(payload);
        expect(result.success).toBe(false);
      }
    });

    it('accepts null, undefined, or empty phone in registerSchema (optional field)', () => {
      expect(registerSchema.safeParse({ firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'Password123!' }).success).toBe(true);
      expect(registerSchema.safeParse({ firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: null, password: 'Password123!' }).success).toBe(true);
      expect(registerSchema.safeParse({ firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '', password: 'Password123!' }).success).toBe(true);
    });

    it('rejects invalid mobile numbers in updateProfileSchema', () => {
      for (const phone of invalidMobileNumbers) {
        const result = updateProfileSchema.safeParse({ phone });
        expect(result.success).toBe(false);
      }
    });
  });

  describe('Worker Provisioning DTO', () => {
    it('accepts valid mobile numbers and rejects invalid ones in createWorkerSchema', () => {
      expect(createWorkerSchema.safeParse({ firstName: 'Worker', lastName: 'One', email: 'w1@example.com', phone: '9876543210', password: 'Password123!' }).success).toBe(true);
      expect(createWorkerSchema.safeParse({ firstName: 'Worker', lastName: 'One', email: 'w1@example.com', phone: '1234567890', password: 'Password123!' }).success).toBe(false);
    });
  });

  describe('Beneficiary DTOs', () => {
    it('accepts valid mobile numbers and rejects invalid ones in createBeneficiarySchema', () => {
      expect(createBeneficiarySchema.safeParse({ name: 'Shelter', phone: '9876543210', address: '123 Main St' }).success).toBe(true);
      expect(createBeneficiarySchema.safeParse({ name: 'Shelter', phone: '555-0199', address: '123 Main St' }).success).toBe(false);
    });

    it('accepts valid mobile numbers and rejects invalid ones in updateBeneficiarySchema', () => {
      expect(updateBeneficiarySchema.safeParse({ phone: '9123456789' }).success).toBe(true);
      expect(updateBeneficiarySchema.safeParse({ phone: '98765abc10' }).success).toBe(false);
    });
  });

  describe('Donation DTOs (contactPhone Required)', () => {
    const getValidDonation = () => ({
      category: DonationCategory.COOKED_MEAL,
      description: 'Meals for 20 people',
      quantity: 20,
      quantityUnit: DonationQuantityUnit.PORTIONS,
      preparedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(),
      pickupAddress: '456 Ring Road, Indore',
      contactName: 'Contact Person',
      contactPhone: '9876543210',
    });

    it('accepts valid Indian mobile numbers for contactPhone in createDonationSchema', () => {
      for (const phone of validMobileNumbers) {
        const payload = { ...getValidDonation(), contactPhone: phone };
        const result = createDonationSchema.safeParse(payload);
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid mobile numbers for contactPhone in createDonationSchema', () => {
      for (const phone of invalidMobileNumbers) {
        const payload = { ...getValidDonation(), contactPhone: phone };
        const result = createDonationSchema.safeParse(payload);
        expect(result.success).toBe(false);
      }
    });

    it('rejects missing or empty contactPhone in createDonationSchema (required field)', () => {
      const payloadMissing = { ...getValidDonation(), contactPhone: undefined };
      expect(createDonationSchema.safeParse(payloadMissing).success).toBe(false);

      const payloadEmpty = { ...getValidDonation(), contactPhone: '' };
      expect(createDonationSchema.safeParse(payloadEmpty).success).toBe(false);
    });
  });
});
