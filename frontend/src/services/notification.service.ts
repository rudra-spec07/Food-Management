import { apiClient } from './api/apiClient';
import {
  AppNotification,
  PaginatedNotifications,
  UnreadCountResponse,
  NotificationPreference,
  UpdatePreferencePayload,
  NotificationStatus,
} from '../types/notification.types';

export const notificationService = {
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    status?: NotificationStatus;
  }): Promise<PaginatedNotifications> {
    const response = await apiClient.get('/notifications', { params });
    return response.data.data;
  },

  async getUnreadCount(): Promise<UnreadCountResponse> {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data.data;
  },

  async markAsRead(notificationId: string): Promise<AppNotification> {
    const response = await apiClient.patch(`/notifications/${notificationId}/read`);
    return response.data.data;
  },

  async markAllAsRead(): Promise<{ updatedCount: number }> {
    const response = await apiClient.patch('/notifications/read-all');
    return response.data.data;
  },

  async getPreferences(): Promise<NotificationPreference[]> {
    const response = await apiClient.get('/notification-preferences');
    return response.data.data.preferences;
  },

  async updatePreference(payload: UpdatePreferencePayload): Promise<NotificationPreference> {
    const response = await apiClient.patch('/notification-preferences', payload);
    return response.data.data;
  },
};
