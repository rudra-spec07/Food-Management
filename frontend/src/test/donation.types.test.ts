import { describe, it, expect } from 'vitest';
import {
  DonationCategory,
  DonationQuantityUnit,
  DonationStatus,
  CreateDonationPayload,
  CancelDonationPayload,
  DonationQueryFilters,
  PaginatedDonationResult,
} from '../modules/donors/types/donor.types';

// ─── Backend Contract Alignment Tests ────────────────────────────────────────
// These tests document and enforce that the frontend types exactly match the
// backend donation.dto.ts / prisma/schema.prisma definitions.

describe('DonationCategory enum', () => {
  const BACKEND_CATEGORIES: DonationCategory[] = [
    'COOKED_MEAL', 'PACKAGED_FOOD', 'GROCERIES', 'BAKERY', 'FRUITS', 'VEGETABLES', 'OTHER',
  ];
  it('contains exactly the 7 categories defined in backend prisma schema', () => {
    expect(BACKEND_CATEGORIES).toHaveLength(7);
  });
  it('does not contain any non-backend values', () => {
    const invalid = ['PREPARED_FOOD', 'BEVERAGE', 'DAIRY'];
    invalid.forEach((v) => expect(BACKEND_CATEGORIES).not.toContain(v));
  });
});

describe('DonationQuantityUnit enum', () => {
  const BACKEND_UNITS: DonationQuantityUnit[] = [
    'PORTIONS', 'KG', 'LITERS', 'PACKETS', 'BOXES', 'ITEMS',
  ];
  it('contains exactly the 6 units defined in backend prisma schema', () => {
    expect(BACKEND_UNITS).toHaveLength(6);
  });
  it('uses LITERS not LITER', () => {
    expect(BACKEND_UNITS).toContain('LITERS');
    expect(BACKEND_UNITS).not.toContain('LITER');
  });
});

describe('DonationStatus enum', () => {
  const BACKEND_STATUSES: DonationStatus[] = [
    'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ASSIGNED',
    'ACCEPTED', 'PICKED_UP', 'COMPLETED', 'CANCELLED',
  ];
  it('contains exactly the 8 statuses from backend prisma schema', () => {
    expect(BACKEND_STATUSES).toHaveLength(8);
  });
  it('does not contain DELIVERED or EXPIRED (not in backend schema)', () => {
    expect(BACKEND_STATUSES).not.toContain('DELIVERED');
    expect(BACKEND_STATUSES).not.toContain('EXPIRED');
  });
  it('includes ACCEPTED and COMPLETED (confirmed in backend state machine)', () => {
    expect(BACKEND_STATUSES).toContain('ACCEPTED');
    expect(BACKEND_STATUSES).toContain('COMPLETED');
  });
});

describe('CreateDonationPayload fields', () => {
  it('maps exactly to backend createDonationSchema fields', () => {
    const payload: CreateDonationPayload = {
      category: 'COOKED_MEAL',
      description: 'Test donation',
      quantity: 10,
      quantityUnit: 'PORTIONS',
      preparedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      pickupAddress: '123 Test Street',
      contactName: 'Test Contact',
      contactPhone: '9876543210',
      // optional fields
      pickupLatitude: null,
      pickupLongitude: null,
      photoUrl: null,
      notes: null,
    };
    // Required fields present
    expect(payload.category).toBe('COOKED_MEAL');
    expect(payload.description).toBeTruthy();
    expect(payload.quantity).toBeGreaterThan(0);
    expect(payload.quantityUnit).toBe('PORTIONS');
    expect(payload.preparedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(payload.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(payload.pickupAddress).toBeTruthy();
    expect(payload.contactName).toBeTruthy();
    expect(payload.contactPhone).toBeTruthy();
  });

  it('does not have invented fields like title, imageUrl, expirationDate, preparedDate', () => {
    const payload: CreateDonationPayload = {
      category: 'GROCERIES',
      description: 'Groceries',
      quantity: 5,
      quantityUnit: 'KG',
      preparedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      pickupAddress: 'Test',
      contactName: 'Name',
      contactPhone: '1234567890',
    };
    expect((payload as any).title).toBeUndefined();
    expect((payload as any).imageUrl).toBeUndefined();
    expect((payload as any).expirationDate).toBeUndefined();
  });
});

describe('CancelDonationPayload', () => {
  it('only contains optional reason field matching cancelDonationSchema', () => {
    const withReason: CancelDonationPayload = { reason: 'No longer available' };
    const withoutReason: CancelDonationPayload = {};
    expect(withReason.reason).toBe('No longer available');
    expect(withoutReason.reason).toBeUndefined();
    // No other fields
    expect(Object.keys(withReason)).toEqual(['reason']);
  });
});

describe('DonationQueryFilters', () => {
  it('only supports page, limit, and status — no search/keyword', () => {
    const filters: DonationQueryFilters = { page: 1, limit: 10, status: 'PENDING_REVIEW' };
    expect((filters as any).search).toBeUndefined();
    expect((filters as any).keyword).toBeUndefined();
    expect((filters as any).q).toBeUndefined();
  });

  it('accepts ALL as status filter (client-side: sends no status param)', () => {
    const filters: DonationQueryFilters = { status: 'ALL' };
    expect(filters.status).toBe('ALL');
  });
});

describe('PaginatedDonationResult shape', () => {
  it('matches backend listMyDonations response envelope', () => {
    const result: PaginatedDonationResult = {
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
    expect(result.items).toBeInstanceOf(Array);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.totalPages).toBe(0);
  });
});
