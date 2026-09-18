import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DonationReviewDetailsModal } from '../modules/admin/components/DonationReviewDetailsModal';
import { ReviewDetailResponse } from '../modules/admin/types/review.types';

const mockDonationWithPhoto: ReviewDetailResponse = {
  id: 'don-100',
  donorId: 'donor-1',
  donor: {
    id: 'donor-1',
    firstName: 'John',
    lastName: 'Donor',
    email: 'donor@example.com',
    phone: '9876543210',
  },
  category: 'COOKED_MEAL',
  description: 'Fresh vegetarian meals',
  quantity: 25,
  quantityUnit: 'PORTIONS',
  preparedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  pickupAddress: '123 Main St',
  pickupLatitude: 22.7196,
  pickupLongitude: 75.8577,
  contactName: 'John Donor',
  contactPhone: '9876543210',
  photoUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  notes: 'Ring bell',
  status: 'PENDING_REVIEW',
  rejectionReason: null,
  cancelledAt: null,
  completedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  review: null,
  statusHistory: [],
};

const mockDonationNoPhoto: ReviewDetailResponse = {
  ...mockDonationWithPhoto,
  id: 'don-101',
  photoUrl: null,
};

describe('Frontend Donation Image Visibility Component Tests', () => {
  it('should render donor photo when photoUrl is present in Admin Review Workspace', () => {
    render(
      <DonationReviewDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        donation={mockDonationWithPhoto}
        loading={false}
        error={null}
        onApprove={vi.fn()}
        onRejectClick={vi.fn()}
        onViewHistoryClick={vi.fn()}
        isApproving={false}
      />
    );

    expect(screen.getByText('Donation Photo')).toBeInTheDocument();
    const img = screen.getByAltText('Donation Submission');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://res.cloudinary.com/demo/image/upload/sample.jpg');
  });

  it('should render "No photo uploaded" when photoUrl is null in Admin Review Workspace', () => {
    render(
      <DonationReviewDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        donation={mockDonationNoPhoto}
        loading={false}
        error={null}
        onApprove={vi.fn()}
        onRejectClick={vi.fn()}
        onViewHistoryClick={vi.fn()}
        isApproving={false}
      />
    );

    expect(screen.getByText('Donation Photo')).toBeInTheDocument();
    expect(screen.getByText('No photo uploaded')).toBeInTheDocument();
  });
});
