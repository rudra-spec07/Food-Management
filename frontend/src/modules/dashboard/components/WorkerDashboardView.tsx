import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { reportingService } from '../../../services/reporting.service';
import { assignmentService, Assignment } from '../../../services/assignment.service';
import { WorkerDashboardData } from '../../../types/reporting.types';
import { Link } from 'react-router-dom';
import {
  Truck,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  ArrowRight,
  MapPin,
  Package
} from 'lucide-react';

export const WorkerDashboardView: React.FC = () => {
  const { user } = useAuth();

  const [metrics, setMetrics] = useState<WorkerDashboardData | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState<boolean>(true);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    setMetricsError(null);
    try {
      const data = await reportingService.getWorkerDashboard();
      setMetrics(data);
    } catch (err: any) {
      setMetricsError(err?.response?.data?.message || err?.message || 'Failed to load worker performance metrics');
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    setLoadingAssignments(true);
    setAssignmentsError(null);
    try {
      // Backend handles identity from JWT token — no workerId passed!
      const res = await assignmentService.getWorkerAssignments(1, 10);
      setAssignments(res.items || []);
    } catch (err: any) {
      setAssignmentsError(err?.response?.data?.message || err?.message || 'Failed to load active worker assignments');
    } finally {
      setLoadingAssignments(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    fetchAssignments();
  }, [fetchMetrics, fetchAssignments]);

  if (!user) return null;

  return (
    <div className="animate-fade-in foodshare-container" style={{ paddingTop: '16px', paddingBottom: '40px' }}>
      {/* Welcome Header Banner */}
      <div
        className="foodshare-card"
        style={{
          padding: '24px 28px',
          marginBottom: '24px',
          backgroundColor: '#ffffff',
          borderLeft: '6px solid var(--foodshare-green-dark)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--foodshare-green-dark)' }}>
                Welcome, {user.firstName}! 👋
              </h1>
              <span className="role-badge worker">WORKER</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--foodshare-green-dark)',
                  background: 'var(--foodshare-green-soft)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--foodshare-green-border)'
                }}
              >
                <CheckCircle2 size={13} /> Active Field Worker
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Pickup Worker Dispatch Portal. Manage collections, view active tasks, and complete food transfers.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => { fetchMetrics(); fetchAssignments(); }}
              className="btn-foodshare btn-foodshare-outline"
              style={{ fontSize: '0.85rem', padding: '8px 14px', height: '38px', gap: '6px' }}
              title="Refresh Worker Dashboard"
            >
              <RotateCw size={15} className={loadingMetrics || loadingAssignments ? 'spin' : ''} />
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Truck size={18} color="var(--foodshare-green-primary)" /> Worker Dispatch Metrics
        </h2>

        {loadingMetrics ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="foodshare-card" style={{ padding: '20px', minHeight: '110px' }}>
                <div className="skeleton-loader" style={{ width: '40%', height: '14px', marginBottom: '12px' }} />
                <div className="skeleton-loader" style={{ width: '60%', height: '28px' }} />
              </div>
            ))}
          </div>
        ) : metricsError ? (
          <div className="foodshare-card" style={{ padding: '24px', textAlign: 'center', borderLeft: '4px solid var(--color-danger)' }}>
            <AlertCircle size={32} color="var(--color-danger)" style={{ margin: '0 auto 10px auto', display: 'block' }} />
            <p style={{ color: 'var(--text-main)', fontWeight: 600, marginBottom: '8px' }}>{metricsError}</p>
            <button onClick={fetchMetrics} className="btn-foodshare btn-foodshare-primary" style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
              Retry Loading Metrics
            </button>
          </div>
        ) : metrics ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {/* KPI 1: Active Assignments */}
            <div className="foodshare-card" style={{ padding: '20px', borderTop: '4px solid #16a34a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Assignments</span>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--foodshare-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--foodshare-green-dark)' }}>
                  <ClipboardList size={20} />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                {metrics.activeAssignmentsCount.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Pending worker response / action
              </div>
            </div>

            {/* KPI 2: In-Progress Pickups */}
            <div className="foodshare-card" style={{ padding: '20px', borderTop: '4px solid #3b82f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>In-Progress Pickups</span>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8' }}>
                  <Truck size={20} />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1d4ed8', fontFamily: 'var(--font-heading)' }}>
                {metrics.inProgressPickupsCount.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Currently active collections
              </div>
            </div>

            {/* KPI 3: Success Rate */}
            <div className="foodshare-card" style={{ padding: '20px', borderTop: '4px solid #8b5cf6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Success Rate</span>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6d28d9' }}>
                  <CheckCircle2 size={20} />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#6d28d9', fontFamily: 'var(--font-heading)' }}>
                {`${metrics.successRate.toFixed(1)}%`}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Completed: {metrics.completedPickupsCount} | Failed: {metrics.failedPickupsCount}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Main Grid: Active Assignments & Worker Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Active Assignments List */}
        <div className="foodshare-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <ClipboardList size={18} color="var(--foodshare-green-primary)" /> My Assigned Tasks
            </h3>
            <Link to="/worker/assignments" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foodshare-green-primary)' }}>
              View All Tasks &rarr;
            </Link>
          </div>

          {loadingAssignments ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-loader" style={{ height: '70px', borderRadius: 'var(--radius-sm)' }} />
              ))}
            </div>
          ) : assignmentsError ? (
            <div style={{ padding: '16px', background: '#fef2f2', borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca', textAlign: 'center' }}>
              <p style={{ color: '#991b1b', fontSize: '0.85rem', marginBottom: '8px' }}>{assignmentsError}</p>
              <button onClick={fetchAssignments} className="btn-foodshare btn-foodshare-outline" style={{ padding: '4px 12px', fontSize: '0.78rem' }}>
                Retry Loading Tasks
              </button>
            </div>
          ) : assignments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', background: '#faf8f5', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)' }}>
              <CheckCircle2 size={36} color="var(--foodshare-green-primary)" style={{ margin: '0 auto 10px auto', display: 'block' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>No Active Assignments</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>You currently have no pending or active pickup tasks assigned.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {assignments.map((item) => {
                const targetUrl = item.pickup?.id ? `/worker/pickups/${item.pickup.id}` : '/worker/assignments';
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-sm)',
                      background: '#ffffff',
                      border: '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <span className="role-badge" style={{ fontSize: '0.7rem', padding: '2px 8px', marginBottom: '4px', display: 'inline-block' }}>
                          {item.donation?.category || 'DONATION'}
                        </span>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {item.donation?.description || 'Food Donation Task'}
                        </h4>
                      </div>
                      <span className={`status-badge ${item.status.toLowerCase()}`} style={{ fontSize: '0.75rem' }}>
                        {item.status}
                      </span>
                    </div>

                    {item.donation && (
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Package size={14} color="var(--foodshare-green-dark)" />
                          <span>Quantity: <strong>{item.donation.quantity} {item.donation.quantityUnit}</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={14} color="var(--foodshare-green-dark)" />
                          <span>Address: {item.donation.pickupAddress}</span>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <Link
                        to={targetUrl}
                        className="btn-foodshare btn-foodshare-primary"
                        style={{ fontSize: '0.8rem', padding: '6px 12px', height: '32px', gap: '4px' }}
                      >
                        <span>Open Task Details</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Worker Performance & Quick Shortcuts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Performance Card */}
          {metrics && (
            <div className="foodshare-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                <CheckCircle2 size={18} color="var(--foodshare-green-primary)" /> Performance Breakdown
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Assigned Tasks</span>
                  <strong style={{ color: 'var(--text-main)' }}>{metrics.assignedPickupsCount}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f0fdf4', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                  <span style={{ color: '#166534' }}>Completed Collections</span>
                  <strong style={{ color: '#166534' }}>{metrics.completedPickupsCount}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fef2f2', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                  <span style={{ color: '#991b1b' }}>Failed Collections</span>
                  <strong style={{ color: '#991b1b' }}>{metrics.failedPickupsCount}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f5f3ff', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                  <span style={{ color: '#6d28d9' }}>Overall Success Rate</span>
                  <strong style={{ color: '#6d28d9' }}>{`${metrics.successRate.toFixed(1)}%`}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Quick Shortcuts */}
          <div className="foodshare-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <Truck size={18} color="var(--foodshare-green-primary)" /> Field Shortcuts
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link
                to="/worker/assignments"
                className="btn-foodshare btn-foodshare-outline"
                style={{ justifyContent: 'space-between', height: '40px', fontSize: '0.85rem' }}
              >
                <span>My Assignments</span>
                <ArrowRight size={15} />
              </Link>

              <Link
                to="/collection/available"
                className="btn-foodshare btn-foodshare-outline"
                style={{ justifyContent: 'space-between', height: '40px', fontSize: '0.85rem' }}
              >
                <span>Available Surplus Food</span>
                <ArrowRight size={15} />
              </Link>

              <Link
                to="/inventory"
                className="btn-foodshare btn-foodshare-outline"
                style={{ justifyContent: 'space-between', height: '40px', fontSize: '0.85rem' }}
              >
                <span>Inventory Hub</span>
                <ArrowRight size={15} />
              </Link>

              <Link
                to="/distributions"
                className="btn-foodshare btn-foodshare-outline"
                style={{ justifyContent: 'space-between', height: '40px', fontSize: '0.85rem' }}
              >
                <span>Food Distributions</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
