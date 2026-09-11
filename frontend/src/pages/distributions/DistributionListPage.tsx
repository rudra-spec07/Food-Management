import React, { useState } from 'react';
import { Truck, Search, Plus, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DistributionListPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

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
            Integration Notice — Distribution Backend Module Pending
          </strong>
          Distribution tracking and beneficiary allocation backend APIs are pending backend module deployment.
        </div>
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
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
        <Truck size={48} color="var(--text-light)" style={{ marginBottom: '12px' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
          No Live Distribution Records
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '6px' }}>
          Distribution services are waiting for backend integration.
        </p>
      </div>
    </div>
  );
};
