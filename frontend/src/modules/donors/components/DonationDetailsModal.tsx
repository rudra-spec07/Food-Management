import React from 'react';
import { Donation } from '../types/donor.types';
import { DonationStatusBadge } from './DonationStatusBadge';
import { X, Calendar, MapPin, Phone, User, Package, Clock, History, AlertCircle } from 'lucide-react';

interface DonationDetailsModalProps {
  donation: Donation | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DonationDetailsModal: React.FC<DonationDetailsModalProps> = ({ donation, isOpen, onClose }) => {
  if (!isOpen || !donation) return null;

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return 'N/A';
    return new Date(isoStr).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
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
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>{donation.description}</h2>
              <DonationStatusBadge status={donation.status} />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              ID: {donation.id} • Created: {formatDate(donation.createdAt)}
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Rejection / Cancellation alerts if present */}
        {donation.rejectionReason && (
          <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-sm)', padding: '12px', marginBottom: '16px', color: '#b91c1c', fontSize: '0.875rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AlertCircle size={18} />
            <span>Rejection Reason: {donation.rejectionReason}</span>
          </div>
        )}

        {/* Content Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Package size={18} color="var(--foodshare-green-primary)" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Category & Quantity</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                  {donation.category.replace('_', ' ')} — {donation.quantity} {donation.quantityUnit.toLowerCase()}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={18} color="var(--foodshare-green-primary)" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Prepared At</div>
                <div style={{ fontSize: '0.875rem' }}>{formatDate(donation.preparedAt)}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={18} color="var(--foodshare-green-primary)" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Expires At</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#b45309' }}>{formatDate(donation.expiresAt)}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <MapPin size={18} color="var(--foodshare-green-primary)" style={{ marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pickup Location</div>
                <div style={{ fontSize: '0.875rem' }}>{donation.pickupAddress}</div>
                {donation.pickupLatitude !== null && donation.pickupLatitude !== undefined && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                    Coords: {donation.pickupLatitude}, {donation.pickupLongitude}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={18} color="var(--foodshare-green-primary)" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Contact Person</div>
                <div style={{ fontSize: '0.875rem' }}>{donation.contactName}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Phone size={18} color="var(--foodshare-green-primary)" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Contact Phone</div>
                <div style={{ fontSize: '0.875rem' }}>{donation.contactPhone}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Image & Notes */}
        {donation.photoUrl && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>Donation Photo</div>
            <img src={donation.photoUrl} alt="Donation preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
          </div>
        )}

        {donation.notes && (
          <div style={{ backgroundColor: 'var(--bg-page)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pickup Notes</div>
            <div style={{ fontSize: '0.875rem' }}>{donation.notes}</div>
          </div>
        )}

        {/* Status History Timeline */}
        {donation.statusHistory && donation.statusHistory.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
              <History size={16} />
              <span>Status History Timeline</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {donation.statusHistory.map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', backgroundColor: 'var(--bg-page)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <span style={{ fontWeight: 700 }}>{item.toStatus}</span>
                    {item.reason && <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>— {item.reason}</span>}
                  </div>
                  <div style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>{formatDate(item.changedAt)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
