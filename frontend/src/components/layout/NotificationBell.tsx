import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Settings, Inbox, ExternalLink } from 'lucide-react';
import { notificationService } from '../../services/notification.service';
import { AppNotification } from '../../types/notification.types';

export const NotificationBell: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifications, setRecentNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [markingAll, setMarkingAll] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationService.getUnreadCount();
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // Ignore background unread count fetch errors silently
    }
  }, []);

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.getNotifications({ page: 1, limit: 5 });
      setRecentNotifications(data.items || []);
    } catch {
      // Handle gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();

    const handleFocus = () => {
      fetchUnreadCount();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (isOpen) {
      fetchRecent();
      fetchUnreadCount();
    }
  }, [isOpen, fetchRecent, fetchUnreadCount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setRecentNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'READ' as const } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      setRecentNotifications((prev) =>
        prev.map((n) => ({ ...n, status: 'READ' as const }))
      );
      setUnreadCount(0);
    } catch {
      // Ignore
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (n: AppNotification) => {
    if (n.status === 'UNREAD') {
      await handleMarkAsRead(n.id, { stopPropagation: () => {} } as any);
    }
    setIsOpen(false);
    navigate('/notifications');
  };

  const formattedBadgeCount = unreadCount > 99 ? '99+' : unreadCount.toString();

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          background: 'none',
          border: 'none',
          padding: '8px',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-main)',
          position: 'relative',
          transition: 'var(--transition)',
        }}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              backgroundColor: '#e11d48',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: 700,
              minWidth: '18px',
              height: '18px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              lineHeight: 1,
              boxShadow: '0 0 0 2px var(--bg-surface)',
            }}
          >
            {formattedBadgeCount}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '360px',
            maxWidth: '90vw',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 200,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-page)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: 'var(--foodshare-green-soft)',
                    color: 'var(--foodshare-green-dark)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--foodshare-green-primary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: markingAll ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: markingAll ? 0.6 : 1,
                }}
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Body List */}
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Loading notifications...
              </div>
            ) : recentNotifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <Inbox size={32} color="var(--text-light)" style={{ marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  No notifications yet
                </p>
              </div>
            ) : (
              recentNotifications.map((n) => {
                const isUnread = n.status === 'UNREAD';
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: isUnread ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                    }}
                  >
                    {isUnread && (
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--foodshare-green-primary)',
                          marginTop: '6px',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: isUnread ? 700 : 600,
                          color: 'var(--text-main)',
                          marginBottom: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {n.title}
                      </div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)',
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {n.message}
                      </div>
                      <div
                        style={{
                          fontSize: '0.725rem',
                          color: 'var(--text-light)',
                          marginTop: '4px',
                        }}
                      >
                        {new Date(n.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Links */}
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-page)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              style={{
                fontSize: '0.825rem',
                fontWeight: 600,
                color: 'var(--foodshare-green-primary)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>View all notifications</span>
              <ExternalLink size={13} />
            </Link>

            <Link
              to="/notification-preferences"
              onClick={() => setIsOpen(false)}
              style={{
                fontSize: '0.825rem',
                color: 'var(--text-muted)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Preferences"
            >
              <Settings size={14} />
              <span>Settings</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
