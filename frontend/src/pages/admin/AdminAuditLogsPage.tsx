import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { reportingService } from '../../services/reporting.service';
import { ActivityLogItem } from '../../types/reporting.types';
import {
  ShieldAlert,
  RotateCw,
  AlertCircle,
  Activity,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Search
} from 'lucide-react';

export const AdminAuditLogsPage: React.FC = () => {
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<ActivityLogItem | null>(null);
  const [filterAction, setFilterAction] = useState<string>('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportingService.getActivityReport({ page, limit });
      setActivities(res.items || []);
      setTotalPages(res.totalPages || 1);
      setTotalItems(res.total || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load system audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (selectedLog) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedLog]);

  const filteredActivities = filterAction
    ? activities.filter(
        (a) =>
          a.action.toLowerCase().includes(filterAction.toLowerCase()) ||
          a.entityType.toLowerCase().includes(filterAction.toLowerCase()) ||
          (a.user && `${a.user.firstName} ${a.user.lastName}`.toLowerCase().includes(filterAction.toLowerCase())) ||
          (a.user && a.user.email.toLowerCase().includes(filterAction.toLowerCase()))
      )
    : activities;

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATED') || action.includes('SUCCESS') || action.includes('APPROVED') || action.includes('COMPLETED')) {
      return { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' };
    }
    if (action.includes('FAILED') || action.includes('REJECTED') || action.includes('DEACTIVATED')) {
      return { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' };
    }
    if (action.includes('UPDATED') || action.includes('ASSIGNED') || action.includes('STARTED')) {
      return { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' };
    }
    return { bg: '#f8fafc', color: 'var(--text-main)', border: 'var(--border-color)' };
  };

  return (
    <div className="animate-fade-in foodshare-container" style={{ paddingTop: '16px', paddingBottom: '40px' }}>
      {/* Header Banner */}
      <div
        className="foodshare-card"
        style={{
          padding: '24px 28px',
          marginBottom: '24px',
          backgroundColor: '#ffffff',
          borderLeft: '6px solid var(--foodshare-green-dark)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <ShieldAlert size={26} color="var(--foodshare-green-dark)" />
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--foodshare-green-dark)', margin: 0 }}>
                System Audit & Activity Logs
              </h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
              Immutable system-wide audit records tracking security events, user logins, donation approvals, and inventory transactions.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={fetchLogs}
              className="btn-foodshare btn-foodshare-outline"
              style={{ fontSize: '0.85rem', padding: '8px 14px', height: '38px', gap: '6px' }}
              title="Refresh Audit Logs"
            >
              <RotateCw size={15} className={loading ? 'spin' : ''} />
              <span>Refresh Logs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Summary Toolbar */}
      <div
        className="foodshare-card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by action, entity, user name or email..."
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          Showing {filteredActivities.length} of {totalItems} total logs
        </div>
      </div>

      {/* Audit Log Table Container */}
      <div className="foodshare-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading audit records from server...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '36px 24px', textAlign: 'center', borderLeft: '4px solid var(--color-danger)' }}>
            <AlertCircle size={36} color="var(--color-danger)" style={{ margin: '0 auto 12px auto', display: 'block' }} />
            <p style={{ color: 'var(--text-main)', fontWeight: 700, marginBottom: '8px' }}>{error}</p>
            <button
              type="button"
              onClick={fetchLogs}
              className="btn-foodshare btn-foodshare-primary"
              style={{ fontSize: '0.85rem', padding: '6px 16px' }}
            >
              Retry Loading Audit Logs
            </button>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Activity size={42} color="var(--text-light)" style={{ margin: '0 auto 12px auto', display: 'block' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
              No Audit Records Found
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {filterAction ? 'No audit records match your search filter.' : 'No audit log entries recorded in the system yet.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>Timestamp</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>Actor / User</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>Action</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>Entity</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>IP Address</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((log) => {
                  const badgeStyle = getActionBadgeColor(log.action);
                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background-color 0.15s ease',
                      }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} color="var(--text-muted)" />
                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        {log.user ? (
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                              {log.user.firstName} {log.user.lastName}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{log.user.email}</div>
                          </div>
                        ) : (
                          <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>System / Guest</span>
                        )}
                      </td>

                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: badgeStyle.bg,
                            color: badgeStyle.color,
                            border: `1px solid ${badgeStyle.border}`,
                          }}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="role-badge" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                            {log.entityType}
                          </span>
                          {log.entityId && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              #{log.entityId.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                        {log.ipAddress || '—'}
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="btn-foodshare btn-foodshare-outline"
                          style={{ padding: '4px 10px', fontSize: '0.78rem', gap: '4px', height: '30px' }}
                          aria-label="View metadata"
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && totalPages > 1 && (
          <div
            style={{
              padding: '14px 20px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.85rem',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalItems} total logs)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-foodshare btn-foodshare-outline"
                style={{ padding: '4px 12px', fontSize: '0.8rem', height: '32px' }}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="btn-foodshare btn-foodshare-outline"
                style={{ padding: '4px 12px', fontSize: '0.8rem', height: '32px' }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Detail Modal */}
      {selectedLog &&
        ReactDOM.createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100dvh',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              padding: '16px',
            }}
            onClick={() => setSelectedLog(null)}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-md)',
                width: '100%',
                maxWidth: '560px',
                maxHeight: 'calc(100dvh - 32px)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Sticky Header */}
              <div
                style={{
                  padding: '18px 24px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <div>
                  <span className="role-badge admin" style={{ fontSize: '0.7rem', marginBottom: '4px', display: 'inline-block' }}>
                    AUDIT LOG DETAIL
                  </span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    {selectedLog.action}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                  aria-label="Close detail modal"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Internal Scroll Body */}
              <div
                style={{
                  padding: '20px 24px',
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  fontSize: '0.875rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Log ID</span>
                  <strong style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{selectedLog.id}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Timestamp</span>
                  <strong>{new Date(selectedLog.createdAt).toLocaleString()}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Entity Type & ID</span>
                  <span>
                    <strong>{selectedLog.entityType}</strong> {selectedLog.entityId ? `(${selectedLog.entityId})` : ''}
                  </span>
                </div>

                {selectedLog.user && (
                  <div style={{ padding: '10px 12px', background: '#f0fdf4', borderRadius: 'var(--radius-sm)', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700 }}>Actor Information</div>
                    <div style={{ fontWeight: 700, color: '#166534' }}>{selectedLog.user.firstName} {selectedLog.user.lastName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#166534' }}>{selectedLog.user.email} (Role: {selectedLog.user.role})</div>
                  </div>
                )}

                {selectedLog.ipAddress && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>IP Address</span>
                    <strong>{selectedLog.ipAddress}</strong>
                  </div>
                )}

                {selectedLog.metadata && (
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Event Metadata Payload
                    </div>
                    <pre
                      style={{
                        background: '#1e293b',
                        color: '#f8fafc',
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.78rem',
                        overflowX: 'auto',
                        maxHeight: '220px',
                      }}
                    >
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Modal Sticky Footer */}
              <div
                style={{
                  padding: '12px 24px',
                  borderTop: '1px solid var(--border-color)',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="btn-foodshare btn-foodshare-primary"
                  style={{ padding: '6px 16px', fontSize: '0.85rem' }}
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
