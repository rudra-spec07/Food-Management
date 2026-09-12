import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { assignmentService, Assignment } from '../../../services/assignment.service';
import { ClipboardList, CheckCircle, XCircle, RefreshCw, AlertCircle, MapPin, Calendar, Phone, Info, Truck } from 'lucide-react';

export const WorkerAssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reject Modal state
  const [rejectingAssignment, setRejectingAssignment] = useState<Assignment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Detail Modal state
  const [detailAssignment, setDetailAssignment] = useState<Assignment | null>(null);

  const fetchAssignments = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await assignmentService.getWorkerAssignments();
      setAssignments(result.items);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch your assigned tasks.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleAccept = async (assignment: Assignment) => {
    setIsSubmittingAction(true);
    setErrorMessage(null);
    try {
      await assignmentService.acceptAssignment(assignment.id);
      setSuccessMessage(`Assignment for "${assignment.donation?.category || 'food donation'}" accepted successfully.`);
      fetchAssignments();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to accept assignment.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleOpenRejectModal = (assignment: Assignment) => {
    setRejectingAssignment(assignment);
    setRejectionReason('');
    setModalError(null);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingAssignment) return;

    const trimmedReason = rejectionReason.trim();
    if (!trimmedReason) {
      setModalError('Please provide a reason for rejecting this assignment.');
      return;
    }

    if (trimmedReason.length > 2000) {
      setModalError('Rejection reason cannot exceed 2000 characters.');
      return;
    }

    setIsSubmittingAction(true);
    setModalError(null);

    try {
      await assignmentService.rejectAssignment(rejectingAssignment.id, trimmedReason);
      setSuccessMessage(`Assignment rejected. Donation returned to approved queue.`);
      setRejectingAssignment(null);
      fetchAssignments();
    } catch (err: any) {
      setModalError(err.message || 'Failed to reject assignment.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleOpenDetailModal = async (assignment: Assignment) => {
    try {
      const fullDetail = await assignmentService.getWorkerAssignmentDetail(assignment.id);
      setDetailAssignment(fullDetail);
    } catch (err: any) {
      setDetailAssignment(assignment); // fallback to list representation if fetch fails
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      {/* Header & Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            My Assigned Tasks
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Review, accept, and manage your food collection and delivery assignments.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={fetchAssignments}
          disabled={isLoading || isSubmittingAction}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={16} className={isLoading ? 'spinner' : ''} />
          <span>Refresh Tasks</span>
        </button>
      </div>

      {/* Success Notification */}
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
            <CheckCircle size={20} color="#16a34a" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534', fontWeight: 'bold' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Error Notification */}
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

      {/* Loading Skeleton */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', borderTopColor: 'var(--foodshare-green-dark)' }} />
        </div>
      ) : assignments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <ClipboardList size={48} color="var(--text-light)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            No Assigned Tasks
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            You currently have no pending or active food collection assignments.
          </p>
        </div>
      ) : (
        /* Task Cards List */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {assignments.map((item) => {
            const donation = item.donation;
            const isPending = item.status === 'PENDING';

            return (
              <div key={item.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <span className={`status-badge ${item.status.toLowerCase()}`} style={{ fontSize: '0.75rem', marginBottom: '6px', display: 'inline-block' }}>
                        {item.status === 'ACCEPTED' ? 'Accepted — Awaiting Pickup' : item.status}
                      </span>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                        {donation?.category || 'Food Donation'}
                      </h3>
                    </div>
                    {donation && (
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--foodshare-green-dark)', backgroundColor: 'var(--foodshare-green-soft)', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>
                        {donation.quantity} {donation.quantityUnit}
                      </span>
                    )}
                  </div>

                  {donation?.description && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {donation.description}
                    </p>
                  )}

                  <div style={{ fontSize: '0.825rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                    {donation?.pickupAddress && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} color="var(--foodshare-green-primary)" />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{donation.pickupAddress}</span>
                      </div>
                    )}
                    {donation?.expiresAt && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} color="var(--text-muted)" />
                        <span>Expires: {new Date(donation.expiresAt).toLocaleString()}</span>
                      </div>
                    )}
                    {donation?.contactPhone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={14} color="var(--text-muted)" />
                        <span>Contact: {donation.contactName} ({donation.contactPhone})</span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: '100%', fontSize: '0.85rem', padding: '8px 12px' }}
                    onClick={() => handleOpenDetailModal(item)}
                  >
                    <Info size={14} style={{ marginRight: '6px' }} /> View Details
                  </button>

                  {item.status === 'ACCEPTED' && (
                    item.pickup?.id ? (
                      <Link
                        to={`/worker/pickups/${item.pickup.id}`}
                        className="btn btn-primary"
                        style={{ width: '100%', fontSize: '0.85rem', padding: '8px 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Truck size={14} />
                        <span>Manage Pickup</span>
                      </Link>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '6px', backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius-sm)' }}>
                        Pickup record initializing...
                      </div>
                    )
                  )}

                  {isPending && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ flex: 1, fontSize: '0.85rem', color: '#b91c1c', borderColor: '#fecaca', backgroundColor: '#fef2f2' }}
                        onClick={() => handleOpenRejectModal(item)}
                        disabled={isSubmittingAction}
                      >
                        <XCircle size={14} style={{ marginRight: '4px' }} /> Reject
                      </button>

                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ flex: 1.5, fontSize: '0.85rem' }}
                        onClick={() => handleAccept(item)}
                        disabled={isSubmittingAction}
                      >
                        <CheckCircle size={14} style={{ marginRight: '4px' }} /> Accept Task
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Assignment Modal */}
      {rejectingAssignment && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 12px', color: '#991b1b' }}>
              Reject Assignment Task
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Please provide a valid reason for rejecting this food collection assignment.
            </p>

            {modalError && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: '0.85rem',
                  marginBottom: '16px',
                }}
              >
                {modalError}
              </div>
            )}

            <form onSubmit={handleRejectSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                  Rejection Reason <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  className="input-field"
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Vehicle malfunction / Unable to fulfill pickup window"
                  disabled={isSubmittingAction}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Max 2000 characters.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRejectingAssignment(null)}
                  disabled={isSubmittingAction}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                  disabled={isSubmittingAction}
                >
                  {isSubmittingAction ? 'Submitting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Detail Modal */}
      {detailAssignment && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '560px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                Assignment Details
              </h3>
              <span className={`status-badge ${detailAssignment.status.toLowerCase()}`}>
                {detailAssignment.status === 'ACCEPTED' ? 'Accepted — Awaiting Pickup' : detailAssignment.status}
              </span>
            </div>

            <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              <div><strong>Assignment ID:</strong> {detailAssignment.id}</div>
              <div><strong>Category:</strong> {detailAssignment.donation?.category || 'N/A'}</div>
              <div><strong>Quantity:</strong> {detailAssignment.donation?.quantity} {detailAssignment.donation?.quantityUnit}</div>
              <div><strong>Description:</strong> {detailAssignment.donation?.description}</div>
              <div><strong>Pickup Address:</strong> {detailAssignment.donation?.pickupAddress}</div>
              <div><strong>Contact Person:</strong> {detailAssignment.donation?.contactName} ({detailAssignment.donation?.contactPhone})</div>
              <div><strong>Assigned Date:</strong> {new Date(detailAssignment.assignedAt).toLocaleString()}</div>
              {detailAssignment.respondedAt && (
                <div><strong>Responded Date:</strong> {new Date(detailAssignment.respondedAt).toLocaleString()}</div>
              )}
              {detailAssignment.rejectionReason && (
                <div style={{ color: '#991b1b', fontStyle: 'italic' }}>
                  <strong>Rejection Reason:</strong> "{detailAssignment.rejectionReason}"
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDetailAssignment(null)}
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
