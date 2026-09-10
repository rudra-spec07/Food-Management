import React from 'react';
import { DonationStatus } from '../types/donor.types';

interface DonationStatusBadgeProps {
  status: DonationStatus;
}

export const DonationStatusBadge: React.FC<DonationStatusBadgeProps> = ({ status }) => {
  const getBadgeStyle = (st: DonationStatus) => {
    switch (st) {
      case 'PENDING_REVIEW':
        return { bg: '#fef3c7', color: '#b45309', border: '#fde68a', label: 'Pending Review' };
      case 'APPROVED':
        return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', label: 'Approved' };
      case 'REJECTED':
        return { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', label: 'Rejected' };
      case 'ASSIGNED':
        return { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd', label: 'Assigned' };
      case 'ACCEPTED':
        return { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe', label: 'Accepted' };
      case 'PICKED_UP':
        return { bg: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff', label: 'Picked Up' };
      case 'COMPLETED':
        return { bg: '#d1fae5', color: '#065f46', border: '#a7f3d0', label: 'Completed' };
      case 'CANCELLED':
        return { bg: '#f3f4f6', color: '#4b5563', border: '#e5e7eb', label: 'Cancelled' };
      default:
        return { bg: '#f3f4f6', color: '#4b5563', border: '#e5e7eb', label: status };
    }
  };

  const style = getBadgeStyle(status);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 700,
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {style.label}
    </span>
  );
};
