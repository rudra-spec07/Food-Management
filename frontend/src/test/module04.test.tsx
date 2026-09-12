import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AdminWorkerProvisioningPage } from '../modules/admin/pages/AdminWorkerProvisioningPage';
import { AdminAssignmentQueuePage } from '../modules/admin/pages/AdminAssignmentQueuePage';
import { AvailableFoodPage } from '../pages/collection/AvailableFoodPage';
import { DistributionListPage } from '../pages/distributions/DistributionListPage';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { adminWorkerService } from '../services/admin-worker.service';
import { assignmentService } from '../services/assignment.service';
import { useAuth } from '../hooks/useAuth';

// ── Service Mocks ─────────────────────────────────────────────────────────────

vi.mock('../services/admin-worker.service', () => ({
  adminWorkerService: {
    createWorker: vi.fn(),
    listWorkers: vi.fn(),
  },
}));

vi.mock('../services/assignment.service', () => ({
  assignmentService: {
    getAssignmentQueue: vi.fn(),
    getAdminAssignments: vi.fn(),
    assignWorker: vi.fn(),
    getAssignmentHistory: vi.fn(),
    getWorkerAssignments: vi.fn(),
    getWorkerAssignmentDetail: vi.fn(),
    acceptAssignment: vi.fn(),
    rejectAssignment: vi.fn(),
  },
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockAdminAuth = () => {
  (useAuth as any).mockReturnValue({
    user: { id: 'admin-1', role: 'ADMIN', firstName: 'Admin', lastName: 'User' },
    status: 'authenticated',
  });
};

const mockEmptyWorkerList = () => {
  (adminWorkerService.listWorkers as any).mockResolvedValue({
    items: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  });
};

const mockWorkerList = (workers: any[] = []) => {
  (adminWorkerService.listWorkers as any).mockResolvedValue({
    items: workers,
    pagination: { page: 1, limit: 20, total: workers.length, totalPages: 1 },
  });
};

const mockWorker = {
  id: 'worker-uuid-101',
  firstName: 'Rahul',
  lastName: 'Kumar',
  email: 'rahul.worker@example.com',
  phone: '9876543210',
  role: 'WORKER' as const,
  status: 'ACTIVE' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Frontend Module 04 — Unit & Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Worker Management Page — Create Form ──────────────────────────────────

  describe('AdminWorkerProvisioningPage Form Validation & API Call', () => {
    beforeEach(() => {
      mockAdminAuth();
      mockEmptyWorkerList(); // list loads on mount
    });

    it('renders page heading and Provision Worker button', async () => {
      render(
        <MemoryRouter>
          <AdminWorkerProvisioningPage />
        </MemoryRouter>
      );
      expect(screen.getByText('Worker Management')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Provision Worker/i })).toBeInTheDocument();
    });

    it('opens provision form when Provision Worker button is clicked', async () => {
      render(
        <MemoryRouter>
          <AdminWorkerProvisioningPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /Provision Worker/i }));

      expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Temporary Password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    });

    it('shows validation error when passwords do not match', async () => {
      render(
        <MemoryRouter>
          <AdminWorkerProvisioningPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /Provision Worker/i }));

      fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Rahul' } });
      fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Kumar' } });
      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'rahul@example.com' } });
      fireEvent.change(screen.getByLabelText(/Temporary Password/i), { target: { value: 'Password123!' } });
      fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'PasswordMismatch!' } });

      fireEvent.click(screen.getByRole('button', { name: /Create Worker Credentials/i }));

      expect(await screen.findByText(/Passwords do not match/i)).toBeInTheDocument();
    });

    it('successfully submits valid form data and shows success message', async () => {
      (adminWorkerService.createWorker as any).mockResolvedValue(mockWorker);

      render(
        <MemoryRouter>
          <AdminWorkerProvisioningPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /Provision Worker/i }));

      fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Rahul' } });
      fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Kumar' } });
      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'rahul.worker@example.com' } });
      fireEvent.change(screen.getByLabelText(/Temporary Password/i), { target: { value: 'TemporaryPassword123!' } });
      fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'TemporaryPassword123!' } });

      fireEvent.click(screen.getByRole('button', { name: /Create Worker Credentials/i }));

      await waitFor(() => {
        expect(adminWorkerService.createWorker).toHaveBeenCalledWith({
          firstName: 'Rahul',
          lastName: 'Kumar',
          email: 'rahul.worker@example.com',
          password: 'TemporaryPassword123!',
          phone: undefined,
        });
      });

      expect(await screen.findByText(/Worker Account Provisioned Successfully!/i)).toBeInTheDocument();
    });

    it('handles 409 duplicate email conflict error cleanly', async () => {
      (adminWorkerService.createWorker as any).mockRejectedValue({
        statusCode: 409,
        code: 'AUTH_EMAIL_ALREADY_EXISTS',
        message: 'Email address is already registered',
      });

      render(
        <MemoryRouter>
          <AdminWorkerProvisioningPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /Provision Worker/i }));

      fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Rahul' } });
      fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Kumar' } });
      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'existing@example.com' } });
      fireEvent.change(screen.getByLabelText(/Temporary Password/i), { target: { value: 'TemporaryPassword123!' } });
      fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'TemporaryPassword123!' } });

      fireEvent.click(screen.getByRole('button', { name: /Create Worker Credentials/i }));

      expect(await screen.findByText(/Email address is already registered in the system/i)).toBeInTheDocument();
    });
  });

  // ── Worker Management Page — Worker List ──────────────────────────────────

  describe('AdminWorkerProvisioningPage Worker List', () => {
    beforeEach(() => {
      mockAdminAuth();
    });

    it('shows loading skeleton while workers are being fetched', () => {
      // Never resolves → stays in loading state
      (adminWorkerService.listWorkers as any).mockReturnValue(new Promise(() => {}));

      render(
        <MemoryRouter>
          <AdminWorkerProvisioningPage />
        </MemoryRouter>
      );

      // Skeleton rows should be visible (they have specific styling, not data)
      // The key check is that we do NOT see an empty state message yet
      expect(screen.queryByText(/No workers created yet/i)).not.toBeInTheDocument();
    });

    it('renders empty state when no workers exist', async () => {
      mockEmptyWorkerList();

      render(
        <MemoryRouter>
          <AdminWorkerProvisioningPage />
        </MemoryRouter>
      );

      expect(await screen.findByText(/No workers created yet/i)).toBeInTheDocument();
    });

    it('renders worker list when workers are returned', async () => {
      mockWorkerList([mockWorker]);

      render(
        <MemoryRouter>
          <AdminWorkerProvisioningPage />
        </MemoryRouter>
      );

      const table = await screen.findByRole('table');
      expect(within(table).getByText('Rahul Kumar')).toBeInTheDocument();
      expect(within(table).getByText('rahul.worker@example.com')).toBeInTheDocument();
    });

    it('shows error state when worker list fails to load', async () => {
      (adminWorkerService.listWorkers as any).mockRejectedValue({
        message: 'Network error',
      });

      render(
        <MemoryRouter>
          <AdminWorkerProvisioningPage />
        </MemoryRouter>
      );

      expect(await screen.findByText(/Unable to load workers/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    it('shows All / Active / Inactive filter tabs', async () => {
      mockEmptyWorkerList();

      render(
        <MemoryRouter>
          <AdminWorkerProvisioningPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^All$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^Active$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^Inactive$/i })).toBeInTheDocument();
      });
    });

    it('calls listWorkers with status=ACTIVE when Active tab is clicked', async () => {
      mockEmptyWorkerList();

      render(
        <MemoryRouter>
          <AdminWorkerProvisioningPage />
        </MemoryRouter>
      );

      await waitFor(() => screen.getByRole('button', { name: /^Active$/i }));
      fireEvent.click(screen.getByRole('button', { name: /^Active$/i }));

      await waitFor(() => {
        expect(adminWorkerService.listWorkers).toHaveBeenCalledWith(1, 20, 'ACTIVE');
      });
    });

    it('calls listWorkers with status=INACTIVE when Inactive tab is clicked', async () => {
      mockEmptyWorkerList();

      render(
        <MemoryRouter>
          <AdminWorkerProvisioningPage />
        </MemoryRouter>
      );

      await waitFor(() => screen.getByRole('button', { name: /^Inactive$/i }));
      fireEvent.click(screen.getByRole('button', { name: /^Inactive$/i }));

      await waitFor(() => {
        expect(adminWorkerService.listWorkers).toHaveBeenCalledWith(1, 20, 'INACTIVE');
      });
    });

    it('displays worker total count', async () => {
      mockWorkerList([mockWorker]);

      render(
        <MemoryRouter>
          <AdminWorkerProvisioningPage />
        </MemoryRouter>
      );

      expect(await screen.findByText(/1 worker total/i)).toBeInTheDocument();
    });
  });

  // ── Assignment Queue — Worker Selector ────────────────────────────────────

  describe('AdminAssignmentQueuePage Worker Selector', () => {
    const mockDonation = {
      id: 'donation-uuid-1',
      category: 'Cooked Meal',
      description: 'Hot food for 20 people',
      quantity: 20,
      quantityUnit: 'portions',
      preparedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      pickupAddress: '123 Main St',
      contactName: 'Priya',
      contactPhone: '9876543210',
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      donor: { id: 'donor-1', firstName: 'Priya', lastName: 'Sharma', email: 'priya@test.com' },
    };

    beforeEach(() => {
      mockAdminAuth();
      (assignmentService.getAssignmentQueue as any).mockResolvedValue({
        items: [mockDonation],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
      (assignmentService.getAdminAssignments as any).mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    });

    it('renders the assignment queue with donation cards', async () => {
      render(
        <MemoryRouter>
          <AdminAssignmentQueuePage />
        </MemoryRouter>
      );

      expect(await screen.findByText('Cooked Meal')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Assign Worker/i })).toBeInTheDocument();
    });

    it('opens assign modal with worker selector when Assign Worker is clicked', async () => {
      (adminWorkerService.listWorkers as any).mockResolvedValue({
        items: [mockWorker],
        pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
      });

      render(
        <MemoryRouter>
          <AdminAssignmentQueuePage />
        </MemoryRouter>
      );

      await waitFor(() => screen.getByRole('button', { name: /Assign Worker/i }));
      fireEvent.click(screen.getByRole('button', { name: /Assign Worker/i }));

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      // Modal title heading
      expect(screen.getByRole('heading', { name: /Assign Worker/i })).toBeInTheDocument();
    });

    it('shows loading state in modal while workers are being fetched', async () => {
      (adminWorkerService.listWorkers as any).mockReturnValue(new Promise(() => {}));

      render(
        <MemoryRouter>
          <AdminAssignmentQueuePage />
        </MemoryRouter>
      );

      // There may be multiple Assign Worker buttons — click the first (card-level)
      await waitFor(() => screen.getAllByRole('button', { name: /Assign Worker/i }));
      const assignBtns = screen.getAllByRole('button', { name: /Assign Worker/i });
      fireEvent.click(assignBtns[0]);

      expect(await screen.findByText(/Loading workers…/i)).toBeInTheDocument();
    });

    it('shows worker options in the selector when loaded', async () => {
      (adminWorkerService.listWorkers as any).mockResolvedValue({
        items: [mockWorker],
        pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
      });

      render(
        <MemoryRouter>
          <AdminAssignmentQueuePage />
        </MemoryRouter>
      );

      await waitFor(() => screen.getByRole('button', { name: /Assign Worker/i }));
      fireEvent.click(screen.getByRole('button', { name: /Assign Worker/i }));

      const select = await screen.findByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(screen.getByText(/Rahul Kumar/i)).toBeInTheDocument();
    });

    it('submit button is disabled until a worker is selected', async () => {
      (adminWorkerService.listWorkers as any).mockResolvedValue({
        items: [mockWorker],
        pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
      });

      render(
        <MemoryRouter>
          <AdminAssignmentQueuePage />
        </MemoryRouter>
      );

      await waitFor(() => screen.getByRole('button', { name: /Assign Worker/i }));
      fireEvent.click(screen.getByRole('button', { name: /Assign Worker/i }));

      // Wait for selector to be loaded
      await screen.findByRole('combobox');

      // Button should be disabled while nothing is selected
      const submitButtons = screen.getAllByRole('button', { name: /Assign Worker/i });
      const submitBtn = submitButtons[submitButtons.length - 1];
      expect(submitBtn).toBeDisabled();
    });

    it('submit button enables after a worker is selected', async () => {
      (adminWorkerService.listWorkers as any).mockResolvedValue({
        items: [mockWorker],
        pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
      });

      render(
        <MemoryRouter>
          <AdminAssignmentQueuePage />
        </MemoryRouter>
      );

      await waitFor(() => screen.getByRole('button', { name: /Assign Worker/i }));
      fireEvent.click(screen.getByRole('button', { name: /Assign Worker/i }));

      const select = await screen.findByRole('combobox');
      fireEvent.change(select, { target: { value: mockWorker.id } });

      // Preview should appear
      expect(await screen.findByText('rahul.worker@example.com')).toBeInTheDocument();

      const submitButtons = screen.getAllByRole('button', { name: /Assign Worker/i });
      const submitBtn = submitButtons[submitButtons.length - 1];
      expect(submitBtn).not.toBeDisabled();
    });

    it('sends the selected worker UUID to the assignment API', async () => {
      (adminWorkerService.listWorkers as any).mockResolvedValue({
        items: [mockWorker],
        pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
      });
      (assignmentService.assignWorker as any).mockResolvedValue({
        id: 'assignment-1',
        donationId: 'donation-uuid-1',
        workerId: mockWorker.id,
        status: 'PENDING',
        assignedAt: new Date().toISOString(),
      });

      render(
        <MemoryRouter>
          <AdminAssignmentQueuePage />
        </MemoryRouter>
      );

      await waitFor(() => screen.getByRole('button', { name: /Assign Worker/i }));
      fireEvent.click(screen.getByRole('button', { name: /Assign Worker/i }));

      const select = await screen.findByRole('combobox');
      fireEvent.change(select, { target: { value: mockWorker.id } });

      const submitButtons = screen.getAllByRole('button', { name: /Assign Worker/i });
      const submitBtn = submitButtons[submitButtons.length - 1];
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(assignmentService.assignWorker).toHaveBeenCalledWith(
          'donation-uuid-1',
          mockWorker.id  // The actual worker UUID — not a manual string
        );
      });
    });

    it('shows no active workers state when list is empty', async () => {
      (adminWorkerService.listWorkers as any).mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
      });

      render(
        <MemoryRouter>
          <AdminAssignmentQueuePage />
        </MemoryRouter>
      );

      await waitFor(() => screen.getByRole('button', { name: /Assign Worker/i }));
      fireEvent.click(screen.getByRole('button', { name: /Assign Worker/i }));

      expect(await screen.findByText(/No active workers available/i)).toBeInTheDocument();
    });

    it('shows error state and retry when worker load fails', async () => {
      (adminWorkerService.listWorkers as any).mockRejectedValue({ message: 'Network error' });

      render(
        <MemoryRouter>
          <AdminAssignmentQueuePage />
        </MemoryRouter>
      );

      await waitFor(() => screen.getByRole('button', { name: /Assign Worker/i }));
      fireEvent.click(screen.getByRole('button', { name: /Assign Worker/i }));

      expect(await screen.findByText(/Unable to load workers/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    it('prevents duplicate submission during assignment', async () => {
      (adminWorkerService.listWorkers as any).mockResolvedValue({
        items: [mockWorker],
        pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
      });
      // Slow assignment
      (assignmentService.assignWorker as any).mockReturnValue(new Promise(() => {}));

      render(
        <MemoryRouter>
          <AdminAssignmentQueuePage />
        </MemoryRouter>
      );

      await waitFor(() => screen.getByRole('button', { name: /Assign Worker/i }));
      fireEvent.click(screen.getByRole('button', { name: /Assign Worker/i }));

      const select = await screen.findByRole('combobox');
      fireEvent.change(select, { target: { value: mockWorker.id } });

      const submitButtons = screen.getAllByRole('button', { name: /Assign Worker/i });
      const submitBtn = submitButtons[submitButtons.length - 1];
      fireEvent.click(submitBtn);

      // While assigning — button shows "Assigning…" and is disabled
      expect(await screen.findByText(/Assigning…/i)).toBeInTheDocument();
      expect(submitBtn).toBeDisabled();
    });

    it('switches between Pending Assignment and Assigned Tasks tabs', async () => {
      (assignmentService.getAdminAssignments as any).mockResolvedValue({
        items: [
          {
            id: 'assignment-101',
            donationId: mockDonation.id,
            workerId: mockWorker.id,
            status: 'ACCEPTED',
            assignedAt: new Date().toISOString(),
            respondedAt: new Date().toISOString(),
            donation: mockDonation,
            worker: mockWorker,
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      render(
        <MemoryRouter>
          <AdminAssignmentQueuePage />
        </MemoryRouter>
      );

      // Default view is Pending Assignment tab
      expect(await screen.findByText('Cooked Meal')).toBeInTheDocument();

      // Click Assigned Tasks / Tracking tab
      const assignedTab = screen.getByRole('tab', { name: /Assigned Tasks/i });
      fireEvent.click(assignedTab);

      // Verify Assigned Tasks table renders with assigned worker
      const table = await screen.findByRole('table');
      expect(within(table).getByText('Rahul Kumar')).toBeInTheDocument();
      expect(within(table).getByText(/Accepted — Awaiting Pickup/i)).toBeInTheDocument();
    });

    it('filters assigned tasks when status filter chip is clicked', async () => {
      (assignmentService.getAdminAssignments as any).mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      render(
        <MemoryRouter>
          <AdminAssignmentQueuePage />
        </MemoryRouter>
      );

      // Switch to Assigned Tasks tab
      const assignedTab = screen.getByRole('tab', { name: /Assigned Tasks/i });
      fireEvent.click(assignedTab);

      // Click "Accepted" filter chip
      const acceptedChip = await screen.findByRole('button', { name: /^Accepted$/i });
      fireEvent.click(acceptedChip);

      await waitFor(() => {
        expect(assignmentService.getAdminAssignments).toHaveBeenCalledWith(1, 20, 'ACCEPTED');
      });
    });

    it('opens assignment detail modal when Details button is clicked', async () => {
      (assignmentService.getAdminAssignments as any).mockResolvedValue({
        items: [
          {
            id: 'assignment-101',
            donationId: mockDonation.id,
            workerId: mockWorker.id,
            status: 'ACCEPTED',
            assignedAt: new Date().toISOString(),
            respondedAt: new Date().toISOString(),
            donation: mockDonation,
            worker: mockWorker,
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
      (assignmentService.getAssignmentHistory as any).mockResolvedValue([
        {
          id: 'assignment-101',
          donationId: mockDonation.id,
          workerId: mockWorker.id,
          status: 'ACCEPTED',
          assignedAt: new Date().toISOString(),
          worker: mockWorker,
        },
      ]);

      render(
        <MemoryRouter>
          <AdminAssignmentQueuePage />
        </MemoryRouter>
      );

      // Switch to Assigned Tasks tab
      const assignedTab = screen.getByRole('tab', { name: /Assigned Tasks/i });
      fireEvent.click(assignedTab);

      // Click Details button (desktop or mobile)
      const detailsBtns = await screen.findAllByRole('button', { name: /Details/i });
      fireEvent.click(detailsBtns[0]);

      // Modal opens with title and worker details
      const dialog = await screen.findByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByRole('heading', { name: /Assignment Details & History/i })).toBeInTheDocument();
      expect(within(dialog).getByText(/Assigned Worker Details/i)).toBeInTheDocument();
    });
  });

  // ── RBAC Route Protection ─────────────────────────────────────────────────

  describe('RBAC Route Protection for Admin Worker Provisioning', () => {
    it('blocks DONOR user from accessing Admin Worker Provisioning route', () => {
      (useAuth as any).mockReturnValue({
        user: { id: 'donor-1', role: 'DONOR' },
        status: 'authenticated',
      });

      render(
        <MemoryRouter initialEntries={['/admin/workers']}>
          <Routes>
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin/workers" element={<AdminWorkerProvisioningPage />} />
            </Route>
            <Route path="/dashboard" element={<div>Dashboard Redirect</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Dashboard Redirect')).toBeInTheDocument();
    });

    it('blocks WORKER user from accessing Admin Worker Provisioning route', () => {
      (useAuth as any).mockReturnValue({
        user: { id: 'worker-1', role: 'WORKER' },
        status: 'authenticated',
      });

      render(
        <MemoryRouter initialEntries={['/admin/workers']}>
          <Routes>
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin/workers" element={<AdminWorkerProvisioningPage />} />
            </Route>
            <Route path="/dashboard" element={<div>Dashboard Redirect</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Dashboard Redirect')).toBeInTheDocument();
    });
  });

  // ── FDLD Collection & Distribution Integration Notices ────────────────────

  describe('FDLD Collection & Distribution Integration Limitation Notices', () => {
    it('renders Collection integration notice banner cleanly', () => {
      render(
        <MemoryRouter>
          <AvailableFoodPage />
        </MemoryRouter>
      );
      expect(
        screen.getByText(/Integration Notice — Collection Backend Module Pending/i)
      ).toBeInTheDocument();
    });

    it('renders Distribution list page cleanly', async () => {
      render(
        <MemoryRouter>
          <DistributionListPage />
        </MemoryRouter>
      );
      expect(
        await screen.findByText(/Food Distribution Records/i)
      ).toBeInTheDocument();
    });
  });
});
