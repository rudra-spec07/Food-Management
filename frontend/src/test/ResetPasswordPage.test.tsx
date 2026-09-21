import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { authService } from '../services/auth.service';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/auth.service', () => ({
  authService: {
    resetPassword: vi.fn(),
  },
}));

describe('ResetPasswordPage Component', () => {
  const validToken = 'a'.repeat(64);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles missing or invalid token in query string', () => {
    render(
      <MemoryRouter initialEntries={['/reset-password?token=invalid']}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/invalid or missing reset token/i)).toBeInTheDocument();
  });

  it('renders password form when token is valid', () => {
    render(
      <MemoryRouter initialEntries={[`/reset-password?token=${validToken}`]}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  it('validates password policy and matching confirmation', async () => {
    render(
      <MemoryRouter initialEntries={[`/reset-password?token=${validToken}`]}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    const newPassInput = screen.getByLabelText('New Password');
    const confirmPassInput = screen.getByLabelText('Confirm New Password');
    const submitBtn = screen.getByRole('button', { name: /reset password/i });

    // Weak password
    fireEvent.change(newPassInput, { target: { value: 'weak' } });
    fireEvent.change(confirmPassInput, { target: { value: 'weak' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();

    // Mismatched confirmation
    fireEvent.change(newPassInput, { target: { value: 'ValidPass123!' } });
    fireEvent.change(confirmPassInput, { target: { value: 'DifferentPass123!' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('submits valid token and new password and displays success screen', async () => {
    vi.mocked(authService.resetPassword).mockResolvedValueOnce({
      message: 'Your password has been successfully reset. Please log in with your new password.',
    });

    render(
      <MemoryRouter initialEntries={[`/reset-password?token=${validToken}`]}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    const newPassInput = screen.getByLabelText('New Password');
    const confirmPassInput = screen.getByLabelText('Confirm New Password');
    const submitBtn = screen.getByRole('button', { name: /reset password/i });

    fireEvent.change(newPassInput, { target: { value: 'ValidPass123!' } });
    fireEvent.change(confirmPassInput, { target: { value: 'ValidPass123!' } });
    fireEvent.click(submitBtn);

    expect(authService.resetPassword).toHaveBeenCalledWith({
      token: validToken,
      newPassword: 'ValidPass123!',
    });

    expect(await screen.findByText(/your password has been successfully reset/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /proceed to log in/i })).toBeInTheDocument();
  });

  it('handles backend invalid/expired token error', async () => {
    vi.mocked(authService.resetPassword).mockRejectedValueOnce({
      response: { data: { error: { message: 'Invalid or expired password reset token.' } } },
    });

    render(
      <MemoryRouter initialEntries={[`/reset-password?token=${validToken}`]}>
        <ResetPasswordPage />
      </MemoryRouter>
    );

    const newPassInput = screen.getByLabelText('New Password');
    const confirmPassInput = screen.getByLabelText('Confirm New Password');
    const submitBtn = screen.getByRole('button', { name: /reset password/i });

    fireEvent.change(newPassInput, { target: { value: 'ValidPass123!' } });
    fireEvent.change(confirmPassInput, { target: { value: 'ValidPass123!' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/invalid or expired password reset token/i)).toBeInTheDocument();
  });
});
