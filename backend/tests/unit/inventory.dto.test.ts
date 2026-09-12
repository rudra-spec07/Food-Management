import { inventoryQuerySchema } from '../../src/modules/inventory/dto/inventory.dto';

describe('Module 05 — Inventory DTO Validation Unit Tests', () => {
  describe('inventoryQuerySchema Strict Validation', () => {
    it('should parse valid empty query and apply defaults', () => {
      const result = inventoryQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.search).toBeUndefined();
      expect(result.status).toBeUndefined();
      expect(result.foodCategory).toBeUndefined();
    });

    it('should parse valid query params with page, limit, status and foodCategory', () => {
      const result = inventoryQuerySchema.parse({
        page: '2',
        limit: '10',
        status: 'AVAILABLE',
        foodCategory: 'COOKED_MEAL',
        search: ' Rice ',
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.status).toBe('AVAILABLE');
      expect(result.foodCategory).toBe('COOKED_MEAL');
      expect(result.search).toBe('Rice');
    });

    it('should reject invalid page numbers <= 0', () => {
      expect(() => inventoryQuerySchema.parse({ page: '0' })).toThrow();
    });

    it('should reject limit exceeding maximum limit 100', () => {
      expect(() => inventoryQuerySchema.parse({ limit: '101' })).toThrow();
    });

    it('should reject invalid status string', () => {
      expect(() => inventoryQuerySchema.parse({ status: 'INVALID_STATUS' })).toThrow();
    });

    it('should reject unexpected extra fields (strict DTO mass assignment check)', () => {
      expect(() =>
        inventoryQuerySchema.parse({
          page: 1,
          extraField: 'injected',
        })
      ).toThrow();
    });
  });
});
