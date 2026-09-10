import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { KeyRound, Lock, Eye, EyeOff, AlertCircle, ShieldAlert } from 'lucide-react';

export const ChangePasswordPage: React.FC = () => {
  const { changePassword } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) return 'New password must be at least 8 characters long';
    if (!/[A-Z]/.test(pass)) return 'New password must contain at least one uppercase letter';
    if (!/[a-z]/.test(pass)) return 'New password must contain at least one lowercase letter';
    if (!/[0-9]/.test(pass)) return 'New password must contain at least one digit';
    if (!/[^A-Za-z0-9]/.test(pass)) return 'New password must contain at least one special character';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentPassword) {
      setErrorMessage('Please enter your current password');
      return;
    }

    const passError = validatePassword(newPassword);
    if (passError) {
      setErrorMessage(passError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation do not match');
      return;
    }

    try {
      setIsSubmitting(true);
      await changePassword({ currentPassword, newPassword });
      navigate('/login', {
        state: { message: 'Password changed successfully! All active sessions have been revoked. Please log in with your new password.' },
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to change password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in foodshare-container" style={{ maxWidth: '560px', margin: '0 auto', paddingTop: '16px', paddingBottom: '40px' }}>
      <div className="foodshare-card" style={{ padding: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--foodshare-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--foodshare-green-dark)' }}>
            <KeyRound size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--foodshare-green-dark)' }}>Security & Password</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Update your account authentication password</p>
          </div>
        </div>

        {errorMessage && (
          <div className="alert-banner error">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="cp-current">Current Password</label>
            <div className="input-container">
              <Lock className="input-icon-left" size={18} />
              <input
                id="cp-current"
                type={showPassword ? 'text' : 'password'}
                className="form-input has-icon-left has-icon-right"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="input-icon-right"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="cp-new">New Password</label>
            <div className="input-container">
              <Lock className="input-icon-left" size={18} />
              <input
                id="cp-new"
                type={showPassword ? 'text' : 'password'}
                className="form-input has-icon-left"
                placeholder="At least 8 chars, 1 uppercase, 1 digit, 1 symbol"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="cp-confirm">Confirm New Password</label>
            <div className="input-container">
              <Lock className="input-icon-left" size={18} />
              <input
                id="cp-confirm"
                type={showPassword ? 'text' : 'password'}
                className="form-input has-icon-left"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div style={{ padding: '16px', background: 'var(--foodshare-green-soft)', border: '1px solid var(--foodshare-green-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--foodshare-green-dark)', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Security Protocol Notice:</strong> Changing your password will automatically invalidate all active sessions across all devices. You will be prompted to log in with your new password.
            </div>
          </div>

          <button
            type="submit"
            className="btn-foodshare btn-foodshare-primary"
            style={{ width: '100%' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? <div className="spinner" /> : 'Update Password & Revoke Sessions'}
          </button>
        </form>
      </div>
    </div>
  );
};
