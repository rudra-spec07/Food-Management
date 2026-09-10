import React from 'react';
import { Link } from 'react-router-dom';
import { FoodShareLogo } from '../../components/common/FoodShareLogo';
import { Heart, Play, ArrowRight, Sparkles } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)', color: 'var(--text-main)' }}>
      {/* Top Header / Navigation Bar */}
      <header style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="foodshare-container" style={{ height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <FoodShareLogo size="md" showTagline={false} />

          {/* Nav Links */}
          <nav style={{ display: 'none', gap: '28px', alignItems: 'center', fontWeight: 600, fontSize: '0.95rem' }} className="desktop-nav">
            <a href="#about" style={{ color: 'var(--text-main)' }}>About</a>
            <a href="#how-it-works" style={{ color: 'var(--text-main)' }}>How it works</a>
            <a href="#impact" style={{ color: 'var(--text-main)' }}>Impact</a>
            <a href="#contact" style={{ color: 'var(--text-main)' }}>Contact</a>
          </nav>

          {/* Auth Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link to="/login" className="btn-foodshare btn-foodshare-outline" style={{ height: '42px', padding: '0 18px' }}>
              Log in
            </Link>
            <Link to="/register" className="btn-foodshare btn-foodshare-primary" style={{ height: '42px', padding: '0 20px' }}>
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Top Banner Tagline */}
      <div style={{ padding: '8px 16px', textAlign: 'right', fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)', maxWidth: '1280px', margin: '0 auto' }}>
        “ Good Food Finds a Better Home ”
      </div>

      {/* Main Hero Section (Screen 1 Reference) */}
      <main className="foodshare-container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center' }}>
          {/* Hero Left Content */}
          <div className="animate-fade-in">
            <div className="badge-pill" style={{ marginBottom: '20px' }}>
              <Sparkles size={14} color="var(--foodshare-green-dark)" />
              <span>Reduce Food Waste • Support Communities</span>
            </div>

            <h1 style={{ fontSize: 'clamp(2.4rem, 5vw, 3.5rem)', fontWeight: 800, color: 'var(--foodshare-green-dark)', lineHeight: 1.1, marginBottom: '20px' }}>
              Good Food <br />
              <span style={{ color: 'var(--text-main)' }}>Brighter Tomorrows</span>
            </h1>

            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '520px', marginBottom: '32px' }}>
              We connect those who have surplus food with those who need it — because no good food should go to waste.
            </p>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Link to="/register" className="btn-foodshare btn-foodshare-primary" style={{ height: '52px', padding: '0 28px', fontSize: '1rem' }}>
                <span>Get Started</span>
                <ArrowRight size={18} />
              </Link>

              <button className="btn-foodshare btn-foodshare-outline" style={{ height: '52px', padding: '0 24px', fontSize: '1rem' }}>
                <Play size={18} fill="var(--foodshare-green-dark)" />
                <span>Watch Video</span>
              </button>
            </div>
          </div>

          {/* Hero Right Visual Card */}
          <div className="animate-fade-in" style={{ position: 'relative' }}>
            <div className="foodshare-card" style={{ padding: '16px', borderRadius: 'var(--radius-lg)', background: '#ffffff', boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ position: 'relative', height: '360px', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <img
                  src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=800"
                  alt="Food Donation Community"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                
                {/* Floating Badge 1 */}
                <div style={{ position: 'absolute', top: '20px', left: '20px', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', padding: '10px 16px', borderRadius: 'var(--radius-full)', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--foodshare-green-dark)' }}>
                  <Heart size={16} fill="var(--foodshare-green-dark)" />
                  <span>Share • Nourish • Change</span>
                </div>

                {/* Floating Card Banner 2 */}
                <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', backgroundColor: 'rgba(15, 82, 52, 0.92)', backdropFilter: 'blur(12px)', color: '#ffffff', padding: '16px 20px', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '2px' }}>Food Creates Happier Communities</h4>
                  <p style={{ fontSize: '0.8rem', color: '#dcfce7' }}>Over 10,000+ meals delivered safely to families in need.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Impact Stats Counters */}
        <div style={{ marginTop: '64px', paddingTop: '40px', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px' }}>
          <div className="stat-box">
            <div className="stat-num">10K+</div>
            <div className="stat-label">Meals Shared</div>
          </div>

          <div className="stat-box">
            <div className="stat-num">500+</div>
            <div className="stat-label">Active Partners</div>
          </div>

          <div className="stat-box">
            <div className="stat-num">25+</div>
            <div className="stat-label">Cities Covered</div>
          </div>

          <div className="stat-box">
            <div className="stat-num">100+ Ton</div>
            <div className="stat-label">Food Waste Prevented</div>
          </div>
        </div>
      </main>
    </div>
  );
};
