import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FoodShareLogo } from '../../components/common/FoodShareLogo';
import { User, Mail, Phone, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, HeartHandshake } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) return 'Password must be at least 8 characters long';
    if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(pass)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(pass)) return 'Password must contain at least one digit';
    if (!/[^A-Za-z0-9]/.test(pass)) return 'Password must contain at least one special character';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Please enter both your first name and last name');
      return;
    }

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    const passError = validatePassword(password);
    if (passError) {
      setErrorMessage(passError);
      return;
    }

    try {
      setIsSubmitting(true);
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', backgroundColor: 'var(--bg-page)' }}>
      <div className="auth-split-wrapper animate-fade-in" style={{ maxWidth: '1060px' }}>
        {/* Left Column - Registration Form */}
        <div className="auth-form-column">
          <div style={{ marginBottom: '24px' }}>
            <Link to="/">
              <FoodShareLogo size="md" />
            </Link>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
              Create Your Account
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Join us in making a positive impact.
            </p>
          </div>

          {/* Account Category Pill Indicator (Matching Screen 2 Reference) */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>I am registering as:</div>
            <div className="role-pill-selector">
              <button type="button" className="role-pill-item active" style={{ cursor: 'default' }}>
                <HeartHandshake size={16} color="var(--foodshare-green-dark)" />
                <span>Food Donor</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="alert-banner error">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-firstName">First Name</label>
                <div className="input-container">
                  <User className="input-icon-left" size={18} />
                  <input
                    id="reg-firstName"
                    type="text"
                    className="form-input has-icon-left"
                    placeholder="Enter first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-lastName">Last Name</label>
                <div className="input-container">
                  <input
                    id="reg-lastName"
                    type="text"
                    className="form-input"
                    placeholder="Enter last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email Address</label>
              <div className="input-container">
                <Mail className="input-icon-left" size={18} />
                <input
                  id="reg-email"
                  type="email"
                  className="form-input has-icon-left"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-phone">Phone Number <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Optional)</span></label>
              <div className="input-container">
                <Phone className="input-icon-left" size={18} />
                <input
                  id="reg-phone"
                  type="tel"
                  className="form-input has-icon-left"
                  placeholder="Enter phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password</label>
              <div className="input-container">
                <Lock className="input-icon-left" size={18} />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input has-icon-left has-icon-right"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <button
              type="submit"
              className="btn-foodshare btn-foodshare-primary"
              style={{ width: '100%', marginTop: '8px' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? <div className="spinner" /> : 'Create Account'}
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 700, color: 'var(--foodshare-green-dark)' }}>
              Log in
            </Link>
          </div>
        </div>

        {/* Right Column - Visual Panel (Matches Screen 2 Reference) */}
        <div className="auth-visual-column" style={{ justifyContent: 'center', padding: '48px 36px' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.2, marginBottom: '20px' }}>
            Be a Part of a Hunger-Free Tomorrow
          </h2>

          <div style={{ width: '180px', height: '140px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px', border: '1px solid rgba(255,255,255,0.2)' }}>
            <HeartHandshake size={64} style={{ color: '#ffffff' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', width: '100%', maxWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#ffffff' }}>
              <CheckCircle2 size={18} style={{ color: '#86efac', flexShrink: 0 }} />
              <span>Easy registration</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#ffffff' }}>
              <CheckCircle2 size={18} style={{ color: '#86efac', flexShrink: 0 }} />
              <span>Start donating in minutes</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#ffffff' }}>
              <CheckCircle2 size={18} style={{ color: '#86efac', flexShrink: 0 }} />
              <span>Make a real difference</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
