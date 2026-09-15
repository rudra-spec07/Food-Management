import React from 'react';
import { DonationTrendPoint, GroupByPeriod } from '../../../types/reporting.types';
import { TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';

export interface DonationTrendChartProps {
  data: DonationTrendPoint[];
  groupBy: GroupByPeriod;
  onGroupByChange: (groupBy: GroupByPeriod) => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export const DonationTrendChart: React.FC<DonationTrendChartProps> = ({
  data,
  groupBy,
  onGroupByChange,
  isLoading = false,
  isError = false,
  onRetry,
}) => {
  if (isError) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--bg-card)' }}>
        <AlertCircle size={32} color="var(--danger-color, #ef4444)" style={{ marginBottom: '8px' }} />
        <h4 style={{ margin: '0 0 8px', color: 'var(--text-color)' }}>Failed to load donation trend</h4>
        <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          There was an error fetching trend metrics.
        </p>
        {onRetry && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
            <RefreshCw size={14} style={{ marginRight: '6px' }} /> Retry
          </button>
        )}
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const chartHeight = 180;
  const paddingX = 40;
  const paddingY = 20;
  const viewWidth = 600;
  const viewHeight = 220;

  const points = data.map((d, index) => {
    const x =
      data.length > 1
        ? paddingX + (index / (data.length - 1)) * (viewWidth - 2 * paddingX)
        : viewWidth / 2;
    const y = viewHeight - paddingY - (d.count / maxVal) * chartHeight;
    return { x, y, period: d.period, count: d.count, totalQuantity: d.totalQuantity };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  const areaPoints = points.length > 0
    ? `${points[0].x},${viewHeight - paddingY} ${polylinePoints} ${points[points.length - 1].x},${viewHeight - paddingY}`
    : '';

  return (
    <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={20} color="var(--foodshare-green-primary)" />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-color)' }}>
            Donation Trends
          </h3>
        </div>

        <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-page)', padding: '3px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          {(['DAY', 'WEEK', 'MONTH'] as GroupByPeriod[]).map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => onGroupByChange(period)}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: groupBy === period ? 700 : 500,
                color: groupBy === period ? 'var(--foodshare-green-dark)' : 'var(--text-muted)',
                backgroundColor: groupBy === period ? 'var(--bg-card)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-xs, 4px)',
                cursor: 'pointer',
                boxShadow: groupBy === period ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" style={{ width: '28px', height: '28px', borderTopColor: 'var(--foodshare-green-primary)' }} />
        </div>
      ) : data.length === 0 ? (
        <div style={{ height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>No donation trend data available for selected period.</p>
        </div>
      ) : (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const yVal = viewHeight - paddingY - ratio * chartHeight;
              const labelVal = Math.round(ratio * maxVal);
              return (
                <g key={ratio}>
                  <line
                    x1={paddingX}
                    y1={yVal}
                    x2={viewWidth - paddingX}
                    y2={yVal}
                    stroke="var(--border-color)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingX - 8}
                    y={yVal + 4}
                    fill="var(--text-light)"
                    fontSize="10"
                    textAnchor="end"
                  >
                    {labelVal}
                  </text>
                </g>
              );
            })}

            {/* Shaded Area */}
            {points.length > 1 && (
              <polygon points={areaPoints} fill="var(--foodshare-green-primary)" fillOpacity="0.12" />
            )}

            {/* Trend Line */}
            {points.length > 1 ? (
              <polyline
                fill="none"
                stroke="var(--foodshare-green-primary)"
                strokeWidth="2.5"
                points={polylinePoints}
              />
            ) : null}

            {/* Data Points */}
            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4.5"
                  fill="var(--bg-card)"
                  stroke="var(--foodshare-green-primary)"
                  strokeWidth="2.5"
                />
                {/* X-axis labels for selected key points */}
                {(points.length <= 10 || i % Math.ceil(points.length / 7) === 0) && (
                  <text
                    x={p.x}
                    y={viewHeight - 4}
                    fill="var(--text-muted)"
                    fontSize="9.5"
                    textAnchor="middle"
                  >
                    {p.period.length > 10 ? p.period.substring(5) : p.period}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
};
