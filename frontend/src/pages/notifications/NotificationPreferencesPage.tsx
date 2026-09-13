import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Bell, Check, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { notificationService } from '../../services/notification.service';
import { NotificationChannel, NotificationPreference } from '../../types/notification.types';

interface EventConfig {
  eventType: string;
  label: string;
  description: string;
  category: 'Donor' | 'Worker' | 'Admin';
}

const SUPPORTED_EVENTS: EventConfig[] = [
  {
    eventType: 'DONATION_SUBMITTED',
    label: 'Donation Submitted',
    description: 'Received when you submit a new food donation.',
    category: 'Donor',
  },
  {
    eventType: 'DONATION_APPROVED',
    label: 'Donation Approved',
    description: 'Received when an admin approves your food donation.',
    category: 'Donor',
  },
  {
    eventType: 'DONATION_REJECTED',
    label: 'Donation Rejected',
    description: 'Received when an admin rejects your food donation.',
    category: 'Donor',
  },
  {
    eventType: 'PICKUP_STARTED',
    label: 'Pickup En Route',
    description: 'Received when a assigned worker starts pickup for your donation.',
    category: 'Donor',
  },
  {
    eventType: 'PICKUP_COMPLETED',
    label: 'Pickup Completed',
    description: 'Received when your food donation pickup is successfully completed.',
    category: 'Donor',
  },
  {
    eventType: 'DONATION_ASSIGNED',
    label: 'Assignment Received',
    description: 'Received when an admin assigns a donation pickup task to you.',
    category: 'Worker',
  },
  {
    eventType: 'ASSIGNMENT_ACCEPTED',
    label: 'Assignment Accepted',
    description: 'Received when a worker accepts an assigned pickup task.',
    category: 'Admin',
  },
  {
    eventType: 'ASSIGNMENT_REJECTED',
    label: 'Assignment Rejected',
    description: 'Received when a worker rejects an assigned pickup task.',
    category: 'Admin',
  },
  {
    eventType: 'PICKUP_FAILED',
    label: 'Pickup Failure Alert',
    description: 'Received when a pickup task fails during execution.',
    category: 'Admin',
  },
];

export const NotificationPreferencesPage: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const prefs = await notificationService.getPreferences();
      setPreferences(prefs || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load notification preferences.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const isEnabled = (eventType: string, channel: NotificationChannel): boolean => {
    const existing = preferences.find(
      (p) => p.eventType === eventType && p.channel === channel
    );
    return existing ? existing.enabled : true; // default enabled
  };

  const handleToggle = async (eventType: string, channel: NotificationChannel) => {
    const currentStatus = isEnabled(eventType, channel);
    const newStatus = !currentStatus;
    const key = `${eventType}_${channel}`;

    setSavingKey(key);
    setSuccessMessage(null);

    try {
      const updated = await notificationService.updatePreference({
        eventType,
        channel,
        enabled: newStatus,
      });

      setPreferences((prev) => {
        const filtered = prev.filter(
          (p) => !(p.eventType === eventType && p.channel === channel)
        );
        return [...filtered, updated];
      });

      setSuccessMessage(`Updated preference for ${eventType.replace(/_/g, ' ')}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update preference.');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Back Link & Header */}
      <div style={{ marginBottom: '20px' }}>
        <Link
          to="/notifications"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--foodshare-green-primary)',
            textDecoration: 'none',
            marginBottom: '12px',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Notifications</span>
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
          Notification Preferences
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Manage your notification channels and event delivery preferences.
        </p>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--foodshare-green-soft)',
            border: '1px solid var(--foodshare-green-primary)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--foodshare-green-dark)',
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Check size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Container */}
      {loading ? (
        <div
          style={{
            padding: '48px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            Loading notification settings...
          </p>
        </div>
      ) : error ? (
        <div
          style={{
            padding: '32px 24px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <AlertCircle size={36} color="#ef4444" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px' }}>
            Error loading preferences
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 16px' }}>{error}</p>
          <button
            type="button"
            onClick={fetchPreferences}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: 'var(--foodshare-green-primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} />
            <span>Retry</span>
          </button>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          {/* Table Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 100px 100px',
              padding: '14px 20px',
              backgroundColor: 'var(--bg-page)',
              borderBottom: '1px solid var(--border-color)',
              fontWeight: 700,
              fontSize: '0.825rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <div>Notification Event</div>
            <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Bell size={14} />
              <span>In-App</span>
            </div>
            <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Mail size={14} />
              <span>Email</span>
            </div>
          </div>

          {/* Event List Items */}
          <div>
            {SUPPORTED_EVENTS.map((event) => {
              const inAppActive = isEnabled(event.eventType, 'IN_APP');
              const emailActive = isEnabled(event.eventType, 'EMAIL');
              const inAppSaving = savingKey === `${event.eventType}_IN_APP`;
              const emailSaving = savingKey === `${event.eventType}_EMAIL`;

              return (
                <div
                  key={event.eventType}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 100px 100px',
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-color)',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                        }}
                      >
                        {event.label}
                      </span>
                      <span
                        style={{
                          fontSize: '0.675rem',
                          fontWeight: 700,
                          backgroundColor: 'var(--bg-page)',
                          color: 'var(--text-light)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        {event.category}
                      </span>
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {event.description}
                    </p>
                  </div>

                  {/* In-App Toggle */}
                  <div style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleToggle(event.eventType, 'IN_APP')}
                      disabled={inAppSaving}
                      style={{
                        width: '44px',
                        height: '24px',
                        borderRadius: '9999px',
                        backgroundColor: inAppActive ? 'var(--foodshare-green-primary)' : 'var(--border-color)',
                        border: 'none',
                        cursor: inAppSaving ? 'not-allowed' : 'pointer',
                        position: 'relative',
                        transition: 'background-color 0.2s ease',
                        margin: '0 auto',
                        display: 'block',
                      }}
                      aria-label={`Toggle In-App for ${event.label}`}
                    >
                      <span
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: '#ffffff',
                          position: 'absolute',
                          top: '3px',
                          left: inAppActive ? '23px' : '3px',
                          transition: 'left 0.2s ease',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}
                      />
                    </button>
                  </div>

                  {/* Email Toggle */}
                  <div style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleToggle(event.eventType, 'EMAIL')}
                      disabled={emailSaving}
                      style={{
                        width: '44px',
                        height: '24px',
                        borderRadius: '9999px',
                        backgroundColor: emailActive ? 'var(--foodshare-green-primary)' : 'var(--border-color)',
                        border: 'none',
                        cursor: emailSaving ? 'not-allowed' : 'pointer',
                        position: 'relative',
                        transition: 'background-color 0.2s ease',
                        margin: '0 auto',
                        display: 'block',
                      }}
                      aria-label={`Toggle Email for ${event.label}`}
                    >
                      <span
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: '#ffffff',
                          position: 'absolute',
                          top: '3px',
                          left: emailActive ? '23px' : '3px',
                          transition: 'left 0.2s ease',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Info */}
          <div
            style={{
              padding: '12px 20px',
              backgroundColor: 'var(--bg-page)',
              fontSize: '0.8rem',
              color: 'var(--text-light)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShieldCheck size={14} color="var(--foodshare-green-primary)" />
            <span>Preferences are saved automatically and applied immediately.</span>
          </div>
        </div>
      )}
    </div>
  );
};
