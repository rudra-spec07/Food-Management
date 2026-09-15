import {
  parseDateParam,
  validateDateRange,
  donationReportQuerySchema,
  donationTrendQuerySchema,
  pickupReportQuerySchema,
  activityQuerySchema,
} from '../../src/modules/reporting/dto/reporting.dto';
import { DonationStatus, DonationCategory, PickupStatus, AuditEventType } from '@prisma/client';
import { BadRequestError } from '../../src/shared/errors/app-error';

describe('Reporting DTO & Date Validation Unit Tests', () => {
  describe('parseDateParam', () => {
    it('returns undefined when date string is empty or missing', () => {
      expect(parseDateParam(undefined)).toBeUndefined();
      expect(parseDateParam('')).toBeUndefined();
      expect(parseDateParam('   ')).toBeUndefined();
    });

    it('parses YYYY-MM-DD date-only for start date as 00:00:00.000Z UTC', () => {
      const parsed = parseDateParam('2026-09-01', false);
      expect(parsed).toBeDefined();
      expect(parsed?.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    });

    it('parses YYYY-MM-DD date-only for end date as start of NEXT day (half-open interval)', () => {
      const parsed = parseDateParam('2026-09-10', true);
      expect(parsed).toBeDefined();
      expect(parsed?.toISOString()).toBe('2026-09-11T00:00:00.000Z');
    });

    it('parses full ISO date string', () => {
      const isoStr = '2026-09-05T14:30:00.000Z';
      const parsed = parseDateParam(isoStr);
      expect(parsed).toBeDefined();
      expect(parsed?.toISOString()).toBe(isoStr);
    });

    it('throws BadRequestError on malformed date string', () => {
      expect(() => parseDateParam('invalid-date')).toThrow(BadRequestError);
      try {
        parseDateParam('invalid-date');
      } catch (err: any) {
        expect(err.code).toBe('REPORT_INVALID_DATE');
      }
    });
  });

  describe('validateDateRange', () => {
    it('passes when dateFrom <= dateTo', () => {
      const from = new Date('2026-09-01T00:00:00Z');
      const to = new Date('2026-09-10T00:00:00Z');
      expect(() => validateDateRange(from, to)).not.toThrow();
    });

    it('throws REPORT_INVALID_DATE_RANGE when dateFrom > dateTo', () => {
      const from = new Date('2026-09-10T00:00:00Z');
      const to = new Date('2026-09-01T00:00:00Z');
      expect(() => validateDateRange(from, to)).toThrow(BadRequestError);
      try {
        validateDateRange(from, to);
      } catch (err: any) {
        expect(err.code).toBe('REPORT_INVALID_DATE_RANGE');
      }
    });

    it('throws REPORT_DATE_RANGE_TOO_LARGE when range exceeds 366 days', () => {
      const from = new Date('2025-01-01T00:00:00Z');
      const to = new Date('2026-06-01T00:00:00Z'); // > 366 days
      expect(() => validateDateRange(from, to)).toThrow(BadRequestError);
      try {
        validateDateRange(from, to);
      } catch (err: any) {
        expect(err.code).toBe('REPORT_DATE_RANGE_TOO_LARGE');
      }
    });
  });

  describe('Zod Schemas Validation', () => {
    it('donationReportQuerySchema parses valid inputs and defaults', () => {
      const parsed = donationReportQuerySchema.parse({
        page: '2',
        limit: '50',
        status: DonationStatus.APPROVED,
        category: DonationCategory.COOKED_MEAL,
      });
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(50);
      expect(parsed.status).toBe(DonationStatus.APPROVED);
      expect(parsed.category).toBe(DonationCategory.COOKED_MEAL);
    });

    it('donationTrendQuerySchema defaults groupBy to DAY and validates enum', () => {
      const defaultParsed = donationTrendQuerySchema.parse({});
      expect(defaultParsed.groupBy).toBe('DAY');

      const monthParsed = donationTrendQuerySchema.parse({ groupBy: 'MONTH' });
      expect(monthParsed.groupBy).toBe('MONTH');

      expect(() => donationTrendQuerySchema.parse({ groupBy: 'YEAR' })).toThrow();
    });

    it('pickupReportQuerySchema validates workerId UUID', () => {
      const validWorkerId = '123e4567-e89b-12d3-a456-426614174000';
      const parsed = pickupReportQuerySchema.parse({
        status: PickupStatus.COMPLETED,
        workerId: validWorkerId,
      });
      expect(parsed.workerId).toBe(validWorkerId);
      expect(parsed.status).toBe(PickupStatus.COMPLETED);

      expect(() => pickupReportQuerySchema.parse({ workerId: 'not-a-uuid' })).toThrow();
    });

    it('activityQuerySchema validates AuditEventType', () => {
      const parsed = activityQuerySchema.parse({
        action: AuditEventType.DONATION_CREATED,
      });
      expect(parsed.action).toBe(AuditEventType.DONATION_CREATED);

      expect(() => activityQuerySchema.parse({ action: 'INVALID_ACTION' })).toThrow();
    });
  });
});
