import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FoodShareLogo } from '../../components/common/FoodShareLogo';
import { Lock, Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { authService } from '../../services/auth.service';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const rawToken = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validatePassword = (pass: string): string | null => {
    if (!pass) return 'Password is required';
    if (pass.length < 8) return 'Password must be at least 8 characters long';
    if (pass.length > 100) return 'Password must not exceed 100 characters';
    if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(pass)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(pass)) return 'Password must contain at least one digit';
    if (!/[^A-Za-z0-9]/.test(pass)) return 'Password must contain at least one special character';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!rawToken || rawToken.length !== 64) {
      setErrorMessage('Invalid or expired password reset link. Please request a new password reset link.');
      return;
    }

    const passError = validatePassword(newPassword);
    if (passError) {
      setErrorMessage(passError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await authService.resetPassword({
        token: rawToken,
        newPassword,
      });
      setSuccessMessage(res.message || 'Your password has been successfully reset. Please log in with your new password.');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to reset password. The link may have expired or already been used.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTokenMissingOrInvalid = !rawToken || rawToken.length !== 64;

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
              Reset Password
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Create a new secure password for your account.
            </p>
          </div>

          {isTokenMissingOrInvalid && !successMessage && (
            <div className="alert-banner error" style={{ marginBottom: '24px' }} role="alert">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>Invalid or missing reset token. Please request a new password reset link.</span>
            </div>
          )}

          {errorMessage && (
            <div className="alert-banner error" style={{ marginBottom: '24px' }} role="alert">
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
              <Link
                to="/login"
                className="btn-foodshare btn-foodshare-primary"
                style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
              >
                <span>Proceed to Log In</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <form noValidate onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="reset-new-password">New Password</label>
                <div className="input-container">
                  <Lock className="input-icon-left" size={18} />
                  <input
                    id="reset-new-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input has-icon-left has-icon-right"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isSubmitting || isTokenMissingOrInvalid}
                    autoComplete="new-password"
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

              <div className="form-group">
                <label className="form-label" htmlFor="reset-confirm-password">Confirm New Password</label>
                <div className="input-container">
                  <Lock className="input-icon-left" size={18} />
                  <input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-input has-icon-left has-icon-right"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting || isTokenMissingOrInvalid}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="input-icon-right"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn-foodshare btn-foodshare-primary"
                style={{ width: '100%', marginTop: '8px' }}
                disabled={isSubmitting || isTokenMissingOrInvalid}
              >
                {isSubmitting ? <div className="spinner" /> : (
                  <>
                    <span>Reset Password</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.875rem' }}>
                Need a new link?{' '}
                <Link to="/forgot-password" style={{ fontWeight: 600, color: 'var(--foodshare-green-dark)' }}>
                  Request Password Reset
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
            "Security & Safety For Every Member"
          </h2>

          <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.4)' }} />
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.4)' }} />
            <span style={{ width: '24px', height: '6px', borderRadius: '3px', backgroundColor: '#ffffff' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
