import React, { useCallback, useEffect, useState } from 'react';
import {
  ClipboardCheck,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  Inbox,
  AlertTriangle,
  History,
} from 'lucide-react';
import { reviewService } from '../services/review.service';
import {
  PaginatedReviewQueueResult,
  ReviewDetailResponse,
  ReviewQueryFilters,
  ReviewQueueItem,
} from '../types/review.types';
import { DonationCategory } from '../../donors/types/donor.types';
import { DonationStatusBadge } from '../../donors/components/DonationStatusBadge';
import { DonationReviewDetailsModal } from '../components/DonationReviewDetailsModal';
import { RejectDonationModal } from '../components/RejectDonationModal';
import { ReviewHistoryModal } from '../components/ReviewHistoryModal';

export const AdminDonationReviewPage: React.FC = () => {
  // State management
  const [queueData, setQueueData] = useState<PaginatedReviewQueueResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<ReviewQueryFilters>({
    page: 1,
    limit: 20,
    status: 'PENDING_REVIEW',
  });

  // Modal states
  const [selectedDonationId, setSelectedDonationId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [detailDonation, setDetailDonation] = useState<ReviewDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [rejectModalOpen, setRejectModalOpen] = useState<boolean>(false);
  const [targetRejectId, setTargetRejectId] = useState<string | null>(null);
  const [isSubmittingReject, setIsSubmittingReject] = useState<boolean>(false);

  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const [targetHistoryId, setTargetHistoryId] = useState<string | null>(null);

  const [approvingIds, setApprovingIds] = useState<Record<string, boolean>>({});

  // Fetch Review Queue
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reviewService.getReviewQueue(filters);
      setQueueData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch donation review queue.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Handle 409 Conflict Error gracefully
  const handleConflictError = (err: any) => {
    if (err.statusCode === 409 || err.code === 'DONATION_ALREADY_REVIEWED') {
      setConflictMessage(
        'This donation has already been reviewed by another admin. The queue has been refreshed to reflect the latest status.'
      );
      fetchQueue();
      if (detailModalOpen) {
        setDetailModalOpen(false);
      }
      return true;
    }
    return false;
  };

  // Inspect donation detail
  const handleOpenDetail = async (donationId: string) => {
    setSelectedDonationId(donationId);
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    try {
      const donation = await reviewService.getReviewDetail(donationId);
      setDetailDonation(donation);
    } catch (err: any) {
      setDetailError(err.message || 'Failed to load donation details.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Approve action
  const handleApprove = async (donationId: string) => {
    setApprovingIds((prev) => ({ ...prev, [donationId]: true }));
    setConflictMessage(null);
    try {
      await reviewService.approveDonation(donationId);
      fetchQueue();
      if (detailModalOpen && selectedDonationId === donationId) {
        setDetailModalOpen(false);
      }
    } catch (err: any) {
      const isConflict = handleConflictError(err);
      if (!isConflict) {
        alert(err.message || 'Failed to approve donation');
      }
    } finally {
      setApprovingIds((prev) => ({ ...prev, [donationId]: false }));
    }
  };

  // Open Reject Modal
  const handleOpenReject = (donationId: string) => {
    setTargetRejectId(donationId);
    setRejectModalOpen(true);
  };

  // Confirm Reject
  const handleConfirmReject = async (reason: string) => {
    if (!targetRejectId) return;
    setIsSubmittingReject(true);
    setConflictMessage(null);
    try {
      await reviewService.rejectDonation(targetRejectId, { reason });
      setRejectModalOpen(false);
      setTargetRejectId(null);
      fetchQueue();
      if (detailModalOpen && selectedDonationId === targetRejectId) {
        setDetailModalOpen(false);
      }
    } catch (err: any) {
      const isConflict = handleConflictError(err);
      if (!isConflict) {
        alert(err.message || 'Failed to reject donation');
      }
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // View History
  const handleOpenHistory = (donationId: string) => {
    setTargetHistoryId(donationId);
    setHistoryModalOpen(true);
  };

  const handlePageChange = (newPage: number) => {
    if (queueData && newPage >= 1 && newPage <= queueData.pagination.totalPages) {
      setFilters((prev) => ({ ...prev, page: newPage }));
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ClipboardCheck size={28} color="var(--foodshare-green-primary)" />
              <span>Donation Review Workspace</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', marginTop: '4px' }}>
              Review, approve, or reject food donations submitted by donors before worker pickup assignment.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchQueue}
            disabled={loading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px' }}
          >
            <RefreshCw size={16} className={loading ? 'spinner' : ''} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Conflict / Concurrency Notification Banner */}
      {conflictMessage && (
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: '#fef3c7',
            borderLeft: '4px solid #d97706',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} color="#b45309" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#92400e' }}>
              {conflictMessage}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setConflictMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontWeight: 700 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>
            <Filter size={18} />
            <span>Filters:</span>
          </div>

          {/* Status Filter */}
          <select
            value={filters.status || 'PENDING_REVIEW'}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                status: e.target.value as 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED',
              }))
            }
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.875rem',
              fontWeight: 600,
              backgroundColor: 'var(--bg-main)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Category Filter */}
          <select
            value={filters.category || ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                page: 1,
                category: (e.target.value as DonationCategory) || undefined,
              }))
            }
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.875rem',
              fontWeight: 600,
              backgroundColor: 'var(--bg-main)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">All Categories</option>
            <option value="COOKED_MEAL">Cooked Meal</option>
            <option value="PACKAGED_FOOD">Packaged Food</option>
            <option value="GROCERIES">Groceries</option>
            <option value="BAKERY">Bakery</option>
            <option value="FRUITS">Fruits</option>
            <option value="VEGETABLES">Vegetables</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* Counter summary */}
        {queueData && (
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Showing {queueData.items.length} of {queueData.pagination.total} donations
          </div>
        )}
      </div>

      {/* Queue Content */}
      {loading ? (
        <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={40} className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontSize: '1rem', fontWeight: 600 }}>Loading review queue...</p>
        </div>
      ) : error ? (
        <div
          style={{
            padding: '32px',
            backgroundColor: '#fef2f2',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid #fca5a5',
            color: '#991b1b',
            textAlign: 'center',
          }}
        >
          <AlertCircle size={40} style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Failed to Load Queue</h3>
          <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>{error}</p>
          <button
            type="button"
            onClick={fetchQueue}
            className="btn btn-outline"
            style={{ marginTop: '16px', padding: '8px 20px' }}
          >
            Retry
          </button>
        </div>
      ) : !queueData || queueData.items.length === 0 ? (
        <div
          style={{
            padding: '80px 24px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            textAlign: 'center',
          }}
        >
          <Inbox size={48} color="var(--foodshare-green-primary)" style={{ opacity: 0.4, margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
            No donations waiting for review
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '6px', maxWidth: '440px', margin: '6px auto 0' }}>
            There are currently no donations matching your selected filter criteria. Check back later or adjust status filters.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div
            className="desktop-review-table"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden',
              marginBottom: '24px',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.775rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Donation Details</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Donor Information</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Quantity & Unit</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Prepared / Expires</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>Review Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queueData.items.map((item: ReviewQueueItem) => {
                    const isPending = item.status === 'PENDING_REVIEW';
                    const isApproving = approvingIds[item.id] || false;

                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          transition: 'var(--transition)',
                        }}
                      >
                        {/* Donation details */}
                        <td style={{ padding: '16px 18px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                            {item.category.replace('_', ' ')}
                          </div>
                          <div
                            style={{
                              fontSize: '0.825rem',
                              color: 'var(--text-muted)',
                              marginTop: '2px',
                              maxWidth: '260px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {item.description}
                          </div>
                        </td>

                        {/* Donor Info */}
                        <td style={{ padding: '16px 18px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {item.donor.firstName} {item.donor.lastName}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {item.donor.email}
                          </div>
                        </td>

                        {/* Quantity */}
                        <td style={{ padding: '16px 18px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--foodshare-green-dark)' }}>
                            {item.quantity} {item.quantityUnit}
                          </span>
                        </td>

                        {/* Dates */}
                        <td style={{ padding: '16px 18px', fontSize: '0.825rem' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Prep: </span>
                            {new Date(item.preparedAt).toLocaleDateString()}
                          </div>
                          <div style={{ marginTop: '2px', color: new Date(item.expiresAt) < new Date() ? '#b91c1c' : 'var(--text-main)', fontWeight: 600 }}>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Exp: </span>
                            {new Date(item.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '16px 18px' }}>
                          <DonationStatusBadge status={item.status} />
                        </td>

                        {/* Review Actions */}
                        <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(item.id)}
                              className="btn btn-outline"
                              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title="Inspect Full Details"
                            >
                              <Eye size={15} />
                              <span>Inspect</span>
                            </button>

                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenReject(item.id)}
                                  disabled={isApproving}
                                  style={{
                                    backgroundColor: '#fee2e2',
                                    color: '#b91c1c',
                                    border: '1px solid #fca5a5',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '6px 10px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    cursor: isApproving ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                  title="Reject Donation"
                                >
                                  <XCircle size={15} />
                                  <span>Reject</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleApprove(item.id)}
                                  disabled={isApproving}
                                  style={{
                                    backgroundColor: 'var(--foodshare-green-primary)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '6px 14px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    cursor: isApproving ? 'not-allowed' : 'pointer',
                                    opacity: isApproving ? 0.7 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                  title="Approve Donation"
                                >
                                  {isApproving ? (
                                    <Loader2 size={15} className="spinner" />
                                  ) : (
                                    <CheckCircle2 size={15} />
                                  )}
                                  <span>Approve</span>
                                </button>
                              </>
                            )}

                            {!isPending && (
                              <button
                                type="button"
                                onClick={() => handleOpenHistory(item.id)}
                                style={{
                                  backgroundColor: 'var(--bg-main)',
                                  border: '1px solid var(--border-color)',
                                  color: 'var(--text-main)',
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '6px 10px',
                                  fontSize: '0.775rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <History size={14} />
                                <span>Log</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {queueData.pagination.totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--bg-surface)',
                padding: '14px 20px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
              }}
            >
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Page {queueData.pagination.page} of {queueData.pagination.totalPages}
              </span>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handlePageChange(queueData.pagination.page - 1)}
                  disabled={queueData.pagination.page <= 1}
                  className="btn btn-outline"
                  style={{ padding: '6px 14px', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(queueData.pagination.page + 1)}
                  disabled={queueData.pagination.page >= queueData.pagination.totalPages}
                  className="btn btn-outline"
                  style={{ padding: '6px 14px', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <DonationReviewDetailsModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        donation={detailDonation}
        loading={detailLoading}
        error={detailError}
        onApprove={handleApprove}
        onRejectClick={(id) => {
          setDetailModalOpen(false);
          handleOpenReject(id);
        }}
        onViewHistoryClick={(id) => {
          handleOpenHistory(id);
        }}
        isApproving={selectedDonationId ? approvingIds[selectedDonationId] || false : false}
      />

      <RejectDonationModal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setTargetRejectId(null);
        }}
        onConfirm={handleConfirmReject}
        donationId={targetRejectId || ''}
        isSubmitting={isSubmittingReject}
      />

      <ReviewHistoryModal
        isOpen={historyModalOpen}
        onClose={() => {
          setHistoryModalOpen(false);
          setTargetHistoryId(null);
        }}
        donationId={targetHistoryId || ''}
      />
    </div>
  );
};
