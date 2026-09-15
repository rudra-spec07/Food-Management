// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import './setup';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { reportingService } from '../services/reporting.service';
import { assignmentService } from '../services/assignment.service';
import { donationService } from '../modules/donors/services/donation.service';

const mockUseAuth = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../services/reporting.service', () => ({
  reportingService: {
    getAdminDashboard: vi.fn(),
    getActivityReport: vi.fn(),
    getWorkerDashboard: vi.fn(),
  },
}));

vi.mock('../services/assignment.service', () => ({
  assignmentService: {
    getWorkerAssignments: vi.fn(),
  },
}));

vi.mock('../modules/donors/services/donation.service', () => ({
  donationService: {
    getMyDonations: vi.fn(),
  },
}));

const mockAdminDashboard = {
  donations: { total: 150, pending: 12, approved: 45, assigned: 30, completed: 60, rejected: 1, cancelled: 2 },
  pickups: { total: 60, notStarted: 10, inProgress: 15, completed: 30, failed: 3, cancelled: 2 },
  workers: { active: 10, assigned: 6 },
  inventory: { totalItems: 85, availableQuantity: 520, reservedQuantity: 40, distributedQuantity: 800 },
};

const mockActivityReport = {
  items: [
    {
      id: 'act-1',
      userId: 'usr-admin',
      user: { firstName: 'Alice', lastName: 'Admin', email: 'admin@test.com', role: 'ADMIN' },
      action: 'APPROVED_DONATION',
      entityType: 'DONATION',
      entityId: 'don-1',
      metadata: null,
      ipAddress: '127.0.0.1',
      createdAt: '2026-09-15T12:00:00Z',
    },
  ],
  total: 1,
  page: 1,
  limit: 5,
  totalPages: 1,
};

const mockWorkerDashboard = {
  workerId: 'wrk-100',
  assignedPickupsCount: 15,
  inProgressPickupsCount: 3,
  completedPickupsCount: 11,
  failedPickupsCount: 1,
  successRate: 91.7,
  activeAssignmentsCount: 4,
};

const mockWorkerAssignments = {
  items: [
    {
      id: 'asgn-1',
      donationId: 'don-10',
      workerId: 'wrk-100',
      assignedById: 'adm-1',
      status: 'ACCEPTED' as const,
      assignedAt: '2026-09-15T10:00:00Z',
      createdAt: '2026-09-15T10:00:00Z',
      updatedAt: '2026-09-15T10:00:00Z',
      donation: {
        id: 'don-10',
        category: 'COOKED_MEAL',
        description: 'Hot Meals Box',
        quantity: 50,
        quantityUnit: 'PORTIONS',
        preparedAt: '2026-09-15T09:00:00Z',
        expiresAt: '2026-09-15T18:00:00Z',
        pickupAddress: '123 Main St',
        contactName: 'John',
        contactPhone: '555-0199',
        status: 'ACCEPTED',
        createdAt: '2026-09-15T09:00:00Z',
        updatedAt: '2026-09-15T09:00:00Z',
        donor: { id: 'dn-1', firstName: 'Jane', lastName: 'Donor', email: 'jane@test.com' },
      },
      pickup: { id: 'pck-55', status: 'IN_PROGRESS' },
    },
  ],
  pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
};

const mockDonorDonations = {
  items: [
    {
      id: 'don-50',
      donorId: 'usr-100',
      category: 'PACKAGED_FOOD' as const,
      description: 'Rice & Canned Goods',
      quantity: 20,
      quantityUnit: 'BOXES' as const,
      preparedAt: '2026-09-15T08:00:00Z',
      expiresAt: '2026-10-15T08:00:00Z',
      pickupAddress: '456 Market St',
      contactName: 'TestUser',
      contactPhone: '555-1234',
      status: 'APPROVED' as const,
      createdAt: '2026-09-15T08:00:00Z',
      updatedAt: '2026-09-15T08:00:00Z',
    },
  ],
  pagination: { page: 1, limit: 5, total: 12, totalPages: 3 },
};

describe('Role-Based Operational Dashboard Enhancement', () => {
  const mockUser = (role: 'ADMIN' | 'WORKER' | 'DONOR') => ({
    user: {
      id: 'usr-100',
      firstName: 'TestUser',
      lastName: 'Role',
      email: 'test@example.com',
      role,
      status: 'ACTIVE' as const,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      lastLoginAt: '2026-09-15T10:00:00Z',
    },
    status: 'authenticated',
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    refreshUser: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(mockUser('ADMIN'));
    vi.mocked(reportingService.getAdminDashboard).mockResolvedValue(mockAdminDashboard);
    vi.mocked(reportingService.getActivityReport).mockResolvedValue(mockActivityReport);
    vi.mocked(reportingService.getWorkerDashboard).mockResolvedValue(mockWorkerDashboard);
    vi.mocked(assignmentService.getWorkerAssignments).mockResolvedValue(mockWorkerAssignments);
    vi.mocked(donationService.getMyDonations).mockResolvedValue(mockDonorDonations);
  });

  it('1. ADMIN user renders AdminDashboardView and fetches backend APIs', async () => {
    mockUseAuth.mockReturnValue(mockUser('ADMIN'));

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Welcome, TestUser!/i)).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();

    await waitFor(() => {
      expect(reportingService.getAdminDashboard).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('150')).toBeInTheDocument();
  });

  it('2. Admin activity API failure does not crash KPI card section', async () => {
    mockUseAuth.mockReturnValue(mockUser('ADMIN'));
    vi.mocked(reportingService.getActivityReport).mockRejectedValue(new Error('Activity API Timeout'));

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Activity API Timeout')).toBeInTheDocument();
    });
  });

  it('3. WORKER user renders WorkerDashboardView and calls worker endpoints without workerId', async () => {
    mockUseAuth.mockReturnValue(mockUser('WORKER'));

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    expect(screen.getByText('WORKER')).toBeInTheDocument();

    await waitFor(() => {
      expect(reportingService.getWorkerDashboard).toHaveBeenCalledTimes(1);
      expect(assignmentService.getWorkerAssignments).toHaveBeenCalledWith(1, 10);
    });

    expect(await screen.findByText('Hot Meals Box')).toBeInTheDocument();
    expect(screen.getByText('COOKED_MEAL')).toBeInTheDocument();
  });

  it('4. Empty worker assignment state renders friendly empty message', async () => {
    mockUseAuth.mockReturnValue(mockUser('WORKER'));
    vi.mocked(assignmentService.getWorkerAssignments).mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No Active Assignments')).toBeInTheDocument();
    });
  });

  it('5. DONOR user renders DonorDashboardView and calls /donations/my', async () => {
    mockUseAuth.mockReturnValue(mockUser('DONOR'));

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    expect(screen.getByText('DONOR')).toBeInTheDocument();

    await waitFor(() => {
      expect(donationService.getMyDonations).toHaveBeenCalledWith({ page: 1, limit: 5 });
    });

    expect(await screen.findByText('Rice & Canned Goods')).toBeInTheDocument();
  });

  it('6. Empty donor donation state renders empty message and creation CTA', async () => {
    mockUseAuth.mockReturnValue(mockUser('DONOR'));
    vi.mocked(donationService.getMyDonations).mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No Food Donations Posted')).toBeInTheDocument();
    });
  });

  it('7. Quick actions render correct destination links', async () => {
    mockUseAuth.mockReturnValue(mockUser('ADMIN'));

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Review Donations/i })).toHaveAttribute('href', '/admin/donations/review');
      expect(screen.getByRole('link', { name: /Worker Management/i })).toHaveAttribute('href', '/admin/workers');
    });
  });
});
