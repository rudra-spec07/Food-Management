import React, { useState, useEffect, useCallback } from 'react';
import {
  adminWorkerService,
  WorkerUserResponse,
  WorkerListPagination,
} from '../../../services/admin-worker.service';
import {
  UserPlus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
  X,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertTriangle,
} from 'lucide-react';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

// ── Helpers ─────────────────────────────────────────────────────────────────

const getInitials = (firstName: string, lastName: string) =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

const truncateId = (id: string) =>
  id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

// ── Main Page ────────────────────────────────────────────────────────────────

export const AdminWorkerProvisioningPage: React.FC = () => {
  // ── Create form state ──────────────────────────────────────────────────────
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<WorkerUserResponse | null>(null);

  // ── Worker list state ──────────────────────────────────────────────────────
  const [workers, setWorkers] = useState<WorkerUserResponse[]>([]);
  const [pagination, setPagination] = useState<WorkerListPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [isListLoading, setIsListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [copyFeedbackId, setCopyFeedbackId] = useState<string | null>(null);

  // ── Fetch workers ─────────────────────────────────────────────────────────

  const fetchWorkers = useCallback(async () => {
    setIsListLoading(true);
    setListError(null);
    try {
      const result = await adminWorkerService.listWorkers(
        currentPage,
        20,
        statusFilter === 'ALL' ? undefined : statusFilter
      );
      setWorkers(result.items);
      setPagination(result.pagination);
    } catch (err: any) {
      setListError(err.message || 'Failed to load workers. Please try again.');
    } finally {
      setIsListLoading(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  // ── Create form handlers ──────────────────────────────────────────────────

  const validateForm = (): string | null => {
    if (!firstName.trim()) return 'First name is required.';
    if (!lastName.trim()) return 'Last name is required.';
    if (!email.trim()) return 'Email is required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return 'Please enter a valid email address.';
    if (!password) return 'Password is required.';
    if (password.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return 'Password must contain at least one special character.';
    }
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setCreateError(null);
    setCreateSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    const validationError = validateForm();
    if (validationError) {
      setCreateError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const createdWorker = await adminWorkerService.createWorker({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
      });
      setCreateSuccess(createdWorker);
      // Reset sensitive fields
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setConfirmPassword('');
      // Refresh list to show the new worker
      fetchWorkers();
    } catch (err: any) {
      if (err.statusCode === 409 || err.code === 'AUTH_EMAIL_ALREADY_EXISTS') {
        setCreateError('Email address is already registered in the system.');
      } else if (err.statusCode === 403) {
        setCreateError('You do not have permission to provision worker accounts.');
      } else {
        setCreateError(err.message || 'Failed to create worker account. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Copy to clipboard ─────────────────────────────────────────────────────

  const handleCopyId = async (workerId: string) => {
    try {
      await navigator.clipboard.writeText(workerId);
      setCopyFeedbackId(workerId);
      setTimeout(() => setCopyFeedbackId(null), 2000);
    } catch {
      // Clipboard API unavailable — silent fail
    }
  };

  // ── Filter tab handler ────────────────────────────────────────────────────

  const handleFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderSkeletonRows = () =>
    Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="skeleton-row">
        <div className="skeleton" style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="skeleton" style={{ height: 13, width: '45%' }} />
          <div className="skeleton" style={{ height: 11, width: '30%' }} />
        </div>
        <div className="skeleton" style={{ height: 13, width: '20%' }} />
        <div className="skeleton" style={{ height: 22, width: 60, borderRadius: 99 }} />
      </div>
    ));

  const renderStatusBadge = (status: 'ACTIVE' | 'INACTIVE') => (
    <span className={`status-badge ${status === 'ACTIVE' ? 'approved' : 'rejected'}`}>
      {status === 'ACTIVE' ? 'Active' : 'Inactive'}
    </span>
  );

  const renderWorkerTable = () => (
    <>
      {/* Desktop Table */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Worker</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Created</th>
              <th>Worker ID</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((worker) => (
              <tr key={worker.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="worker-avatar">
                      {getInitials(worker.firstName, worker.lastName)}
                    </div>
                    <span style={{ fontWeight: 600 }}>
                      {worker.firstName} {worker.lastName}
                    </span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{worker.email}</td>
                <td style={{ color: 'var(--text-muted)' }}>{worker.phone ?? '—'}</td>
                <td>{renderStatusBadge(worker.status)}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  {formatDate(worker.createdAt)}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <code style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {truncateId(worker.id)}
                    </code>
                    <button
                      className={`copy-btn ${copyFeedbackId === worker.id ? 'copied' : ''}`}
                      onClick={() => handleCopyId(worker.id)}
                      title={copyFeedbackId === worker.id ? 'Copied!' : 'Copy Worker ID'}
                      aria-label={`Copy Worker ID for ${worker.firstName} ${worker.lastName}`}
                    >
                      {copyFeedbackId === worker.id ? <Check size={11} /> : <Copy size={11} />}
                      {copyFeedbackId === worker.id ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="worker-mobile-cards">
        {workers.map((worker) => (
          <div key={worker.id} className="worker-card-mobile">
            <div className="worker-card-mobile-header">
              <div className="worker-avatar large">
                {getInitials(worker.firstName, worker.lastName)}
              </div>
              <div>
                <div className="worker-card-mobile-name">
                  {worker.firstName} {worker.lastName}
                </div>
                {renderStatusBadge(worker.status)}
              </div>
            </div>
            <div className="worker-card-mobile-row">
              <span className="worker-card-mobile-label">Email</span>
              <span className="worker-card-mobile-value">{worker.email}</span>
            </div>
            <div className="worker-card-mobile-row">
              <span className="worker-card-mobile-label">Phone</span>
              <span className="worker-card-mobile-value">{worker.phone ?? '—'}</span>
            </div>
            <div className="worker-card-mobile-row">
              <span className="worker-card-mobile-label">Created</span>
              <span className="worker-card-mobile-value">{formatDate(worker.createdAt)}</span>
            </div>
            <div className="worker-card-mobile-row">
              <span className="worker-card-mobile-label">Worker ID</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {truncateId(worker.id)}
                </code>
                <button
                  className={`copy-btn ${copyFeedbackId === worker.id ? 'copied' : ''}`}
                  onClick={() => handleCopyId(worker.id)}
                  title="Copy Worker ID"
                  aria-label={`Copy Worker ID for ${worker.firstName} ${worker.lastName}`}
                >
                  {copyFeedbackId === worker.id ? <Check size={11} /> : <Copy size={11} />}
                  {copyFeedbackId === worker.id ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const renderEmptyState = () => (
    <div
      style={{
        textAlign: 'center',
        padding: '56px 24px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--foodshare-green-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}
      >
        <Users size={24} color="var(--foodshare-green-primary)" />
      </div>
      <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', marginBottom: 6 }}>
        {statusFilter === 'ALL' ? 'No workers created yet' : `No ${statusFilter.toLowerCase()} workers`}
      </p>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' }}>
        {statusFilter === 'ALL'
          ? 'Create your first operational worker to start assigning approved donations.'
          : `There are no workers with ${statusFilter.toLowerCase()} status.`}
      </p>
      {statusFilter === 'ALL' && (
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <UserPlus size={16} />
          Provision Worker
        </button>
      )}
    </div>
  );

  const renderListError = () => (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 24px',
        background: 'var(--bg-surface)',
        border: '1px solid #fecaca',
        borderRadius: 'var(--radius-md)',
        backgroundColor: '#fef2f2',
      }}
    >
      <AlertTriangle size={28} color="#dc2626" style={{ marginBottom: 12 }} />
      <p style={{ fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>Unable to load workers</p>
      <p style={{ fontSize: '0.875rem', color: '#b91c1c', marginBottom: 20 }}>
        {listError}
      </p>
      <button className="btn btn-secondary" onClick={fetchWorkers}>
        <RefreshCw size={15} />
        Retry
      </button>
    </div>
  );

  // ── Full render ──────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px' }}>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 28,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Worker Management
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Create and manage operational workers for food collection.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowCreateForm((prev) => !prev);
            setCreateError(null);
            setCreateSuccess(null);
          }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          {showCreateForm ? <X size={16} /> : <UserPlus size={16} />}
          {showCreateForm ? 'Close Form' : 'Provision Worker'}
        </button>
      </div>

      {/* ── Create Worker Form (collapsible) ─────────────────────────────── */}
      {showCreateForm && (
        <div className="card" style={{ padding: '24px', marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--foodshare-green-soft)',
                  color: 'var(--foodshare-green-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UserPlus size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Provision New Worker</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Admin-controlled. Role and status are set by the server.
                </p>
              </div>
            </div>
          </div>

          {/* Security notice */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '11px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1e40af',
              fontSize: '0.82rem',
              marginBottom: 20,
            }}
          >
            <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              <strong>Admin-Controlled Account Security:</strong> Public self-registration for workers is
              disabled. Server automatically sets role to <code>WORKER</code> and status to{' '}
              <code>ACTIVE</code>.
            </span>
          </div>

          {/* Create success */}
          {createSuccess && (
            <div
              style={{
                padding: 16,
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#166534',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <CheckCircle2 size={20} color="#16a34a" />
                <strong style={{ fontSize: '0.95rem' }}>Worker Account Provisioned Successfully!</strong>
              </div>
              <div
                style={{
                  fontSize: '0.875rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '6px 16px',
                }}
              >
                <div>
                  <strong>Name:</strong> {createSuccess.firstName} {createSuccess.lastName}
                </div>
                <div>
                  <strong>Email:</strong> {createSuccess.email}
                </div>
                <div>
                  <strong>Role:</strong>{' '}
                  <span className="role-badge worker">{createSuccess.role}</span>
                </div>
                <div>
                  <strong>Status:</strong>{' '}
                  <span className="status-badge approved">{createSuccess.status}</span>
                </div>
              </div>
            </div>
          )}

          {/* Create error */}
          {createError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                marginBottom: 20,
                fontSize: '0.875rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{createError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div>
                <label
                  htmlFor="firstName"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 6 }}
                >
                  First Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="firstName"
                  type="text"
                  className="input-field"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Rahul"
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 6 }}
                >
                  Last Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="lastName"
                  type="text"
                  className="input-field"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Kumar"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div>
                <label
                  htmlFor="email"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 6 }}
                >
                  Email Address <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rahul.worker@example.com"
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="phone"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 6 }}
                >
                  Phone{' '}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                    (Optional)
                  </span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="input-field"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div>
                <label
                  htmlFor="password"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 6 }}
                >
                  Temporary Password <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="password"
                  type="password"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars, uppercase, number, symbol"
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 6 }}
                >
                  Confirm Password <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="input-field"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password to confirm"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetForm}
                disabled={isSubmitting}
              >
                Reset
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="spinner" />
                    Provisioning…
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    Create Worker Credentials
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Worker List ───────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* List header + filter tabs */}
        <div style={{ padding: '20px 20px 0' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Workers</h2>
              {!isListLoading && !listError && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  {pagination.total} {pagination.total === 1 ? 'worker' : 'workers'} total
                </p>
              )}
            </div>
            <button
              className="btn btn-secondary"
              onClick={fetchWorkers}
              disabled={isListLoading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}
              aria-label="Refresh worker list"
            >
              <RefreshCw size={13} className={isListLoading ? 'spinner' : ''} />
              Refresh
            </button>
          </div>

          {/* Filter tabs */}
          <div className="filter-tabs">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as StatusFilter[]).map((f) => (
              <button
                key={f}
                className={`filter-tab${statusFilter === f ? ' active' : ''}`}
                onClick={() => handleFilterChange(f)}
                aria-pressed={statusFilter === f}
              >
                {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* List body */}
        <div style={{ padding: '0 20px 20px' }}>
          {isListLoading ? (
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              {renderSkeletonRows()}
            </div>
          ) : listError ? (
            renderListError()
          ) : workers.length === 0 ? (
            renderEmptyState()
          ) : (
            renderWorkerTable()
          )}

          {/* Pagination */}
          {!isListLoading && !listError && pagination.totalPages > 1 && (
            <div className="pagination-bar">
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.82rem' }}
              >
                <ChevronLeft size={14} />
                Prev
              </button>
              <span className="pagination-info">
                {currentPage} of {pagination.totalPages}
              </span>
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage === pagination.totalPages}
                aria-label="Next page"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.82rem' }}
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
