import React, { useState, useEffect, useCallback } from 'react';
import {
  assignmentService,
  DonationCandidate,
  Assignment,
  Pagination,
} from '../../../services/assignment.service';
import { adminWorkerService, WorkerUserResponse } from '../../../services/admin-worker.service';
import {
  UserCheck,
  History,
  RefreshCw,
  AlertCircle,
  Calendar,
  MapPin,
  Package,
  Phone,
  CheckCircle2,
  X,
  Users,
  Eye,
  ChevronLeft,
  ChevronRight,
  Check,
  Copy,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Worker selector load states
type WorkerLoadState = 'idle' | 'loading' | 'loaded' | 'error';
type ActiveTab = 'queue' | 'assigned';
type AssignmentStatusFilter = 'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

// Helpers
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function truncateId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

export const AdminAssignmentQueuePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('queue');

  // ── Pending Queue State ───────────────────────────────────────────────────
  const [queueItems, setQueueItems] = useState<DonationCandidate[]>([]);
  const [isQueueLoading, setIsQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);

  // ── Assigned Tasks / Tracking State ───────────────────────────────────────
  const [assignedTasks, setAssignedTasks] = useState<Assignment[]>([]);
  const [assignedPagination, setAssignedPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [isAssignedLoading, setIsAssignedLoading] = useState(false);
  const [assignedError, setAssignedError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AssignmentStatusFilter>('ALL');
  const [assignedPage, setAssignedPage] = useState(1);

  // ── Shared Alerts ─────────────────────────────────────────────────────────
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copyFeedbackId, setCopyFeedbackId] = useState<string | null>(null);

  // ── Assign Modal State ────────────────────────────────────────────────────
  const [selectedDonation, setSelectedDonation] = useState<DonationCandidate | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // ── Worker Selector State ─────────────────────────────────────────────────
  const [activeWorkers, setActiveWorkers] = useState<WorkerUserResponse[]>([]);
  const [workerLoadState, setWorkerLoadState] = useState<WorkerLoadState>('idle');
  const [workerTotal, setWorkerTotal] = useState(0);

  // ── Detail & History Modal State ──────────────────────────────────────────
  const [viewDetailAssignment, setViewDetailAssignment] = useState<Assignment | null>(null);
  const [historyDonation, setHistoryDonation] = useState<DonationCandidate | null>(null);
  const [assignmentHistory, setAssignmentHistory] = useState<Assignment[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // ── Copy to clipboard ─────────────────────────────────────────────────────
  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopyFeedbackId(id);
      setTimeout(() => setCopyFeedbackId(null), 2000);
    } catch {
      // Clipboard unavailable
    }
  };

  // ── Fetch Pending Queue ───────────────────────────────────────────────────
  const fetchQueue = useCallback(async () => {
    setIsQueueLoading(true);
    setQueueError(null);
    try {
      const result = await assignmentService.getAssignmentQueue();
      setQueueItems(result.items);
    } catch (err: any) {
      setQueueError(err.message || 'Failed to fetch donation assignment queue.');
    } finally {
      setIsQueueLoading(false);
    }
  }, []);

  // ── Fetch Assigned Tasks ──────────────────────────────────────────────────
  const fetchAssignedTasks = useCallback(async () => {
    setIsAssignedLoading(true);
    setAssignedError(null);
    try {
      const result = await assignmentService.getAdminAssignments(
        assignedPage,
        20,
        statusFilter === 'ALL' ? undefined : statusFilter
      );
      setAssignedTasks(result.items);
      setAssignedPagination(result.pagination);
    } catch (err: any) {
      setAssignedError(err.message || 'Failed to fetch assigned tasks.');
    } finally {
      setIsAssignedLoading(false);
    }
  }, [assignedPage, statusFilter]);

  // Initial load
  useEffect(() => {
    fetchQueue();
    fetchAssignedTasks();
  }, [fetchQueue, fetchAssignedTasks]);

  // ── Fetch Active Workers for Selector ─────────────────────────────────────
  const fetchActiveWorkers = useCallback(async () => {
    setWorkerLoadState('loading');
    try {
      const result = await adminWorkerService.listWorkers(1, 100, 'ACTIVE');
      setActiveWorkers(result.items);
      setWorkerTotal(result.pagination.total);
      setWorkerLoadState('loaded');
    } catch {
      setWorkerLoadState('error');
    }
  }, []);

  // ── Assign Modal Handlers ─────────────────────────────────────────────────
  const handleOpenAssignModal = (donation: DonationCandidate) => {
    setSelectedDonation(donation);
    setSelectedWorkerId('');
    setAssignError(null);
    fetchActiveWorkers();
  };

  const handleCloseAssignModal = () => {
    setSelectedDonation(null);
    setSelectedWorkerId('');
    setAssignError(null);
    setWorkerLoadState('idle');
    setActiveWorkers([]);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDonation || !selectedWorkerId) {
      setAssignError('Please select a worker to assign.');
      return;
    }

    setIsAssigning(true);
    setAssignError(null);

    try {
      await assignmentService.assignWorker(selectedDonation.id, selectedWorkerId);
      const selectedWorkerObj = activeWorkers.find((w) => w.id === selectedWorkerId);
      const workerName = selectedWorkerObj
        ? `${selectedWorkerObj.firstName} ${selectedWorkerObj.lastName}`
        : 'worker';
      setSuccessMessage(
        `Donation "${selectedDonation.category}" successfully assigned to ${workerName}.`
      );
      handleCloseAssignModal();
      fetchQueue();
      fetchAssignedTasks();
    } catch (err: any) {
      if (err.code === 'ASSIGNMENT_WORKER_NOT_FOUND') {
        setAssignError('The selected worker account was not found.');
      } else if (err.code === 'ASSIGNMENT_WORKER_INACTIVE') {
        setAssignError('The selected worker account is inactive. Please choose another.');
      } else if (err.code === 'ASSIGNMENT_INVALID_WORKER_ROLE') {
        setAssignError('The selected user does not have the WORKER role.');
      } else if (err.statusCode === 409) {
        setAssignError(
          err.message || 'This donation already has an active assignment. Refresh and try again.'
        );
      } else {
        setAssignError(err.message || 'Failed to assign worker. Please try again.');
      }
    } finally {
      setIsAssigning(false);
    }
  };

  // ── History & Detail Modal Handlers ───────────────────────────────────────
  const handleOpenHistoryModal = async (donation: DonationCandidate) => {
    setHistoryDonation(donation);
    setIsLoadingHistory(true);
    try {
      const history = await assignmentService.getAssignmentHistory(donation.id);
      setAssignmentHistory(history);
    } catch (err: any) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleOpenDetailModal = async (assignment: Assignment) => {
    setViewDetailAssignment(assignment);
    setIsLoadingHistory(true);
    try {
      const history = await assignmentService.getAssignmentHistory(assignment.donationId);
      setAssignmentHistory(history);
    } catch (err: any) {
      console.error('Failed to load assignment detail history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFilterChange = (filter: AssignmentStatusFilter) => {
    setStatusFilter(filter);
    setAssignedPage(1);
  };

  // ── Selected worker preview helper ────────────────────────────────────────
  const selectedWorkerObj = activeWorkers.find((w) => w.id === selectedWorkerId) ?? null;

  // ── Escape Key Handler ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedDonation) handleCloseAssignModal();
        if (historyDonation) setHistoryDonation(null);
        if (viewDetailAssignment) setViewDetailAssignment(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedDonation, historyDonation, viewDetailAssignment]);

  // ── Status Badges Helper ──────────────────────────────────────────────────
  const renderAssignmentStatusBadge = (status: Assignment['status']) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <span className="status-badge approved" title="Worker accepted assignment">
            Accepted — Awaiting Pickup
          </span>
        );
      case 'PENDING':
        return (
          <span className="status-badge pending" title="Awaiting worker response">
            Pending Acceptance
          </span>
        );
      case 'REJECTED':
        return (
          <span className="status-badge rejected" title="Worker rejected assignment">
            Rejected
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="status-badge cancelled" title="Assignment cancelled">
            Cancelled
          </span>
        );
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const renderDonationStatusBadge = (status: string) => {
    const lower = status.toLowerCase();
    if (status === 'APPROVED') return <span className="status-badge approved">Approved</span>;
    if (status === 'ASSIGNED') return <span className="status-badge assigned">Assigned</span>;
    if (status === 'ACCEPTED') return <span className="status-badge accepted">Accepted</span>;
    if (status === 'REJECTED') return <span className="status-badge rejected">Rejected</span>;
    if (status === 'CANCELLED') return <span className="status-badge cancelled">Cancelled</span>;
    return <span className={`status-badge ${lower}`}>{status}</span>;
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Worker Assignment & Tracking
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Assign food donations to active workers and track real-time assignment status.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (activeTab === 'queue') fetchQueue();
              else fetchAssignedTasks();
            }}
            disabled={isQueueLoading || isAssignedLoading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={16} className={isQueueLoading || isAssignedLoading ? 'spinner' : ''} />
            <span>Refresh</span>
          </button>
          <Link
            to="/admin/workers"
            className="btn btn-primary"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <UserCheck size={16} />
            <span>Manage Workers</span>
          </Link>
        </div>
      </div>

      {/* Success notification */}
      {successMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={20} color="#16a34a" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#166534',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              lineHeight: 1,
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Primary View Switcher Tabs */}
      <div className="view-switcher-tabs" role="tablist" aria-label="Assignment Views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'queue'}
          className={`view-switcher-tab ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          <Package size={16} />
          <span>Pending Assignment</span>
          <span className="view-switcher-tab-count">{queueItems.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'assigned'}
          className={`view-switcher-tab ${activeTab === 'assigned' ? 'active' : ''}`}
          onClick={() => setActiveTab('assigned')}
        >
          <Users size={16} />
          <span>Assigned Tasks / Tracking</span>
          <span className="view-switcher-tab-count">{assignedPagination.total}</span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: PENDING ASSIGNMENT QUEUE                                            */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'queue' && (
        <>
          {queueError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                marginBottom: '20px',
              }}
            >
              <AlertCircle size={20} />
              <span>{queueError}</span>
            </div>
          )}

          {isQueueLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <div
                className="spinner"
                style={{ width: '40px', height: '40px', borderTopColor: 'var(--foodshare-green-dark)' }}
              />
            </div>
          ) : queueItems.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <Package size={48} color="var(--text-light)" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                No Donations Awaiting Assignment
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                All approved donations currently have active worker assignments or none are available.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '20px',
              }}
            >
              {queueItems.map((item) => (
                <div
                  key={item.id}
                  className="card"
                  style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '12px',
                      }}
                    >
                      <div>
                        <span
                          className="status-badge approved"
                          style={{ fontSize: '0.75rem', marginBottom: '6px', display: 'inline-block' }}
                        >
                          {item.status}
                        </span>
                        <h3
                          style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}
                        >
                          {item.category}
                        </h3>
                      </div>
                      <span
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 800,
                          color: 'var(--foodshare-green-dark)',
                          backgroundColor: 'var(--foodshare-green-soft)',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        {item.quantity} {item.quantityUnit}
                      </span>
                    </div>

                    <p
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-muted)',
                        margin: '0 0 16px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.description}
                    </p>

                    <div
                      style={{
                        fontSize: '0.825rem',
                        color: 'var(--text-main)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} color="var(--foodshare-green-primary)" />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.pickupAddress}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} color="var(--text-muted)" />
                        <span>Expires: {new Date(item.expiresAt).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={14} color="var(--text-muted)" />
                        <span>
                          Contact: {item.contactName} ({item.contactPhone})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '10px',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--border-color)',
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1, fontSize: '0.85rem', padding: '8px 12px' }}
                      onClick={() => handleOpenHistoryModal(item)}
                    >
                      <History size={14} style={{ marginRight: '4px' }} /> History
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1.5, fontSize: '0.85rem', padding: '8px 12px' }}
                      onClick={() => handleOpenAssignModal(item)}
                    >
                      <UserCheck size={14} style={{ marginRight: '4px' }} /> Assign Worker
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: ASSIGNED TASKS / TRACKING                                           */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'assigned' && (
        <>
          {/* Status filter bar */}
          <div className="filter-bar" style={{ marginBottom: '16px' }}>
            <span className="filter-label">Filter by Status:</span>
            <div className="filter-chips">
              {(['ALL', 'PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'] as AssignmentStatusFilter[]).map(
                (filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={`filter-chip ${statusFilter === filter ? 'active' : ''}`}
                    onClick={() => handleFilterChange(filter)}
                  >
                    {filter === 'ALL'
                      ? 'All'
                      : filter === 'PENDING'
                      ? 'Pending Acceptance'
                      : filter === 'ACCEPTED'
                      ? 'Accepted'
                      : filter === 'REJECTED'
                      ? 'Rejected'
                      : 'Cancelled'}
                  </button>
                )
              )}
            </div>
          </div>

          {assignedError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                marginBottom: '20px',
              }}
            >
              <AlertCircle size={20} />
              <span>{assignedError}</span>
            </div>
          )}

          {isAssignedLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <div
                className="spinner"
                style={{ width: '40px', height: '40px', borderTopColor: 'var(--foodshare-green-dark)' }}
              />
            </div>
          ) : assignedTasks.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <Users size={48} color="var(--text-light)" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                No Assigned Tasks Found
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                {statusFilter === 'ALL'
                  ? 'No donations have been assigned to workers yet.'
                  : `No assignments currently match the "${statusFilter}" filter.`}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Donation</th>
                      <th>Assigned Worker</th>
                      <th>Assignment Status</th>
                      <th>Donation Status</th>
                      <th>Assigned At</th>
                      <th>Responded At</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedTasks.map((assignment) => (
                      <tr key={assignment.id}>
                        <td>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                              {assignment.donation?.category || 'Donation'}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              {assignment.donation?.quantity} {assignment.donation?.quantityUnit}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="worker-avatar">
                              {assignment.worker
                                ? `${assignment.worker.firstName.charAt(0)}${assignment.worker.lastName.charAt(0)}`
                                : 'W'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                {assignment.worker
                                  ? `${assignment.worker.firstName} ${assignment.worker.lastName}`
                                  : truncateId(assignment.workerId)}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {assignment.worker?.email || '—'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{renderAssignmentStatusBadge(assignment.status)}</td>
                        <td>
                          {assignment.donation
                            ? renderDonationStatusBadge(assignment.donation.status)
                            : '—'}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {formatDate(assignment.assignedAt)}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {assignment.respondedAt ? (
                            formatDate(assignment.respondedAt)
                          ) : (
                            <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>
                              Awaiting response
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                            onClick={() => handleOpenDetailModal(assignment)}
                          >
                            <Eye size={13} />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="worker-mobile-cards">
                {assignedTasks.map((assignment) => (
                  <div key={assignment.id} className="worker-card-mobile">
                    <div className="worker-card-mobile-header">
                      <div className="worker-avatar">
                        {assignment.worker
                          ? `${assignment.worker.firstName.charAt(0)}${assignment.worker.lastName.charAt(0)}`
                          : 'W'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="worker-card-mobile-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {assignment.donation?.category || 'Donation'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          Worker:{' '}
                          {assignment.worker
                            ? `${assignment.worker.firstName} ${assignment.worker.lastName}`
                            : truncateId(assignment.workerId)}
                        </div>
                      </div>
                      {renderAssignmentStatusBadge(assignment.status)}
                    </div>

                    <div className="worker-card-mobile-row">
                      <span className="worker-card-mobile-label">Donation Status</span>
                      <span className="worker-card-mobile-value">
                        {assignment.donation
                          ? renderDonationStatusBadge(assignment.donation.status)
                          : '—'}
                      </span>
                    </div>

                    <div className="worker-card-mobile-row">
                      <span className="worker-card-mobile-label">Worker Email</span>
                      <span className="worker-card-mobile-value">
                        {assignment.worker?.email || '—'}
                      </span>
                    </div>

                    <div className="worker-card-mobile-row">
                      <span className="worker-card-mobile-label">Assigned At</span>
                      <span className="worker-card-mobile-value">
                        {formatDate(assignment.assignedAt)}
                      </span>
                    </div>

                    <div className="worker-card-mobile-row">
                      <span className="worker-card-mobile-label">Responded At</span>
                      <span className="worker-card-mobile-value">
                        {assignment.respondedAt ? (
                          formatDate(assignment.respondedAt)
                        ) : (
                          <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>
                            Awaiting response
                          </span>
                        )}
                      </span>
                    </div>

                    <div style={{ marginTop: 6, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ width: '100%', fontSize: '0.85rem', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        onClick={() => handleOpenDetailModal(assignment)}
                      >
                        <Eye size={14} />
                        <span>View Details & History</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {assignedPagination.totalPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '20px',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Page {assignedPagination.page} of {assignedPagination.totalPages} ({assignedPagination.total} total)
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={assignedPagination.page <= 1}
                      onClick={() => setAssignedPage((p) => Math.max(1, p - 1))}
                      style={{ fontSize: '0.82rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <ChevronLeft size={14} /> Previous
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={assignedPagination.page >= assignedPagination.totalPages}
                      onClick={() => setAssignedPage((p) => p + 1)}
                      style={{ fontSize: '0.82rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Assign Worker Modal ─────────────────────────────────────────────── */}
      {selectedDonation && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.48)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '480px', padding: '24px', position: 'relative' }}
          >
            {/* Modal header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '6px',
              }}
            >
              <h3 id="assign-modal-title" style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                Assign Worker
              </h3>
              <button
                type="button"
                onClick={handleCloseAssignModal}
                disabled={isAssigning}
                aria-label="Close modal"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '2px',
                  lineHeight: 1,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Assign an active worker to this approved donation.
            </p>

            {/* Donation summary */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-page)',
                border: '1px solid var(--border-color)',
                marginBottom: '20px',
                fontSize: '0.875rem',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                {selectedDonation.category}
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                {selectedDonation.quantity} {selectedDonation.quantityUnit}
                {selectedDonation.donor && (
                  <span>
                    {' '}· Donor: {selectedDonation.donor.firstName} {selectedDonation.donor.lastName}
                  </span>
                )}
              </div>
            </div>

            {/* Assign error */}
            {assignError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: '0.85rem',
                  marginBottom: '16px',
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{assignError}</span>
              </div>
            )}

            <form onSubmit={handleAssignSubmit}>
              {/* Worker selector */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="worker-select"
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: '6px',
                  }}
                >
                  Select Worker <span style={{ color: '#dc2626' }}>*</span>
                </label>

                {/* Loading workers */}
                {workerLoadState === 'loading' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '11px 14px',
                      background: 'var(--bg-page)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <RefreshCw size={15} className="spinner" />
                    Loading workers…
                  </div>
                )}

                {/* Worker load error */}
                {workerLoadState === 'error' && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#991b1b',
                        fontSize: '0.85rem',
                        marginBottom: 8,
                      }}
                    >
                      <AlertCircle size={15} style={{ flexShrink: 0 }} />
                      <span>Unable to load workers.</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={fetchActiveWorkers}
                      style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <RefreshCw size={13} />
                      Retry
                    </button>
                  </div>
                )}

                {/* Loaded — show select */}
                {workerLoadState === 'loaded' && activeWorkers.length === 0 && (
                  <div
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--foodshare-green-soft)',
                      border: '1px solid var(--foodshare-green-border)',
                      fontSize: '0.875rem',
                      color: 'var(--text-muted)',
                      textAlign: 'center',
                    }}
                  >
                    <Users size={20} color="var(--foodshare-green-primary)" style={{ marginBottom: 6 }} />
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                      No active workers available
                    </div>
                    <div style={{ fontSize: '0.82rem', marginBottom: 10 }}>
                      Provision at least one active worker before assigning.
                    </div>
                    <Link
                      to="/admin/workers"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.82rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <UserCheck size={13} />
                      Manage Workers
                    </Link>
                  </div>
                )}

                {workerLoadState === 'loaded' && activeWorkers.length > 0 && (
                  <>
                    <select
                      id="worker-select"
                      className="input-field"
                      value={selectedWorkerId}
                      onChange={(e) => setSelectedWorkerId(e.target.value)}
                      disabled={isAssigning}
                      aria-describedby={
                        workerTotal > activeWorkers.length ? 'worker-limit-notice' : undefined
                      }
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="">Select an active worker…</option>
                      {activeWorkers.map((worker) => (
                        <option key={worker.id} value={worker.id}>
                          {worker.firstName} {worker.lastName} — {worker.email}
                        </option>
                      ))}
                    </select>

                    {/* Scale limitation notice */}
                    {workerTotal > activeWorkers.length && (
                      <p
                        id="worker-limit-notice"
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          marginTop: 5,
                        }}
                      >
                        Showing {activeWorkers.length} of {workerTotal} active workers. Visit{' '}
                        <Link to="/admin/workers" style={{ color: 'var(--foodshare-green-primary)' }}>
                          Worker Management
                        </Link>{' '}
                        to see all.
                      </p>
                    )}

                    {/* Selected worker preview */}
                    {selectedWorkerObj && (
                      <div className="worker-selector-preview">
                        <div className="worker-avatar" style={{ flexShrink: 0 }}>
                          {selectedWorkerObj.firstName.charAt(0)}
                          {selectedWorkerObj.lastName.charAt(0)}
                        </div>
                        <div className="worker-selector-preview-info">
                          <span className="worker-selector-preview-name">
                            {selectedWorkerObj.firstName} {selectedWorkerObj.lastName}
                          </span>
                          <span className="worker-selector-preview-email">
                            {selectedWorkerObj.email}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseAssignModal}
                  disabled={isAssigning}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    isAssigning ||
                    !selectedWorkerId ||
                    workerLoadState !== 'loaded' ||
                    activeWorkers.length === 0
                  }
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}
                >
                  {isAssigning ? (
                    <>
                      <RefreshCw size={15} className="spinner" />
                      Assigning…
                    </>
                  ) : (
                    <>
                      <UserCheck size={15} />
                      Assign Worker
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Detail & History Modal ─────────────────────────────────────────── */}
      {viewDetailAssignment && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.48)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '680px',
              padding: '24px',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px',
              }}
            >
              <div>
                <h3 id="detail-modal-title" style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                  Assignment Details & History
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Assignment ID: {truncateId(viewDetailAssignment.id)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewDetailAssignment(null)}
                aria-label="Close modal"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '2px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Current Assignment Status Overview */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                marginBottom: '20px',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-page)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Assignment Status
                </div>
                <div style={{ marginTop: 4 }}>
                  {renderAssignmentStatusBadge(viewDetailAssignment.status)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Donation Status
                </div>
                <div style={{ marginTop: 4 }}>
                  {viewDetailAssignment.donation
                    ? renderDonationStatusBadge(viewDetailAssignment.donation.status)
                    : '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Assigned At
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: 4 }}>
                  {formatDate(viewDetailAssignment.assignedAt)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Responded At
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: 4 }}>
                  {viewDetailAssignment.respondedAt
                    ? formatDate(viewDetailAssignment.respondedAt)
                    : 'Awaiting response'}
                </div>
              </div>
            </div>

            {/* Rejection reason alert if applicable */}
            {viewDetailAssignment.rejectionReason && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: '0.875rem',
                  marginBottom: '20px',
                }}
              >
                <strong>Worker Rejection Reason:</strong> "{viewDetailAssignment.rejectionReason}"
              </div>
            )}

            {/* Assigned Worker Info Card */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--text-main)' }}>
                Assigned Worker Details
              </h4>
              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div className="worker-avatar" style={{ width: 44, height: 44, fontSize: '1rem' }}>
                  {viewDetailAssignment.worker
                    ? `${viewDetailAssignment.worker.firstName.charAt(0)}${viewDetailAssignment.worker.lastName.charAt(0)}`
                    : 'W'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                    {viewDetailAssignment.worker
                      ? `${viewDetailAssignment.worker.firstName} ${viewDetailAssignment.worker.lastName}`
                      : 'Worker Account'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Email: {viewDetailAssignment.worker?.email || '—'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Phone: {viewDetailAssignment.worker?.phone || '—'}
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={() => handleCopyId(viewDetailAssignment.workerId)}
                    title="Copy Worker UUID"
                    style={{ fontSize: '0.78rem' }}
                  >
                    {copyFeedbackId === viewDetailAssignment.workerId ? (
                      <>
                        <Check size={12} color="#16a34a" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> Copy ID
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Donation Details Card */}
            {viewDetailAssignment.donation && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--text-main)' }}>
                  Donation Information
                </h4>
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '0.875rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {viewDetailAssignment.donation.category}
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--foodshare-green-dark)' }}>
                      {viewDetailAssignment.donation.quantity} {viewDetailAssignment.donation.quantityUnit}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    {viewDetailAssignment.donation.description}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-main)' }}>
                    <MapPin size={14} color="var(--foodshare-green-primary)" />
                    <span>{viewDetailAssignment.donation.pickupAddress}</span>
                  </div>
                  {viewDetailAssignment.donation.contactName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                      <Phone size={14} />
                      <span>
                        Contact: {viewDetailAssignment.donation.contactName} ({viewDetailAssignment.donation.contactPhone})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Historical Assignment Timeline */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--text-main)' }}>
                Donation Assignment History
              </h4>
              {isLoadingHistory ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto', width: '24px', height: '24px' }} />
                </div>
              ) : assignmentHistory.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  No historical assignment records available.
                </p>
              ) : (
                <div className="assignment-timeline">
                  {assignmentHistory.map((h) => (
                    <div key={h.id} className="assignment-timeline-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        {renderAssignmentStatusBadge(h.status)}
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {formatDate(h.assignedAt)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem' }}>
                        <strong>Assigned Worker:</strong>{' '}
                        {h.worker
                          ? `${h.worker.firstName} ${h.worker.lastName} (${h.worker.email})`
                          : h.workerId}
                      </div>
                      {h.respondedAt && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 3 }}>
                          Responded At: {formatDate(h.respondedAt)}
                        </div>
                      )}
                      {h.rejectionReason && (
                        <div style={{ fontSize: '0.82rem', color: '#991b1b', marginTop: 6, fontStyle: 'italic' }}>
                          Rejection Reason: "{h.rejectionReason}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewDetailAssignment(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Standalone History Modal for Queue Items ───────────────────────── */}
      {historyDonation && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Assignment History"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.48)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '600px',
              padding: '24px',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 12px' }}>
              Assignment History — {historyDonation.category}
            </h3>

            {isLoadingHistory ? (
              <div style={{ padding: '30px', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto', width: '30px', height: '30px' }} />
              </div>
            ) : assignmentHistory.length === 0 ? (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                No historical assignment attempts found for this donation.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {assignmentHistory.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-page)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      {renderAssignmentStatusBadge(h.status)}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Assigned: {formatDate(h.assignedAt)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem' }}>
                      <strong>Worker:</strong>{' '}
                      {h.worker
                        ? `${h.worker.firstName} ${h.worker.lastName}`
                        : h.workerId}
                    </div>
                    {h.rejectionReason && (
                      <div
                        style={{
                          fontSize: '0.85rem',
                          color: '#991b1b',
                          marginTop: '6px',
                          fontStyle: 'italic',
                        }}
                      >
                        Rejection Reason: "{h.rejectionReason}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setHistoryDonation(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
