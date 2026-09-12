import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { inventoryService } from '../../modules/inventory/services/inventory.service';
import { InventoryItem } from '../../modules/inventory/types/inventory.types';
import { distributionService } from '../../services/distribution.service';

export const CreateDistributionPage: React.FC = () => {
  const navigate = useNavigate();

  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [recipientName, setRecipientName] = useState('');
  const [quantity, setQuantity] = useState<string>('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadInventory = async () => {
    try {
      setLoadingItems(true);
      const res = await inventoryService.getItems({ status: 'AVAILABLE' as any, limit: 100 });
      if (res && res.items) {
        setAvailableItems(res.items);
      } else {
        setAvailableItems([]);
      }
    } catch (err: any) {
      console.error('Failed to load inventory choices:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleItemSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedInventoryId(id);
    const item = availableItems.find((inv) => inv.id === id) || null;
    setSelectedItem(item);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedInventoryId) {
      setErrorMessage('Please select an available food item to distribute.');
      return;
    }

    if (!recipientName.trim()) {
      setErrorMessage('Please enter the recipient or beneficiary organization name.');
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

    try {
      setSubmitting(true);
      const newRecord = await distributionService.createDistribution({
        inventoryId: selectedInventoryId,
        recipientName: recipientName.trim(),
        quantity: numQuantity,
        unit: selectedItem?.unit,
        notes: notes.trim() || undefined,
      });

      navigate(`/distributions/${newRecord.id}`);
    } catch (err: any) {
      const msg = err.message || 'Failed to create distribution';
      setErrorMessage(msg);

      // If 409 conflict or quantity error, refresh available inventory
      if (err.statusCode === 409 || err.code === 'INSUFFICIENT_INVENTORY') {
        loadInventory();
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
          Allocate collected food items to a beneficiary organization.
        </p>
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
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
            Available Food Batch <span style={{ color: '#dc2626' }}>*</span>
          </label>
          {loadingItems ? (
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

        {selectedItem && (
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
            Quantity to Distribute {selectedItem ? `(${selectedItem.unit})` : ''} <span style={{ color: '#dc2626' }}>*</span>
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
