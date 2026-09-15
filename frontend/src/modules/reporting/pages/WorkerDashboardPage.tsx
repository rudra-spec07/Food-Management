import React, { useEffect, useState } from 'react';
import { WorkerDashboardData } from '../../../types/reporting.types';
import { reportingService } from '../../../services/reporting.service';
import {
  ClipboardList,
  Truck,
  CheckCircle2,
  XCircle,
  TrendingUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const WorkerDashboardPage: React.FC = () => {
  const [data, setData] = useState<WorkerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  const fetchWorkerDashboard = () => {
    setIsLoading(true);
    setIsError(false);
    reportingService
      .getWorkerDashboard()
      .then((res) => {
        setData(res);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load worker dashboard', err);
        setIsError(true);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchWorkerDashboard();
  }, []);

  return (
    <div className="reporting-page-container">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-color)', margin: '0 0 6px' }}>
          Worker Operational Dashboard
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Overview of your current pickup metrics, active assignments, and completion performance.
        </p>
      </div>

      {isLoading ? (
        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" style={{ width: '36px', height: '36px', borderTopColor: 'var(--foodshare-green-primary)' }} />
        </div>
      ) : isError ? (
        <div className="card" style={{ padding: '36px', textAlign: 'center', backgroundColor: 'var(--bg-card)' }}>
          <AlertCircle size={40} color="var(--danger-color, #ef4444)" style={{ marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 8px', color: 'var(--text-color)' }}>Failed to load operational dashboard</h3>
          <p style={{ margin: '0 0 20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            We encountered an issue retrieving your operational metrics.
          </p>
          <button type="button" className="btn btn-secondary" onClick={fetchWorkerDashboard}>
            <RefreshCw size={16} style={{ marginRight: '8px' }} /> Retry
          </button>
        </div>
      ) : data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Row Stats */}
          <div className="reporting-kpi-grid">
            {/* Active Assignments */}
            <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)', borderLeft: '4px solid var(--foodshare-green-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Active Assignments</span>
                <ClipboardList size={22} color="var(--foodshare-green-primary)" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-color)' }}>
                {data.activeAssignmentsCount}
              </div>
            </div>

            {/* In Progress Pickups */}
            <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Pickups In Progress</span>
                <Truck size={22} color="#3b82f6" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1e40af' }}>
                {data.inProgressPickupsCount}
              </div>
            </div>

            {/* Success Rate */}
            <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)', borderLeft: '4px solid #22c55e' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Success Rate</span>
                <TrendingUp size={22} color="#22c55e" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#166534' }}>
                {data.successRate}%
              </div>
            </div>
          </div>

          {/* Breakdown Card */}
          <div className="card" style={{ padding: '24px', backgroundColor: 'var(--bg-card)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-color)' }}>
              Historical Performance Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <ClipboardList size={14} /> Total Assigned
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-color)' }}>{data.assignedPickupsCount}</div>
              </div>

              <div style={{ padding: '16px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#166534', marginBottom: '4px' }}>
                  <CheckCircle2 size={14} color="#22c55e" /> Total Completed
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534' }}>{data.completedPickupsCount}</div>
              </div>

              <div style={{ padding: '16px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#991b1b', marginBottom: '4px' }}>
                  <XCircle size={14} color="#ef4444" /> Total Failed
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#991b1b' }}>{data.failedPickupsCount}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
