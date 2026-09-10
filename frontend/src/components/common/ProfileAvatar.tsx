import React from 'react';

interface ProfileAvatarProps {
  firstName?: string | null;
  lastName?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export const getUserInitial = (firstName?: string | null): string => {
  if (!firstName || typeof firstName !== 'string') return 'U';
  const trimmed = firstName.trim();
  if (!trimmed) return 'U';
  return trimmed.charAt(0).toUpperCase();
};

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ firstName, lastName, size = 'md' }) => {
  const initial = getUserInitial(firstName);
  const sizePx = size === 'sm' ? '32px' : size === 'lg' ? '44px' : '36px';
  const fontSize = size === 'sm' ? '0.8rem' : size === 'lg' ? '1.1rem' : '0.9rem';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'User Profile';

  return (
    <div
      style={{
        width: sizePx,
        height: sizePx,
        borderRadius: '50%',
        backgroundColor: 'var(--foodshare-green-dark)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize,
        boxShadow: '0 2px 6px rgba(15, 82, 52, 0.2)',
        border: '2px solid #ffffff',
        flexShrink: 0,
        userSelect: 'none',
      }}
      title={fullName}
      aria-label={`Avatar for ${fullName}`}
    >
      {initial}
    </div>
  );
};
