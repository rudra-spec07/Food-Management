import React, { useState, useEffect } from 'react';
import { beneficiaryService, PaginatedBeneficiaryHistoryResult } from '../../services/beneficiary.service';
import { Beneficiary, BeneficiaryStatus } from '../../types/beneficiary.types';
import { useAuth } from '../../hooks/useAuth';
import { Users, Plus, Search, Building, Phone, Mail, MapPin, Clock, CheckCircle, XCircle, X } from 'lucide-react';

export const BeneficiaryListPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BeneficiaryStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State: Create Beneficiary
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createContactPerson, setCreateContactPerson] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createAddress, setCreateAddress] = useState('');
  const [createStatus, setCreateStatus] = useState<BeneficiaryStatus>('ACTIVE');
  const [createNotes, setCreateNotes] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Modal State: History
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [historyData, setHistoryData] = useState<PaginatedBeneficiaryHistoryResult | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const fetchBeneficiaries = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await beneficiaryService.getBeneficiaries({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        page,
        limit: 10,
      });
      setBeneficiaries(data.items);
      setTotalItems(data.pagination.totalItems);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load beneficiaries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeneficiaries();
  }, [page, search, statusFilter]);

  const handleCreateBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createAddress.trim()) {
      setCreateError('Name and Address are required.');
      return;
    }

    try {
      setCreateSubmitting(true);
      setCreateError(null);
      await beneficiaryService.createBeneficiary({
        name: createName.trim(),
        contactPerson: createContactPerson.trim() || undefined,
        email: createEmail.trim() || undefined,
        phone: createPhone.trim() || undefined,
        address: createAddress.trim(),
        status: createStatus,
        notes: createNotes.trim() || undefined,
      });

      setIsCreateModalOpen(false);
      // Reset form
      setCreateName('');
      setCreateContactPerson('');
      setCreateEmail('');
      setCreatePhone('');
      setCreateAddress('');
      setCreateStatus('ACTIVE');
      setCreateNotes('');
      fetchBeneficiaries();
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || err.message || 'Failed to create beneficiary');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleToggleStatus = async (beneficiary: Beneficiary) => {
    if (!isAdmin) return;
    const newStatus: BeneficiaryStatus = beneficiary.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await beneficiaryService.updateBeneficiary(beneficiary.id, { status: newStatus });
      fetchBeneficiaries();
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Failed to update status');
    }
  };

  const handleViewHistory = async (beneficiary: Beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const history = await beneficiaryService.getBeneficiaryHistory(beneficiary.id, { page: 1, limit: 10 });
      setHistoryData(history);
    } catch (err: any) {
      setHistoryError(err?.response?.data?.message || err.message || 'Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-main, #0f172a)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users style={{ color: '#2563eb' }} /> Beneficiary Organizations
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
            Manage recipient shelters, food banks, and track allocated distribution records.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.5rem',
              fontWeight: '600',
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
            }}
          >
            <Plus size={18} /> Add Beneficiary
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', backgroundColor: 'var(--bg-card, #ffffff)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by name, contact, phone, or address..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{
              width: '100%',
              paddingLeft: '2.5rem',
              paddingRight: '0.75rem',
              paddingTop: '0.5rem',
              paddingBottom: '0.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ minWidth: '160px' }}>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as BeneficiaryStatus | '');
              setPage(1);
            }}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE Only</option>
            <option value="INACTIVE">INACTIVE Only</option>
          </select>
        </div>
      </div>

      {/* Main List Table */}
      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '0.5rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
          Loading beneficiaries...
        </div>
      ) : beneficiaries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
          <Building size={48} style={{ color: '#cbd5e1', marginBottom: '0.75rem' }} />
          <h3 style={{ margin: 0, color: '#334155' }}>No Beneficiaries Found</h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Try adjusting your search query or filters.
          </p>
        </div>
      ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Organization Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Contact Info</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Address</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {beneficiaries.map((beneficiary) => (
                  <tr key={beneficiary.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem', fontWeight: '600', color: '#0f172a' }}>
                      {beneficiary.name}
                      {beneficiary.notes && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '400', marginTop: '0.125rem' }}>
                          {beneficiary.notes}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem', color: '#475569' }}>
                      {beneficiary.contactPerson && (
                        <div style={{ fontWeight: '500' }}>{beneficiary.contactPerson}</div>
                      )}
                      {beneficiary.phone && (
                        <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Phone size={12} /> {beneficiary.phone}
                        </div>
                      )}
                      {beneficiary.email && (
                        <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Mail size={12} /> {beneficiary.email}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem', color: '#475569', maxWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.25rem' }}>
                        <MapPin size={14} style={{ marginTop: '0.25rem', flexShrink: 0, color: '#94a3b8' }} />
                        <span>{beneficiary.address}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.25rem 0.625rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: beneficiary.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
                          color: beneficiary.status === 'ACTIVE' ? '#166534' : '#64748b',
                        }}
                      >
                        {beneficiary.status === 'ACTIVE' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {beneficiary.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleViewHistory(beneficiary)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            fontSize: '0.75rem',
                            borderRadius: '0.375rem',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#334155',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          <Clock size={12} /> History
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleToggleStatus(beneficiary)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              fontSize: '0.75rem',
                              borderRadius: '0.375rem',
                              border: 'none',
                              backgroundColor: beneficiary.status === 'ACTIVE' ? '#fee2e2' : '#dcfce7',
                              color: beneficiary.status === 'ACTIVE' ? '#991b1b' : '#166534',
                              cursor: 'pointer',
                              fontWeight: '600',
                            }}
                          >
                            {beneficiary.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Showing {beneficiaries.length} of {totalItems} beneficiaries
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={{
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.8rem',
                  borderRadius: '0.25rem',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 ? 0.5 : 1,
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', color: '#334155' }}>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.8rem',
                  borderRadius: '0.25rem',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages ? 0.5 : 1,
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Beneficiary */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', width: '100%', maxWidth: '500px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem', fontWeight: '700' }}>Add Beneficiary Organization</h3>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateBeneficiary} style={{ padding: '1.25rem' }}>
              {createError && (
                <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '0.375rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  {createError}
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>
                  Organization Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. St. Jude Food Shelter"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mary Jane"
                    value={createContactPerson}
                    onChange={(e) => setCreateContactPerson(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 555-0199"
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="contact@organization.org"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>
                  Address <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Full physical address..."
                  value={createAddress}
                  onChange={(e) => setCreateAddress(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>
                  Initial Status
                </label>
                <select
                  value={createStatus}
                  onChange={(e) => setCreateStatus(e.target.value as BeneficiaryStatus)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#ffffff' }}
                >
                  <option value="ACTIVE">ACTIVE (Eligible for distributions)</option>
                  <option value="INACTIVE">INACTIVE (Disabled)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  style={{ padding: '0.5rem 1.25rem', borderRadius: '0.375rem', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', cursor: createSubmitting ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.875rem' }}
                >
                  {createSubmitting ? 'Saving...' : 'Create Beneficiary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: History */}
      {selectedBeneficiary && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', width: '100%', maxWidth: '700px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem', fontWeight: '700' }}>Distribution History</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Recipient: {selectedBeneficiary.name}</span>
              </div>
              <button onClick={() => setSelectedBeneficiary(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.25rem', maxHeight: '450px', overflowY: 'auto' }}>
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#64748b' }}>Loading history...</div>
              ) : historyError ? (
                <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '0.375rem' }}>{historyError}</div>
              ) : !historyData || historyData.items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#64748b' }}>No distributions recorded for this beneficiary yet.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem' }}>Date</th>
                      <th style={{ padding: '0.5rem' }}>Item Description</th>
                      <th style={{ padding: '0.5rem' }}>Quantity</th>
                      <th style={{ padding: '0.5rem' }}>Distributor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.items.map((record) => (
                      <tr key={record.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.5rem', color: '#64748b' }}>
                          {new Date(record.distributedAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '0.5rem', fontWeight: '500', color: '#0f172a' }}>
                          {record.inventory?.description || 'N/A'}
                        </td>
                        <td style={{ padding: '0.5rem', fontWeight: '600', color: '#2563eb' }}>
                          {record.quantity} {record.unit}
                        </td>
                        <td style={{ padding: '0.5rem', color: '#475569' }}>
                          {record.distributor ? `${record.distributor.firstName} ${record.distributor.lastName}` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ padding: '0.75rem 1.25rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
              <button
                onClick={() => setSelectedBeneficiary(null)}
                style={{ padding: '0.375rem 1rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', cursor: 'pointer', fontSize: '0.85rem' }}
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
