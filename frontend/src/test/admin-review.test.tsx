import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RejectDonationModal } from '../modules/admin/components/RejectDonationModal';
import { ReviewHistoryModal } from '../modules/admin/components/ReviewHistoryModal';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { reviewService } from '../modules/admin/services/review.service';
import { apiClient } from '../services/api/apiClient';

vi.mock('../services/api/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../hooks/useAuth';

describe('Frontend Module 03 — Admin Review Unit & Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RejectDonationModal Validation', () => {
    it('blocks submission and shows error when reason is empty or whitespace-only', async () => {
      const handleConfirm = vi.fn();
      const handleClose = vi.fn();

      render(
        <RejectDonationModal
          isOpen={true}
          onClose={handleClose}
          onConfirm={handleConfirm}
          donationId="test-donation-123"
          isSubmitting={false}
        />
      );

      expect(screen.getByText(/Reject Food Donation/i)).toBeInTheDocument();

      const textarea = screen.getByPlaceholderText(/Food prepared date is too close to expiry/i);
      const submitBtn = screen.getByRole('button', { name: /Confirm Rejection/i });

      // Attempt to submit whitespace
      fireEvent.change(textarea, { target: { value: '   ' } });
      expect(submitBtn).toBeDisabled();

      fireEvent.change(textarea, { target: { value: 'Valid rejection reason.' } });
      expect(submitBtn).not.toBeDisabled();
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(handleConfirm).toHaveBeenCalledWith('Valid rejection reason.');
      });
    });

    it('trims leading/trailing whitespace before calling onConfirm', async () => {
      const handleConfirm = vi.fn();

      render(
        <RejectDonationModal
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={handleConfirm}
          donationId="test-donation-123"
          isSubmitting={false}
        />
      );

      const textarea = screen.getByPlaceholderText(/Food prepared date is too close to expiry/i);
      fireEvent.change(textarea, { target: { value: '  Untrimmed reason text  ' } });
      fireEvent.click(screen.getByText('Confirm Rejection'));

      await waitFor(() => {
        expect(handleConfirm).toHaveBeenCalledWith('Untrimmed reason text');
      });
    });
  });

  describe('ReviewHistoryModal Component & Contract Alignment', () => {
    it('renders review decision and status history timeline from backend history object', async () => {
      const mockHistoryResponse = {
        data: {
          success: true,
          data: {
            history: {
              id: 'don-123',
              status: 'REJECTED',
              rejectionReason: 'Damaged package',
              review: {
                id: 'rev-1',
                reviewerId: 'admin-1',
                decision: 'REJECTED',
                reason: 'Damaged package',
                reviewedAt: '2026-09-10T22:30:00.000Z',
                reviewer: {
                  id: 'admin-1',
                  firstName: 'Admin',
                  lastName: 'User',
                  email: 'admin.dev@foodshare.test',
                },
              },
              statusHistory: [
                {
                  id: 'sh-1',
                  fromStatus: null,
                  toStatus: 'PENDING_REVIEW',
                  changedBy: 'donor-1',
                  changedAt: '2026-09-10T22:00:00.000Z',
                  reason: null,
                  user: { id: 'donor-1', firstName: 'Jane', lastName: 'Donor', role: 'DONOR' },
                },
              ],
            },
          },
        },
      };
      (apiClient.get as any).mockResolvedValueOnce(mockHistoryResponse);

      render(
        <ReviewHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          donationId="don-123"
        />
      );

      expect(screen.getByText('Loading review history log...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/Donation Review & Audit History/i)).toBeInTheDocument();
      });

      expect(screen.getByText('Administrative Review Decision')).toBeInTheDocument();
      expect(screen.getByText('Damaged package', { exact: false })).toBeInTheDocument();
      expect(screen.getByText(/Admin User/)).toBeInTheDocument();
      expect(screen.getByText(/Status Transition History/)).toBeInTheDocument();
    });

    it('renders empty message gracefully when review is null and statusHistory is empty', async () => {
      const mockEmptyHistoryResponse = {
        data: {
          success: true,
          data: {
            history: {
              id: 'don-456',
              status: 'PENDING_REVIEW',
              rejectionReason: null,
              review: null,
              statusHistory: [],
            },
          },
        },
      };
      (apiClient.get as any).mockResolvedValueOnce(mockEmptyHistoryResponse);

      render(
        <ReviewHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          donationId="don-456"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No review record yet')).toBeInTheDocument();
      });
    });
  });

  describe('reviewService API Integration Contract', () => {
    it('calls GET /admin/donations/review with correct params', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            items: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
          },
        },
      };
      (apiClient.get as any).mockResolvedValueOnce(mockResponse);

      const result = await reviewService.getReviewQueue({ page: 1, limit: 20, status: 'PENDING_REVIEW' });

      expect(apiClient.get).toHaveBeenCalledWith('/admin/donations/review', {
        params: { page: 1, limit: 20, status: 'PENDING_REVIEW' },
      });
      expect(result.items).toEqual([]);
    });

    it('calls GET /admin/donations/:id/reviews and returns history object', async () => {
      const mockHistoryObj = {
        id: 'don-123',
        status: 'APPROVED',
        review: { id: 'rev-1', decision: 'APPROVED' },
        statusHistory: [],
      };
      (apiClient.get as any).mockResolvedValueOnce({
        data: { success: true, data: { history: mockHistoryObj } },
      });

      const history = await reviewService.getReviewHistory('don-123');

      expect(apiClient.get).toHaveBeenCalledWith('/admin/donations/don-123/reviews');
      expect(history).toEqual(mockHistoryObj);
    });

    it('sends empty body {} to POST /admin/donations/:id/approve', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Approved',
          data: { donation: { id: 'don-1' }, review: { id: 'rev-1' } },
        },
      };
      (apiClient.post as any).mockResolvedValueOnce(mockResponse);

      await reviewService.approveDonation('don-1');

      expect(apiClient.post).toHaveBeenCalledWith('/admin/donations/don-1/approve', {});
    });

    it('sends payload { reason } to POST /admin/donations/:id/reject', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Rejected',
          data: { donation: { id: 'don-1' }, review: { id: 'rev-1' } },
        },
      };
      (apiClient.post as any).mockResolvedValueOnce(mockResponse);

      await reviewService.rejectDonation('don-1', { reason: 'Food expired' });

      expect(apiClient.post).toHaveBeenCalledWith('/admin/donations/don-1/reject', {
        reason: 'Food expired',
      });
    });
  });

  describe('Role-Based ProtectedRoute Guards for ADMIN', () => {
    it('allows ADMIN role to render protected workspace route', () => {
      (useAuth as any).mockReturnValue({
        status: 'authenticated',
        user: { role: 'ADMIN', firstName: 'Admin', lastName: 'User' },
      });

      render(
        <MemoryRouter initialEntries={['/admin/donations/review']}>
          <Routes>
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin/donations/review" element={<div>Admin Review Workspace</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Admin Review Workspace')).toBeInTheDocument();
    });

    it('redirects DONOR role away from ADMIN workspace to /dashboard', () => {
      (useAuth as any).mockReturnValue({
        status: 'authenticated',
        user: { role: 'DONOR', firstName: 'Jane', lastName: 'Donor' },
      });

      render(
        <MemoryRouter initialEntries={['/admin/donations/review']}>
          <Routes>
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin/donations/review" element={<div>Admin Review Workspace</div>} />
            </Route>
            <Route path="/dashboard" element={<div>Donor Dashboard Fallback</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.queryByText('Admin Review Workspace')).not.toBeInTheDocument();
      expect(screen.getByText('Donor Dashboard Fallback')).toBeInTheDocument();
    });
  });
});
