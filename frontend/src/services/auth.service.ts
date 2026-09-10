import { apiClient } from './api/apiClient';
import { RegisterPayload, LoginPayload, AuthResponse, ApiSuccessResponse } from '../types/auth.types';

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await apiClient.post<ApiSuccessResponse<AuthResponse>>('/auth/register', payload);
    return response.data.data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await apiClient.post<ApiSuccessResponse<AuthResponse>>('/auth/login', payload);
    return response.data.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      // Even if network fails, logout proceeds locally
      console.warn('Backend logout call completed with status:', err);
    }
  },
};
