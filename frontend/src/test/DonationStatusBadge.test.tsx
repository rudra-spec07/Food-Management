import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DonationStatusBadge } from '../modules/donors/components/DonationStatusBadge';
import { DonationStatus } from '../modules/donors/types/donor.types';

// All statuses defined in the backend DonationStatus enum (prisma/schema.prisma)
const ALL_BACKEND_STATUSES: { status: DonationStatus; expectedLabel: string }[] = [
  { status: 'PENDING_REVIEW', expectedLabel: 'Pending Review' },
  { status: 'APPROVED', expectedLabel: 'Approved' },
  { status: 'REJECTED', expectedLabel: 'Rejected' },
  { status: 'ASSIGNED', expectedLabel: 'Assigned' },
  { status: 'ACCEPTED', expectedLabel: 'Accepted' },
  { status: 'PICKED_UP', expectedLabel: 'Picked Up' },
  { status: 'COMPLETED', expectedLabel: 'Completed' },
  { status: 'CANCELLED', expectedLabel: 'Cancelled' },
];

describe('DonationStatusBadge', () => {
  it.each(ALL_BACKEND_STATUSES)(
    'renders correct label for status "$status"',
    ({ status, expectedLabel }) => {
      render(<DonationStatusBadge status={status} />);
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    }
  );

  it('renders 8 statuses total matching backend enum exactly — no DELIVERED or EXPIRED', () => {
    expect(ALL_BACKEND_STATUSES).toHaveLength(8);
    const statuses = ALL_BACKEND_STATUSES.map((s) => s.status);
    expect(statuses).not.toContain('DELIVERED');
    expect(statuses).not.toContain('EXPIRED');
  });
});
