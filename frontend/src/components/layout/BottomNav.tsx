import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  HeartHandshake,
  ClipboardCheck,
  UserPlus,
  ClipboardList,
  Package,
  Truck,
  Layers,
  Bookmark,
  Bell,
  Users,
  BarChart3,
  Shield,
  UtensilsCrossed,
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isFoodAnalyzerEnabled = import.meta.env.VITE_FOOD_ANALYZER_ENABLED !== 'false';

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Notifications', path: '/notifications', icon: Bell },
    ...(user.role === 'DONOR'
      ? [
          { label: 'My Donations', path: '/donations', icon: HeartHandshake },
          ...(isFoodAnalyzerEnabled
            ? [{ label: 'Planner', path: '/food-planner', icon: UtensilsCrossed }]
            : []),
        ]
      : []),
    ...(user.role === 'ADMIN'
      ? [
          { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
          ...(isFoodAnalyzerEnabled
            ? [{ label: 'Planner', path: '/food-planner', icon: UtensilsCrossed }]
            : []),
          { label: 'Review', path: '/admin/donations/review', icon: ClipboardCheck },
          { label: 'Workers', path: '/admin/workers', icon: UserPlus },
          { label: 'Assignments', path: '/admin/donations/assignments', icon: ClipboardList },
          { label: 'Audit Logs', path: '/admin/audit-logs', icon: Shield },
          { label: 'Available Food', path: '/collection/available', icon: Package },
          { label: 'Inventory', path: '/inventory', icon: Layers },
          { label: 'Reservations', path: '/reservations', icon: Bookmark },
          { label: 'Distributions', path: '/distributions', icon: Truck },
          { label: 'Beneficiaries', path: '/beneficiaries', icon: Users },
        ]
      : []),
    ...(user.role === 'WORKER'
      ? [
          { label: 'Dashboard', path: '/worker/dashboard', icon: BarChart3 },
          { label: 'Assignments', path: '/worker/assignments', icon: ClipboardList },
          { label: 'Available Food', path: '/collection/available', icon: Package },
          { label: 'Inventory', path: '/inventory', icon: Layers },
          { label: 'Reservations', path: '/reservations', icon: Bookmark },
          { label: 'Distributions', path: '/distributions', icon: Truck },
          { label: 'Beneficiaries', path: '/beneficiaries', icon: Users },
        ]
      : []),
  ];

  return (
    <nav className="app-bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;

        return (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              padding: '6px 12px',
              minWidth: '68px',
              flexShrink: 0,
              color: isActive ? 'var(--foodshare-green-dark)' : 'var(--text-muted)',
              backgroundColor: isActive ? 'var(--foodshare-green-soft)' : 'transparent',
              borderRadius: 'var(--radius-sm)',
              fontWeight: isActive ? 700 : 500,
              fontSize: '0.725rem',
              textDecoration: 'none',
              transition: 'var(--transition)',
            }}
          >
            <Icon size={19} color={isActive ? 'var(--foodshare-green-primary)' : 'currentColor'} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};
