import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LayoutDashboard } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
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
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              padding: '6px 12px',
              color: isActive ? 'var(--foodshare-green-dark)' : 'var(--text-muted)',
              fontWeight: isActive ? 700 : 500,
              fontSize: '0.75rem',
              textDecoration: 'none',
              transition: 'var(--transition)',
              flex: 1,
            }}
          >
            <Icon size={20} color={isActive ? 'var(--foodshare-green-dark)' : 'currentColor'} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
