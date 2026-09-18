import { describe, it, expect } from 'vitest';
import { normalizeQuantityInput, validateIndianMobile, sanitizePhoneInput } from '../utils/validation';

describe('Frontend Validation Utilities Unit Tests', () => {
  describe('normalizeQuantityInput', () => {
    it('preserves empty string editing state', () => {
      expect(normalizeQuantityInput('')).toBe('');
    });

    it('preserves valid temporary "0" editing state', () => {
      expect(normalizeQuantityInput('0')).toBe('0');
    });

    it('preserves valid temporary "0." editing state', () => {
      expect(normalizeQuantityInput('0.')).toBe('0.');
    });

    it('normalizes multiple zero digits to single "0"', () => {
      expect(normalizeQuantityInput('00')).toBe('0');
      expect(normalizeQuantityInput('000')).toBe('0');
    });

    it('normalizes integer quantity with leading zero (012 -> 12)', () => {
      expect(normalizeQuantityInput('012')).toBe('12');
    });

    it('normalizes integer quantity with multiple leading zeros (00100 -> 100)', () => {
      expect(normalizeQuantityInput('00100')).toBe('100');
    });

    it('preserves legitimate decimal values (0.5, 1.5, 10.25)', () => {
      expect(normalizeQuantityInput('0.5')).toBe('0.5');
      expect(normalizeQuantityInput('1.5')).toBe('1.5');
      expect(normalizeQuantityInput('10.25')).toBe('10.25');
    });

    it('normalizes malformed decimal with leading zeros (012.5 -> 12.5)', () => {
      expect(normalizeQuantityInput('012.5')).toBe('12.5');
    });

    it('normalizes multiple leading zeros before decimal point (00.5 -> 0.5)', () => {
      expect(normalizeQuantityInput('00.5')).toBe('0.5');
    });
  });

  describe('validateIndianMobile', () => {
    it('accepts valid 10-digit Indian numbers starting with 6, 7, 8, 9', () => {
      expect(validateIndianMobile('9876543210')).toBe(true);
      expect(validateIndianMobile('9123456789')).toBe(true);
      expect(validateIndianMobile('7012345678')).toBe(true);
      expect(validateIndianMobile('6123456789')).toBe(true);
      expect(validateIndianMobile('8999999999')).toBe(true);
    });

    it('accepts empty or null string for optional fields', () => {
      expect(validateIndianMobile('')).toBe(true);
      expect(validateIndianMobile(null)).toBe(true);
      expect(validateIndianMobile(undefined)).toBe(true);
    });

    it('rejects numbers starting with 0, 1, 2, 3, 4, 5', () => {
      expect(validateIndianMobile('1234567890')).toBe(false);
      expect(validateIndianMobile('5123456789')).toBe(false);
      expect(validateIndianMobile('0987654321')).toBe(false);
    });

    it('rejects numbers with length other than 10 digits', () => {
      expect(validateIndianMobile('987654321')).toBe(false); // 9 digits
      expect(validateIndianMobile('98765432101')).toBe(false); // 11 digits
    });

    it('rejects strings with letters, symbols, spaces, or country codes', () => {
      expect(validateIndianMobile('98765abc10')).toBe(false);
      expect(validateIndianMobile('+919876543210')).toBe(false);
      expect(validateIndianMobile('98765 43210')).toBe(false);
    });
  });

  describe('sanitizePhoneInput', () => {
    it('strips non-digits and truncates to 10 chars', () => {
      expect(sanitizePhoneInput('98765abc10')).toBe('9876510');
      expect(sanitizePhoneInput('+91-98765-43210')).toBe('9198765432');
      expect(sanitizePhoneInput('98765432109999')).toBe('9876543210');
    });
  });
});
