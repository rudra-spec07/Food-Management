import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '48px', maxWidth: '480px' }}>
        <AlertTriangle size={56} style={{ color: 'var(--color-accent)', margin: '0 auto 16px' }} />
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>Page Not Found</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px' }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <Link to="/dashboard" className="btn btn-primary">
          <Home size={18} />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};
