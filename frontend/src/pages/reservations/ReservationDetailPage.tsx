import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Truck, Trash2 } from 'lucide-react';
import { reservationService, InventoryReservation } from '../../services/reservation.service';
import { useAuth } from '../../hooks/useAuth';

export const ReservationDetailPage: React.FC = () => {
  const { reservationId } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [reservation, setReservation] = useState<InventoryReservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Release modal state
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseReason, setReleaseReason] = useState('');
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  const fetchDetail = async () => {
    if (!reservationId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await reservationService.getReservationDetail(reservationId);
      setReservation(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load reservation detail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [reservationId]);

  const handleRelease = async () => {
    if (!reservation) return;
    try {
      setReleasing(true);
      setReleaseError(null);
      const updated = await reservationService.releaseReservation(reservation.id, releaseReason.trim() || undefined);
      setReservation(updated);
      setShowReleaseModal(false);
      setReleaseReason('');
    } catch (err: any) {
      setReleaseError(err.message || 'Failed to release reservation');
    } finally {
      setReleasing(false);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { backgroundColor: '#dbeafe', color: '#1e40af' };
      case 'FULFILLED':
        return { backgroundColor: '#dcfce7', color: '#15803d' };
      case 'RELEASED':
        return { backgroundColor: '#f3f4f6', color: '#4b5563' };
      case 'EXPIRED':
        return { backgroundColor: '#fef3c7', color: '#92400e' };
      case 'CANCELLED':
        return { backgroundColor: '#fee2e2', color: '#991b1b' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#374151' };
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-muted)' }}>
          Loading reservation details...
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
        <Link
          to="/reservations"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '16px' }}
        >
          <ArrowLeft size={16} /> Back to Reservations
        </Link>
        <div className="card" style={{ padding: '24px', textAlign: 'center', color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
          <AlertCircle size={32} style={{ marginBottom: '8px' }} />
          <h3 style={{ margin: '0 0 8px', fontWeight: 700 }}>Reservation Not Found</h3>
          <p style={{ margin: '0 0 16px' }}>{error || 'The requested reservation could not be found or you do not have permission to view it.'}</p>
          <button className="btn btn-secondary" onClick={() => navigate('/reservations')}>
            Return to Reservation List
          </button>
        </div>
      </div>
    );
  }

  const isOwnerOrAdmin = user?.role === 'ADMIN' || user?.id === reservation.reservedBy;
  const canRelease = isOwnerOrAdmin && reservation.status === 'ACTIVE';

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
      <Link
        to="/reservations"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
          textDecoration: 'none',
          marginBottom: '16px',
        }}
      >
        <ArrowLeft size={16} /> Back to Reservation List
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              Reservation Detail
            </h1>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: 700,
                ...getStatusBadgeStyle(reservation.status),
              }}
            >
              {reservation.status}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            ID: <code style={{ fontSize: '0.8rem' }}>{reservation.id}</code>
          </p>
        </div>

        {canRelease && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowReleaseModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#b91c1c', borderColor: '#fecaca' }}
            >
              <Trash2 size={16} />
              <span>Release Reservation</span>
            </button>
            <Link
              to={`/distributions/new?reservationId=${reservation.id}`}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
            >
              <Truck size={16} />
              <span>Fulfill Distribution</span>
            </Link>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          Reserved Item Summary
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Food Category</span>
            <span style={{ fontSize: '1rem', fontWeight: 700 }}>{reservation.inventory?.foodCategory?.replace('_', ' ') || 'N/A'}</span>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Description</span>
            <span style={{ fontSize: '0.95rem' }}>{reservation.inventory?.description || 'N/A'}</span>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Reserved Quantity</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-color)' }}>
              {Number(reservation.quantity).toFixed(2)} {reservation.unit}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Storage Location</span>
            <span style={{ fontSize: '0.95rem' }}>{reservation.inventory?.location || 'Unspecified'}</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          Reservation Info & Timeline
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Reserved By</span>
            <span style={{ fontSize: '0.95rem' }}>
              {reservation.reserver ? `${reservation.reserver.firstName} ${reservation.reserver.lastName} (${reservation.reserver.email})` : reservation.reservedBy}
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Created At</span>
            <span style={{ fontSize: '0.95rem' }}>{new Date(reservation.createdAt).toLocaleString()}</span>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Reservation Expiry</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: new Date(reservation.expiresAt) <= new Date() ? '#b91c1c' : 'inherit' }}>
              {new Date(reservation.expiresAt).toLocaleString()}
            </span>
          </div>

          {reservation.fulfilledAt && (
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Fulfilled At</span>
              <span style={{ fontSize: '0.95rem', color: '#15803d', fontWeight: 600 }}>{new Date(reservation.fulfilledAt).toLocaleString()}</span>
            </div>
          )}

          {reservation.notes && (
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Notes</span>
              <p style={{ margin: '4px 0 0', fontSize: '0.9rem', backgroundColor: 'var(--bg-hover)', padding: '8px 12px', borderRadius: '4px' }}>
                {reservation.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {showReleaseModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px', color: 'var(--text-main)' }}>
              Release Food Reservation
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 16px' }}>
              Releasing this reservation will return <strong>{Number(reservation.quantity).toFixed(2)} {reservation.unit}</strong> back to available inventory.
            </p>

            {releaseError && (
              <div style={{ padding: '12px', borderRadius: '4px', backgroundColor: '#fef2f2', color: '#991b1b', fontSize: '0.85rem', marginBottom: '16px' }}>
                {releaseError}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Release Reason (Optional)
              </label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="e.g. Beneficiary cancelled order, stock no longer needed"
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setShowReleaseModal(false)} disabled={releasing}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ backgroundColor: '#dc2626' }} onClick={handleRelease} disabled={releasing}>
                {releasing ? 'Releasing...' : 'Confirm Release'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
