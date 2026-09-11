import React, { useState } from 'react';
import { Package, Search, Filter, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AvailableFoodPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      {/* Header Title */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
          Available Food Collections
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Explore available food items for collection and distribution.
        </p>
      </div>

      {/* FDLD Integration Limitation Notice Banner */}
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
          Collection operations are not yet connected to a live collection backend. Active operational workflows are currently managed through live Worker Assignments.
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
              <span>Go to Active Worker Assignments</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '38px' }}
              placeholder="Search by food category or donor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ width: '200px', position: 'relative' }}>
            <Filter size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <select
              className="input-field"
              style={{ paddingLeft: '38px' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              <option value="COOKED_FOOD">Cooked Food</option>
              <option value="PACKAGED_FOOD">Packaged Food</option>
              <option value="PRODUCE">Raw Produce</option>
              <option value="BAKERY">Bakery Items</option>
            </select>
          </div>
        </div>
      </div>

      {/* Placeholder Operational State */}
      <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
        <Package size={48} color="var(--text-light)" style={{ marginBottom: '12px' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
          No Live Collection Data
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '6px', maxWidth: '480px', margin: '6px auto 0' }}>
          Direct collection query APIs are awaiting future backend module deployment. Please check back after collection service initialization.
        </p>
      </div>
    </div>
  );
};
