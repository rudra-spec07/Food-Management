import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FoodShareLogo } from '../../components/common/FoodShareLogo';
import { Mail, AlertCircle, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { authService } from '../../services/auth.service';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await authService.forgotPassword({ email: trimmedEmail });
      setSuccessMessage(res.message || 'If an account exists with that email, a password reset link has been sent.');
    } catch (err: any) {
      // Even on API error, unless rate limited, retain generic message if appropriate,
      // but if server returns error (e.g. rate limit), display error message
      setErrorMessage(err.response?.data?.error?.message || err.message || 'An error occurred. Please try again.');
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
              Forgot Password?
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Enter your email address and we'll send you instructions to reset your password.
            </p>
          </div>

          {errorMessage && (
            <div className="alert-banner error" role="alert">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage ? (
            <div style={{ textAlign: 'left' }}>
              <div className="alert-banner success" style={{ marginBottom: '24px' }} role="status">
                <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
                <span>{successMessage}</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Please check your inbox (and spam folder) for the password reset link. The link expires in 15 minutes.
              </p>
              <Link
                to="/login"
                className="btn-foodshare btn-foodshare-primary"
                style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
              >
                <ArrowLeft size={18} />
                <span>Return to Sign In</span>
              </Link>
            </div>
          ) : (
            <form noValidate onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="forgot-email">Email Address</label>
                <div className="input-container">
                  <Mail className="input-icon-left" size={18} />
                  <input
                    id="forgot-email"
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

              <button
                type="submit"
                className="btn-foodshare btn-foodshare-primary"
                style={{ width: '100%', marginTop: '8px' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? <div className="spinner" /> : (
                  <>
                    <span>Send Reset Link</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <Link
                  to="/login"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--foodshare-green-dark)', textDecoration: 'none' }}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Right Column - Visual Panel */}
        <div className="auth-visual-column">
          <div style={{ position: 'relative', width: '200px', height: '200px', borderRadius: '50%', overflow: 'hidden', border: '4px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 12px 30px rgba(0,0,0,0.2)', marginBottom: '28px' }}>
            <img
              src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=600"
              alt="Healthy Food"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.3, maxWidth: '280px', marginBottom: '16px' }}>
            "Secure Access to Your Food Share Account"
          </h2>

          <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.4)' }} />
            <span style={{ width: '24px', height: '6px', borderRadius: '3px', backgroundColor: '#ffffff' }} />
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.4)' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
