import React, { useState, useEffect, useCallback } from 'react';
import { Bookmark, AlertCircle, ChevronLeft, ChevronRight, Eye, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { reservationService, InventoryReservation } from '../../services/reservation.service';
import { useAuth } from '../../hooks/useAuth';

export const ReservationListPage: React.FC = () => {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<InventoryReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await reservationService.getReservations({
        page,
        limit: 10,
        status: statusFilter || undefined,
      });
      setReservations(res.items || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalItems(res.pagination?.totalItems || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Food Stock Reservations
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {user?.role === 'ADMIN'
              ? 'View and manage all system food reservations.'
              : 'View and manage your active and past food reservations.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => fetchReservations()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
          <Link to="/collection/available" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Browse Available Food
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            Filter by Status
          </label>
          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="FULFILLED">FULFILLED</option>
            <option value="RELEASED">RELEASED</option>
            <option value="EXPIRED">EXPIRED</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-muted)' }}>
          Loading reservations...
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '24px', textAlign: 'center', color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
          <AlertCircle size={32} style={{ marginBottom: '8px' }} />
          <p style={{ fontWeight: 600, margin: '0 0 8px' }}>{error}</p>
          <button className="btn btn-secondary" onClick={() => fetchReservations()}>
            Retry
          </button>
        </div>
      ) : reservations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <Bookmark size={48} color="var(--text-light)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            No reservations found.
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            You have no reservations matching the filter criteria.
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-hover)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Item / Category</th>
                {user?.role === 'ADMIN' && <th style={{ padding: '12px 16px', fontWeight: 600 }}>Reserved By</th>}
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Quantity</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Expires At</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Created At</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((res) => (
                <tr key={res.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                    {res.inventory?.foodCategory?.replace('_', ' ') || 'Food Item'}
                    {res.inventory?.description ? ` — ${res.inventory.description}` : ''}
                  </td>
                  {user?.role === 'ADMIN' && (
                    <td style={{ padding: '12px 16px' }}>
                      {res.reserver ? `${res.reserver.firstName} ${res.reserver.lastName}` : res.reservedBy}
                    </td>
                  )}
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                    {Number(res.quantity).toFixed(2)} {res.unit}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        ...getStatusBadgeStyle(res.status),
                      }}
                    >
                      {res.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                    {new Date(res.expiresAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                    {new Date(res.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Link
                      to={`/reservations/${res.id}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: 'var(--primary-color)', fontWeight: 600 }}
                    >
                      <Eye size={16} />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Page {page} of {totalPages} ({totalItems} records)
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
