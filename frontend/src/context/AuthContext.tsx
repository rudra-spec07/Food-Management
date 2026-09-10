import React, { createContext, useState, useEffect, useCallback } from 'react';
import { User, LoginPayload, RegisterPayload, UpdateProfilePayload, ChangePasswordPayload } from '../types/auth.types';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import { tokenStorage, setUnauthorizedListener } from '../services/api/apiClient';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<User>;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const clearSession = useCallback(() => {
    tokenStorage.removeToken();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const bootstrap = useCallback(async () => {
    const token = tokenStorage.getToken();
    if (!token) {
      clearSession();
      return;
    }

    try {
      const currentUser = await userService.getCurrentUser();
      setUser(currentUser);
      setStatus('authenticated');
    } catch {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    bootstrap();

    // Register 401 listener
    setUnauthorizedListener(() => {
      clearSession();
    });
  }, [bootstrap, clearSession]);

  const login = async (payload: LoginPayload): Promise<void> => {
    const authData = await authService.login(payload);
    tokenStorage.setToken(authData.accessToken);
    setUser(authData.user);
    setStatus('authenticated');
  };

  const register = async (payload: RegisterPayload): Promise<void> => {
    const authData = await authService.register(payload);
    tokenStorage.setToken(authData.accessToken);
    setUser(authData.user);
    setStatus('authenticated');
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  };

  const updateProfile = async (payload: UpdateProfilePayload): Promise<User> => {
    const updatedUser = await userService.updateProfile(payload);
    setUser(updatedUser);
    return updatedUser;
  };

  const changePassword = async (payload: ChangePasswordPayload): Promise<void> => {
    await userService.changePassword(payload);
    // Server revokes all sessions after password change
    clearSession();
  };

  const refreshUser = async (): Promise<void> => {
    if (status === 'authenticated') {
      const currentUser = await userService.getCurrentUser();
      setUser(currentUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
