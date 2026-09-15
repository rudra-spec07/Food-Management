import { z } from 'zod';
import { DonationCategory, DonationStatus, PickupStatus, AuditEventType } from '@prisma/client';
import { BadRequestError } from '../../../shared/errors/app-error';

const MAX_DATE_RANGE_DAYS = 366;
const MAX_DATE_RANGE_MS = MAX_DATE_RANGE_DAYS * 24 * 60 * 60 * 1000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Parses input string (YYYY-MM-DD or full ISO string) into a Date object.
 * For `dateTo` when provided as date-only (YYYY-MM-DD, len 10), moves to start of next day (2026-09-11T00:00:00.000Z)
 * to fulfill half-open interval semantics [dateFrom, dateTo).
 */
export function parseDateParam(dateStr?: string, isEndDate = false): Date | undefined {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') {
    return undefined;
  }

  const trimmed = dateStr.trim();
  // Check if date-only format YYYY-MM-DD
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);

  if (isDateOnly) {
    const [yearStr, monthStr, dayStr] = trimmed.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; // 0-indexed
    const day = parseInt(dayStr, 10);

    if (isEndDate) {
      // Half open boundary: dateTo 2026-09-10 becomes 2026-09-11T00:00:00.000Z
      const date = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
      if (isNaN(date.getTime())) {
        throw new BadRequestError('Invalid dateTo format', 'REPORT_INVALID_DATE');
      }
      return date;
    } else {
      const date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      if (isNaN(date.getTime())) {
        throw new BadRequestError('Invalid dateFrom format', 'REPORT_INVALID_DATE');
      }
      return date;
    }
  }

  const date = new Date(trimmed);
  if (isNaN(date.getTime())) {
    throw new BadRequestError(`Invalid date format: ${dateStr}`, 'REPORT_INVALID_DATE');
  }
  return date;
}

/**
 * Validates dateFrom <= dateTo and maximum date range (366 days).
 */
export function validateDateRange(dateFrom?: Date, dateTo?: Date): void {
  if (dateFrom && dateTo) {
    if (dateFrom.getTime() > dateTo.getTime()) {
      throw new BadRequestError('dateFrom cannot be greater than dateTo', 'REPORT_INVALID_DATE_RANGE');
    }
    if (dateTo.getTime() - dateFrom.getTime() > MAX_DATE_RANGE_MS) {
      throw new BadRequestError(
        `Date range exceeds maximum limit of ${MAX_DATE_RANGE_DAYS} days`,
        'REPORT_DATE_RANGE_TOO_LARGE'
      );
    }
  }
}

export const baseReportQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const paginationQuerySchema = z.object({
  page: z.preprocess((val) => (val ? parseInt(val as string, 10) : 1), z.number().int().min(1).default(1)),
  limit: z.preprocess((val) => (val ? parseInt(val as string, 10) : 20), z.number().int().min(1).max(100).default(20)),
});

export const donationReportQuerySchema = baseReportQuerySchema.merge(paginationQuerySchema).extend({
  status: z.nativeEnum(DonationStatus).optional(),
  category: z.nativeEnum(DonationCategory).optional(),
});

export const donationTrendQuerySchema = baseReportQuerySchema.extend({
  groupBy: z.enum(['DAY', 'WEEK', 'MONTH']).default('DAY'),
});

export const pickupReportQuerySchema = baseReportQuerySchema.extend({
  status: z.nativeEnum(PickupStatus).optional(),
  workerId: z.string().regex(UUID_REGEX, 'Invalid workerId format').optional(),
});

export const workerReportQuerySchema = baseReportQuerySchema.merge(paginationQuerySchema);

export const activityQuerySchema = baseReportQuerySchema.merge(paginationQuerySchema).extend({
  action: z.nativeEnum(AuditEventType).optional(),
  userId: z.string().regex(UUID_REGEX, 'Invalid userId format').optional(),
});
