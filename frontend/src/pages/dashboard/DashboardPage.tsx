import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ShieldCheck, Clock, Package, CheckCircle2, Truck, Users, Heart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const roleClass = user.role.toLowerCase();

  return (
    <div className="animate-fade-in foodshare-container" style={{ paddingTop: '16px', paddingBottom: '40px' }}>
      {/* Welcome Banner Card */}
      <div className="foodshare-card" style={{ padding: '32px', marginBottom: '28px', backgroundColor: '#ffffff', borderLeft: '6px solid var(--foodshare-green-dark)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--foodshare-green-dark)' }}>
                Welcome, {user.firstName}! 👋
              </h1>
              <span className={`role-badge ${roleClass}`}>{user.role}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--foodshare-green-dark)', background: 'var(--foodshare-green-soft)', padding: '4px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--foodshare-green-border)' }}>
                <CheckCircle2 size={14} /> ACTIVE
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '640px' }}>
              Logged in as <strong style={{ color: 'var(--text-main)' }}>{user.email}</strong>. Welcome to your FoodShare dashboard.
            </p>
          </div>

          <div style={{ background: 'var(--foodshare-green-soft)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--foodshare-green-border)', minWidth: '220px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Clock size={14} /> Active Session Timestamp
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--foodshare-green-dark)' }}>
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Current Session Active'}
            </div>
          </div>
        </div>
      </div>

      {/* Impact Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="foodshare-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--foodshare-green-dark)', fontFamily: 'var(--font-heading)' }}>10K+</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Meals Shared</div>
        </div>

        <div className="foodshare-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--foodshare-green-dark)', fontFamily: 'var(--font-heading)' }}>500+</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Partners</div>
        </div>

        <div className="foodshare-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--foodshare-green-dark)', fontFamily: 'var(--font-heading)' }}>25+</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Cities Reached</div>
        </div>

        <div className="foodshare-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--foodshare-green-dark)', fontFamily: 'var(--font-heading)' }}>100+ Ton</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Waste Prevented</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Role Overview */}
        <div className="foodshare-card">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--foodshare-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--foodshare-green-dark)', marginBottom: '16px' }}>
            {user.role === 'DONOR' && <Package size={26} />}
            {user.role === 'ADMIN' && <Users size={26} />}
            {user.role === 'WORKER' && <Truck size={26} />}
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
            {user.role === 'DONOR' && 'Food Donor Account'}
            {user.role === 'ADMIN' && 'System Administrator'}
            {user.role === 'WORKER' && 'Pickup Worker Account'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: 1.5 }}>
            {user.role === 'DONOR' && 'Your account is enabled to post surplus food donations for verification and pickup coordination.'}
            {user.role === 'ADMIN' && 'Administrative oversight enabled. Manage donation approvals, worker assignments, and system audit logs.'}
            {user.role === 'WORKER' && 'Pickup worker dispatch enabled. Receive pickup assignments, navigate to locations, and complete collections.'}
          </p>
          <div style={{ padding: '14px', background: 'var(--foodshare-green-soft)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--foodshare-green-dark)', fontWeight: 600 }}>
            ✓ Module 01 Foundation & Authentication Active
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="foodshare-card">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--foodshare-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--foodshare-green-dark)', marginBottom: '16px' }}>
            <Heart size={26} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>Account Controls</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
            Manage your personal profile details or update your authentication security credentials.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link to="/profile" className="btn-foodshare btn-foodshare-outline" style={{ justifyContent: 'space-between', height: '42px', fontSize: '0.875rem' }}>
              <span>View & Edit Profile</span>
              <ArrowRight size={16} />
            </Link>
            <Link to="/change-password" className="btn-foodshare btn-foodshare-outline" style={{ justifyContent: 'space-between', height: '42px', fontSize: '0.875rem' }}>
              <span>Update Security Password</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Security Overview Banner */}
      <div className="foodshare-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid var(--foodshare-green-dark)' }}>
        <ShieldCheck size={36} style={{ color: 'var(--foodshare-green-dark)', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
            Security & Session Compliance
          </h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Every API operation requires server-side token signature verification and active database session validation. Changing your password automatically revokes all sessions across devices.
          </p>
        </div>
      </div>
    </div>
  );
};
