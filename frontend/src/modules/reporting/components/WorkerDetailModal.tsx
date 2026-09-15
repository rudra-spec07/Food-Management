import React, { useEffect, useState } from 'react';
import { WorkerDetailData } from '../../../types/reporting.types';
import { reportingService } from '../../../services/reporting.service';
import { X, User, CheckCircle2, XCircle, Truck, ClipboardList, AlertCircle, RefreshCw } from 'lucide-react';

export interface WorkerDetailModalProps {
  workerId: string | null;
  dateFrom?: string;
  dateTo?: string;
  onClose: () => void;
}

export const WorkerDetailModal: React.FC<WorkerDetailModalProps> = ({
  workerId,
  dateFrom,
  dateTo,
  onClose,
}) => {
  const [data, setData] = useState<WorkerDetailData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    if (!workerId) return;

    let isMounted = true;
    setIsLoading(true);
    setIsError(false);

    reportingService
      .getWorkerDetail(workerId, { dateFrom, dateTo })
      .then((res: WorkerDetailData) => {
        if (isMounted) {
          setData(res);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to load worker details', err);
        if (isMounted) {
          setIsError(true);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [workerId, dateFrom, dateTo]);

  if (!workerId) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '540px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User size={22} color="var(--foodshare-green-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-color)' }}>
              Worker Performance Detail
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px' }}>
          {isLoading ? (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" style={{ width: '32px', height: '32px', borderTopColor: 'var(--foodshare-green-primary)' }} />
            </div>
          ) : isError ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <AlertCircle size={36} color="var(--danger-color, #ef4444)" style={{ marginBottom: '12px' }} />
              <p style={{ margin: '0 0 16px', color: 'var(--text-color)' }}>Failed to load worker details.</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setIsLoading(true);
                  setIsError(false);
                  reportingService
                    .getWorkerDetail(workerId, { dateFrom, dateTo })
                    .then((res: WorkerDetailData) => {
                      setData(res);
                      setIsLoading(false);
                    })
                    .catch(() => {
                      setIsError(true);
                      setIsLoading(false);
                    });
                }}
              >
                <RefreshCw size={14} style={{ marginRight: '6px' }} /> Retry
              </button>
            </div>
          ) : data ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Worker Profile Summary */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  backgroundColor: 'var(--bg-page)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-color)' }}>
                    {data.firstName} {data.lastName}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{data.email}</p>
                </div>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-xs, 4px)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: data.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                    color: data.status === 'ACTIVE' ? '#166534' : '#991b1b',
                  }}
                >
                  {data.status}
                </span>
              </div>

              {/* Grid Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '12px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <ClipboardList size={14} color="var(--foodshare-green-primary)" />
                    <span>Assigned</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-color)' }}>{data.assignedCount}</div>
                </div>

                <div style={{ padding: '12px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <CheckCircle2 size={14} color="#22c55e" />
                    <span>Completed</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#166534' }}>{data.completedCount}</div>
                </div>

                <div style={{ padding: '12px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <XCircle size={14} color="#ef4444" />
                    <span>Failed</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#991b1b' }}>{data.failedCount}</div>
                </div>

                <div style={{ padding: '12px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <Truck size={14} color="#3b82f6" />
                    <span>Active Pickups</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e40af' }}>{data.activePickupsCount}</div>
                </div>
              </div>

              {/* Extra Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Success Rate</span>
                  <span style={{ fontWeight: 700, color: 'var(--foodshare-green-dark)' }}>{data.successRate}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Avg Completion Time</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-color)' }}>
                    {data.avgCompletionTimeMinutes != null ? `${data.avgCompletionTimeMinutes} mins` : 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Pending Assignments</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-color)' }}>{data.pendingAssignmentsCount}</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
