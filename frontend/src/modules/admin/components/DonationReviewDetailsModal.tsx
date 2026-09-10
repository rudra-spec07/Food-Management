import React from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  MapPin,
  Calendar,
  Package,
  History,
  FileText,
  AlertTriangle,
  Loader2,
  Phone,
  Mail,
} from 'lucide-react';
import { ReviewDetailResponse } from '../types/review.types';
import { DonationStatusBadge } from '../../donors/components/DonationStatusBadge';

interface DonationReviewDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  donation: ReviewDetailResponse | null;
  loading: boolean;
  error: string | null;
  onApprove: (donationId: string) => Promise<void>;
  onRejectClick: (donationId: string) => void;
  onViewHistoryClick: (donationId: string) => void;
  isApproving: boolean;
}

export const DonationReviewDetailsModal: React.FC<DonationReviewDetailsModalProps> = ({
  isOpen,
  onClose,
  donation,
  loading,
  error,
  onApprove,
  onRejectClick,
  onViewHistoryClick,
  isApproving,
}) => {
  if (!isOpen) return null;

  const isPending = donation?.status === 'PENDING_REVIEW';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="review-details-modal-title"
        aria-modal="true"
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--foodshare-green-soft)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Package size={22} color="var(--foodshare-green-primary)" />
            <div>
              <h3 id="review-details-modal-title" style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Donation Review Workspace
              </h3>
              {donation && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ID: {donation.id}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={36} className="spinner" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '0.9rem' }}>Fetching donation details for admin review...</p>
            </div>
          ) : error ? (
            <div
              style={{
                padding: '20px',
                backgroundColor: '#fef2f2',
                borderRadius: 'var(--radius-md)',
                color: '#991b1b',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <AlertTriangle size={24} />
              <div>
                <strong style={{ fontSize: '0.95rem' }}>Failed to Load Details</strong>
                <p style={{ fontSize: '0.85rem', marginTop: '2px' }}>{error}</p>
              </div>
            </div>
          ) : donation ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Top Banner & Status */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  backgroundColor: 'var(--bg-main)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Current Review Status
                  </span>
                  <div style={{ marginTop: '4px' }}>
                    <DonationStatusBadge status={donation.status} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onViewHistoryClick(donation.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-surface)',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: 'var(--text-main)',
                  }}
                >
                  <History size={16} color="var(--foodshare-green-primary)" />
                  <span>View Review Log</span>
                </button>
              </div>

              {/* Rejection Alert if REJECTED */}
              {donation.status === 'REJECTED' && donation.rejectionReason && (
                <div
                  style={{
                    padding: '14px 16px',
                    backgroundColor: '#fef2f2',
                    borderLeft: '4px solid #b91c1c',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <strong style={{ fontSize: '0.85rem', color: '#991b1b', display: 'block' }}>
                    Rejection Reason Recorded:
                  </strong>
                  <p style={{ fontSize: '0.875rem', color: '#7f1d1d', marginTop: '4px', margin: 0 }}>
                    {donation.rejectionReason}
                  </p>
                </div>
              )}

              {/* Donor Information Card */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={16} color="var(--foodshare-green-primary)" />
                  <span>Donor Account Information</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Donor Name:</span>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                      {donation.donor.firstName} {donation.donor.lastName}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Mail size={12} /> Email:
                    </span>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                      {donation.donor.email}
                    </p>
                  </div>
                  {donation.donor.phone && (
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} /> Phone:
                      </span>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                        {donation.donor.phone}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Food Details Grid */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={16} color="var(--foodshare-green-primary)" />
                  <span>Food Donation Specifications</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category:</span>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, textTransform: 'capitalize' }}>
                      {donation.category.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quantity & Unit:</span>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--foodshare-green-dark)', margin: 0 }}>
                      {donation.quantity} {donation.quantityUnit}
                    </p>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FileText size={12} /> Description:
                  </span>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginTop: '4px', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                    {donation.description}
                  </p>
                </div>

                {/* Dates */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', padding: '12px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} /> Prepared At:
                    </span>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                      {new Date(donation.preparedAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> Expiration Time:
                    </span>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: new Date(donation.expiresAt) < new Date() ? '#b91c1c' : '#15803d', margin: 0 }}>
                      {new Date(donation.expiresAt).toLocaleString()}
                      {new Date(donation.expiresAt) < new Date() && ' (EXPIRED)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pickup & Contact Information */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={16} color="var(--foodshare-green-primary)" />
                  <span>Pickup Location & Contact</span>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Address:</span>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                    {donation.pickupAddress}
                  </p>
                  {donation.pickupLatitude !== null && donation.pickupLongitude !== null && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                      GPS Coordinates: {donation.pickupLatitude}, {donation.pickupLongitude}
                    </span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contact Person:</span>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                      {donation.contactName}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contact Phone:</span>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                      {donation.contactPhone}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {donation.notes && (
                <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Special Notes:</span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '4px', margin: 0 }}>{donation.notes}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-main)',
          }}
        >
          <button type="button" onClick={onClose} className="btn btn-outline" style={{ padding: '9px 20px' }}>
            Close
          </button>

          {donation && isPending && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => onRejectClick(donation.id)}
                disabled={isApproving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  border: '1px solid #fca5a5',
                  borderRadius: 'var(--radius-md)',
                  padding: '9px 18px',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: isApproving ? 'not-allowed' : 'pointer',
                  transition: 'var(--transition)',
                }}
              >
                <XCircle size={18} />
                <span>Reject</span>
              </button>

              <button
                type="button"
                onClick={() => onApprove(donation.id)}
                disabled={isApproving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--foodshare-green-primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '9px 22px',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: isApproving ? 'not-allowed' : 'pointer',
                  opacity: isApproving ? 0.7 : 1,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {isApproving ? (
                  <>
                    <Loader2 size={18} className="spinner" />
                    <span>Approving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Approve Donation</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
