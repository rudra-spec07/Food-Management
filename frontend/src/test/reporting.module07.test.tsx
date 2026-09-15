import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { reportingService } from '../services/reporting.service';
import { AdminReportsPage } from '../modules/reporting/pages/AdminReportsPage';
import { WorkerDashboardPage } from '../modules/reporting/pages/WorkerDashboardPage';
import { ReportDateFilter } from '../modules/reporting/components/ReportDateFilter';

let mockUserRole: 'ADMIN' | 'WORKER' | 'DONOR' = 'ADMIN';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
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
    getAdminDashboard: vi.fn(),
    getDonationReport: vi.fn(),
    getDonationTrend: vi.fn(),
    getDonationStatusDistribution: vi.fn(),
    getPickupReport: vi.fn(),
    getWorkerReport: vi.fn(),
    getWorkerDetail: vi.fn(),
    getActivityReport: vi.fn(),
    exportDonationsCsv: vi.fn(),
    getWorkerDashboard: vi.fn(),
  },
}));

const mockAdminDashboard = {
  donations: { total: 100, pending: 10, approved: 20, assigned: 30, completed: 40, rejected: 0, cancelled: 0 },
  pickups: { total: 50, notStarted: 5, inProgress: 15, completed: 30, failed: 0, cancelled: 0 },
  workers: { active: 8, assigned: 5 },
  inventory: { totalItems: 120, availableQuantity: 450, reservedQuantity: 50, distributedQuantity: 700 },
};

const mockDonationTrend = {
  items: [
    { period: '2026-09-01', count: 12, totalQuantity: 120 },
    { period: '2026-09-02', count: 18, totalQuantity: 200 },
  ],
  groupBy: 'DAY' as const,
};

const mockStatusDistribution = {
  distribution: { PENDING: 10, APPROVED: 20, COMPLETED: 40 },
  total: 70,
};

const mockPickupReport = {
  total: 50,
  notStarted: 5,
  inProgress: 15,
  completed: 30,
  failed: 0,
  cancelled: 0,
  avgDurationMinutes: 42,
};

const mockWorkerDashboard = {
  workerId: 'worker-1',
  assignedPickupsCount: 25,
  inProgressPickupsCount: 3,
  completedPickupsCount: 20,
  failedPickupsCount: 2,
  successRate: 90.9,
  activeAssignmentsCount: 3,
};

describe('Module 07 — Reports, Dashboard & Analytics Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ReportDateFilter Component', () => {
    it('handles date selection and preset buttons', () => {
      const handleChange = vi.fn();
      const handleReset = vi.fn();

      render(<ReportDateFilter dateFrom="" dateTo="" onChange={handleChange} onReset={handleReset} />);

      expect(screen.getByText('Date Range:')).toBeInTheDocument();

      const preset7 = screen.getByText('7 Days');
      fireEvent.click(preset7);

      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFrom: expect.any(String),
          dateTo: expect.any(String),
        })
      );
    });
  });

  describe('AdminReportsPage', () => {
    it('renders Overview tab with KPIs and charts', async () => {
      mockUserRole = 'ADMIN';
      vi.mocked(reportingService.getAdminDashboard).mockResolvedValue(mockAdminDashboard);
      vi.mocked(reportingService.getDonationTrend).mockResolvedValue(mockDonationTrend);
      vi.mocked(reportingService.getDonationStatusDistribution).mockResolvedValue(mockStatusDistribution);
      vi.mocked(reportingService.getPickupReport).mockResolvedValue(mockPickupReport);

      render(
        <MemoryRouter>
          <AdminReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Reports & Analytics Center')).toBeInTheDocument();
        expect(screen.getByText('Total Donations')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('Available Food Qty')).toBeInTheDocument();
        expect(screen.getByText('450')).toBeInTheDocument();
      });
    });

    it('switches tabs to Donations and renders controls', async () => {
      mockUserRole = 'ADMIN';
      vi.mocked(reportingService.getAdminDashboard).mockResolvedValue(mockAdminDashboard);
      vi.mocked(reportingService.getDonationTrend).mockResolvedValue(mockDonationTrend);
      vi.mocked(reportingService.getDonationStatusDistribution).mockResolvedValue(mockStatusDistribution);
      vi.mocked(reportingService.getPickupReport).mockResolvedValue(mockPickupReport);
      vi.mocked(reportingService.getDonationReport).mockResolvedValue({
        items: [
          {
            id: 'don-1',
            donorId: 'd-1',
            donorName: 'Fresh Farms',
            category: 'FRESH_PRODUCE',
            description: 'Apples',
            quantity: 50,
            quantityUnit: 'KG',
            status: 'APPROVED',
            preparedAt: '2026-09-15',
            expiresAt: '2026-09-20',
            createdAt: '2026-09-15',
          },
        ],
        total: 1,
        page: 1,
        limit: 15,
        totalPages: 1,
        summary: { totalQuantity: 50, statusCounts: { APPROVED: 1 } },
      });

      render(
        <MemoryRouter>
          <AdminReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Reports & Analytics Center')).toBeInTheDocument();
      });

      const donationsTab = screen.getByRole('button', { name: /Donations/i });
      fireEvent.click(donationsTab);

      await waitFor(() => {
        expect(screen.getByText('Fresh Farms')).toBeInTheDocument();
        expect(screen.getByText('50 KG')).toBeInTheDocument();
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
      });
    });

    it('triggers CSV export on click', async () => {
      mockUserRole = 'ADMIN';
      vi.mocked(reportingService.getAdminDashboard).mockResolvedValue(mockAdminDashboard);
      vi.mocked(reportingService.getDonationReport).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 15,
        totalPages: 1,
        summary: { totalQuantity: 0, statusCounts: {} },
      });
      const mockBlob = new Blob(['id,donorName\ndon-1,Fresh Farms'], { type: 'text/csv' });
      vi.mocked(reportingService.exportDonationsCsv).mockResolvedValue(mockBlob);

      // Mock URL.createObjectURL
      window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-csv');
      window.URL.revokeObjectURL = vi.fn();

      render(
        <MemoryRouter>
          <AdminReportsPage />
        </MemoryRouter>
      );

      const donationsTab = screen.getByRole('button', { name: /Donations/i });
      fireEvent.click(donationsTab);

      await waitFor(() => {
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Export CSV'));

      await waitFor(() => {
        expect(reportingService.exportDonationsCsv).toHaveBeenCalled();
      });
    });
  });

  describe('WorkerDashboardPage', () => {
    it('renders worker operational statistics', async () => {
      mockUserRole = 'WORKER';
      vi.mocked(reportingService.getWorkerDashboard).mockResolvedValue(mockWorkerDashboard);

      render(
        <MemoryRouter>
          <WorkerDashboardPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Worker Operational Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Active Assignments')).toBeInTheDocument();
        expect(screen.getByText('90.9%')).toBeInTheDocument();
      });
    });
  });
});
