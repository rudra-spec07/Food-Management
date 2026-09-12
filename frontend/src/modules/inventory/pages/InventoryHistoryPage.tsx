import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, History, Layers, AlertCircle } from 'lucide-react';
import { InventoryNoticeBanner } from '../components/InventoryNoticeBanner';
import { inventoryService } from '../services/inventory.service';
import { InventoryMovement } from '../types/inventory.types';

export const InventoryHistoryPage: React.FC = () => {
  const { inventoryId } = useParams<{ inventoryId: string }>();
  const [movements, setMovements] = useState<InventoryMovement[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!inventoryId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await inventoryService.getItemHistory(inventoryId);
        setMovements(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch inventory movement history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [inventoryId]);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px' }}>
      {/* Navigation link */}
      <div style={{ marginBottom: '20px' }}>
        <Link to={`/inventory/items/${inventoryId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>
          <ArrowLeft size={16} />
          <span>Back to Item Details</span>
        </Link>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
          Inventory Movement History
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Batch ID: {inventoryId}
        </p>
      </div>

      {/* Integration Notice */}
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
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Loading movement timeline...</p>
        </div>
      ) : !movements || movements.length === 0 ? (
        /* Empty / Pending State */
        <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <History size={48} color="var(--text-light)" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            No Movement Records Found
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px', maxWidth: '500px', margin: '8px auto 0' }}>
            Direct movement tracking for item <code>{inventoryId}</code> requires backend movement audit event stream initialization.
          </p>
          <div style={{ marginTop: '24px' }}>
            <Link to="/inventory/items" className="btn btn-secondary">
              Return to Inventory List
            </Link>
          </div>
        </div>
      ) : (
        /* Movement Timeline */
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} color="var(--foodshare-green-primary)" />
            <span>Audit Movement Timeline</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {movements.map((m) => (
              <div key={m.id} style={{ display: 'flex', gap: '16px', padding: '16px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-muted)', borderLeft: '4px solid var(--foodshare-green-primary)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                      {m.movementType}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                      {new Date(m.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', margin: '0 0 8px', color: 'var(--text-muted)' }}>
                    Quantity: <strong>{m.quantity} {m.unit}</strong> {m.notes ? `— ${m.notes}` : ''}
                  </p>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', display: 'flex', gap: '12px' }}>
                    <span>Actor: {m.actorName || 'System'} ({m.actorRole || 'SYSTEM'})</span>
                    {m.referenceId && <span>Ref: {m.referenceId}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
