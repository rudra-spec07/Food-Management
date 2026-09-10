import React, { useState } from 'react';
import { DonationCategory, DonationQuantityUnit, CreateDonationPayload } from '../types/donor.types';
import { X, Sparkles, AlertCircle } from 'lucide-react';

interface CreateDonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateDonationPayload) => Promise<void>;
  defaultContactName?: string;
  defaultContactPhone?: string;
}

export const CreateDonationModal: React.FC<CreateDonationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  defaultContactName = '',
  defaultContactPhone = '',
}) => {
  const nowStr = new Date().toISOString().slice(0, 16);
  const futureStr = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString().slice(0, 16);

  const [category, setCategory] = useState<DonationCategory>('COOKED_MEAL');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState<number>(20);
  const [quantityUnit, setQuantityUnit] = useState<DonationQuantityUnit>('PORTIONS');
  const [preparedAt, setPreparedAt] = useState(nowStr);
  const [expiresAt, setExpiresAt] = useState(futureStr);
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLatitude, setPickupLatitude] = useState<string>('');
  const [pickupLongitude, setPickupLongitude] = useState<string>('');
  const [contactName, setContactName] = useState(defaultContactName);
  const [contactPhone, setContactPhone] = useState(defaultContactPhone);
  const [photoUrl, setPhotoUrl] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError('Description is required.');
      return;
    }
    if (!quantity || quantity <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }
    if (!preparedAt || !expiresAt) {
      setError('Preparation and expiration times are required.');
      return;
    }
    if (new Date(expiresAt).getTime() <= new Date(preparedAt).getTime()) {
      setError('Expiration time must be later than preparation time.');
      return;
    }
    if (new Date(expiresAt).getTime() <= Date.now()) {
      setError('Expiration time must be in the future.');
      return;
    }
    if (!pickupAddress.trim()) {
      setError('Pickup address is required.');
      return;
    }
    if (!contactName.trim() || !contactPhone.trim()) {
      setError('Contact name and phone number are required.');
      return;
    }

    const hasLat = pickupLatitude !== '';
    const hasLng = pickupLongitude !== '';
    if ((hasLat && !hasLng) || (!hasLat && hasLng)) {
      setError('Latitude and Longitude must both be provided or both omitted.');
      return;
    }

    if (photoUrl.trim() && /\.(exe|sh|bat|cmd|js|py|php|dll)$/i.test(photoUrl.trim())) {
      setError('photoUrl cannot point to an executable file.');
      return;
    }

    try {
      setLoading(true);
      const payload: CreateDonationPayload = {
        category,
        description: description.trim(),
        quantity: Number(quantity),
        quantityUnit,
        preparedAt: new Date(preparedAt).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
        pickupAddress: pickupAddress.trim(),
        pickupLatitude: hasLat ? Number(pickupLatitude) : undefined,
        pickupLongitude: hasLng ? Number(pickupLongitude) : undefined,
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        photoUrl: photoUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create donation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="foodshare-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          position: 'relative',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--foodshare-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--foodshare-green-dark)' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Create Food Donation</h2>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: 0 }}>Share surplus food with people in need</p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', padding: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontSize: '0.875rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Category & Quantity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Food Category *</label>
              <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value as DonationCategory)}>
                <option value="COOKED_MEAL">Cooked Meal</option>
                <option value="PACKAGED_FOOD">Packaged Food</option>
                <option value="GROCERIES">Groceries</option>
                <option value="BAKERY">Bakery Items</option>
                <option value="FRUITS">Fruits</option>
                <option value="VEGETABLES">Vegetables</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Quantity & Unit *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="number" className="form-input" min="1" step="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} style={{ width: '40%' }} />
                <select className="form-input" value={quantityUnit} onChange={(e) => setQuantityUnit(e.target.value as DonationQuantityUnit)} style={{ width: '60%' }}>
                  <option value="PORTIONS">Portions</option>
                  <option value="KG">Kilograms (kg)</option>
                  <option value="LITERS">Liters</option>
                  <option value="PACKETS">Packets</option>
                  <option value="BOXES">Boxes</option>
                  <option value="ITEMS">Items</option>
                </select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea className="form-input" rows={2} placeholder="E.g., 20 boxes of fresh vegetarian lunch meals..." value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>

          {/* Prepared & Expiration Timestamps */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Prepared At *</label>
              <input type="datetime-local" className="form-input" value={preparedAt} onChange={(e) => setPreparedAt(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">Expires At *</label>
              <input type="datetime-local" className="form-input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} required />
            </div>
          </div>

          {/* Pickup Address */}
          <div className="form-group">
            <label className="form-label">Pickup Address *</label>
            <textarea className="form-input" rows={2} placeholder="Full street address for pickup..." value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} required />
          </div>

          {/* Coordinates (Optional) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Latitude (Optional)</label>
              <input type="number" step="any" placeholder="e.g. 22.7196" className="form-input" value={pickupLatitude} onChange={(e) => setPickupLatitude(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Longitude (Optional)</label>
              <input type="number" step="any" placeholder="e.g. 75.8577" className="form-input" value={pickupLongitude} onChange={(e) => setPickupLongitude(e.target.value)} />
            </div>
          </div>

          {/* Contact Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Contact Person Name *</label>
              <input type="text" className="form-input" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">Contact Phone Number *</label>
              <input type="tel" className="form-input" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} required />
            </div>
          </div>

          {/* Photo URL & Notes */}
          <div className="form-group">
            <label className="form-label">Photo Image URL (Optional)</label>
            <input type="url" className="form-input" placeholder="https://images.example.com/food.jpg" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Additional Pickup Notes (Optional)</label>
            <input type="text" className="form-input" placeholder="E.g. Collect from gate #2" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {/* Submit Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={onClose} className="btn-foodshare btn-foodshare-outline" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-foodshare btn-foodshare-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : <span>Submit Donation</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
