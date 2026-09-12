import React, { useState, useEffect, useCallback } from 'react';
import { Package, Search, Filter, AlertCircle, MapPin, Calendar, BookmarkCheck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api/apiClient';
import { reservationService } from '../../services/reservation.service';
import { InventoryItem } from '../../modules/inventory/types/inventory.types';

export const AvailableFoodPage: React.FC = () => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reserve modal state
  const [reservingItem, setReservingItem] = useState<InventoryItem | null>(null);
  const [reserveQuantity, setReserveQuantity] = useState<string>('');
  const [reserveNotes, setReserveNotes] = useState<string>('');
  const [reserveDuration, setReserveDuration] = useState<number>(24);
  const [reserving, setReserving] = useState(false);
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [quantityError, setQuantityError] = useState<string | null>(null);

  const fetchAvailableFood = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/inventory/available', {
        params: {
          search: searchTerm.trim() || undefined,
          foodCategory: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        },
      });
      setItems(res.data.data.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load available food items');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, categoryFilter]);

  useEffect(() => {
    fetchAvailableFood();
  }, [fetchAvailableFood]);

  // Lock body scroll while modal is open & add Escape key listener
  useEffect(() => {
    if (!reservingItem) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeReserveModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [reservingItem]);

  const openReserveModal = (item: InventoryItem) => {
    setReservingItem(item);
    setReserveQuantity('');
    setReserveNotes('');
    setReserveDuration(24);
    setReserveError(null);
    setQuantityError(null);
  };

  const closeReserveModal = () => {
    setReservingItem(null);
    setReserveError(null);
    setQuantityError(null);
  };

  const handleReserveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservingItem) return;

    setReserveError(null);
    setQuantityError(null);

    const trimmedQty = reserveQuantity.trim();
    if (!trimmedQty) {
      setQuantityError('Quantity is required.');
      return;
    }

    const numQty = Number(trimmedQty);
    if (isNaN(numQty) || numQty <= 0) {
      setQuantityError('Please enter a valid positive quantity.');
      return;
    }

    const available = Number(reservingItem.availableQuantity);
    if (numQty > available) {
      setQuantityError(
        `Quantity cannot exceed available stock (${available} ${reservingItem.unit}).`
      );
      return;
    }

    try {
      setReserving(true);
      await reservationService.createReservation({
        inventoryId: reservingItem.id,
        quantity: numQty,
        durationHours: reserveDuration,
        notes: reserveNotes.trim() || undefined,
      });

      closeReserveModal();
      navigate('/reservations');
    } catch (err: any) {
      setReserveError(err.message || 'Failed to create reservation');
      if (err.statusCode === 409 || err.code === 'INSUFFICIENT_INVENTORY') {
        fetchAvailableFood();
      }
    } finally {
      setReserving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
          Available Food Collections
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Explore live available food inventory ready for reservation and distribution.
        </p>
      </div>

      {/* Search & Filter Controls */}
      <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '38px' }}
              placeholder="Search by food category, description, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ width: '200px', position: 'relative' }}>
            <Filter size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <select
              className="input-field"
              style={{ paddingLeft: '38px' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              <option value="COOKED_MEAL">Cooked Meal</option>
              <option value="PACKAGED_FOOD">Packaged Food</option>
              <option value="GROCERIES">Groceries</option>
              <option value="BAKERY">Bakery</option>
              <option value="FRUITS">Fruits</option>
              <option value="VEGETABLES">Vegetables</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-muted)' }}>
          Loading available food items...
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '24px', textAlign: 'center', color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
          <AlertCircle size={32} style={{ marginBottom: '8px' }} />
          <p style={{ fontWeight: 600, margin: '0 0 8px' }}>{error}</p>
          <button className="btn btn-secondary" onClick={() => fetchAvailableFood()}>
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <Package size={48} color="var(--text-light)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            No Available Food Items
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            There are currently no available food items matching your query.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {items.map((item) => (
            <div key={item.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: 'var(--foodshare-green-soft)',
                      color: 'var(--foodshare-green-dark)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.foodCategory.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {item.unit}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 8px', color: 'var(--text-main)' }}>
                  {item.description}
                </h3>

                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--foodshare-green-primary)', marginBottom: '12px' }}>
                  {Number(item.availableQuantity).toFixed(2)} {item.unit} Available
                </div>

                {item.location && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={15} />
                    <span>Location: {item.location}</span>
                  </div>
                )}

                {item.expirationDate && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={15} />
                    <span>Expires: {new Date(item.expirationDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                  onClick={() => openReserveModal(item)}
                >
                  <BookmarkCheck size={16} />
                  <span>Reserve Food</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reserve Modal */}
      {reservingItem && (
        <div
          onClick={closeReserveModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: '16px',
          }}
        >
          <div
            className="foodshare-card animate-fade-in"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reserve-modal-title"
            style={{
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--foodshare-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--foodshare-green-dark)', flexShrink: 0 }}>
                  <BookmarkCheck size={22} />
                </div>
                <div>
                  <h2 id="reserve-modal-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                    Reserve Food Stock
                  </h2>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Hold inventory for organization distribution
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeReserveModal}
                aria-label="Close modal"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  color: 'var(--text-muted)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'var(--transition)',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Item Details Summary Box */}
            <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--foodshare-green-soft)', border: '1px solid var(--foodshare-green-border)', marginBottom: '20px', fontSize: '0.875rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--foodshare-green-dark)', marginBottom: '4px' }}>
                {reservingItem.description}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-main)', fontSize: '0.825rem' }}>
                <span>Category: <strong>{reservingItem.foodCategory.replace('_', ' ')}</strong></span>
                <span>Available: <strong style={{ color: 'var(--foodshare-green-primary)' }}>{Number(reservingItem.availableQuantity).toFixed(2)} {reservingItem.unit}</strong></span>
              </div>
            </div>

            {/* API level error / 409 banner */}
            {reserveError && (
              <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.875rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{reserveError}</span>
              </div>
            )}

            <form onSubmit={handleReserveSubmit} noValidate>
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label htmlFor="reserve-quantity-input" className="form-label" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                  Quantity to Reserve ({reservingItem.unit}) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="reserve-quantity-input"
                  type="number"
                  step="0.01"
                  className="input-field"
                  style={{
                    borderColor: quantityError ? '#dc2626' : undefined,
                    boxShadow: quantityError ? '0 0 0 3px rgba(220, 38, 38, 0.15)' : undefined,
                  }}
                  placeholder={`Enter quantity (max ${Number(reservingItem.availableQuantity).toFixed(2)})`}
                  value={reserveQuantity}
                  onChange={(e) => {
                    setReserveQuantity(e.target.value);
                    if (quantityError) setQuantityError(null);
                  }}
                  aria-invalid={!!quantityError}
                  aria-describedby={quantityError ? "quantity-error-msg" : undefined}
                />
                {quantityError && (
                  <div id="quantity-error-msg" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontSize: '0.825rem', marginTop: '6px' }}>
                    <AlertCircle size={14} />
                    <span>{quantityError}</span>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label htmlFor="reserve-duration-select" className="form-label" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                  Hold Duration (Hours)
                </label>
                <select
                  id="reserve-duration-select"
                  className="input-field"
                  value={reserveDuration}
                  onChange={(e) => setReserveDuration(Number(e.target.value))}
                >
                  <option value={12}>12 Hours</option>
                  <option value={24}>24 Hours (Default)</option>
                  <option value={48}>48 Hours</option>
                  <option value={72}>72 Hours (Max)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label htmlFor="reserve-notes-textarea" className="form-label" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                  Notes / Reservation Purpose
                </label>
                <textarea
                  id="reserve-notes-textarea"
                  className="input-field"
                  rows={3}
                  placeholder="Add optional notes (e.g. Reserved for Hope Shelter dispatch)..."
                  value={reserveNotes}
                  onChange={(e) => setReserveNotes(e.target.value)}
                  maxLength={2000}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={closeReserveModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={reserving}>
                  {reserving ? 'Reserving...' : 'Confirm Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
