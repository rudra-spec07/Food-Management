import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Bookmark, Truck } from 'lucide-react';
import { inventoryService } from '../../modules/inventory/services/inventory.service';
import { InventoryItem } from '../../modules/inventory/types/inventory.types';
import { distributionService } from '../../services/distribution.service';
import { reservationService, InventoryReservation } from '../../services/reservation.service';

export const CreateDistributionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialReservationId = searchParams.get('reservationId');

  const [distributionMode, setDistributionMode] = useState<'STANDARD' | 'RESERVED'>(
    initialReservationId ? 'RESERVED' : 'STANDARD'
  );

  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);
  const [activeReservations, setActiveReservations] = useState<InventoryReservation[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [selectedReservationId, setSelectedReservationId] = useState<string>(initialReservationId || '');
  const [selectedReservation, setSelectedReservation] = useState<InventoryReservation | null>(null);

  const [recipientName, setRecipientName] = useState('');
  const [quantity, setQuantity] = useState<string>('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      const [invRes, resRes] = await Promise.all([
        inventoryService.getItems({ status: 'AVAILABLE' as any, limit: 100 }),
        reservationService.getReservations({ status: 'ACTIVE', limit: 100 }),
      ]);

      if (invRes && invRes.items) {
        setAvailableItems(invRes.items);
      }
      if (resRes && resRes.items) {
        setActiveReservations(resRes.items);
        if (initialReservationId) {
          const match = resRes.items.find((r) => r.id === initialReservationId);
          if (match) {
            setSelectedReservation(match);
            setSelectedInventoryId(match.inventoryId);
            setQuantity(String(match.quantity));
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load distribution prerequisites:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleModeChange = (mode: 'STANDARD' | 'RESERVED') => {
    setDistributionMode(mode);
    setErrorMessage(null);
    setSelectedInventoryId('');
    setSelectedItem(null);
    setSelectedReservationId('');
    setSelectedReservation(null);
    setQuantity('');
  };

  const handleItemSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedInventoryId(id);
    const item = availableItems.find((inv) => inv.id === id) || null;
    setSelectedItem(item);
  };

  const handleReservationSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedReservationId(id);
    const res = activeReservations.find((r) => r.id === id) || null;
    setSelectedReservation(res);
    if (res) {
      setSelectedInventoryId(res.inventoryId);
      setQuantity(String(res.quantity));
    } else {
      setSelectedInventoryId('');
      setQuantity('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!recipientName.trim()) {
      setErrorMessage('Please enter the recipient or beneficiary organization name.');
      return;
    }

    if (distributionMode === 'RESERVED') {
      if (!selectedReservationId || !selectedReservation) {
        setErrorMessage('Please select an active reservation to fulfill.');
        return;
      }
    } else {
      if (!selectedInventoryId) {
        setErrorMessage('Please select an available food item to distribute.');
        return;
      }

      const numQuantity = Number(quantity);
      if (isNaN(numQuantity) || numQuantity <= 0) {
        setErrorMessage('Please enter a valid positive quantity.');
        return;
      }

      if (selectedItem && numQuantity > Number(selectedItem.availableQuantity)) {
        setErrorMessage(
          `Requested quantity (${numQuantity}) exceeds available stock (${selectedItem.availableQuantity} ${selectedItem.unit}).`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload: any = {
        recipientName: recipientName.trim(),
        notes: notes.trim() || undefined,
      };

      if (distributionMode === 'RESERVED' && selectedReservation) {
        payload.reservationId = selectedReservation.id;
        payload.inventoryId = selectedReservation.inventoryId;
        payload.quantity = Number(selectedReservation.quantity);
        payload.unit = selectedReservation.unit;
      } else {
        payload.inventoryId = selectedInventoryId;
        payload.quantity = Number(quantity);
        payload.unit = selectedItem?.unit;
      }

      const newRecord = await distributionService.createDistribution(payload);
      navigate(`/distributions/${newRecord.id}`);
    } catch (err: any) {
      const msg = err.message || 'Failed to create distribution';
      setErrorMessage(msg);

      if (
        err.statusCode === 409 ||
        err.code === 'INSUFFICIENT_INVENTORY' ||
        err.code === 'INVALID_RESERVATION_FULFILLMENT_QUANTITY'
      ) {
        loadInitialData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
      <Link
        to="/distributions"
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
        <ArrowLeft size={16} />
        Back to Distribution List
      </Link>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
          Create New Distribution
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Allocate collected or reserved food items to a beneficiary organization.
        </p>
      </div>

      <div className="card" style={{ padding: '8px', marginBottom: '24px', display: 'flex', gap: '8px', backgroundColor: 'var(--bg-hover)' }}>
        <button
          type="button"
          className={`btn ${distributionMode === 'STANDARD' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => handleModeChange('STANDARD')}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <Truck size={18} />
          <span>Standard Available Stock</span>
        </button>
        <button
          type="button"
          className={`btn ${distributionMode === 'RESERVED' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => handleModeChange('RESERVED')}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <Bookmark size={18} />
          <span>Fulfill Active Reservation</span>
        </button>
      </div>

      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            fontSize: '0.9rem',
            marginBottom: '24px',
          }}
        >
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Error:</strong> {errorMessage}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card" style={{ padding: '24px' }}>
        {distributionMode === 'STANDARD' ? (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
              Available Food Batch <span style={{ color: '#dc2626' }}>*</span>
            </label>
            {loadingData ? (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Loading available inventory...</div>
            ) : (
              <select
                className="input-field"
                value={selectedInventoryId}
                onChange={handleItemSelect}
                required
              >
                <option value="">-- Select available food batch --</option>
                {availableItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.foodCategory.replace('_', ' ')} — {item.description} ({Number(item.availableQuantity).toFixed(2)} {item.unit} available)
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
              Active Reservation <span style={{ color: '#dc2626' }}>*</span>
            </label>
            {loadingData ? (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Loading active reservations...</div>
            ) : (
              <select
                className="input-field"
                value={selectedReservationId}
                onChange={handleReservationSelect}
                required
              >
                <option value="">-- Select active reservation --</option>
                {activeReservations.map((res) => (
                  <option key={res.id} value={res.id}>
                    {res.inventory?.foodCategory?.replace('_', ' ')} — {Number(res.quantity).toFixed(2)} {res.unit} (Reserved by {res.reserver ? `${res.reserver.firstName} ${res.reserver.lastName}` : res.reservedBy})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {distributionMode === 'STANDARD' && selectedItem && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-hover)',
              border: '1px solid var(--border-color)',
              marginBottom: '20px',
              fontSize: '0.875rem',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Selected Item Details</div>
            <div>Category: {selectedItem.foodCategory.replace('_', ' ')}</div>
            <div>Description: {selectedItem.description}</div>
            <div>
              Available Quantity: <strong>{Number(selectedItem.availableQuantity).toFixed(2)} {selectedItem.unit}</strong>
            </div>
            {selectedItem.location && <div>Location: {selectedItem.location}</div>}
          </div>
        )}

        {distributionMode === 'RESERVED' && selectedReservation && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1e40af',
              marginBottom: '20px',
              fontSize: '0.875rem',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '4px' }}>Active Reservation Details</div>
            <div>Category: {selectedReservation.inventory?.foodCategory?.replace('_', ' ') || 'Food Item'}</div>
            <div>Exact Fulfillment Quantity: <strong>{Number(selectedReservation.quantity).toFixed(2)} {selectedReservation.unit}</strong></div>
            <div>Expires At: {new Date(selectedReservation.expiresAt).toLocaleString()}</div>
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
            Recipient / Beneficiary Name <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Hope Community Shelter, City Food Bank"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            required
            maxLength={255}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
            Quantity to Distribute {distributionMode === 'RESERVED' ? '(Fixed to Reservation)' : selectedItem ? `(${selectedItem.unit})` : ''} <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            className="input-field"
            placeholder="Enter quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            disabled={distributionMode === 'RESERVED'}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
            Notes / Distribution Remarks
          </label>
          <textarea
            className="input-field"
            rows={3}
            placeholder="Add optional notes about the distribution..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Link to="/distributions" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating Distribution...' : 'Create Distribution'}
          </button>
        </div>
      </form>
    </div>
  );
};
