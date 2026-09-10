import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { donationService } from '../services/donation.service';
import { Donation, DonationStatus, CreateDonationPayload, UpdateDonationPayload } from '../types/donor.types';
import { DonationStatusBadge } from '../components/DonationStatusBadge';
import { CreateDonationModal } from '../components/CreateDonationModal';
import { EditDonationModal } from '../components/EditDonationModal';
import { DonationDetailsModal } from '../components/DonationDetailsModal';
import { CancelDonationDialog } from '../components/CancelDonationDialog';
import {
  Plus,
  Filter,
  Eye,
  Edit3,
  XCircle,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

export const DonorDashboardPage: React.FC = () => {
  const { user } = useAuth();

  // Role guard — only DONOR users may access this page.
  // ProtectedRoute blocks unauthenticated users; this covers ADMIN/WORKER.
  if (user && user.role !== 'DONOR') {
    return <Navigate to="/dashboard" replace />;
  }

  const [donations, setDonations] = useState<Donation[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [statusFilter, setStatusFilter] = useState<DonationStatus | 'ALL'>('ALL');
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDetailsDonation, setSelectedDetailsDonation] = useState<Donation | null>(null);
  const [selectedEditDonation, setSelectedEditDonation] = useState<Donation | null>(null);
  const [selectedCancelDonation, setSelectedCancelDonation] = useState<Donation | null>(null);

  const fetchDonations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await donationService.getMyDonations({
        page,
        limit,
        status: statusFilter,
      });

      setDonations(res.items);
      setTotalItems(res.pagination.total);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch donations');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const handleCreateSubmit = async (payload: CreateDonationPayload) => {
    await donationService.createDonation(payload);
    setPage(1);
    await fetchDonations();
  };

  const handleEditSubmit = async (donationId: string, payload: UpdateDonationPayload) => {
    await donationService.updateDonation(donationId, payload);
    await fetchDonations();
  };

  const handleCancelConfirm = async (donationId: string, reason?: string) => {
    await donationService.cancelDonation(donationId, { reason });
    await fetchDonations();
  };

  const handleViewDetails = async (donation: Donation) => {
    try {
      // Fetch full details with status history
      const full = await donationService.getDonationById(donation.id);
      setSelectedDetailsDonation(full);
    } catch {
      setSelectedDetailsDonation(donation);
    }
  };

  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Compute stat metrics for donor header summary
  const pendingCount = donations.filter((d) => d.status === 'PENDING_REVIEW').length;
  const approvedCount = donations.filter((d) => d.status === 'APPROVED' || d.status === 'ASSIGNED' || d.status === 'ACCEPTED').length;
  const completedCount = donations.filter((d) => d.status === 'COMPLETED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            My Food Donations
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Manage surplus food listings, monitor reviews, and track community impact
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="btn-foodshare btn-foodshare-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
        >
          <Plus size={18} />
          <span>Donate Surplus Food</span>
        </button>
      </div>

      {/* Stats Summary Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="foodshare-card stat-box" style={{ padding: '16px 20px', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="stat-label">Total Submissions</span>
            <Package size={20} color="var(--foodshare-green-primary)" />
          </div>
          <div className="stat-num">{totalItems}</div>
        </div>

        <div className="foodshare-card stat-box" style={{ padding: '16px 20px', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="stat-label">Pending Review</span>
            <Clock size={20} color="#b45309" />
          </div>
          <div className="stat-num" style={{ color: '#b45309' }}>{pendingCount}</div>
        </div>

        <div className="foodshare-card stat-box" style={{ padding: '16px 20px', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="stat-label">Active & Approved</span>
            <CheckCircle2 size={20} color="var(--foodshare-green-dark)" />
          </div>
          <div className="stat-num" style={{ color: 'var(--foodshare-green-dark)' }}>{approvedCount}</div>
        </div>

        <div className="foodshare-card stat-box" style={{ padding: '16px 20px', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="stat-label">Completed Deliveries</span>
            <CheckCircle2 size={20} color="#065f46" />
          </div>
          <div className="stat-num" style={{ color: '#065f46' }}>{completedCount}</div>
        </div>
      </div>

      {/* Filter Tabs & Refresh Controls */}
      <div className="foodshare-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Filter size={16} color="var(--text-muted)" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status Filter:</span>

            {(['ALL', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'COMPLETED', 'CANCELLED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: statusFilter === st ? 'var(--foodshare-green-primary)' : 'var(--border-color)',
                  backgroundColor: statusFilter === st ? 'var(--foodshare-green-soft)' : 'var(--bg-surface)',
                  color: statusFilter === st ? 'var(--foodshare-green-dark)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                }}
              >
                {st === 'ALL' ? 'All Items' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={fetchDonations}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foodshare-green-primary)', fontSize: '0.85rem', fontWeight: 600 }}
            title="Refresh list"
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', padding: '16px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="foodshare-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: '32px', height: '32px', borderTopColor: 'var(--foodshare-green-dark)' }} />
          <p style={{ margin: 0, fontWeight: 500 }}>Loading your donations...</p>
        </div>
      ) : donations.length === 0 ? (
        <div className="foodshare-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Package size={48} color="var(--text-light)" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 6px' }}>
            {statusFilter === 'ALL' ? 'No Food Donations Yet' : 'No Donations Match Filter'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 20px' }}>
            {statusFilter === 'ALL'
              ? 'You have not submitted any food donations yet. Share surplus food to help feed communities in need.'
              : `There are currently no donations with status "${statusFilter.replace('_', ' ')}".`}
          </p>
          {statusFilter === 'ALL' ? (
            <button onClick={() => setIsCreateOpen(true)} className="btn-foodshare btn-foodshare-primary" style={{ padding: '10px 20px' }}>
              Create First Donation
            </button>
          ) : (
            <button onClick={() => setStatusFilter('ALL')} className="btn-foodshare btn-foodshare-outline">
              Clear Filter
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop & Tablet Data Table */}
          <div className="foodshare-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-page)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '14px 20px' }}>Item & Category</th>
                    <th style={{ padding: '14px 20px' }}>Quantity</th>
                    <th style={{ padding: '14px 20px' }}>Prepared / Expires</th>
                    <th style={{ padding: '14px 20px' }}>Status</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'var(--transition)' }}>
                      {/* Description & Category */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '2px' }}>{item.description}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {item.category.replace('_', ' ')} • Pickup: {item.pickupAddress.slice(0, 30)}...
                        </div>
                      </td>

                      {/* Quantity */}
                      <td style={{ padding: '16px 20px', fontWeight: 600 }}>
                        {item.quantity} {item.quantityUnit.toLowerCase()}
                      </td>

                      {/* Dates */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>{formatDate(item.preparedAt)}</div>
                        <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 500 }}>Exp: {formatDate(item.expiresAt)}</div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 20px' }}>
                        <DonationStatusBadge status={item.status} />
                      </td>

                      {/* Action Controls */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          {/* View Details Button */}
                          <button
                            onClick={() => handleViewDetails(item)}
                            style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600 }}
                            title="View details"
                          >
                            <Eye size={15} />
                            <span>View</span>
                          </button>

                          {/* Edit Button (Allowed ONLY when PENDING_REVIEW) */}
                          {item.status === 'PENDING_REVIEW' && (
                            <button
                              onClick={() => setSelectedEditDonation(item)}
                              style={{ background: 'none', border: '1px solid var(--foodshare-green-primary)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', cursor: 'pointer', color: 'var(--foodshare-green-dark)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600, backgroundColor: 'var(--foodshare-green-soft)' }}
                              title="Edit pending donation"
                            >
                              <Edit3 size={15} />
                              <span>Edit</span>
                            </button>
                          )}

                          {/* Cancel Button (Allowed when PENDING_REVIEW or APPROVED) */}
                          {(item.status === 'PENDING_REVIEW' || item.status === 'APPROVED') && (
                            <button
                              onClick={() => setSelectedCancelDonation(item)}
                              style={{ background: 'none', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', cursor: 'pointer', color: '#b91c1c', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600 }}
                              title="Cancel donation"
                            >
                              <XCircle size={15} />
                              <span>Cancel</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-page)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Showing page {page} of {totalPages} ({totalItems} total items)
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="btn-foodshare btn-foodshare-outline"
                    style={{ height: '32px', padding: '0 10px', fontSize: '0.8rem' }}
                  >
                    <ChevronLeft size={16} />
                    <span>Previous</span>
                  </button>

                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page >= totalPages}
                    className="btn-foodshare btn-foodshare-outline"
                    style={{ height: '32px', padding: '0 10px', fontSize: '0.8rem' }}
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals & Dialogs */}
      <CreateDonationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        defaultContactName={user ? `${user.firstName} ${user.lastName}` : ''}
        defaultContactPhone={user?.phone || ''}
      />

      <EditDonationModal
        donation={selectedEditDonation}
        isOpen={!!selectedEditDonation}
        onClose={() => setSelectedEditDonation(null)}
        onSubmit={handleEditSubmit}
      />

      <DonationDetailsModal
        donation={selectedDetailsDonation}
        isOpen={!!selectedDetailsDonation}
        onClose={() => setSelectedDetailsDonation(null)}
      />

      <CancelDonationDialog
        donation={selectedCancelDonation}
        isOpen={!!selectedCancelDonation}
        onClose={() => setSelectedCancelDonation(null)}
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
};
