import React, { useEffect, useState, useCallback } from 'react';
import {
  AdminDashboardData,
  DonationReportData,
  DonationReportItem,
  DonationTrendData,
  DonationStatusDistributionData,
  PickupReportData,
  WorkerReportData,
  WorkerPerformanceItem,
  ActivityReportData,
  ActivityLogItem,
  GroupByPeriod,
} from '../../../types/reporting.types';
import { reportingService } from '../../../services/reporting.service';
import { ReportDateFilter } from '../components/ReportDateFilter';
import { DonationTrendChart } from '../components/DonationTrendChart';
import { StatusDistributionChart } from '../components/StatusDistributionChart';
import { WorkerDetailModal } from '../components/WorkerDetailModal';
import {
  BarChart3,
  HeartHandshake,
  Truck,
  Users,
  Activity,
  Download,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';

type TabKey = 'overview' | 'donations' | 'pickups' | 'workers' | 'activity';

export const AdminReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Shared Date Filter state
  const [dates, setDates] = useState<{ dateFrom: string; dateTo: string }>({
    dateFrom: '',
    dateTo: '',
  });

  // Overview Widgets State
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState<boolean>(false);
  const [isDashboardError, setIsDashboardError] = useState<boolean>(false);

  const [trendData, setTrendData] = useState<DonationTrendData | null>(null);
  const [trendGroupBy, setTrendGroupBy] = useState<GroupByPeriod>('DAY');
  const [isTrendLoading, setIsTrendLoading] = useState<boolean>(false);
  const [isTrendError, setIsTrendError] = useState<boolean>(false);

  const [distributionData, setDistributionData] = useState<DonationStatusDistributionData | null>(null);
  const [isDistributionLoading, setIsDistributionLoading] = useState<boolean>(false);
  const [isDistributionError, setIsDistributionError] = useState<boolean>(false);

  const [overviewPickupData, setOverviewPickupData] = useState<PickupReportData | null>(null);
  const [isOverviewPickupLoading, setIsOverviewPickupLoading] = useState<boolean>(false);
  const [isOverviewPickupError, setIsOverviewPickupError] = useState<boolean>(false);

  // Tab 2: Donations Tab State
  const [donationReport, setDonationReport] = useState<DonationReportData | null>(null);
  const [donationStatus, setDonationStatus] = useState<string>('');
  const [donationCategory, setDonationCategory] = useState<string>('');
  const [donationPage, setDonationPage] = useState<number>(1);
  const [isDonationLoading, setIsDonationLoading] = useState<boolean>(false);
  const [isDonationError, setIsDonationError] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Tab 3: Pickups Tab State
  const [pickupReport, setPickupReport] = useState<PickupReportData | null>(null);
  const [pickupStatus, setPickupStatus] = useState<string>('');
  const [isPickupLoading, setIsPickupLoading] = useState<boolean>(false);
  const [isPickupError, setIsPickupError] = useState<boolean>(false);

  // Tab 4: Workers Tab State
  const [workerReport, setWorkerReport] = useState<WorkerReportData | null>(null);
  const [workerPage, setWorkerPage] = useState<number>(1);
  const [isWorkerLoading, setIsWorkerLoading] = useState<boolean>(false);
  const [isWorkerError, setIsWorkerError] = useState<boolean>(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  // Tab 5: Activity Tab State
  const [activityReport, setActivityReport] = useState<ActivityReportData | null>(null);
  const [activityAction] = useState<string>('');
  const [activityPage, setActivityPage] = useState<number>(1);
  const [isActivityLoading, setIsActivityLoading] = useState<boolean>(false);
  const [isActivityError, setIsActivityError] = useState<boolean>(false);

  // Data Fetchers
  const fetchAdminDashboard = useCallback(() => {
    setIsDashboardLoading(true);
    setIsDashboardError(false);
    reportingService
      .getAdminDashboard()
      .then((res: AdminDashboardData) => {
        setDashboardData(res);
        setIsDashboardLoading(false);
      })
      .catch((err: unknown) => {
        console.error('Failed to load dashboard metrics', err);
        setIsDashboardError(true);
        setIsDashboardLoading(false);
      });
  }, []);

  const fetchDonationTrend = useCallback(() => {
    setIsTrendLoading(true);
    setIsTrendError(false);
    reportingService
      .getDonationTrend({ dateFrom: dates.dateFrom, dateTo: dates.dateTo, groupBy: trendGroupBy })
      .then((res: DonationTrendData) => {
        setTrendData(res);
        setIsTrendLoading(false);
      })
      .catch((err: unknown) => {
        console.error('Failed to load trend', err);
        setIsTrendError(true);
        setIsTrendLoading(false);
      });
  }, [dates.dateFrom, dates.dateTo, trendGroupBy]);

  const fetchStatusDistribution = useCallback(() => {
    setIsDistributionLoading(true);
    setIsDistributionError(false);
    reportingService
      .getDonationStatusDistribution({ dateFrom: dates.dateFrom, dateTo: dates.dateTo })
      .then((res: DonationStatusDistributionData) => {
        setDistributionData(res);
        setIsDistributionLoading(false);
      })
      .catch((err: unknown) => {
        console.error('Failed to load status distribution', err);
        setIsDistributionError(true);
        setIsDistributionLoading(false);
      });
  }, [dates.dateFrom, dates.dateTo]);

  const fetchOverviewPickups = useCallback(() => {
    setIsOverviewPickupLoading(true);
    setIsOverviewPickupError(false);
    reportingService
      .getPickupReport({ dateFrom: dates.dateFrom, dateTo: dates.dateTo })
      .then((res: PickupReportData) => {
        setOverviewPickupData(res);
        setIsOverviewPickupLoading(false);
      })
      .catch((err: unknown) => {
        console.error('Failed to load pickup overview', err);
        setIsOverviewPickupError(true);
        setIsOverviewPickupLoading(false);
      });
  }, [dates.dateFrom, dates.dateTo]);

  const fetchDonationReport = useCallback(() => {
    setIsDonationLoading(true);
    setIsDonationError(false);
    reportingService
      .getDonationReport({
        dateFrom: dates.dateFrom,
        dateTo: dates.dateTo,
        status: donationStatus || undefined,
        category: donationCategory || undefined,
        page: donationPage,
        limit: 15,
      })
      .then((res: DonationReportData) => {
        setDonationReport(res);
        setIsDonationLoading(false);
      })
      .catch((err: unknown) => {
        console.error('Failed to load donation report', err);
        setIsDonationError(true);
        setIsDonationLoading(false);
      });
  }, [dates.dateFrom, dates.dateTo, donationStatus, donationCategory, donationPage]);

  const fetchPickupReport = useCallback(() => {
    setIsPickupLoading(true);
    setIsPickupError(false);
    reportingService
      .getPickupReport({
        dateFrom: dates.dateFrom,
        dateTo: dates.dateTo,
        status: pickupStatus || undefined,
      })
      .then((res: PickupReportData) => {
        setPickupReport(res);
        setIsPickupLoading(false);
      })
      .catch((err: unknown) => {
        console.error('Failed to load pickup report', err);
        setIsPickupError(true);
        setIsPickupLoading(false);
      });
  }, [dates.dateFrom, dates.dateTo, pickupStatus]);

  const fetchWorkerReport = useCallback(() => {
    setIsWorkerLoading(true);
    setIsWorkerError(false);
    reportingService
      .getWorkerReport({
        dateFrom: dates.dateFrom,
        dateTo: dates.dateTo,
        page: workerPage,
        limit: 15,
      })
      .then((res: WorkerReportData) => {
        setWorkerReport(res);
        setIsWorkerLoading(false);
      })
      .catch((err: unknown) => {
        console.error('Failed to load worker report', err);
        setIsWorkerError(true);
        setIsWorkerLoading(false);
      });
  }, [dates.dateFrom, dates.dateTo, workerPage]);

  const fetchActivityReport = useCallback(() => {
    setIsActivityLoading(true);
    setIsActivityError(false);
    reportingService
      .getActivityReport({
        dateFrom: dates.dateFrom,
        dateTo: dates.dateTo,
        action: activityAction || undefined,
        page: activityPage,
        limit: 20,
      })
      .then((res: ActivityReportData) => {
        setActivityReport(res);
        setIsActivityLoading(false);
      })
      .catch((err: unknown) => {
        console.error('Failed to load activity report', err);
        setIsActivityError(true);
        setIsActivityLoading(false);
      });
  }, [dates.dateFrom, dates.dateTo, activityAction, activityPage]);

  // Initial and reactive effects based on active tab
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchAdminDashboard();
      fetchDonationTrend();
      fetchStatusDistribution();
      fetchOverviewPickups();
    } else if (activeTab === 'donations') {
      fetchDonationReport();
    } else if (activeTab === 'pickups') {
      fetchPickupReport();
    } else if (activeTab === 'workers') {
      fetchWorkerReport();
    } else if (activeTab === 'activity') {
      fetchActivityReport();
    }
  }, [
    activeTab,
    fetchAdminDashboard,
    fetchDonationTrend,
    fetchStatusDistribution,
    fetchOverviewPickups,
    fetchDonationReport,
    fetchPickupReport,
    fetchWorkerReport,
    fetchActivityReport,
  ]);

  // CSV Export Handler
  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const blob = await reportingService.exportDonationsCsv({
        dateFrom: dates.dateFrom || undefined,
        dateTo: dates.dateTo || undefined,
        status: donationStatus || undefined,
        category: donationCategory || undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `donations-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV', err);
      alert('Failed to download CSV export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="reporting-page-container">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-color)', margin: '0 0 6px' }}>
          Reports & Analytics Center
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Operational metrics, donation analytics, worker performance, and system activity logs.
        </p>
      </div>

      {/* Shared Date Filter */}
      <ReportDateFilter
        dateFrom={dates.dateFrom}
        dateTo={dates.dateTo}
        onChange={(newDates) => {
          setDates(newDates);
          setDonationPage(1);
          setWorkerPage(1);
          setActivityPage(1);
        }}
        onReset={() => {
          setDates({ dateFrom: '', dateTo: '' });
          setDonationPage(1);
          setWorkerPage(1);
          setActivityPage(1);
        }}
      />

      {/* Tabs Bar */}
      <div className="reporting-tabs-bar">
        {[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'donations', label: 'Donations', icon: HeartHandshake },
          { key: 'pickups', label: 'Pickups', icon: Truck },
          { key: 'workers', label: 'Worker Analytics', icon: Users },
          { key: 'activity', label: 'Activity Feed', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as TabKey)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                border: 'none',
                background: 'none',
                fontSize: '0.925rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--foodshare-green-dark)' : 'var(--text-muted)',
                borderBottom: isActive ? '3px solid var(--foodshare-green-primary)' : '3px solid transparent',
                marginBottom: '-2px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={18} color={isActive ? 'var(--foodshare-green-primary)' : 'currentColor'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* KPI Dashboard Row */}
          {isDashboardLoading ? (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto', borderTopColor: 'var(--foodshare-green-primary)' }} />
            </div>
          ) : isDashboardError ? (
            <div className="card" style={{ padding: '20px', textAlign: 'center', backgroundColor: 'var(--bg-card)' }}>
              <AlertCircle size={28} color="var(--danger-color, #ef4444)" style={{ marginBottom: '8px' }} />
              <p style={{ margin: '0 0 12px', color: 'var(--text-color)' }}>Failed to load operational KPIs.</p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={fetchAdminDashboard}>
                <RefreshCw size={14} style={{ marginRight: '6px' }} /> Retry
              </button>
            </div>
          ) : dashboardData ? (
            <div className="reporting-kpi-grid">
              {/* Donation KPI */}
              <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)', borderLeft: '4px solid var(--foodshare-green-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Donations</span>
                  <HeartHandshake size={20} color="var(--foodshare-green-primary)" />
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-color)', marginBottom: '8px' }}>
                  {dashboardData.donations.total}
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Pending: <strong>{dashboardData.donations.pending}</strong></span>
                  <span>Completed: <strong>{dashboardData.donations.completed}</strong></span>
                </div>
              </div>

              {/* Pickups KPI */}
              <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)', borderLeft: '4px solid #3b82f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Pickups</span>
                  <Truck size={20} color="#3b82f6" />
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-color)', marginBottom: '8px' }}>
                  {dashboardData.pickups.total}
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Active: <strong>{dashboardData.pickups.inProgress}</strong></span>
                  <span>Completed: <strong>{dashboardData.pickups.completed}</strong></span>
                </div>
              </div>

              {/* Workers KPI */}
              <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)', borderLeft: '4px solid #8b5cf6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Active Workers</span>
                  <Users size={20} color="#8b5cf6" />
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-color)', marginBottom: '8px' }}>
                  {dashboardData.workers.active}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Workers Assigned: <strong>{dashboardData.workers.assigned}</strong>
                </div>
              </div>

              {/* Inventory KPI */}
              <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Available Food Qty</span>
                  <Layers size={20} color="#f59e0b" />
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-color)', marginBottom: '8px' }}>
                  {dashboardData.inventory.availableQuantity}
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Items: <strong>{dashboardData.inventory.totalItems}</strong></span>
                  <span>Reserved: <strong>{dashboardData.inventory.reservedQuantity}</strong></span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Visualization Grid */}
          <div className="reporting-chart-grid">
            <DonationTrendChart
              data={trendData?.items || []}
              groupBy={trendGroupBy}
              onGroupByChange={setTrendGroupBy}
              isLoading={isTrendLoading}
              isError={isTrendError}
              onRetry={fetchDonationTrend}
            />

            <StatusDistributionChart
              distribution={distributionData?.distribution || {}}
              total={distributionData?.total || 0}
              isLoading={isDistributionLoading}
              isError={isDistributionError}
              onRetry={fetchStatusDistribution}
            />
          </div>

          {/* Pickup Overview Section */}
          <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Truck size={20} color="var(--foodshare-green-primary)" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-color)' }}>
                Pickup Operational Summary
              </h3>
            </div>

            {isOverviewPickupLoading ? (
              <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" style={{ width: '28px', height: '28px', borderTopColor: 'var(--foodshare-green-primary)' }} />
              </div>
            ) : isOverviewPickupError ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ margin: '0 0 8px', color: 'var(--text-color)', fontSize: '0.9rem' }}>Failed to load pickup summary.</p>
                <button type="button" className="btn btn-secondary btn-sm" onClick={fetchOverviewPickups}>
                  <RefreshCw size={14} style={{ marginRight: '6px' }} /> Retry
                </button>
              </div>
            ) : overviewPickupData ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
                <div style={{ padding: '12px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Not Started</span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-color)' }}>{overviewPickupData.notStarted}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>In Progress</span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#3b82f6' }}>{overviewPickupData.inProgress}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Completed</span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#22c55e' }}>{overviewPickupData.completed}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Failed</span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ef4444' }}>{overviewPickupData.failed}</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: 'var(--bg-page)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Avg Duration</span>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-color)' }}>
                    {overviewPickupData.avgDurationMinutes != null ? `${overviewPickupData.avgDurationMinutes} mins` : 'N/A'}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* TAB 2: DONATIONS */}
      {activeTab === 'donations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Controls Header */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: 'var(--bg-card)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {/* Status Filter */}
              <select
                value={donationStatus}
                onChange={(e) => {
                  setDonationStatus(e.target.value);
                  setDonationPage(1);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-page)',
                  color: 'var(--text-color)',
                  fontSize: '0.875rem',
                }}
              >
                <option value="">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="PICKED_UP">PICKED_UP</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="EXPIRED">EXPIRED</option>
              </select>

              {/* Category Filter */}
              <select
                value={donationCategory}
                onChange={(e) => {
                  setDonationCategory(e.target.value);
                  setDonationPage(1);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-page)',
                  color: 'var(--text-color)',
                  fontSize: '0.875rem',
                }}
              >
                <option value="">All Categories</option>
                <option value="COOKED_MEALS">Cooked Meals</option>
                <option value="PACKAGED_FOOD">Packaged Food</option>
                <option value="FRESH_PRODUCE">Fresh Produce</option>
                <option value="BAKERY">Bakery</option>
                <option value="BEVERAGES">Beverages</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* CSV Export Button */}
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="btn btn-primary btn-sm"
              style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Download size={16} />
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          </div>

          {/* Table Container */}
          <div className="card" style={{ padding: 0, backgroundColor: 'var(--bg-card)', overflow: 'hidden' }}>
            {isDonationLoading ? (
              <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" style={{ width: '32px', height: '32px', borderTopColor: 'var(--foodshare-green-primary)' }} />
              </div>
            ) : isDonationError ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <AlertCircle size={36} color="var(--danger-color, #ef4444)" style={{ marginBottom: '12px' }} />
                <p style={{ margin: '0 0 16px', color: 'var(--text-color)' }}>Failed to load donation report.</p>
                <button type="button" className="btn btn-secondary btn-sm" onClick={fetchDonationReport}>
                  <RefreshCw size={14} style={{ marginRight: '6px' }} /> Retry
                </button>
              </div>
            ) : donationReport && donationReport.items.length > 0 ? (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-page)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '12px 16px' }}>Donor</th>
                        <th style={{ padding: '12px 16px' }}>Category</th>
                        <th style={{ padding: '12px 16px' }}>Description</th>
                        <th style={{ padding: '12px 16px' }}>Quantity</th>
                        <th style={{ padding: '12px 16px' }}>Status</th>
                        <th style={{ padding: '12px 16px' }}>Created Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {donationReport.items.map((item: DonationReportItem) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600 }}>{item.donorName}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{item.category}</td>
                          <td style={{ padding: '12px 16px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.description}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                            {item.quantity} {item.quantityUnit}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                backgroundColor: 'var(--bg-page)',
                                border: '1px solid var(--border-color)',
                              }}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div
                  style={{
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border-color)',
                  }}
                >
                  <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    Showing Page <strong>{donationReport.page}</strong> of <strong>{donationReport.totalPages}</strong> (Total: {donationReport.total})
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      disabled={donationPage <= 1}
                      onClick={() => setDonationPage((p) => Math.max(p - 1, 1))}
                      className="btn btn-secondary btn-sm"
                    >
                      <ChevronLeft size={16} /> Prev
                    </button>
                    <button
                      type="button"
                      disabled={donationPage >= donationReport.totalPages}
                      onClick={() => setDonationPage((p) => Math.min(p + 1, donationReport.totalPages))}
                      className="btn btn-secondary btn-sm"
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No donations match the specified criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PICKUPS */}
      {activeTab === 'pickups' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Status Filter */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Filter Status:</span>
            <select
              value={pickupStatus}
              onChange={(e) => setPickupStatus(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-page)',
                color: 'var(--text-color)',
                fontSize: '0.875rem',
              }}
            >
              <option value="">All Statuses</option>
              <option value="NOT_STARTED">NOT_STARTED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="FAILED">FAILED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          {/* Metrics Summary */}
          {isPickupLoading ? (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" style={{ width: '32px', height: '32px', borderTopColor: 'var(--foodshare-green-primary)' }} />
            </div>
          ) : isPickupError ? (
            <div className="card" style={{ padding: '30px', textAlign: 'center' }}>
              <AlertCircle size={36} color="var(--danger-color, #ef4444)" style={{ marginBottom: '12px' }} />
              <p style={{ margin: '0 0 16px', color: 'var(--text-color)' }}>Failed to load pickup metrics.</p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={fetchPickupReport}>
                <RefreshCw size={14} style={{ marginRight: '6px' }} /> Retry
              </button>
            </div>
          ) : pickupReport ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)' }}>
                <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Total Pickups</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-color)', marginTop: '4px' }}>
                  {pickupReport.total}
                </div>
              </div>
              <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)' }}>
                <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>In Progress</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>
                  {pickupReport.inProgress}
                </div>
              </div>
              <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)' }}>
                <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Completed</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#22c55e', marginTop: '4px' }}>
                  {pickupReport.completed}
                </div>
              </div>
              <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)' }}>
                <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Failed</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
                  {pickupReport.failed}
                </div>
              </div>
              <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-card)' }}>
                <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Avg Duration</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-color)', marginTop: '4px' }}>
                  {pickupReport.avgDurationMinutes != null ? `${pickupReport.avgDurationMinutes} mins` : 'N/A'}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 4: WORKER ANALYTICS */}
      {activeTab === 'workers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: 0, backgroundColor: 'var(--bg-card)', overflow: 'hidden' }}>
            {isWorkerLoading ? (
              <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" style={{ width: '32px', height: '32px', borderTopColor: 'var(--foodshare-green-primary)' }} />
              </div>
            ) : isWorkerError ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <AlertCircle size={36} color="var(--danger-color, #ef4444)" style={{ marginBottom: '12px' }} />
                <p style={{ margin: '0 0 16px', color: 'var(--text-color)' }}>Failed to load worker performance report.</p>
                <button type="button" className="btn btn-secondary btn-sm" onClick={fetchWorkerReport}>
                  <RefreshCw size={14} style={{ marginRight: '6px' }} /> Retry
                </button>
              </div>
            ) : workerReport && workerReport.items.length > 0 ? (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-page)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '12px 16px' }}>Worker Name</th>
                        <th style={{ padding: '12px 16px' }}>Email</th>
                        <th style={{ padding: '12px 16px' }}>Assigned</th>
                        <th style={{ padding: '12px 16px' }}>Completed</th>
                        <th style={{ padding: '12px 16px' }}>Failed</th>
                        <th style={{ padding: '12px 16px' }}>Success Rate</th>
                        <th style={{ padding: '12px 16px' }}>Avg Time</th>
                        <th style={{ padding: '12px 16px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workerReport.items.map((worker: WorkerPerformanceItem) => (
                        <tr key={worker.workerId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                            {worker.firstName} {worker.lastName}
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{worker.email}</td>
                          <td style={{ padding: '12px 16px' }}>{worker.assignedCount}</td>
                          <td style={{ padding: '12px 16px', color: '#166534', fontWeight: 700 }}>{worker.completedCount}</td>
                          <td style={{ padding: '12px 16px', color: '#991b1b' }}>{worker.failedCount}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--foodshare-green-dark)' }}>
                            {worker.successRate}%
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                            {worker.avgCompletionTimeMinutes != null ? `${worker.avgCompletionTimeMinutes}m` : 'N/A'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <button
                              type="button"
                              onClick={() => setSelectedWorkerId(worker.workerId)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div
                  style={{
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border-color)',
                  }}
                >
                  <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    Page <strong>{workerReport.page}</strong> of <strong>{workerReport.totalPages}</strong>
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      disabled={workerPage <= 1}
                      onClick={() => setWorkerPage((p) => Math.max(p - 1, 1))}
                      className="btn btn-secondary btn-sm"
                    >
                      <ChevronLeft size={16} /> Prev
                    </button>
                    <button
                      type="button"
                      disabled={workerPage >= workerReport.totalPages}
                      onClick={() => setWorkerPage((p) => Math.min(p + 1, workerReport.totalPages))}
                      className="btn btn-secondary btn-sm"
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No worker performance records found.
              </div>
            )}
          </div>

          {/* Worker Detail Modal */}
          {selectedWorkerId && (
            <WorkerDetailModal
              workerId={selectedWorkerId}
              dateFrom={dates.dateFrom}
              dateTo={dates.dateTo}
              onClose={() => setSelectedWorkerId(null)}
            />
          )}
        </div>
      )}

      {/* TAB 5: ACTIVITY */}
      {activeTab === 'activity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: 0, backgroundColor: 'var(--bg-card)', overflow: 'hidden' }}>
            {isActivityLoading ? (
              <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" style={{ width: '32px', height: '32px', borderTopColor: 'var(--foodshare-green-primary)' }} />
              </div>
            ) : isActivityError ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <AlertCircle size={36} color="var(--danger-color, #ef4444)" style={{ marginBottom: '12px' }} />
                <p style={{ margin: '0 0 16px', color: 'var(--text-color)' }}>Failed to load activity feed.</p>
                <button type="button" className="btn btn-secondary btn-sm" onClick={fetchActivityReport}>
                  <RefreshCw size={14} style={{ marginRight: '6px' }} /> Retry
                </button>
              </div>
            ) : activityReport && activityReport.items.length > 0 ? (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-page)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '12px 16px' }}>User</th>
                        <th style={{ padding: '12px 16px' }}>Action</th>
                        <th style={{ padding: '12px 16px' }}>Entity</th>
                        <th style={{ padding: '12px 16px' }}>Entity ID</th>
                        <th style={{ padding: '12px 16px' }}>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityReport.items.map((log: ActivityLogItem) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px 16px' }}>
                            {log.user ? (
                              <div>
                                <div style={{ fontWeight: 600 }}>{log.user.firstName} {log.user.lastName}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.user.role}</div>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>System</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--foodshare-green-dark)' }}>
                            {log.action}
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{log.entityType}</td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {log.entityId || 'N/A'}
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div
                  style={{
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border-color)',
                  }}
                >
                  <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    Page <strong>{activityReport.page}</strong> of <strong>{activityReport.totalPages}</strong>
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      disabled={activityPage <= 1}
                      onClick={() => setActivityPage((p) => Math.max(p - 1, 1))}
                      className="btn btn-secondary btn-sm"
                    >
                      <ChevronLeft size={16} /> Prev
                    </button>
                    <button
                      type="button"
                      disabled={activityPage >= activityReport.totalPages}
                      onClick={() => setActivityPage((p) => Math.min(p + 1, activityReport.totalPages))}
                      className="btn btn-secondary btn-sm"
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No activity logs found for the selected filter.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
