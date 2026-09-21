import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Plus, Trash2, Loader2, AlertCircle, RotateCcw, HeartHandshake } from 'lucide-react';
import { aiEstimatorService, AiEstimateItem } from '../../../services/ai-estimator.service';

export const FoodQuantityPlanner: React.FC = () => {
  const navigate = useNavigate();
  const isEnabled = import.meta.env.VITE_FOOD_ANALYZER_ENABLED !== 'false';

  const [peopleCount, setPeopleCount] = useState<number | string>(50);
  const [items, setItems] = useState<string[]>(['Rice', 'Dal', 'Vegetable Curry']);
  const [newItemName, setNewItemName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimates, setEstimates] = useState<AiEstimateItem[]>([]);
  const [hasEstimated, setHasEstimated] = useState(false);

  if (!isEnabled) {
    return (
      <div
        className="foodshare-card"
        style={{ padding: '32px', textAlign: 'center', backgroundColor: 'var(--bg-surface)' }}
      >
        <AlertCircle size={36} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 8px' }}>
          Food Quantity Planner Unavailable
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          The AI Food Quantity Planner feature is currently disabled in system settings.
        </p>
      </div>
    );
  }

  const handleAddItem = () => {
    const trimmed = newItemName.trim();
    if (!trimmed) return;
    if (items.length >= 10) return;
    setItems((prev) => [...prev, trimmed]);
    setNewItemName('');
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEstimate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const count = Number(peopleCount);
    if (isNaN(count) || count < 1 || count > 1000) {
      setError('Number of people must be between 1 and 1000.');
      return;
    }

    const validItems = items.map((i) => i.trim()).filter((i) => i.length > 0);
    if (validItems.length === 0) {
      setError('Please add at least 1 food item to estimate.');
      return;
    }

    try {
      setLoading(true);
      const results = await aiEstimatorService.estimateQuantity({
        peopleCount: count,
        foodItems: validItems,
      });
      setEstimates(results);
      setHasEstimated(true);
    } catch (err: any) {
      const msg =
        err?.message ||
        'AI estimation is temporarily unavailable. You can try again or plan your quantities manually.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanAgain = () => {
    setEstimates([]);
    setHasEstimated(false);
    setError(null);
  };

  return (
    <div style={{ maxWidth: '768px', margin: '0 auto' }}>
      {/* Header Info */}
      <div
        className="foodshare-card animate-fade-in"
        style={{
          padding: '28px',
          borderRadius: 'var(--radius-lg, 12px)',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, var(--foodshare-green-soft, #ecfdf5) 0%, #ffffff 100%)',
          border: '1px solid var(--border-color, #e2e8f0)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--foodshare-green-primary, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            <UtensilsCrossed size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-main)' }}>
              Plan Before You Prepare
            </h1>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Tell us how many people you&apos;re preparing food for and what you&apos;re making. We&apos;ll estimate the quantity you may need to help reduce excess food preparation and prevent food waste.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '14px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#b91c1c',
            fontSize: '0.875rem',
          }}
        >
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Input Form Section */}
      {!hasEstimated ? (
        <form
          onSubmit={handleEstimate}
          className="foodshare-card animate-fade-in"
          style={{
            padding: '28px',
            borderRadius: 'var(--radius-lg, 12px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div className="form-group">
            <label htmlFor="planner-people-count" className="form-label" style={{ fontWeight: 700 }}>
              Number of People *
            </label>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '-4px', marginBottom: '8px' }}>
              How many people are you expecting to feed?
            </p>
            <input
              id="planner-people-count"
              type="number"
              className="form-input"
              min="1"
              max="1000"
              value={peopleCount}
              onChange={(e) => setPeopleCount(e.target.value)}
              placeholder="e.g. 50"
              required
              style={{ maxWidth: '240px' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="planner-add-item" className="form-label" style={{ fontWeight: 700 }}>
              Food Items Menu (Max 10) *
            </label>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '-4px', marginBottom: '8px' }}>
              List the main dishes or food items you plan to prepare.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                id="planner-add-item"
                type="text"
                className="form-input"
                placeholder="e.g. Biryani, Chapati, Kheer"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddItem();
                  }
                }}
                disabled={items.length >= 10}
              />
              <button
                type="button"
                onClick={handleAddItem}
                disabled={items.length >= 10 || !newItemName.trim()}
                className="btn-foodshare btn-foodshare-outline"
                style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
              >
                <Plus size={16} />
                <span>Add Item</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {items.map((item, idx) => (
                <span
                  key={idx}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: 'var(--bg-surface, #ffffff)',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    borderRadius: '20px',
                    padding: '6px 14px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  {item}
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: 'var(--text-muted, #94a3b8)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      aria-label={`Remove ${item}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-start' }}>
            <button
              type="submit"
              disabled={loading}
              className="btn-foodshare btn-foodshare-primary"
              style={{
                padding: '12px 24px',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Estimating food quantities...</span>
                </>
              ) : (
                <>
                  <UtensilsCrossed size={18} />
                  <span>Estimate Quantity</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Recommendation Results View */
        <div
          className="foodshare-card animate-fade-in"
          style={{ padding: '28px', borderRadius: 'var(--radius-lg, 12px)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 4px' }}>
                Food Quantity Plan
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Estimated preparation amounts for approximately <strong>{peopleCount} people</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={handlePlanAgain}
              className="btn-foodshare btn-foodshare-outline"
              style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCcw size={15} />
              <span>Plan Again</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            {estimates.map((est, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '18px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-main)' }}>
                    {est.foodItem}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {est.reasoning || 'Estimated based on standard serving sizes.'}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                    Recommended
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--foodshare-green-dark, #047857)' }}>
                    ~{est.quantity} {est.unit}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Result Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <button
              type="button"
              onClick={handlePlanAgain}
              className="btn-foodshare btn-foodshare-outline"
              style={{ padding: '8px 18px', fontSize: '0.875rem' }}
            >
              Plan Again
            </button>

            <button
              type="button"
              onClick={() => navigate('/donations')}
              className="btn-foodshare btn-foodshare-primary"
              style={{
                padding: '8px 18px',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <HeartHandshake size={16} />
              <span>Create Donation</span>
            </button>
          </div>
        </div>
      )}

      {/* Advisory Disclaimer */}
      <div
        style={{
          marginTop: '20px',
          padding: '12px 16px',
          backgroundColor: '#f1f5f9',
          borderRadius: 'var(--radius-sm, 6px)',
          fontSize: '0.775rem',
          color: '#475569',
          lineHeight: 1.5,
        }}
      >
        💡 <strong>Advisory Disclaimer:</strong> AI quantity estimates are advisory. Actual requirements may vary based on serving size, menu, preparation method, and the people being served. Review the estimate before preparing food.
      </div>
    </div>
  );
};
