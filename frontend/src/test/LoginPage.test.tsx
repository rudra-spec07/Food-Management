import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage';
import { AuthContext } from '../context/AuthContext';
import { describe, it, expect, vi } from 'vitest';

const mockContextValue = {
  user: null,
  status: 'unauthenticated' as const,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  refreshUser: vi.fn(),
};

describe('LoginPage Component', () => {
  it('renders login form with email and password inputs', () => {
    render(
      <AuthContext.Provider value={mockContextValue}>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('displays client error message when submitting empty form', async () => {
    render(
      <AuthContext.Provider value={mockContextValue}>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </AuthContext.Provider>
    );

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/please enter your email address/i)).toBeInTheDocument();
  });
});
