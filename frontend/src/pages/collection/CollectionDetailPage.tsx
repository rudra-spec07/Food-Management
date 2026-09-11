import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export const CollectionDetailPage: React.FC = () => {
  const { collectionId } = useParams<{ collectionId: string }>();

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
      <Link
        to="/collection"
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
        Back to Collection History
      </Link>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
          Collection Details
        </h1>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID: {collectionId}</span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: '#fffbeb',
          border: '1px solid #fef3c7',
          color: '#92400e',
          fontSize: '0.9rem',
          marginBottom: '24px',
        }}
      >
        <AlertTriangle size={22} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} />
        <div>
          <strong style={{ fontSize: '0.95rem', display: 'block', marginBottom: '4px' }}>
            Integration Notice — Collection Backend Module Pending
          </strong>
          Collection detail endpoint is pending backend module release. Direct collection resource status cannot be fetched.
        </div>
      </div>

      <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Resource details unavailable due to pending collection backend APIs.
      </div>
    </div>
  );
};
