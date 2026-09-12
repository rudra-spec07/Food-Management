import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FoodShareLogo } from '../common/FoodShareLogo';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { User as UserIcon, KeyRound, LogOut, ChevronDown } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  if (!user) return null;

  const roleClass = user.role.toLowerCase();

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    if (location.pathname === '/dashboard') return 'Dashboard Overview';
    if (location.pathname === '/donations') return 'My Food Donations';
    if (location.pathname === '/admin/donations/review') return 'Donation Review Queue';
    if (location.pathname === '/admin/workers') return 'Worker Account Provisioning';
    if (location.pathname === '/admin/donations/assignments') return 'Worker Assignment Queue';
    if (location.pathname === '/worker/assignments') return 'My Assigned Tasks';
    if (location.pathname === '/inventory') return 'Inventory & Food Availability';
    if (location.pathname === '/inventory/items') return 'Inventory Stock Items';
    if (location.pathname.endsWith('/history') && location.pathname.startsWith('/inventory/items/')) return 'Inventory Movement History';
    if (location.pathname.startsWith('/inventory/items/')) return 'Inventory Batch Detail';
    if (location.pathname === '/collection/available') return 'Available Food Collections';
    if (location.pathname === '/collection') return 'Collection History';
    if (location.pathname.startsWith('/collection/')) return 'Collection Detail';
    if (location.pathname === '/distributions') return 'Food Distribution Records';
    if (location.pathname === '/distributions/new') return 'Create Food Distribution';
    if (location.pathname.startsWith('/distributions/')) return 'Distribution Detail';
    if (location.pathname === '/profile') return 'User Profile Settings';
    if (location.pathname === '/change-password') return 'Security & Password';
    return 'FoodShare App';
  };

  return (
    <header className="app-header">
      {/* Left: Mobile Brand Logo (hidden on desktop where sidebar has logo) */}
      <div className="mobile-header-brand" style={{ display: 'flex', alignItems: 'center' }}>
        <Link to="/dashboard" style={{ textDecoration: 'none' }}>
          <FoodShareLogo size="sm" showTagline={false} />
        </Link>
      </div>

      {/* Center/Left Page Title indicator (Desktop) */}
      <div className="desktop-header-title" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
        {getPageTitle()}
      </div>

      {/* Right: User Identity & Dynamic Profile Avatar Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }} ref={dropdownRef}>
        {/* User Name and Role Badge (Desktop & Tablet) */}
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }} className="user-header-info">
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }} className="user-header-name">
            {user.firstName} {user.lastName}
          </span>
          <span className={`role-badge ${roleClass}`}>{user.role}</span>
        </div>

        {/* Dynamic Profile Avatar Trigger Button */}
        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            borderRadius: '50%',
            outline: 'none',
          }}
          aria-label="Open profile menu"
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
        >
          <ProfileAvatar firstName={user.firstName} lastName={user.lastName} size="md" />
          <ChevronDown size={14} color="var(--text-muted)" style={{ transition: 'transform 0.2s ease', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </button>

        {/* Profile Dropdown Menu */}
        {dropdownOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '210px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-md)',
              padding: '8px 0',
              zIndex: 200,
              animation: 'fadeIn 0.2s ease-out forwards',
            }}
            role="menu"
            aria-orientation="vertical"
          >
            {/* Header info in dropdown for mobile view */}
            <div style={{ padding: '8px 16px 10px', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }} className="mobile-dropdown-header">
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                {user.firstName} {user.lastName}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
            </div>

            {/* Profile Link */}
            <Link
              to="/profile"
              onClick={() => setDropdownOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 16px',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: location.pathname === '/profile' ? 'var(--foodshare-green-dark)' : 'var(--text-main)',
                backgroundColor: location.pathname === '/profile' ? 'var(--foodshare-green-soft)' : 'transparent',
                textDecoration: 'none',
                transition: 'var(--transition)',
              }}
              role="menuitem"
            >
              <UserIcon size={17} color="var(--foodshare-green-primary)" />
              <span>Profile</span>
            </Link>

            {/* Security Link */}
            <Link
              to="/change-password"
              onClick={() => setDropdownOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 16px',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: location.pathname === '/change-password' ? 'var(--foodshare-green-dark)' : 'var(--text-main)',
                backgroundColor: location.pathname === '/change-password' ? 'var(--foodshare-green-soft)' : 'transparent',
                textDecoration: 'none',
                transition: 'var(--transition)',
              }}
              role="menuitem"
            >
              <KeyRound size={17} color="var(--foodshare-green-primary)" />
              <span>Security</span>
            </Link>

            {/* Divider */}
            <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '6px 0' }} />

            {/* Logout Action */}
            <button
              type="button"
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 16px',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#b91c1c',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'var(--transition)',
              }}
              role="menuitem"
            >
              <LogOut size={17} color="#b91c1c" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
