import React from 'react';
import { PieChart, AlertCircle, RefreshCw } from 'lucide-react';

export interface StatusDistributionChartProps {
  distribution: Record<string, number>;
  total: number;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; fill: string }> = {
  PENDING: { bg: '#fef3c7', text: '#92400e', fill: '#f59e0b' },
  APPROVED: { bg: '#dbeafe', text: '#1e40af', fill: '#3b82f6' },
  ASSIGNED: { bg: '#e0e7ff', text: '#3730a3', fill: '#6366f1' },
  PICKED_UP: { bg: '#fae8ff', text: '#86198f', fill: '#d946ef' },
  COMPLETED: { bg: '#dcfce7', text: '#166534', fill: '#22c55e' },
  REJECTED: { bg: '#fee2e2', text: '#991b1b', fill: '#ef4444' },
  CANCELLED: { bg: '#f3f4f6', text: '#374151', fill: '#9ca3af' },
  EXPIRED: { bg: '#ffedd5', text: '#9a3412', fill: '#f97316' },
};

export const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({
  distribution,
  total,
  isLoading = false,
  isError = false,
  onRetry,
}) => {
  if (isError) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--bg-card)' }}>
        <AlertCircle size={32} color="var(--danger-color, #ef4444)" style={{ marginBottom: '8px' }} />
        <h4 style={{ margin: '0 0 8px', color: 'var(--text-color)' }}>Failed to load status distribution</h4>
        {onRetry && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
            <RefreshCw size={14} style={{ marginRight: '6px' }} /> Retry
          </button>
        )}
      </div>
    );
  }

  const entries = Object.entries(distribution).filter(([_, count]) => count >= 0);

  return (
    <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <PieChart size={20} color="var(--foodshare-green-primary)" />
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-color)' }}>
          Status Distribution
        </h3>
        <span style={{ marginLeft: 'auto', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
          Total: <strong>{total}</strong>
        </span>
      </div>

      {isLoading ? (
        <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" style={{ width: '28px', height: '28px', borderTopColor: 'var(--foodshare-green-primary)' }} />
        </div>
      ) : total === 0 ? (
        <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No status distribution data available.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {entries.map(([status, count]) => {
            const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
            const colors = STATUS_COLORS[status] || { bg: '#f3f4f6', text: '#374151', fill: '#6b7280' };

            return (
              <div key={status} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: colors.bg,
                      color: colors.text,
                    }}
                  >
                    {status}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                    {count} <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>({pct}%)</span>
                  </span>
                </div>
                <div
                  style={{
                    height: '8px',
                    width: '100%',
                    backgroundColor: 'var(--bg-page)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      backgroundColor: colors.fill,
                      borderRadius: '4px',
                      transition: 'width 0.3s ease-in-out',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
