import React, { useState } from 'react';
import { History, Search, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CollectionHistoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
          Collection History
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Historical record of completed food collection tasks.
        </p>
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
          Collection history records will be available once the collection backend service is deployed. Live task status and history can currently be viewed under Worker Assignments.
          <div style={{ marginTop: '10px' }}>
            <Link
              to="/worker/assignments"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#b45309',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <span>View Worker Assignment Records</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: '38px' }}
            placeholder="Search collection records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
        <History size={48} color="var(--text-light)" style={{ marginBottom: '12px' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
          No Collection Records Available
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '6px' }}>
          Collection historical records are waiting for backend endpoint integration.
        </p>
      </div>
    </div>
  );
};
