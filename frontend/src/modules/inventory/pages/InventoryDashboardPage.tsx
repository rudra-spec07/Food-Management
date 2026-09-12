import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Layers, Clock, TrendingUp, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { InventoryNoticeBanner } from '../components/InventoryNoticeBanner';
import { inventoryService } from '../services/inventory.service';
import { InventorySummary } from '../types/inventory.types';

export const InventoryDashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getSummary();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory summary data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      {/* Header & Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Inventory & Food Availability
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Monitor real-time food stock, reservations, distributions, and inventory health.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchDashboardData}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={16} className={loading ? 'spinner' : ''} />
            <span>Refresh</span>
          </button>
          <Link to="/inventory/items" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span>View All Items</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Integration Notice Banner */}
      <InventoryNoticeBanner />

      {/* Error Banner */}
      {error && (
        <div className="card" style={{ padding: '16px', marginBottom: '24px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span style={{ fontWeight: 600 }}>{error}</span>
          </div>
        </div>
      )}

      {/* Loading Skeleton / Metrics Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card" style={{ padding: '20px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" style={{ width: '24px', height: '24px' }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {/* Total Food Metric */}
          <div className="card" style={{ padding: '20px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Food</span>
              <Package size={20} color="var(--foodshare-green-primary)" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {summary ? summary.totalFoodItems : '—'}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Tracked inventory batches</span>
          </div>

          {/* Available Inventory Metric */}
          <div className="card" style={{ padding: '20px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Available</span>
              <Layers size={20} color="#10b981" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#047857' }}>
              {summary ? summary.availableInventoryCount : '—'}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Ready for distribution</span>
          </div>

          {/* Reserved Inventory Metric */}
          <div className="card" style={{ padding: '20px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Reserved</span>
              <Clock size={20} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309' }}>
              {summary ? summary.reservedInventoryCount : '—'}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Allocated for collections</span>
          </div>

          {/* Distributed Metric */}
          <div className="card" style={{ padding: '20px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Distributed</span>
              <TrendingUp size={20} color="#3b82f6" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1d4ed8' }}>
              {summary ? summary.distributedInventoryCount : '—'}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Distributed batches</span>
          </div>

          {/* Low Availability Metric */}
          <div className="card" style={{ padding: '20px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Low Stock Alert</span>
              <AlertCircle size={20} color="#ef4444" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b91c1c' }}>
              {summary ? summary.lowAvailabilityCount : '—'}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Near expiration / stock out</span>
          </div>
        </div>
      )}

      {/* Content Section Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Low Availability Widget */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} color="#f59e0b" />
            <span>Low Availability Items</span>
          </h3>
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
            <Package size={36} color="var(--text-light)" style={{ marginBottom: '8px' }} />
            <p style={{ fontSize: '0.9rem', margin: 0 }}>No low stock alerts recorded.</p>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
              Backend inventory monitoring service will list critical items here.
            </span>
          </div>
        </div>

        {/* Recent Inventory Movements */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="var(--foodshare-green-primary)" />
            <span>Recent Movements</span>
          </h3>
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
            <Layers size={36} color="var(--text-light)" style={{ marginBottom: '8px' }} />
            <p style={{ fontSize: '0.9rem', margin: 0 }}>No recent movement records found.</p>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
              Inflow and outflow transactions will display here as food is received and distributed.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
