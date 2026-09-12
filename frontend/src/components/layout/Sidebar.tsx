import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FoodShareLogo } from '../common/FoodShareLogo';
import { LayoutDashboard, HeartHandshake, ClipboardCheck, UserPlus, ClipboardList, Package, Truck, Layers } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ...(user.role === 'DONOR'
      ? [{ label: 'My Donations', path: '/donations', icon: HeartHandshake }]
      : []),
    ...(user.role === 'ADMIN'
      ? [
          { label: 'Donation Review', path: '/admin/donations/review', icon: ClipboardCheck },
          { label: 'Worker Management', path: '/admin/workers', icon: UserPlus },
          { label: 'Assignment Queue', path: '/admin/donations/assignments', icon: ClipboardList },
          { label: 'Inventory', path: '/inventory', icon: Layers },
        ]
      : []),
    ...(user.role === 'WORKER'
      ? [
          { label: 'My Assignments', path: '/worker/assignments', icon: ClipboardList },
          { label: 'Available Food', path: '/collection/available', icon: Package },
          { label: 'Inventory', path: '/inventory', icon: Layers },
          { label: 'Distributions', path: '/distributions', icon: Truck },
        ]
      : []),
  ];

  return (
    <aside className="app-sidebar">
      {/* Brand Section */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
        <Link to="/dashboard" style={{ textDecoration: 'none' }}>
          <FoodShareLogo size="md" />
        </Link>
      </div>

      {/* Main Navigation Links */}
      <nav style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 12px 8px' }}>
          Main Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 16px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.925rem',
                fontWeight: isActive ? 700 : 600,
                color: isActive ? 'var(--foodshare-green-dark)' : 'var(--text-muted)',
                backgroundColor: isActive ? 'var(--foodshare-green-soft)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--foodshare-green-primary)' : '3px solid transparent',
                transition: 'var(--transition)',
              }}
            >
              <Icon size={19} color={isActive ? 'var(--foodshare-green-primary)' : 'currentColor'} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
