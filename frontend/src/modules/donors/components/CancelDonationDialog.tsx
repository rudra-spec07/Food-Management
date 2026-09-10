import React, { useState } from 'react';
import { Donation } from '../types/donor.types';
import { AlertTriangle, X } from 'lucide-react';

interface CancelDonationDialogProps {
  donation: Donation | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (donationId: string, reason?: string) => Promise<void>;
}

export const CancelDonationDialog: React.FC<CancelDonationDialogProps> = ({
  donation,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !donation) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      await onConfirm(donation.id, reason.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel donation');
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
        zIndex: 210,
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
          maxWidth: '460px',
          padding: '24px',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c' }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Cancel Food Donation</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Are you sure you want to withdraw this donation?</p>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', padding: '10px', marginBottom: '14px', color: '#b91c1c', fontSize: '0.825rem' }}>
            {error}
          </div>
        )}

        <div style={{ fontSize: '0.875rem', marginBottom: '16px', color: 'var(--text-main)', backgroundColor: 'var(--bg-page)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <strong>Donation:</strong> {donation.description} ({donation.quantity} {donation.quantityUnit.toLowerCase()})
        </div>

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label">Reason for cancellation (Optional)</label>
          <input
            type="text"
            className="form-input"
            placeholder="E.g., No longer available, changed plans..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" onClick={onClose} className="btn-foodshare btn-foodshare-outline" disabled={loading}>
            Keep Donation
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="btn-foodshare"
            style={{ backgroundColor: '#b91c1c', color: '#ffffff', border: 'none' }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : <span>Confirm Cancel</span>}
          </button>
        </div>
      </div>
    </div>
  );
};
