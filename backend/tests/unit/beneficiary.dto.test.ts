import { createBeneficiarySchema, updateBeneficiarySchema, beneficiaryQuerySchema } from '../../src/modules/beneficiary/dto/beneficiary.dto';
import { BeneficiaryStatus } from '@prisma/client';

describe('Beneficiary DTO Unit Tests', () => {
  describe('createBeneficiarySchema', () => {
    it('accepts valid payload with defaults', () => {
      const result = createBeneficiarySchema.parse({
        name: 'Shelter Hope',
        address: '123 Care St',
      });
      expect(result.name).toBe('Shelter Hope');
      expect(result.address).toBe('123 Care St');
      expect(result.status).toBe(BeneficiaryStatus.ACTIVE);
    });

    it('trims string inputs correctly', () => {
      const result = createBeneficiarySchema.parse({
        name: '  Community Food Bank  ',
        address: '  456 Main St  ',
        contactPerson: '  Jane Doe  ',
        email: '  INFO@FOODBANK.ORG  ',
      });
      expect(result.name).toBe('Community Food Bank');
      expect(result.address).toBe('456 Main St');
      expect(result.contactPerson).toBe('Jane Doe');
      expect(result.email).toBe('INFO@FOODBANK.ORG');
    });

    it('rejects empty name or address', () => {
      expect(() =>
        createBeneficiarySchema.parse({
          name: '   ',
          address: '123 Care St',
        })
      ).toThrow();

      expect(() =>
        createBeneficiarySchema.parse({
          name: 'Shelter',
          address: '',
        })
      ).toThrow();
    });

    it('rejects invalid email format', () => {
      expect(() =>
        createBeneficiarySchema.parse({
          name: 'Shelter',
          address: '123 Care St',
          email: 'not-an-email',
        })
      ).toThrow();
    });

    it('rejects unexpected fields (strict DTO mass assignment protection)', () => {
      expect(() =>
        createBeneficiarySchema.parse({
          name: 'Shelter',
          address: '123 Care St',
          id: 'fake-uuid',
        })
      ).toThrow();
    });
  });

  describe('updateBeneficiarySchema', () => {
    it('accepts valid partial update', () => {
      const result = updateBeneficiarySchema.parse({
        status: BeneficiaryStatus.INACTIVE,
        phone: '555-0199',
      });
      expect(result.status).toBe(BeneficiaryStatus.INACTIVE);
      expect(result.phone).toBe('555-0199');
    });

    it('rejects unexpected fields on update', () => {
      expect(() =>
        updateBeneficiarySchema.parse({
          status: BeneficiaryStatus.INACTIVE,
          role: 'ADMIN',
        })
      ).toThrow();
    });
  });

  describe('beneficiaryQuerySchema', () => {
    it('provides sensible defaults for pagination', () => {
      const result = beneficiaryQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('coerces string page and limit', () => {
      const result = beneficiaryQuerySchema.parse({
        page: '2',
        limit: '15',
        status: 'ACTIVE',
      });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(15);
      expect(result.status).toBe(BeneficiaryStatus.ACTIVE);
    });

    it('rejects invalid page number', () => {
      expect(() =>
        beneficiaryQuerySchema.parse({
          page: '0',
        })
      ).toThrow();
    });
  });
});
