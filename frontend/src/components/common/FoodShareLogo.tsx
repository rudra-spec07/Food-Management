import React from 'react';
import { Leaf } from 'lucide-react';

interface FoodShareLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const FoodShareLogo: React.FC<FoodShareLogoProps> = ({ size = 'md', showTagline = false }) => {
  const iconSizes = { sm: 18, md: 24, lg: 32 };
  const textSizes = { sm: '1.1rem', md: '1.35rem', lg: '1.75rem' };
  const boxSizes = { sm: '32px', md: '40px', lg: '48px' };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      <div
        style={{
          width: boxSizes[size],
          height: boxSizes[size],
          borderRadius: '10px',
          backgroundColor: 'var(--foodshare-green-dark)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <Leaf size={iconSizes[size]} fill="#ffffff" style={{ opacity: 0.95 }} />
      </div>
      <div>
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: textSizes[size],
            fontWeight: 700,
            color: 'var(--foodshare-green-dark)',
            letterSpacing: '-0.03em',
            lineHeight: 1,
            display: 'block',
          }}
        >
          FoodShare
        </span>
        {showTagline && (
          <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
            Good Food Finds a Better Home
          </span>
        )}
      </div>
    </div>
  );
};
