import React, { useState, useEffect, useCallback } from 'react';
import { Truck, Search, Plus, AlertCircle, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { distributionService, DistributionRecord } from '../../services/distribution.service';

export const DistributionListPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<DistributionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchDistributions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await distributionService.getDistributions({
        page,
        limit: 10,
        search: searchTerm.trim() || undefined,
      });
      setRecords(res.items || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalItems(res.pagination?.totalItems || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load distribution records');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

  useEffect(() => {
    fetchDistributions();
  }, [fetchDistributions]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Food Distribution Records
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Manage and track food deliveries to beneficiary organizations.
          </p>
        </div>

        <Link to="/distributions/new" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={18} />
          <span>Create Distribution</span>
        </Link>
      </div>

      <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: '38px' }}
            placeholder="Search distribution records..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-muted)' }}>
          Loading distribution records...
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '24px', textAlign: 'center', color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
          <AlertCircle size={32} style={{ marginBottom: '8px' }} />
          <p style={{ fontWeight: 600, margin: '0 0 8px' }}>{error}</p>
          <button className="btn btn-secondary" onClick={() => fetchDistributions()}>
            Retry
          </button>
        </div>
      ) : records.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <Truck size={48} color="var(--text-light)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            No distribution records found.
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            No food distributions match the current filters.
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-hover)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Recipient</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Category / Item</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Quantity</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Distributed At</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{record.recipientName}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {record.inventory?.foodCategory?.replace('_', ' ') || 'Food Item'}
                    {record.inventory?.description ? ` (${record.inventory.description})` : ''}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                    {Number(record.quantity).toFixed(2)} {record.unit}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                      }}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                    {new Date(record.distributedAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Link
                      to={`/distributions/${record.id}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: 'var(--primary-color)', fontWeight: 600 }}
                    >
                      <Eye size={16} />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Page {page} of {totalPages} ({totalItems} records)
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
