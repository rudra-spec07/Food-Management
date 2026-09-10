import React, { useEffect, useState } from 'react';
import { X, History, Loader2, UserCheck, AlertCircle, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { ReviewHistoryResponse } from '../types/review.types';
import { reviewService } from '../services/review.service';
import { DonationStatusBadge } from '../../donors/components/DonationStatusBadge';

interface ReviewHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  donationId: string;
}

export const ReviewHistoryModal: React.FC<ReviewHistoryModalProps> = ({
  isOpen,
  onClose,
  donationId,
}) => {
  const [historyData, setHistoryData] = useState<ReviewHistoryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && donationId) {
      let isMounted = true;
      setLoading(true);
      setError(null);

      reviewService
        .getReviewHistory(donationId)
        .then((data) => {
          if (isMounted) {
            setHistoryData(data);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError(err.message || 'Failed to load review history');
            setLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, donationId]);

  if (!isOpen) return null;

  const reviewRecord = historyData?.review;
  const statusHistoryList = Array.isArray(historyData?.statusHistory) ? historyData.statusHistory : [];

  const hasContent = Boolean(reviewRecord || statusHistoryList.length > 0);

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
          maxWidth: '600px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="history-modal-title"
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={20} color="var(--foodshare-green-primary)" />
            <div>
              <h3 id="history-modal-title" style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                Donation Review & Audit History
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Donation ID: {donationId}</span>
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

        {/* Body Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={32} className="spinner" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '0.9rem' }}>Loading review history log...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '24px', backgroundColor: '#fef2f2', borderRadius: 'var(--radius-md)', color: '#991b1b', display: 'flex', gap: '10px' }}>
              <AlertCircle size={20} />
              <div>
                <strong style={{ fontSize: '0.9rem' }}>Error</strong>
                <p style={{ fontSize: '0.85rem', marginTop: '2px' }}>{error}</p>
              </div>
            </div>
          ) : !hasContent ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <History size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
              <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>No review record yet</p>
              <p style={{ fontSize: '0.825rem', marginTop: '4px' }}>This donation is currently awaiting initial review decision.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Section 1: Admin Review Decision */}
              {reviewRecord ? (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-main)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
                    Administrative Review Decision
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        backgroundColor: reviewRecord.decision === 'APPROVED' ? '#dcfce7' : '#fee2e2',
                        color: reviewRecord.decision === 'APPROVED' ? '#15803d' : '#b91c1c',
                      }}
                    >
                      {reviewRecord.decision === 'APPROVED' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      {reviewRecord.decision}
                    </span>
                    <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                      {new Date(reviewRecord.reviewedAt).toLocaleString()}
                    </span>
                  </div>

                  {reviewRecord.reviewer && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
                      <UserCheck size={16} color="var(--foodshare-green-primary)" />
                      <span>
                        Reviewed by: {reviewRecord.reviewer.firstName} {reviewRecord.reviewer.lastName} ({reviewRecord.reviewer.email})
                      </span>
                    </div>
                  )}

                  {reviewRecord.reason && (
                    <div style={{ padding: '10px 12px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      <strong>Decision Reason:</strong> {reviewRecord.reason}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  No administrative review decision has been recorded yet.
                </div>
              )}

              {/* Section 2: Lifecycle Status Transition History */}
              {statusHistoryList.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>
                    Status Transition History ({statusHistoryList.length})
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {statusHistoryList.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-surface)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {item.fromStatus ? (
                              <DonationStatusBadge status={item.fromStatus} />
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Initial Creation</span>
                            )}
                            <ArrowRight size={14} color="var(--text-muted)" />
                            <DonationStatusBadge status={item.toStatus} />
                          </div>

                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(item.changedAt).toLocaleString()}
                          </span>
                        </div>

                        {item.user && (
                          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                            Changed by: <strong style={{ color: 'var(--text-main)' }}>{item.user.firstName} {item.user.lastName}</strong> ({item.user.role})
                          </div>
                        )}

                        {item.reason && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '4px', fontStyle: 'italic' }}>
                            "{item.reason}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} className="btn btn-outline" style={{ padding: '8px 20px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
