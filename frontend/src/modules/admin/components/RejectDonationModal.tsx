import React, { useState } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface RejectDonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  donationId: string;
  isSubmitting: boolean;
}

export const RejectDonationModal: React.FC<RejectDonationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  donationId,
  isSubmitting,
}) => {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();

    if (!trimmed) {
      setValidationError('A rejection reason is required.');
      return;
    }

    if (trimmed.length > 2000) {
      setValidationError('Rejection reason cannot exceed 2000 characters.');
      return;
    }

    setValidationError(null);
    try {
      await onConfirm(trimmed);
      setReason('');
    } catch {
      // Error handled by caller
    }
  };

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
          maxWidth: '520px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="reject-modal-title"
        aria-modal="true"
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#fef2f2',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626',
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3
                id="reject-modal-title"
                style={{ fontSize: '1.1rem', fontWeight: 700, color: '#991b1b', margin: 0 }}
              >
                Reject Food Donation
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#b91c1c' }}>Donation ID: {donationId.slice(0, 8)}...</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '16px', lineHeight: 1.5 }}>
            Please provide a clear justification for rejecting this donation. This reason will be recorded in the donation review audit log and visible to the donor.
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="rejection-reason"
              style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}
            >
              Rejection Reason <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              id="rejection-reason"
              rows={4}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="e.g. Food prepared date is too close to expiry or missing packaging label details."
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: validationError ? '1px solid #dc2626' : '1px solid var(--border-color)',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'vertical',
                backgroundColor: 'var(--bg-main)',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              {validationError ? (
                <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>{validationError}</span>
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mandatory. Max 2000 characters.</span>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{reason.trim().length}/2000</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-outline"
              style={{ padding: '9px 18px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '9px 20px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: isSubmitting || !reason.trim() ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !reason.trim() ? 0.65 : 1,
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  <span>Rejecting...</span>
                </>
              ) : (
                <span>Confirm Rejection</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
