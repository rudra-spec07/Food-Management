import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Truck,
  CheckCircle,
  XCircle,
  Play,
  MapPin,
  Calendar,
  User,
  AlertCircle,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';
import { pickupService, PickupItem } from '../../../services/pickup.service';

export const WorkerPickupDetailPage: React.FC = () => {
  const { pickupId } = useParams<{ pickupId: string }>();
  const [pickup, setPickup] = useState<PickupItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Complete Modal State
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completeError, setCompleteError] = useState<string | null>(null);

  // Fail Modal State
  const [showFailModal, setShowFailModal] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [failError, setFailError] = useState<string | null>(null);

  const fetchDetail = async () => {
    if (!pickupId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await pickupService.getWorkerPickupDetail(pickupId);
      setPickup(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pickup details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [pickupId]);

  const handleStartPickup = async () => {
    if (!pickupId) return;
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await pickupService.startPickup(pickupId);
      setSuccessMsg('Pickup started successfully! Status updated to IN_PROGRESS.');
      await fetchDetail();
    } catch (err: any) {
      if (err.response?.status === 409 || err.status === 409) {
        setError(err.message || 'Conflict: Pickup state has changed. Re-fetching status...');
      } else {
        setError(err.message || 'Failed to start pickup.');
      }
      await fetchDetail();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupId) return;

    if (completionNotes.trim().length > 2000) {
      setCompleteError('Completion notes cannot exceed 2000 characters.');
      return;
    }

    setIsSubmitting(true);
    setCompleteError(null);
    setError(null);
    setSuccessMsg(null);

    try {
      await pickupService.completePickup(pickupId, {
        completionNotes: completionNotes.trim() || undefined,
      });
      setSuccessMsg('Pickup completed successfully! Backend has generated an authoritative AVAILABLE inventory batch record.');
      setShowCompleteModal(false);
      setCompletionNotes('');
      await fetchDetail();
    } catch (err: any) {
      if (err.response?.status === 409 || err.status === 409) {
        setCompleteError(err.message || 'Conflict: Pickup state has changed.');
      } else {
        setCompleteError(err.message || 'Failed to complete pickup.');
      }
      await fetchDetail();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupId) return;

    const trimmedReason = failReason.trim();
    if (!trimmedReason) {
      setFailError('Failure reason is required.');
      return;
    }
    if (trimmedReason.length > 2000) {
      setFailError('Failure reason cannot exceed 2000 characters.');
      return;
    }

    setIsSubmitting(true);
    setFailError(null);
    setError(null);
    setSuccessMsg(null);

    try {
      await pickupService.failPickup(pickupId, { reason: trimmedReason });
      setSuccessMsg('Pickup marked as FAILED.');
      setShowFailModal(false);
      setFailReason('');
      await fetchDetail();
    } catch (err: any) {
      if (err.response?.status === 409 || err.status === 409) {
        setFailError(err.message || 'Conflict: Pickup state has changed.');
      } else {
        setFailError(err.message || 'Failed to report pickup failure.');
      }
      await fetchDetail();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'NOT_STARTED':
        return <span className="badge badge-secondary">Not Started</span>;
      case 'IN_PROGRESS':
        return <span className="badge badge-warning">In Progress</span>;
      case 'COMPLETED':
        return <span className="badge badge-success">Completed</span>;
      case 'FAILED':
        return <span className="badge badge-danger">Failed</span>;
      default:
        return <span className="badge badge-secondary">{status || 'Unknown'}</span>;
    }
  };

  const donation = pickup?.donation;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px' }}>
      {/* Back Link */}
      <div style={{ marginBottom: '20px' }}>
        <Link
          to="/worker/assignments"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to My Assigned Tasks</span>
        </Link>
      </div>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Truck size={24} color="var(--foodshare-green-primary)" />
            <span>Worker Pickup Management</span>
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Pickup ID: <code style={{ color: 'var(--text-main)' }}>{pickupId}</code>
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={fetchDetail}
          disabled={loading || isSubmitting}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={16} className={loading ? 'spinner' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Global Notifications */}
      {successMsg && (
        <div className="card" style={{ padding: '16px', marginBottom: '24px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={20} color="#16a34a" />
            <span style={{ fontWeight: 600 }}>{successMsg}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="card" style={{ padding: '16px', marginBottom: '24px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} />
            <span style={{ fontWeight: 600 }}>{error}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div className="spinner" style={{ width: '36px', height: '36px', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Loading pickup record...</p>
        </div>
      ) : !pickup ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <AlertCircle size={48} color="var(--text-light)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Pickup Record Not Found</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            The requested pickup task could not be found or you do not have permission to view it.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Status & Actions Card */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>
                  Current Pickup Status
                </span>
                <div style={{ marginTop: '4px' }}>{getStatusBadge(pickup.status)}</div>
              </div>

              {/* Action Buttons based on status */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {pickup.status === 'NOT_STARTED' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleStartPickup}
                    disabled={isSubmitting}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Play size={16} />
                    <span>Start Pickup</span>
                  </button>
                )}

                {pickup.status === 'IN_PROGRESS' && (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowFailModal(true);
                        setFailError(null);
                      }}
                      disabled={isSubmitting}
                      style={{ color: '#b91c1c', borderColor: '#fecaca', backgroundColor: '#fef2f2', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <XCircle size={16} />
                      <span>Report Pickup Failure</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        setShowCompleteModal(true);
                        setCompleteError(null);
                      }}
                      disabled={isSubmitting}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <CheckCircle size={16} />
                      <span>Complete Pickup</span>
                    </button>
                  </>
                )}

                {pickup.status === 'COMPLETED' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', fontWeight: 700, fontSize: '0.9rem' }}>
                    <CheckCircle size={18} />
                    <span>Pickup Completed — Inventory Generated</span>
                  </div>
                )}

                {pickup.status === 'FAILED' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b91c1c', fontWeight: 700, fontSize: '0.9rem' }}>
                    <XCircle size={18} />
                    <span>Pickup Marked as Failed</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pickup Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', fontSize: '0.9rem' }}>
              <div>
                <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Food Category</strong>
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>{donation?.category || '—'}</span>
              </div>

              <div>
                <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Quantity & Unit</strong>
                <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--foodshare-green-dark)' }}>
                  {donation ? `${donation.quantity} ${donation.quantityUnit}` : '—'}
                </span>
              </div>

              <div>
                <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Pickup Address</strong>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={16} color="var(--foodshare-green-primary)" />
                  {donation?.pickupAddress || '—'}
                </span>
              </div>

              <div>
                <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Contact Person</strong>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={16} color="var(--text-muted)" />
                  {donation?.contactName} ({donation?.contactPhone})
                </span>
              </div>

              <div>
                <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Expiration Date</strong>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={16} color="var(--text-muted)" />
                  {donation?.expiresAt ? new Date(donation.expiresAt).toLocaleString() : 'N/A'}
                </span>
              </div>

              <div>
                <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Created Timestamp</strong>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} color="var(--text-muted)" />
                  {new Date(pickup.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            {donation?.description && (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Food Description</strong>
                <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.925rem', lineHeight: 1.5 }}>{donation.description}</p>
              </div>
            )}

            {pickup.completionNotes && (
              <div style={{ marginTop: '16px', padding: '14px', borderRadius: 'var(--radius-sm)', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>
                <strong>Completion Notes:</strong> {pickup.completionNotes}
              </div>
            )}

            {pickup.failureReason && (
              <div style={{ marginTop: '16px', padding: '14px', borderRadius: 'var(--radius-sm)', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
                <strong>Failure Reason:</strong> {pickup.failureReason}
              </div>
            )}
          </div>

          {/* Audit Event Timeline */}
          {pickup.events && pickup.events.length > 0 && (
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="var(--foodshare-green-primary)" />
                <span>Pickup Event Audit History</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pickup.events.map((evt) => (
                  <div
                    key={evt.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-muted)',
                      fontSize: '0.875rem',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{evt.eventType}</span>
                      {evt.notes && <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>— {evt.notes}</span>}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                      {new Date(evt.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Complete Pickup Modal */}
      {showCompleteModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 12px', color: 'var(--foodshare-green-dark)' }}>
              Complete Worker Pickup
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Completing this pickup will update the donation status to COMPLETED and automatically create an authoritative AVAILABLE inventory batch.
            </p>

            {completeError && (
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.85rem', marginBottom: '16px' }}>
                {completeError}
              </div>
            )}

            <form onSubmit={handleCompleteSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                  Completion Notes (Optional)
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g. Items verified, insulated packaging intact..."
                  disabled={isSubmitting}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Max 2000 characters.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCompleteModal(false)} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Completing...' : 'Confirm Completion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fail Pickup Modal */}
      {showFailModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 12px', color: '#991b1b' }}>
              Report Pickup Failure
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Please provide a valid reason for marking this pickup as failed.
            </p>

            {failError && (
              <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.85rem', marginBottom: '16px' }}>
                {failError}
              </div>
            )}

            <form onSubmit={handleFailSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                  Failure Reason <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={failReason}
                  onChange={(e) => setFailReason(e.target.value)}
                  placeholder="e.g. Donor unreachable / Food spoiled upon arrival..."
                  disabled={isSubmitting}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Max 2000 characters.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowFailModal(false)} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }} disabled={isSubmitting}>
                  {isSubmitting ? 'Reporting...' : 'Confirm Failure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
