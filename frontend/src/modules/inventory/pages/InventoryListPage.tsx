import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Package, ChevronLeft, ChevronRight, Eye, AlertCircle, RefreshCw } from 'lucide-react';
import { InventoryNoticeBanner } from '../components/InventoryNoticeBanner';
import { inventoryService, PaginatedInventoryResult } from '../services/inventory.service';
import { InventoryItem, InventoryStatus } from '../types/inventory.types';

export const InventoryListPage: React.FC = () => {
  const [itemsResult, setItemsResult] = useState<PaginatedInventoryResult<InventoryItem[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [search, setSearch] = useState('');
  const [foodCategory, setFoodCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryService.getItems({
        page,
        limit: 10,
        search: search.trim() || undefined,
        foodCategory: foodCategory !== 'ALL' ? foodCategory : undefined,
        status: status !== 'ALL' ? status : undefined,
      });
      setItemsResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inventory items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [page, foodCategory, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchItems();
  };

  const getStatusBadgeClass = (itemStatus: InventoryStatus) => {
    switch (itemStatus) {
      case 'AVAILABLE':
        return 'badge-success';
      case 'RESERVED':
        return 'badge-warning';
      case 'DISTRIBUTED':
        return 'badge-info';
      case 'EXPIRED':
      case 'DISCARDED':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Inventory Stock Items
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Filter, inspect, and track available food batches across locations.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={fetchItems}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={16} className={loading ? 'spinner' : ''} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Integration Notice */}
      <InventoryNoticeBanner />

      {/* Search and Filters Bar */}
      <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Input */}
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '38px' }}
              placeholder="Search by description, donor reference, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Food Category Filter */}
          <div style={{ width: '180px', position: 'relative' }}>
            <Filter size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <select
              className="input-field"
              style={{ paddingLeft: '38px' }}
              value={foodCategory}
              onChange={(e) => {
                setFoodCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Categories</option>
              <option value="COOKED_MEAL">Cooked Meal</option>
              <option value="PACKAGED_FOOD">Packaged Food</option>
              <option value="GROCERIES">Groceries</option>
              <option value="BAKERY">Bakery</option>
              <option value="FRUITS">Fruits</option>
              <option value="VEGETABLES">Vegetables</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ width: '180px' }}>
            <select
              className="input-field"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="RESERVED">Reserved</option>
              <option value="DISTRIBUTED">Distributed</option>
              <option value="EXPIRED">Expired</option>
              <option value="DISCARDED">Discarded</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary">
            Apply Filters
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card" style={{ padding: '16px', marginBottom: '24px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span style={{ fontWeight: 600 }}>{error}</span>
          </div>
        </div>
      )}

      {/* Data Table / Cards */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Loading inventory records...</p>
        </div>
      ) : !itemsResult || itemsResult.items.length === 0 ? (
        /* Empty State */
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <Package size={48} color="var(--text-light)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            No Inventory Records Found
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '6px', maxWidth: '480px', margin: '6px auto 0' }}>
            No active stock records found matching your selected search or filter criteria.
          </p>
        </div>
      ) : (
        /* Data View (Desktop Table + Mobile Cards) */
        <>
          <div className="card desktop-only" style={{ padding: 0, overflowX: 'auto', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Food Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Description</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Available / Total</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Location</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {itemsResult.items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{item.foodCategory}</td>
                    <td style={{ padding: '12px 16px' }}>{item.description}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                      {item.availableQuantity} / {item.totalQuantity} {item.unit}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${getStatusBadgeClass(item.status)}`}>{item.status}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{item.location || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link to={`/inventory/items/${item.id}`} className="btn btn-sm btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Eye size={14} />
                        <span>Details</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {itemsResult.pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Page {itemsResult.pagination.page} of {itemsResult.pagination.totalPages} ({itemsResult.pagination.total} total items)
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={page >= itemsResult.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
