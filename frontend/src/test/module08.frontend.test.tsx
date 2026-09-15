import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { reportingService } from '../services/reporting.service';
import { notificationService } from '../services/notification.service';
import { AdminAuditLogsPage } from '../pages/admin/AdminAuditLogsPage';
import { NotificationListPage } from '../pages/notifications/NotificationListPage';
import { NotificationPreferencesPage } from '../pages/notifications/NotificationPreferencesPage';
import { NotificationBell } from '../components/layout/NotificationBell';
import { ActivityReportData } from '../types/reporting.types';
import { AppNotification, NotificationPreference } from '../types/notification.types';

let mockUserRole: 'ADMIN' | 'WORKER' | 'DONOR' = 'ADMIN';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-admin-1',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@foodshare.org',
      role: mockUserRole,
      status: 'ACTIVE',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    status: 'authenticated',
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

vi.mock('../services/reporting.service', () => ({
  reportingService: {
    getActivityReport: vi.fn(),
  },
}));

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

const mockActivityResponse: ActivityReportData = {
  items: [
    {
      id: 'act-1',
      userId: 'user-admin-1',
      user: {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@foodshare.org',
        role: 'ADMIN',
      },
      action: 'WORKER_PROVISIONED',
      entityType: 'User',
      entityId: 'usr-w1',
      metadata: { email: 'worker@foodshare.org', role: 'WORKER' },
      ipAddress: '192.168.1.100',
      createdAt: '2026-09-15T14:30:00.000Z',
    },
    {
      id: 'act-2',
      userId: 'user-admin-1',
      user: {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@foodshare.org',
        role: 'ADMIN',
      },
      action: 'DONATION_REVIEWED',
      entityType: 'Donation',
      entityId: 'don-99',
      metadata: { status: 'APPROVED', comment: 'Quality verified' },
      ipAddress: '192.168.1.101',
      createdAt: '2026-09-15T12:00:00.000Z',
    },
  ],
  total: 2,
  page: 1,
  limit: 20,
  totalPages: 1,
};

const mockNotifications: AppNotification[] = [
  {
    id: 'notif-100',
    eventId: 'evt-100',
    recipientId: 'user-admin-1',
    eventType: 'DONATION_SUBMITTED',
    title: 'New Donation Pending Review',
    message: 'A new donation of 20 KG veggies requires review.',
    status: 'UNREAD',
    createdAt: '2026-09-15T10:00:00.000Z',
    data: { entityType: 'Donation', entityId: 'don-99' },
  },
];

const mockPreferences: NotificationPreference[] = [
  {
    id: 'pref-10',
    userId: 'user-admin-1',
    eventType: 'DONATION_APPROVED',
    channel: 'EMAIL',
    enabled: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
];

describe('Module 08 — Notifications, Audit, Settings & System Admin Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = 'ADMIN';
  });

  describe('AdminAuditLogsPage', () => {
    it('fetches and renders activity log table for admin user', async () => {
      vi.mocked(reportingService.getActivityReport).mockResolvedValue(mockActivityResponse);

      render(
        <MemoryRouter>
          <AdminAuditLogsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('System Audit & Activity Logs')).toBeInTheDocument();
        expect(screen.getByText('WORKER_PROVISIONED')).toBeInTheDocument();
        expect(screen.getByText('DONATION_REVIEWED')).toBeInTheDocument();
        expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
      });
    });

    it('opens detail drawer and displays raw json metadata when clicking View button', async () => {
      vi.mocked(reportingService.getActivityReport).mockResolvedValue(mockActivityResponse);

      render(
        <MemoryRouter>
          <AdminAuditLogsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('WORKER_PROVISIONED')).toBeInTheDocument();
      });

      const detailsButtons = screen.getAllByRole('button', { name: /View metadata/i });
      fireEvent.click(detailsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('AUDIT LOG DETAIL')).toBeInTheDocument();
        expect(screen.getByText(/worker@foodshare.org/)).toBeInTheDocument();
      });
    });

    it('handles search input filter', async () => {
      vi.mocked(reportingService.getActivityReport).mockResolvedValue(mockActivityResponse);

      render(
        <MemoryRouter>
          <AdminAuditLogsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('WORKER_PROVISIONED')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by action/i);
      fireEvent.change(searchInput, { target: { value: 'PROVISIONED' } });

      await waitFor(() => {
        expect(screen.getByText('WORKER_PROVISIONED')).toBeInTheDocument();
        expect(screen.queryByText('DONATION_REVIEWED')).not.toBeInTheDocument();
      });
    });

    it('renders empty state when no activity records returned', async () => {
      vi.mocked(reportingService.getActivityReport).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 15,
        totalPages: 0,
      });

      render(
        <MemoryRouter>
          <AdminAuditLogsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No Audit Records Found')).toBeInTheDocument();
      });
    });

    it('renders error state and handles retry when API fails', async () => {
      vi.mocked(reportingService.getActivityReport).mockRejectedValueOnce(
        new Error('Failed to load activity logs')
      );

      render(
        <MemoryRouter>
          <AdminAuditLogsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load activity logs')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Retry Loading Audit Logs/i })).toBeInTheDocument();
      });

      vi.mocked(reportingService.getActivityReport).mockResolvedValueOnce(mockActivityResponse);
      fireEvent.click(screen.getByRole('button', { name: /Retry Loading Audit Logs/i }));

      await waitFor(() => {
        expect(screen.getByText('WORKER_PROVISIONED')).toBeInTheDocument();
      });
    });
  });

  describe('Notification Integration Capabilities', () => {
    it('NotificationBell loads unread count and items dropdown', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ unreadCount: 1 });
      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        items: mockNotifications,
        pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
      });

      render(
        <MemoryRouter>
          <NotificationBell />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
      });

      const bellButton = screen.getByRole('button', { name: /Notifications \(1 unread\)/i });
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText('New Donation Pending Review')).toBeInTheDocument();
      });
    });

    it('NotificationListPage renders list and handles mark all read', async () => {
      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        items: mockNotifications,
        pagination: { page: 1, limit: 15, total: 1, totalPages: 1 },
      });
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue({ unreadCount: 1 });
      vi.mocked(notificationService.markAllAsRead).mockResolvedValue({ updatedCount: 1 });

      render(
        <MemoryRouter>
          <NotificationListPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('New Donation Pending Review')).toBeInTheDocument();
      });

      const markAllBtn = screen.getByRole('button', { name: /Mark all read/i });
      fireEvent.click(markAllBtn);

      await waitFor(() => {
        expect(notificationService.markAllAsRead).toHaveBeenCalled();
      });
    });

    it('NotificationPreferencesPage loads preferences matrix and toggles state', async () => {
      vi.mocked(notificationService.getPreferences).mockResolvedValue(mockPreferences);
      vi.mocked(notificationService.updatePreference).mockResolvedValue({
        ...mockPreferences[0],
        enabled: false,
      });

      render(
        <MemoryRouter>
          <NotificationPreferencesPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
        expect(screen.getByLabelText('Toggle Email for Donation Approved')).toBeInTheDocument();
      });

      const toggle = screen.getByLabelText('Toggle Email for Donation Approved');
      fireEvent.click(toggle);

      await waitFor(() => {
        expect(notificationService.updatePreference).toHaveBeenCalledWith({
          eventType: 'DONATION_APPROVED',
          channel: 'EMAIL',
          enabled: false,
        });
      });
    });
  });
});
