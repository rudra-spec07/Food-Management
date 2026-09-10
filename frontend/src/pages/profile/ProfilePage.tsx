import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User as UserIcon, Mail, Phone, Shield, CheckCircle2, AlertCircle } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('First name and Last name cannot be empty');
      return;
    }

    try {
      setIsSubmitting(true);
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
      });
      setSuccessMessage('Profile updated successfully!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in foodshare-container" style={{ maxWidth: '680px', margin: '0 auto', paddingTop: '16px', paddingBottom: '40px' }}>
      <div className="foodshare-card" style={{ padding: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--foodshare-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--foodshare-green-dark)' }}>
            <UserIcon size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--foodshare-green-dark)' }}>Account Profile</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage your personal details and contact information</p>
          </div>
        </div>

        {successMessage && (
          <div className="alert-banner success">
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="alert-banner error">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Editable Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="prof-firstName">First Name</label>
              <input
                id="prof-firstName"
                type="text"
                className="form-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="prof-lastName">Last Name</label>
              <input
                id="prof-lastName"
                type="text"
                className="form-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="prof-phone">Phone Number</label>
            <div className="input-container">
              <Phone className="input-icon-left" size={18} />
              <input
                id="prof-phone"
                type="tel"
                className="form-input has-icon-left"
                placeholder="+1 555-0199"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Immutable Security Information */}
          <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <Shield size={16} /> Read-Only Security Attributes
            </h3>

            <div className="form-group">
              <label className="form-label">Email Address (Read-Only)</label>
              <div className="input-container">
                <Mail className="input-icon-left" size={18} />
                <input
                  type="email"
                  className="form-input has-icon-left"
                  value={user.email}
                  disabled
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', color: 'var(--text-muted)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Assigned Role</label>
                <input
                  type="text"
                  className="form-input"
                  value={user.role}
                  disabled
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', fontWeight: 600, color: 'var(--foodshare-green-dark)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Account Status</label>
                <input
                  type="text"
                  className="form-input"
                  value={user.status}
                  disabled
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', fontWeight: 600, color: 'var(--foodshare-green-dark)' }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn-foodshare btn-foodshare-primary"
            style={{ width: '100%', marginTop: '24px' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? <div className="spinner" /> : 'Save Profile Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};
