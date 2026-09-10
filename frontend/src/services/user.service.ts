import { apiClient } from './api/apiClient';
import { User, UpdateProfilePayload, ChangePasswordPayload, ApiSuccessResponse } from '../types/auth.types';

export const userService = {
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<ApiSuccessResponse<User>>('/users/me');
    return response.data.data;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<User> {
    const response = await apiClient.patch<ApiSuccessResponse<User>>('/users/me', payload);
    return response.data.data;
  },

  async changePassword(payload: ChangePasswordPayload): Promise<string> {
    const response = await apiClient.post<ApiSuccessResponse<null>>('/users/me/change-password', payload);
    return response.data.message || 'Password changed successfully';
  },
};
