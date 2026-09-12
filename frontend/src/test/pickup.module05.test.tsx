import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WorkerPickupDetailPage } from '../modules/worker/pages/WorkerPickupDetailPage';
import { pickupService, PickupItem } from '../services/pickup.service';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'worker-1', firstName: 'Worker', lastName: 'User', role: 'WORKER' },
    status: 'authenticated',
  }),
}));

describe('Frontend Module 05 — Worker Pickup Unit & Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockNotStartedPickup: PickupItem = {
    id: 'pck-101',
    donationId: 'don-101',
    assignmentId: 'asg-101',
    workerId: 'worker-1',
    status: 'NOT_STARTED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    donation: {
      id: 'don-101',
      category: 'COOKED_MEAL',
      description: 'Hot meals batch',
      quantity: 25,
      quantityUnit: 'PORTIONS',
      preparedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      pickupAddress: '456 Main St',
      contactName: 'Jane Manager',
      contactPhone: '+1234567890',
      status: 'ACCEPTED',
    },
  };

  const mockInProgressPickup: PickupItem = {
    ...mockNotStartedPickup,
    status: 'IN_PROGRESS',
    startedAt: new Date().toISOString(),
  };

  it('1. Renders pickup detail page header and Start Pickup button when NOT_STARTED', async () => {
    vi.spyOn(pickupService, 'getWorkerPickupDetail').mockResolvedValue(mockNotStartedPickup);

    render(
      <MemoryRouter initialEntries={['/worker/pickups/pck-101']}>
        <Routes>
          <Route path="/worker/pickups/:pickupId" element={<WorkerPickupDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Worker Pickup Management')).toBeInTheDocument();
    expect(screen.getByText('COOKED_MEAL')).toBeInTheDocument();
    expect(screen.getByText('25 PORTIONS')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Pickup/i })).toBeInTheDocument();
  });

  it('2. Calls startPickup API when Start Pickup button is clicked', async () => {
    vi.spyOn(pickupService, 'getWorkerPickupDetail').mockResolvedValue(mockNotStartedPickup);
    const startSpy = vi.spyOn(pickupService, 'startPickup').mockResolvedValue({ status: 'success', data: {} });

    render(
      <MemoryRouter initialEntries={['/worker/pickups/pck-101']}>
        <Routes>
          <Route path="/worker/pickups/:pickupId" element={<WorkerPickupDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    const startBtn = await screen.findByRole('button', { name: /Start Pickup/i });
    fireEvent.click(startBtn);

    expect(startSpy).toHaveBeenCalledWith('pck-101');
  });

  it('3. Renders Complete Pickup and Report Failure buttons when IN_PROGRESS', async () => {
    vi.spyOn(pickupService, 'getWorkerPickupDetail').mockResolvedValue(mockInProgressPickup);

    render(
      <MemoryRouter initialEntries={['/worker/pickups/pck-101']}>
        <Routes>
          <Route path="/worker/pickups/:pickupId" element={<WorkerPickupDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('button', { name: /Complete Pickup/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Report Pickup Failure/i })).toBeInTheDocument();
  });
});
