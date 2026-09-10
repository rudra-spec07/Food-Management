import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FoodShareLogo } from '../../components/common/FoodShareLogo';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    try {
      setIsSubmitting(true);
      await login({ email: email.trim(), password });
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', backgroundColor: 'var(--bg-page)' }}>
      <div className="auth-split-wrapper animate-fade-in">
        {/* Left Column - Form */}
        <div className="auth-form-column">
          <div style={{ marginBottom: '28px' }}>
            <Link to="/">
              <FoodShareLogo size="md" />
            </Link>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
              Welcome Back
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Sign in to continue your journey.
            </p>
          </div>

          {errorMessage && (
            <div className="alert-banner error">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email Address</label>
              <div className="input-container">
                <Mail className="input-icon-left" size={18} />
                <input
                  id="login-email"
                  type="email"
                  className="form-input has-icon-left"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" htmlFor="login-password" style={{ marginBottom: 0 }}>Password</label>
              </div>
              <div className="input-container">
                <Lock className="input-icon-left" size={18} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input has-icon-left has-icon-right"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-foodshare btn-foodshare-primary"
              style={{ width: '100%', marginTop: '8px' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? <div className="spinner" /> : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ fontWeight: 700, color: 'var(--foodshare-green-dark)' }}>
              Sign up
            </Link>
          </div>
        </div>

        {/* Right Column - Visual Panel (Matches Reference Image Screen 3) */}
        <div className="auth-visual-column">
          <div style={{ position: 'relative', width: '200px', height: '200px', borderRadius: '50%', overflow: 'hidden', border: '4px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 12px 30px rgba(0,0,0,0.2)', marginBottom: '28px' }}>
            <img
              src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=600"
              alt="Healthy Food"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.3, maxWidth: '280px', marginBottom: '16px' }}>
            "Together We Reduce Waste We Nourish Lives"
          </h2>

          <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
            <span style={{ width: '24px', height: '6px', borderRadius: '3px', backgroundColor: '#ffffff' }} />
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.4)' }} />
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.4)' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
