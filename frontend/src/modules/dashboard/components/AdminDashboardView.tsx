import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { reportingService } from '../../../services/reporting.service';
import { AdminDashboardData, ActivityLogItem } from '../../../types/reporting.types';
import { Link } from 'react-router-dom';
import {
  Package,
  Clock,
  Truck,
  Boxes,
  Users,
  Activity,
  ArrowRight,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  FileText,
  UserCheck,
  ClipboardList
} from 'lucide-react';

export const AdminDashboardView: React.FC = () => {
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState<boolean>(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoadingDashboard(true);
    setDashboardError(null);
    try {
      const data = await reportingService.getAdminDashboard();
      setDashboardData(data);
    } catch (err: any) {
      setDashboardError(err?.response?.data?.message || err?.message || 'Failed to load operational metrics');
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true);
    setActivitiesError(null);
    try {
      const activityData = await reportingService.getActivityReport({ page: 1, limit: 5 });
      setActivities(activityData.items || []);
    } catch (err: any) {
      setActivitiesError(err?.response?.data?.message || err?.message || 'Failed to load recent activity');
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchActivities();
  }, [fetchDashboardData, fetchActivities]);

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
              <span className="role-badge admin">ADMIN</span>
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
                <CheckCircle2 size={13} /> Operational Overseer
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              System Administrator oversight. Live backend operational data and activity audit logs.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => { fetchDashboardData(); fetchActivities(); }}
              className="btn-foodshare btn-foodshare-outline"
              style={{ fontSize: '0.85rem', padding: '8px 14px', height: '38px', gap: '6px' }}
              title="Refresh Dashboard"
            >
              <RotateCw size={15} className={loadingDashboard || loadingActivities ? 'spin' : ''} />
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} color="var(--foodshare-green-primary)" /> Key Operational Indicators
        </h2>

        {loadingDashboard ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="foodshare-card" style={{ padding: '20px', minHeight: '110px' }}>
                <div className="skeleton-loader" style={{ width: '40%', height: '14px', marginBottom: '12px' }} />
                <div className="skeleton-loader" style={{ width: '60%', height: '28px' }} />
              </div>
            ))}
          </div>
        ) : dashboardError ? (
          <div className="foodshare-card" style={{ padding: '24px', textAlign: 'center', borderLeft: '4px solid var(--color-danger)' }}>
            <AlertCircle size={32} color="var(--color-danger)" style={{ margin: '0 auto 10px auto', display: 'block' }} />
            <p style={{ color: 'var(--text-main)', fontWeight: 600, marginBottom: '8px' }}>{dashboardError}</p>
            <button onClick={fetchDashboardData} className="btn-foodshare btn-foodshare-primary" style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
              Retry Loading KPIs
            </button>
          </div>
        ) : dashboardData ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {/* KPI 1: Total Donations */}
            <div className="foodshare-card" style={{ padding: '20px', borderTop: '4px solid #16a34a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Donations</span>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--foodshare-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--foodshare-green-dark)' }}>
                  <Package size={20} />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                {dashboardData.donations.total.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Approved: {dashboardData.donations.approved} | Completed: {dashboardData.donations.completed}
              </div>
            </div>

            {/* KPI 2: Pending Review */}
            <div className="foodshare-card" style={{ padding: '20px', borderTop: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Review</span>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
                  <Clock size={20} />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#b45309', fontFamily: 'var(--font-heading)' }}>
                {dashboardData.donations.pending.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Awaiting admin verification
              </div>
            </div>

            {/* KPI 3: Active Pickups */}
            <div className="foodshare-card" style={{ padding: '20px', borderTop: '4px solid #3b82f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Pickups</span>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8' }}>
                  <Truck size={20} />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1d4ed8', fontFamily: 'var(--font-heading)' }}>
                {dashboardData.pickups.inProgress.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Currently in transit with workers
              </div>
            </div>

            {/* KPI 4: Available Food Quantity */}
            <div className="foodshare-card" style={{ padding: '20px', borderTop: '4px solid #8b5cf6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Available Food</span>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6d28d9' }}>
                  <Boxes size={20} />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#6d28d9', fontFamily: 'var(--font-heading)' }}>
                {dashboardData.inventory.availableQuantity.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Items: {dashboardData.inventory.totalItems} across inventory
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Operational Breakdown Section */}
      {dashboardData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          {/* Pickup Status Breakdown */}
          <div className="foodshare-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <Truck size={18} color="var(--foodshare-green-primary)" /> Pickup Operations
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Not Started</span>
                <strong style={{ color: 'var(--text-main)' }}>{dashboardData.pickups.notStarted}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#eff6ff', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                <span style={{ color: '#1e40af' }}>In Progress</span>
                <strong style={{ color: '#1e40af' }}>{dashboardData.pickups.inProgress}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f0fdf4', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                <span style={{ color: '#166534' }}>Completed</span>
                <strong style={{ color: '#166534' }}>{dashboardData.pickups.completed}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fef2f2', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                <span style={{ color: '#991b1b' }}>Failed / Cancelled</span>
                <strong style={{ color: '#991b1b' }}>{dashboardData.pickups.failed + dashboardData.pickups.cancelled}</strong>
              </div>
            </div>
          </div>

          {/* Inventory Breakdown */}
          <div className="foodshare-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <Boxes size={18} color="var(--foodshare-green-primary)" /> Inventory Breakdown
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f0fdf4', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                <span style={{ color: '#166534' }}>Available Quantity</span>
                <strong style={{ color: '#166534' }}>{dashboardData.inventory.availableQuantity}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fef3c7', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                <span style={{ color: '#92400e' }}>Reserved Quantity</span>
                <strong style={{ color: '#92400e' }}>{dashboardData.inventory.reservedQuantity}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f3e8ff', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                <span style={{ color: '#6b21a8' }}>Distributed Quantity</span>
                <strong style={{ color: '#6b21a8' }}>{dashboardData.inventory.distributedQuantity}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Inventory Batches</span>
                <strong style={{ color: 'var(--text-main)' }}>{dashboardData.inventory.totalItems}</strong>
              </div>
            </div>
          </div>

          {/* Workers Stats */}
          <div className="foodshare-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <Users size={18} color="var(--foodshare-green-primary)" /> Worker Dispatch Overview
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#f0fdf4', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>Active Workers</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#166534' }}>{dashboardData.workers.active}</div>
                </div>
                <UserCheck size={28} color="#166534" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#eff6ff', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 600 }}>Currently Assigned Workers</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e40af' }}>{dashboardData.workers.assigned}</div>
                </div>
                <ClipboardList size={28} color="#1e40af" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Activity & Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Recent Audit Activity Card */}
        <div className="foodshare-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <Activity size={18} color="var(--foodshare-green-primary)" /> Recent Audit Activity
            </h3>
            <Link to="/admin/reports" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foodshare-green-primary)' }}>
              Full Audit Logs &rarr;
            </Link>
          </div>

          {loadingActivities ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-loader" style={{ height: '50px', borderRadius: 'var(--radius-sm)' }} />
              ))}
            </div>
          ) : activitiesError ? (
            <div style={{ padding: '16px', background: '#fef2f2', borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca', textAlign: 'center' }}>
              <p style={{ color: '#991b1b', fontSize: '0.85rem', marginBottom: '8px' }}>{activitiesError}</p>
              <button onClick={fetchActivities} className="btn-foodshare btn-foodshare-outline" style={{ padding: '4px 12px', fontSize: '0.78rem' }}>
                Retry Loading Logs
              </button>
            </div>
          ) : activities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No recent activity logs recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activities.map((act) => (
                <div
                  key={act.id}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#f8fafc',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {act.user ? `${act.user.firstName} ${act.user.lastName}` : 'System'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(act.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className="role-badge" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>{act.entityType}</span>
                    <span>{act.action}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions Shortcuts */}
        <div className="foodshare-card" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
            <FileText size={18} color="var(--foodshare-green-primary)" /> Admin Operational Shortcuts
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '18px' }}>
            Direct access to core administrative verification, worker assignment, and inventory reporting workflows.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link
              to="/admin/donations/review"
              className="btn-foodshare btn-foodshare-outline"
              style={{ justifyContent: 'space-between', height: '42px', fontSize: '0.875rem' }}
            >
              <span>Review Donations</span>
              <ArrowRight size={16} />
            </Link>

            <Link
              to="/admin/donations/assignments"
              className="btn-foodshare btn-foodshare-outline"
              style={{ justifyContent: 'space-between', height: '42px', fontSize: '0.875rem' }}
            >
              <span>Worker Assignment Queue</span>
              <ArrowRight size={16} />
            </Link>

            <Link
              to="/admin/workers"
              className="btn-foodshare btn-foodshare-outline"
              style={{ justifyContent: 'space-between', height: '42px', fontSize: '0.875rem' }}
            >
              <span>Worker Management</span>
              <ArrowRight size={16} />
            </Link>

            <Link
              to="/inventory"
              className="btn-foodshare btn-foodshare-outline"
              style={{ justifyContent: 'space-between', height: '42px', fontSize: '0.875rem' }}
            >
              <span>Inventory Dashboard</span>
              <ArrowRight size={16} />
            </Link>

            <Link
              to="/admin/reports"
              className="btn-foodshare btn-foodshare-outline"
              style={{ justifyContent: 'space-between', height: '42px', fontSize: '0.875rem' }}
            >
              <span>Reports & Analytics</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
