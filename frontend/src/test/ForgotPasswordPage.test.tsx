import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { authService } from '../services/auth.service';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/auth.service', () => ({
  authService: {
    forgotPassword: vi.fn(),
  },
}));

describe('ForgotPasswordPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders forgot password form with email input and buttons', () => {
    render(
      <BrowserRouter>
        <ForgotPasswordPage />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    expect(screen.getByText(/back to sign in/i)).toBeInTheDocument();
  });

  it('validates empty email on submission', async () => {
    render(
      <BrowserRouter>
        <ForgotPasswordPage />
      </BrowserRouter>
    );

    const submitBtn = screen.getByRole('button', { name: /send reset link/i });
    fireEvent.click(submitBtn);
    expect(await screen.findByText(/please enter your email address/i)).toBeInTheDocument();
  });

  it('validates invalid email format on submission', async () => {
    render(
      <BrowserRouter>
        <ForgotPasswordPage />
      </BrowserRouter>
    );

    const input = screen.getByLabelText(/email address/i);
    const submitBtn = screen.getByRole('button', { name: /send reset link/i });

    fireEvent.change(input, { target: { value: 'invalid-email' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/please enter a valid email address/i)).toBeInTheDocument();
  });

  it('submits email and displays generic success message', async () => {
    vi.mocked(authService.forgotPassword).mockResolvedValueOnce({
      message: 'If an account exists with that email, a password reset link has been sent.',
    });

    render(
      <BrowserRouter>
        <ForgotPasswordPage />
      </BrowserRouter>
    );

    const input = screen.getByLabelText(/email address/i);
    fireEvent.change(input, { target: { value: 'user@example.com' } });

    const submitBtn = screen.getByRole('button', { name: /send reset link/i });
    fireEvent.click(submitBtn);

    expect(authService.forgotPassword).toHaveBeenCalledWith({ email: 'user@example.com' });

    expect(await screen.findByText(/if an account exists with that email, a password reset link has been sent\./i)).toBeInTheDocument();
    expect(screen.getByText(/return to sign in/i)).toBeInTheDocument();
  });

  it('handles API error response', async () => {
    vi.mocked(authService.forgotPassword).mockRejectedValueOnce({
      response: { data: { error: { message: 'Too many requests, please try again later.' } } },
    });

    render(
      <BrowserRouter>
        <ForgotPasswordPage />
      </BrowserRouter>
    );

    const input = screen.getByLabelText(/email address/i);
    fireEvent.change(input, { target: { value: 'user@example.com' } });

    const submitBtn = screen.getByRole('button', { name: /send reset link/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/too many requests, please try again later\./i)).toBeInTheDocument();
  });
});
