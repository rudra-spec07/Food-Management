import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CheckCheck, Settings, RefreshCw, Inbox, AlertCircle } from 'lucide-react';
import { notificationService } from '../../services/notification.service';
import { AppNotification, NotificationStatus } from '../../types/notification.types';
import { NotificationItem } from '../../modules/notifications/components/NotificationItem';
import { NotificationListSkeleton } from '../../modules/notifications/components/NotificationListSkeleton';

export const NotificationListPage: React.FC = () => {
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statusParam: NotificationStatus | undefined =
        filter === 'UNREAD' ? 'UNREAD' : filter === 'READ' ? 'READ' : undefined;

      const [data, unreadRes] = await Promise.all([
        notificationService.getNotifications({ page, limit: 15, status: statusParam }),
        notificationService.getUnreadCount(),
      ]);

      setNotifications(data.items || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
      setUnreadCount(unreadRes.unreadCount || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'READ' as const } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (filter === 'UNREAD') {
        fetchNotifications();
      }
    } catch (err: any) {
      // Ignore or show temporary message
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: 'READ' as const }))
      );
      setUnreadCount(0);
      if (filter === 'UNREAD') {
        fetchNotifications();
      }
    } catch (err: any) {
      // Ignore
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Notifications & Inbox
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Stay updated with donation approvals, worker assignments, and pickup updates.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markingAll || unreadCount === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: unreadCount > 0 ? 'var(--foodshare-green-soft)' : 'var(--bg-page)',
              color: unreadCount > 0 ? 'var(--foodshare-green-dark)' : 'var(--text-light)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              cursor: unreadCount > 0 && !markingAll ? 'pointer' : 'not-allowed',
              transition: 'var(--transition)',
              opacity: unreadCount === 0 || markingAll ? 0.6 : 1,
            }}
          >
            <CheckCheck size={16} />
            <span>Mark all read</span>
          </button>

          <Link
            to="/notification-preferences"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              transition: 'var(--transition)',
            }}
          >
            <Settings size={16} />
            <span>Preferences</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '20px',
        }}
      >
        {(['ALL', 'UNREAD', 'READ'] as const).map((tab) => {
          const isActive = filter === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setFilter(tab);
                setPage(1);
              }}
              style={{
                padding: '10px 16px',
                fontSize: '0.875rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--foodshare-green-dark)' : 'var(--text-muted)',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: isActive
                  ? '3px solid var(--foodshare-green-primary)'
                  : '3px solid transparent',
                cursor: 'pointer',
                transition: 'var(--transition)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{tab === 'ALL' ? 'All Notifications' : tab === 'UNREAD' ? 'Unread' : 'Read'}</span>
              {tab === 'UNREAD' && unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: 'var(--foodshare-green-primary)',
                    color: '#ffffff',
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    borderRadius: '9999px',
                    padding: '2px 6px',
                    lineHeight: 1,
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      {loading ? (
        <NotificationListSkeleton />
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
            Unable to load notifications
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 16px' }}>{error}</p>
          <button
            type="button"
            onClick={fetchNotifications}
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
      ) : notifications.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <Inbox size={48} color="var(--text-light)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px' }}>
            {filter === 'UNREAD'
              ? 'No unread notifications'
              : filter === 'READ'
              ? 'No read notifications'
              : 'No notifications found'}
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
            {filter === 'UNREAD'
              ? "You're all caught up! Check back later for updates."
              : 'Notifications will appear here when donation or assignment activity occurs.'}
          </p>
        </div>
      ) : (
        <>
          {/* Notification Cards List */}
          <div>
            {notifications.map((item) => (
              <NotificationItem
                key={item.id}
                notification={item}
                onMarkAsRead={handleMarkAsRead}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Page {page} of {totalPages} ({totalCount} total)
              </span>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    backgroundColor: 'var(--bg-surface)',
                    color: page <= 1 ? 'var(--text-light)' : 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    backgroundColor: 'var(--bg-surface)',
                    color: page >= totalPages ? 'var(--text-light)' : 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
