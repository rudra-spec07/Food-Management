import React, { useState, useEffect, useCallback } from 'react';
import { assignmentService, DonationCandidate, Assignment } from '../../../services/assignment.service';
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
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Worker selector load states
type WorkerLoadState = 'idle' | 'loading' | 'loaded' | 'error';

export const AdminAssignmentQueuePage: React.FC = () => {
  const [items, setItems] = useState<DonationCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ── Assign Modal state ────────────────────────────────────────────────────
  const [selectedDonation, setSelectedDonation] = useState<DonationCandidate | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // ── Worker selector state ─────────────────────────────────────────────────
  const [activeWorkers, setActiveWorkers] = useState<WorkerUserResponse[]>([]);
  const [workerLoadState, setWorkerLoadState] = useState<WorkerLoadState>('idle');
  const [workerTotal, setWorkerTotal] = useState(0);


  // ── History Modal state ───────────────────────────────────────────────────
  const [historyDonation, setHistoryDonation] = useState<DonationCandidate | null>(null);
  const [assignmentHistory, setAssignmentHistory] = useState<Assignment[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // ── Fetch queue ───────────────────────────────────────────────────────────

  const fetchQueue = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await assignmentService.getAssignmentQueue();
      setItems(result.items);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch donation assignment queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  // ── Fetch active workers ──────────────────────────────────────────────────

  const fetchActiveWorkers = useCallback(async () => {
    setWorkerLoadState('loading');
    try {
      // Load up to 100 active workers — MVP scale limit
      const result = await adminWorkerService.listWorkers(1, 100, 'ACTIVE');
      setActiveWorkers(result.items);
      setWorkerTotal(result.pagination.total);
      setWorkerLoadState('loaded');
    } catch (_err: any) {
      setWorkerLoadState('error');
    }
  }, []);


  // ── Modal handlers ────────────────────────────────────────────────────────

  const handleOpenAssignModal = (donation: DonationCandidate) => {
    setSelectedDonation(donation);
    setSelectedWorkerId('');
    setAssignError(null);
    // Load workers when modal opens
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
      // Existing assignment API — workerId is the selected worker's UUID
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

  // ── Selected worker object ────────────────────────────────────────────────

  const selectedWorkerObj = activeWorkers.find((w) => w.id === selectedWorkerId) ?? null;

  // ── Escape key to close modal ─────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedDonation) handleCloseAssignModal();
        if (historyDonation) setHistoryDonation(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedDonation, historyDonation]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Worker Assignment Queue
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Assign approved food donations to active operational workers for collection.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchQueue}
            disabled={isLoading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={16} className={isLoading ? 'spinner' : ''} />
            <span>Refresh Queue</span>
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
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534', fontWeight: 'bold', fontSize: '1.1rem', lineHeight: 1 }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Error alert */}
      {errorMessage && (
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
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Queue content */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div
            className="spinner"
            style={{ width: '40px', height: '40px', borderTopColor: 'var(--foodshare-green-dark)' }}
          />
        </div>
      ) : items.length === 0 ? (
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
          {items.map((item) => (
            <div
              key={item.id}
              className="card"
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
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
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
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

      {/* ── History Modal ─────────────────────────────────────────────────── */}
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
            style={{ width: '100%', maxWidth: '600px', padding: '24px', maxHeight: '80vh', overflowY: 'auto' }}
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
                      <span className={`status-badge ${h.status.toLowerCase()}`}>{h.status}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Assigned: {new Date(h.assignedAt).toLocaleString()}
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
