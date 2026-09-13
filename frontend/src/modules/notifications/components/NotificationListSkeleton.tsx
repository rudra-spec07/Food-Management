import React from 'react';

export const NotificationListSkeleton: React.FC = () => {
  return (
    <div>
      {[1, 2, 3, 4].map((idx) => (
        <div
          key={idx}
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: '12px',
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start',
            animation: 'pulse 1.5s infinite ease-in-out',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'var(--border-color)',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                height: '16px',
                width: '40%',
                backgroundColor: 'var(--border-color)',
                borderRadius: '4px',
                marginBottom: '8px',
              }}
            />
            <div
              style={{
                height: '14px',
                width: '85%',
                backgroundColor: 'var(--border-color)',
                borderRadius: '4px',
                marginBottom: '6px',
              }}
            />
            <div
              style={{
                height: '12px',
                width: '25%',
                backgroundColor: 'var(--border-color)',
                borderRadius: '4px',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
