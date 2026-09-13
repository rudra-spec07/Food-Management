import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { notificationService } from '../services/notification.service';
import { NotificationListPage } from '../pages/notifications/NotificationListPage';
import { NotificationPreferencesPage } from '../pages/notifications/NotificationPreferencesPage';
import { NotificationBell } from '../components/layout/NotificationBell';
import { AppNotification, NotificationPreference } from '../types/notification.types';

// Mock notification service methods
vi.mock('../services/notification.service', () => ({
  notificationService: {
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    getPreferences: vi.fn(),
    updatePreference: vi.fn(),
  },
}));

const mockNotifications: AppNotification[] = [
  {
    id: 'notif-1',
    eventId: 'evt-1',
    recipientId: 'user-1',
    eventType: 'DONATION_SUBMITTED',
    title: 'Donation Submitted',
    message: 'Your donation of 10 PORTIONS of COOKED_MEAL has been submitted.',
    status: 'UNREAD',
    createdAt: '2026-09-13T10:00:00.000Z',
    data: { category: 'COOKED_MEAL', quantity: 10, quantityUnit: 'PORTIONS' },
  },
  {
    id: 'notif-2',
    eventId: 'evt-2',
    recipientId: 'user-1',
    eventType: 'DONATION_APPROVED',
    title: 'Donation Approved',
    message: 'Your donation has been approved by admin.',
    status: 'READ',
    readAt: '2026-09-13T10:30:00.000Z',
    createdAt: '2026-09-13T10:15:00.000Z',
  },
];

const mockPreferences: NotificationPreference[] = [
  {
    id: 'pref-1',
    userId: 'user-1',
    eventType: 'DONATION_APPROVED',
    channel: 'EMAIL',
    enabled: false,
    createdAt: '2026-09-13T10:00:00.000Z',
    updatedAt: '2026-09-13T10:00:00.000Z',
  },
];

describe('Module 06 — Notifications & Communication Unit & Integration Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('NotificationBell Component', () => {
    it('renders bell icon and unread count badge when unreadCount > 0', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ unreadCount: 3 });
      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        items: mockNotifications,
        pagination: { page: 1, limit: 5, total: 2, totalPages: 1 },
      });

      render(
        <MemoryRouter>
          <NotificationBell />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('opens popover on click and shows notification items', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ unreadCount: 1 });
      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        items: mockNotifications,
        pagination: { page: 1, limit: 5, total: 2, totalPages: 1 },
      });

      render(
        <MemoryRouter>
          <NotificationBell />
        </MemoryRouter>
      );

      const trigger = screen.getByRole('button', { name: /notifications/i });
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Donation Submitted')).toBeInTheDocument();
        expect(screen.getByText('View all notifications')).toBeInTheDocument();
      });
    });
  });

  describe('NotificationListPage Component', () => {
    it('renders notification list, unread status badges, and context details', async () => {
      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        items: mockNotifications,
        pagination: { page: 1, limit: 15, total: 2, totalPages: 1 },
      });
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ unreadCount: 1 });

      render(
        <MemoryRouter>
          <NotificationListPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Notifications & Inbox')).toBeInTheDocument();
        expect(screen.getByText('Donation Submitted')).toBeInTheDocument();
        expect(screen.getByText('Donation Approved')).toBeInTheDocument();
        expect(screen.getByText(/Category:/)).toBeInTheDocument();
      });
    });

    it('handles marking single notification as read', async () => {
      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        items: mockNotifications,
        pagination: { page: 1, limit: 15, total: 2, totalPages: 1 },
      });
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ unreadCount: 1 });
      vi.mocked(notificationService.markAsRead).mockResolvedValue({
        ...mockNotifications[0],
        status: 'READ',
      });

      render(
        <MemoryRouter>
          <NotificationListPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Mark read')).toBeInTheDocument();
      });

      const markReadBtn = screen.getByText('Mark read');
      fireEvent.click(markReadBtn);

      await waitFor(() => {
        expect(notificationService.markAsRead).toHaveBeenCalledWith('notif-1');
      });
    });

    it('handles mark all as read action', async () => {
      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        items: mockNotifications,
        pagination: { page: 1, limit: 15, total: 2, totalPages: 1 },
      });
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ unreadCount: 1 });
      vi.mocked(notificationService.markAllAsRead).mockResolvedValue({ updatedCount: 1 });

      render(
        <MemoryRouter>
          <NotificationListPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Mark all read')).toBeInTheDocument();
      });

      const markAllBtn = screen.getByText('Mark all read');
      fireEvent.click(markAllBtn);

      await waitFor(() => {
        expect(notificationService.markAllAsRead).toHaveBeenCalled();
      });
    });

    it('renders empty state when no notifications returned', async () => {
      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 15, total: 0, totalPages: 0 },
      });
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ unreadCount: 0 });

      render(
        <MemoryRouter>
          <NotificationListPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No notifications found')).toBeInTheDocument();
      });
    });

    it('renders error state when API fails', async () => {
      vi.mocked(notificationService.getNotifications).mockRejectedValue({
        message: 'Network error connecting to notification API',
      });
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ unreadCount: 0 });

      render(
        <MemoryRouter>
          <NotificationListPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Unable to load notifications')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });
  });

  describe('NotificationPreferencesPage Component', () => {
    it('loads and renders supported event types and channel toggles', async () => {
      vi.mocked(notificationService.getPreferences).mockResolvedValue(mockPreferences);

      render(
        <MemoryRouter>
          <NotificationPreferencesPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
        expect(screen.getByText('Donation Approved')).toBeInTheDocument();
        expect(screen.getByText('Pickup En Route')).toBeInTheDocument();
      });
    });

    it('toggles channel preference and saves via service API', async () => {
      vi.mocked(notificationService.getPreferences).mockResolvedValue(mockPreferences);
      vi.mocked(notificationService.updatePreference).mockResolvedValue({
        id: 'pref-1',
        userId: 'user-1',
        eventType: 'DONATION_APPROVED',
        channel: 'EMAIL',
        enabled: true,
        createdAt: '2026-09-13T10:00:00.000Z',
        updatedAt: '2026-09-13T10:00:00.000Z',
      });

      render(
        <MemoryRouter>
          <NotificationPreferencesPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Toggle Email for Donation Approved')).toBeInTheDocument();
      });

      const toggleBtn = screen.getByLabelText('Toggle Email for Donation Approved');
      fireEvent.click(toggleBtn);

      await waitFor(() => {
        expect(notificationService.updatePreference).toHaveBeenCalledWith({
          eventType: 'DONATION_APPROVED',
          channel: 'EMAIL',
          enabled: true,
        });
      });
    });
  });
});
