import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Package, History, AlertCircle } from 'lucide-react';
import { InventoryNoticeBanner } from '../components/InventoryNoticeBanner';
import { inventoryService } from '../services/inventory.service';
import { InventoryItem } from '../types/inventory.types';

export const InventoryDetailsPage: React.FC = () => {
  const { inventoryId } = useParams<{ inventoryId: string }>();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!inventoryId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await inventoryService.getItemDetail(inventoryId);
        setItem(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch inventory details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [inventoryId]);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px' }}>
      {/* Back Button & Navigation */}
      <div style={{ marginBottom: '20px' }}>
        <Link to="/inventory/items" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>
          <ArrowLeft size={16} />
          <span>Back to Inventory List</span>
        </Link>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Inventory Batch Detail
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            ID: {inventoryId}
          </p>
        </div>
        {inventoryId && (
          <Link to={`/inventory/items/${inventoryId}/history`} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <History size={16} />
            <span>View Movement History</span>
          </Link>
        )}
      </div>

      {/* Integration Notice Banner */}
      <InventoryNoticeBanner />

      {/* Error state */}
      {error && (
        <div className="card" style={{ padding: '16px', marginBottom: '24px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span style={{ fontWeight: 600 }}>{error}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Loading batch record...</p>
        </div>
      ) : !item ? (
        /* Empty / Unavailable State */
        <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <Package size={48} color="var(--text-light)" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Inventory Batch Not Found
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px', maxWidth: '500px', margin: '8px auto 0' }}>
            No inventory batch record was found matching ID <code>{inventoryId}</code>.
          </p>
          <div style={{ marginTop: '24px' }}>
            <Link to="/inventory/items" className="btn btn-primary">
              Return to Inventory Items
            </Link>
          </div>
        </div>
      ) : (
        /* Data Detail Card */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {item.foodCategory}
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0 0' }}>
                  {item.description}
                </h2>
              </div>
              <span className="badge badge-success" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                {item.status}
              </span>
            </div>

            {/* Quantity Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-muted)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Total Quantity</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {item.totalQuantity} {item.unit}
                </span>
              </div>
              <div style={{ padding: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: '#ecfdf5' }}>
                <span style={{ fontSize: '0.8rem', color: '#047857', display: 'block', marginBottom: '4px' }}>Available</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#047857' }}>
                  {item.availableQuantity} {item.unit}
                </span>
              </div>
              <div style={{ padding: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: '#fffbeb' }}>
                <span style={{ fontSize: '0.8rem', color: '#b45309', display: 'block', marginBottom: '4px' }}>Reserved</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b45309' }}>
                  {item.reservedQuantity} {item.unit}
                </span>
              </div>
              <div style={{ padding: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: '#eff6ff' }}>
                <span style={{ fontSize: '0.8rem', color: '#1d4ed8', display: 'block', marginBottom: '4px' }}>Distributed</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1d4ed8' }}>
                  {item.distributedQuantity} {item.unit}
                </span>
              </div>
            </div>

            {/* Additional Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', fontSize: '0.9rem' }}>
              <div>
                <strong style={{ color: 'var(--text-muted)', display: 'block' }}>Storage Location</strong>
                <span>{item.location || 'Unassigned'}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--text-muted)', display: 'block' }}>Expiration Date</strong>
                <span>{item.expirationDate ? new Date(item.expirationDate).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--text-muted)', display: 'block' }}>Received Date</strong>
                <span>{new Date(item.receivedAt).toLocaleDateString()}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--text-muted)', display: 'block' }}>Source Reference</strong>
                <span>{item.donorReference || 'Direct Collection'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
