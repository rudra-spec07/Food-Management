import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  PackageCheck,
  AlertTriangle,
  UserCheck,
  UserX,
  Bell,
  Check,
} from 'lucide-react';
import { AppNotification } from '../../../types/notification.types';

interface NotificationItemProps {
  notification: AppNotification;
  onMarkAsRead: (id: string) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
}) => {
  const isUnread = notification.status === 'UNREAD';

  const getEventIcon = () => {
    switch (notification.eventType) {
      case 'DONATION_SUBMITTED':
        return <Clock size={20} color="#0284c7" />;
      case 'DONATION_APPROVED':
        return <CheckCircle2 size={20} color="#10b981" />;
      case 'DONATION_REJECTED':
        return <XCircle size={20} color="#ef4444" />;
      case 'DONATION_ASSIGNED':
        return <UserCheck size={20} color="#6366f1" />;
      case 'ASSIGNMENT_ACCEPTED':
        return <CheckCircle2 size={20} color="#10b981" />;
      case 'ASSIGNMENT_REJECTED':
        return <UserX size={20} color="#f59e0b" />;
      case 'PICKUP_STARTED':
        return <Truck size={20} color="#8b5cf6" />;
      case 'PICKUP_COMPLETED':
        return <PackageCheck size={20} color="#10b981" />;
      case 'PICKUP_FAILED':
        return <AlertTriangle size={20} color="#ef4444" />;
      default:
        return <Bell size={20} color="var(--foodshare-green-primary)" />;
    }
  };

  const data = notification.data || {};

  return (
    <div
      style={{
        backgroundColor: isUnread ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderLeft: isUnread ? '4px solid var(--foodshare-green-primary)' : '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        marginBottom: '12px',
        transition: 'var(--transition)',
        boxShadow: isUnread ? 'var(--shadow-sm)' : 'none',
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-start',
      }}
    >
      {/* Icon Container */}
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'var(--bg-page)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {getEventIcon()}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '4px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h4
              style={{
                margin: 0,
                fontSize: '0.95rem',
                fontWeight: isUnread ? 700 : 600,
                color: 'var(--text-main)',
              }}
            >
              {notification.title}
            </h4>
            {isUnread && (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  backgroundColor: 'var(--foodshare-green-soft)',
                  color: 'var(--foodshare-green-dark)',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Unread
              </span>
            )}
          </div>

          <span
            style={{
              fontSize: '0.775rem',
              color: 'var(--text-light)',
              fontWeight: 500,
            }}
          >
            {new Date(notification.createdAt).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Message body */}
        <p
          style={{
            margin: '4px 0 8px',
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}
        >
          {notification.message}
        </p>

        {/* Dynamic Context Details */}
        {(data.category ||
          data.quantity ||
          data.rejectionReason ||
          data.failureReason ||
          data.completionNotes ||
          data.donationId ||
          data.assignmentId) && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-page)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              marginTop: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            {data.category && (
              <div>
                <strong>Category:</strong> {data.category}
              </div>
            )}
            {data.quantity && (
              <div>
                <strong>Quantity:</strong> {data.quantity} {data.quantityUnit || ''}
              </div>
            )}
            {data.rejectionReason && (
              <div style={{ color: '#ef4444', width: '100%' }}>
                <strong>Reason:</strong> {data.rejectionReason}
              </div>
            )}
            {data.failureReason && (
              <div style={{ color: '#ef4444', width: '100%' }}>
                <strong>Failure Reason:</strong> {data.failureReason}
              </div>
            )}
            {data.completionNotes && (
              <div style={{ width: '100%' }}>
                <strong>Notes:</strong> {data.completionNotes}
              </div>
            )}
            {data.donationId && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                Ref: {data.donationId}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mark as read action button */}
      {isUnread && (
        <button
          type="button"
          onClick={() => onMarkAsRead(notification.id)}
          style={{
            background: 'none',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 12px',
            fontSize: '0.775rem',
            fontWeight: 600,
            color: 'var(--foodshare-green-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'var(--transition)',
            flexShrink: 0,
            marginTop: '2px',
          }}
          title="Mark as read"
        >
          <Check size={14} />
          <span>Mark read</span>
        </button>
      )}
    </div>
  );
};
