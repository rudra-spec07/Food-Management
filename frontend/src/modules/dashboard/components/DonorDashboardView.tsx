import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { donationService } from '../../donors/services/donation.service';
import { Donation } from '../../donors/types/donor.types';
import { Link } from 'react-router-dom';
import {
  Heart,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  ArrowRight,
  PlusCircle,
  Bell,
  User,
  HelpCircle,
  Calendar
} from 'lucide-react';

export const DonorDashboardView: React.FC = () => {
  const { user } = useAuth();

  const [donations, setDonations] = useState<Donation[]>([]);
  const [totalSubmitted, setTotalSubmitted] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyDonations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await donationService.getMyDonations({ page: 1, limit: 5 });
      setDonations(res.items || []);
      setTotalSubmitted(res.pagination?.total || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load your recent donations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyDonations();
  }, [fetchMyDonations]);

  if (!user) return null;

  const latestDonation = donations.length > 0 ? donations[0] : null;

  return (
    <div className="animate-fade-in foodshare-container" style={{ paddingTop: '16px', paddingBottom: '40px' }}>
      {/* Welcome Header Banner */}
      <div
        className="foodshare-card"
        style={{
          padding: '24px 28px',
          marginBottom: '24px',
          backgroundColor: '#ffffff',
          borderLeft: '6px solid var(--foodshare-green-dark)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--foodshare-green-dark)' }}>
                Welcome, {user.firstName}! 👋
              </h1>
              <span className="role-badge donor">DONOR</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--foodshare-green-dark)',
                  background: 'var(--foodshare-green-soft)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--foodshare-green-border)'
                }}
              >
                <CheckCircle2 size={13} /> Verified Food Donor
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Food Donor Portal. Share surplus food to help community beneficiaries and reduce food waste.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              to="/donations"
              className="btn-foodshare btn-foodshare-primary"
              style={{ fontSize: '0.85rem', padding: '8px 16px', height: '38px', gap: '6px' }}
            >
              <PlusCircle size={16} />
              New Donation
            </Link>
            <button
              onClick={fetchMyDonations}
              className="btn-foodshare btn-foodshare-outline"
              style={{ fontSize: '0.85rem', padding: '8px 14px', height: '38px', gap: '6px' }}
              title="Refresh Donations"
            >
              <RotateCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Heart size={18} color="var(--foodshare-green-primary)" /> Donor Activity Summary
        </h2>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {[1, 2].map((i) => (
              <div key={i} className="foodshare-card" style={{ padding: '20px', minHeight: '110px' }}>
                <div className="skeleton-loader" style={{ width: '40%', height: '14px', marginBottom: '12px' }} />
                <div className="skeleton-loader" style={{ width: '60%', height: '28px' }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="foodshare-card" style={{ padding: '24px', textAlign: 'center', borderLeft: '4px solid var(--color-danger)' }}>
            <AlertCircle size={32} color="var(--color-danger)" style={{ margin: '0 auto 10px auto', display: 'block' }} />
            <p style={{ color: 'var(--text-main)', fontWeight: 600, marginBottom: '8px' }}>{error}</p>
            <button onClick={fetchMyDonations} className="btn-foodshare btn-foodshare-primary" style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
              Retry Loading
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {/* KPI 1: Total Donations Submitted (authoritative from pagination.total) */}
            <div className="foodshare-card" style={{ padding: '20px', borderTop: '4px solid #16a34a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Donations Submitted</span>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--foodshare-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--foodshare-green-dark)' }}>
                  <Package size={20} />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                {totalSubmitted.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Total food posts recorded in system
              </div>
            </div>

            {/* KPI 2: Latest Submitted Status (authoritative derived metric from most recent donation item) */}
            <div className="foodshare-card" style={{ padding: '20px', borderTop: '4px solid #3b82f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Latest Donation Status</span>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8' }}>
                  <Clock size={20} />
                </div>
              </div>
              {latestDonation ? (
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1d4ed8', textTransform: 'capitalize' }}>
                    <span className={`status-badge ${latestDonation.status.toLowerCase()}`}>
                      {latestDonation.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {latestDonation.category} ({latestDonation.quantity} {latestDonation.quantityUnit})
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-muted)' }}>No Donations Yet</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Submit your first donation to get started
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Recent Donations & Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Recent Donations List */}
        <div className="foodshare-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <Package size={18} color="var(--foodshare-green-primary)" /> Recent Donations
            </h3>
            <Link to="/donations" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foodshare-green-primary)' }}>
              Manage All &rarr;
            </Link>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-loader" style={{ height: '64px', borderRadius: 'var(--radius-sm)' }} />
              ))}
            </div>
          ) : error ? (
            <div style={{ padding: '16px', background: '#fef2f2', borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca', textAlign: 'center' }}>
              <p style={{ color: '#991b1b', fontSize: '0.85rem', marginBottom: '8px' }}>{error}</p>
              <button onClick={fetchMyDonations} className="btn-foodshare btn-foodshare-outline" style={{ padding: '4px 12px', fontSize: '0.78rem' }}>
                Retry
              </button>
            </div>
          ) : donations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', background: '#faf8f5', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)' }}>
              <Heart size={36} color="var(--foodshare-green-primary)" style={{ margin: '0 auto 10px auto', display: 'block' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>No Food Donations Posted</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                You haven't posted any surplus food donations yet.
              </p>
              <Link to="/donations" className="btn-foodshare btn-foodshare-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                Post a Donation
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {donations.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <span className="role-badge" style={{ fontSize: '0.68rem', padding: '2px 8px', marginBottom: '2px', display: 'inline-block' }}>
                        {item.category}
                      </span>
                      <h4 style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {item.description}
                      </h4>
                    </div>
                    <span className={`status-badge ${item.status.toLowerCase()}`} style={{ fontSize: '0.75rem' }}>
                      {item.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '8px', marginTop: '2px' }}>
                    <span>Quantity: <strong style={{ color: 'var(--text-main)' }}>{item.quantity} {item.quantityUnit}</strong></span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} /> Expires: {new Date(item.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Donor Quick Actions */}
        <div className="foodshare-card" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
            <Heart size={18} color="var(--foodshare-green-primary)" /> Donor Shortcuts
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '18px' }}>
            Quick links to create new donations, view donation history, update preferences, or manage your account.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link
              to="/donations"
              className="btn-foodshare btn-foodshare-primary"
              style={{ justifyContent: 'space-between', height: '42px', fontSize: '0.875rem' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={16} /> Post New Food Donation
              </span>
              <ArrowRight size={16} />
            </Link>

            <Link
              to="/donations"
              className="btn-foodshare btn-foodshare-outline"
              style={{ justifyContent: 'space-between', height: '42px', fontSize: '0.875rem' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={16} /> My Donations List
              </span>
              <ArrowRight size={16} />
            </Link>

            <Link
              to="/notifications"
              className="btn-foodshare btn-foodshare-outline"
              style={{ justifyContent: 'space-between', height: '42px', fontSize: '0.875rem' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={16} /> Notifications
              </span>
              <ArrowRight size={16} />
            </Link>

            <Link
              to="/profile"
              className="btn-foodshare btn-foodshare-outline"
              style={{ justifyContent: 'space-between', height: '42px', fontSize: '0.875rem' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={16} /> Account Profile
              </span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Donation Lifecycle Explanatory Guide */}
      <div className="foodshare-card" style={{ padding: '22px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
          <HelpCircle size={18} color="var(--foodshare-green-primary)" /> Donation Lifecycle Guide
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Understand how your surplus food donation moves through verification, assignment, pickup, and completion.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          <div style={{ padding: '12px', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>STEP 1</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '2px' }}>Pending Review</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Admin verifies safety & details.</div>
          </div>

          <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: 'var(--radius-sm)', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>STEP 2</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534', marginBottom: '2px' }}>Approved</div>
            <div style={{ fontSize: '0.75rem', color: '#166534' }}>Queued for worker dispatch.</div>
          </div>

          <div style={{ padding: '12px', background: '#eff6ff', borderRadius: 'var(--radius-sm)', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>STEP 3</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e40af', marginBottom: '2px' }}>Assigned</div>
            <div style={{ fontSize: '0.75rem', color: '#1e40af' }}>Field worker assigned for pickup.</div>
          </div>

          <div style={{ padding: '12px', background: '#f5f3ff', borderRadius: 'var(--radius-sm)', border: '1px solid #ddd6fe' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6d28d9', marginBottom: '4px' }}>STEP 4</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6d28d9', marginBottom: '2px' }}>Picked Up</div>
            <div style={{ fontSize: '0.75rem', color: '#6d28d9' }}>Food collected from your address.</div>
          </div>

          <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: 'var(--radius-sm)', border: '1px solid #86efac' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', marginBottom: '4px' }}>STEP 5</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#15803d', marginBottom: '2px' }}>Completed</div>
            <div style={{ fontSize: '0.75rem', color: '#15803d' }}>Food delivered into inventory/distribution.</div>
          </div>
        </div>

        <div style={{ marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          * Donations may also be marked <strong>Rejected</strong> if guidelines aren't met, or <strong>Cancelled</strong> by the donor prior to pickup.
        </div>
      </div>
    </div>
  );
};
