import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Package, User, Calendar, FileText } from 'lucide-react';
import { distributionService, DistributionRecord } from '../../services/distribution.service';

export const DistributionDetailPage: React.FC = () => {
  const { distributionId } = useParams<{ distributionId: string }>();
  const [record, setRecord] = useState<DistributionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!distributionId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await distributionService.getDistributionDetail(distributionId);
      setRecord(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load distribution detail');
    } finally {
      setLoading(false);
    }
  }, [distributionId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
        <Link to="/distributions" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '16px' }}>
          <ArrowLeft size={16} /> Back to Distribution Records
        </Link>
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading distribution details...
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
        <Link to="/distributions" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '16px' }}>
          <ArrowLeft size={16} /> Back to Distribution Records
        </Link>
        <div className="card" style={{ padding: '24px', textAlign: 'center', color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
          <AlertCircle size={32} style={{ marginBottom: '8px' }} />
          <p style={{ fontWeight: 600, margin: '0 0 8px' }}>{error || 'Distribution record not found'}</p>
          <button className="btn btn-secondary" onClick={() => fetchDetail()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
      <Link
        to="/distributions"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
          textDecoration: 'none',
          marginBottom: '16px',
        }}
      >
        <ArrowLeft size={16} />
        Back to Distribution Records
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            {record.recipientName}
          </h1>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID: {record.id}</span>
        </div>
        <span
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 700,
            backgroundColor: '#dcfce7',
            color: '#15803d',
          }}
        >
          {record.status}
        </span>
      </div>

      <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={20} color="var(--primary-color)" />
          Distribution Information
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Recipient Name</span>
            <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{record.recipientName}</strong>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Quantity Distributed</span>
            <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
              {Number(record.quantity).toFixed(2)} {record.unit}
            </strong>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Distribution Date</span>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
              <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
              {new Date(record.distributedAt).toLocaleString()}
            </strong>
          </div>
        </div>

        {record.notes && (
          <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              <FileText size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Notes / Remarks
            </span>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)' }}>{record.notes}</p>
          </div>
        )}
      </div>

      {record.inventory && (
        <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={20} color="var(--primary-color)" />
            Source Inventory Batch
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Food Category</span>
              <strong style={{ fontSize: '0.95rem' }}>{record.inventory.foodCategory.replace('_', ' ')}</strong>
            </div>

            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Description</span>
              <strong style={{ fontSize: '0.95rem' }}>{record.inventory.description}</strong>
            </div>

            {record.inventory.location && (
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Storage Location</span>
                <strong style={{ fontSize: '0.95rem' }}>{record.inventory.location}</strong>
              </div>
            )}
          </div>

          <Link
            to={`/inventory/items/${record.inventory.id}`}
            className="btn btn-secondary"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            View Full Inventory Item & History
          </Link>
        </div>
      )}

      {record.distributor && (
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={20} color="var(--primary-color)" />
            Distributed By
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Staff Member</span>
              <strong style={{ fontSize: '0.95rem' }}>
                {record.distributor.firstName} {record.distributor.lastName}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Role / Email</span>
              <strong style={{ fontSize: '0.95rem' }}>
                {record.distributor.role} ({record.distributor.email})
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
