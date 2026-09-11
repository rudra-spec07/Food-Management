import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export const CreateDistributionPage: React.FC = () => {
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
        Back to Distribution List
      </Link>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
          Create New Distribution
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Allocate collected food items to a beneficiary organization.
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
            Integration Notice — Distribution & Beneficiary APIs Pending
          </strong>
          Distribution creation endpoints and Beneficiary Management APIs are scheduled for a future backend module release. Form submission is disabled to prevent non-authoritative data mutation.
        </div>
      </div>

      <div className="card" style={{ padding: '24px' }}>
        <div style={{ opacity: 0.6, pointerEvents: 'none' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>Available Collected Food</label>
            <select className="input-field" disabled><option>Select collected food item...</option></select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>Beneficiary Organization</label>
            <select className="input-field" disabled><option>Select beneficiary...</option></select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>Quantity to Distribute</label>
            <input type="number" className="input-field" placeholder="Enter quantity" disabled />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button type="button" className="btn btn-primary" disabled>
            Backend Integration Pending
          </button>
        </div>
      </div>
    </div>
  );
};
