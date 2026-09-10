import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export const AppLayout: React.FC = () => {
  return (
    <div className="app-shell">
      {/* Desktop Left Sidebar (Visible >= 1024px) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="app-main-layout">
        {/* Sticky Top Header Bar */}
        <Navbar />

        {/* Dynamic Page Content */}
        <main className="app-main-content" style={{ flex: 1, width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '24px 20px' }}>
          <Outlet />
        </main>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid var(--border-color)', padding: '18px 24px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          NourishLink Food Donation Management System — Module 01 Foundation & Auth Baseline
        </footer>
      </div>

      {/* Fixed Bottom Navigation Bar (Visible < 1024px for Tablet & Mobile) */}
      <BottomNav />
    </div>
  );
};
