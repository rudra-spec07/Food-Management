import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AvailableFoodPage } from '../pages/collection/AvailableFoodPage';
import { ReservationListPage } from '../pages/reservations/ReservationListPage';
import { ReservationDetailPage } from '../pages/reservations/ReservationDetailPage';
import { CreateDistributionPage } from '../pages/distributions/CreateDistributionPage';
import { reservationService } from '../services/reservation.service';
import { inventoryService } from '../modules/inventory/services/inventory.service';
import { apiClient } from '../services/api/apiClient';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', firstName: 'Test', lastName: 'Worker', role: 'WORKER' },
    status: 'authenticated',
  }),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', firstName: 'Test', lastName: 'Worker', role: 'WORKER' },
    status: 'authenticated',
  }),
}));

describe('Frontend Module 05 — Reservation Unit & Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('AvailableFoodPage Component with Reserve Action', () => {
    it('1. renders real available food inventory and triggers reserve modal', async () => {
      vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
        if (url.includes('/inventory/available')) {
          return {
            data: {
              success: true,
              data: {
                items: [
                  {
                    id: 'inv-1',
                    donationId: 'don-1',
                    pickupId: 'pick-1',
                    foodCategory: 'COOKED_MEALS',
                    description: '100 Fresh Hot Meals',
                    totalQuantity: 100,
                    availableQuantity: 80,
                    reservedQuantity: 20,
                    distributedQuantity: 0,
                    unit: 'PORTIONS',
                    status: 'AVAILABLE',
                    location: 'Kitchen Shelf 1',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                ],
                pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
              },
            },
          } as any;
        }
        return { data: { success: true, data: {} } } as any;
      });

      render(
        <MemoryRouter initialEntries={['/collection/available']}>
          <Routes>
            <Route path="/collection/available" element={<AvailableFoodPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByText('Available Food Collections')).toBeInTheDocument();
      expect(await screen.findByText('100 Fresh Hot Meals')).toBeInTheDocument();
      expect(screen.getByText('80.00 PORTIONS Available')).toBeInTheDocument();

      const reserveBtn = screen.getByText('Reserve Food');
      expect(reserveBtn).toBeInTheDocument();
      fireEvent.click(reserveBtn);

      expect(await screen.findByText('Reserve Food Stock')).toBeInTheDocument();
      expect(screen.getAllByText(/100 Fresh Hot Meals/i)[0]).toBeInTheDocument();
    });
  });

  describe('ReservationListPage Component', () => {
    it('1. renders reservation list with real reservation data', async () => {
      vi.spyOn(reservationService, 'getReservations').mockResolvedValue({
        items: [
          {
            id: 'res-1',
            inventoryId: 'inv-1',
            reservedBy: 'user-1',
            quantity: 20.0,
            unit: 'KG',
            status: 'ACTIVE',
            notes: 'Reserved for Shelter A',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            inventory: {
              id: 'inv-1',
              foodCategory: 'GROCERIES',
              description: '20 KG Rice',
            },
          },
        ],
        pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
      });

      render(
        <MemoryRouter initialEntries={['/reservations']}>
          <Routes>
            <Route path="/reservations" element={<ReservationListPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByText('Food Stock Reservations')).toBeInTheDocument();
      expect(await screen.findByText('20.00 KG')).toBeInTheDocument();
      expect(screen.getAllByText('ACTIVE').length).toBeGreaterThan(0);
    });

    it('2. renders empty state when user has no reservations', async () => {
      vi.spyOn(reservationService, 'getReservations').mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 1 },
      });

      render(
        <MemoryRouter initialEntries={['/reservations']}>
          <Routes>
            <Route path="/reservations" element={<ReservationListPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByText('No reservations found.')).toBeInTheDocument();
    });
  });

  describe('ReservationDetailPage Component', () => {
    it('1. renders reservation details and release modal trigger', async () => {
      vi.spyOn(reservationService, 'getReservationDetail').mockResolvedValue({
        id: 'res-100',
        inventoryId: 'inv-1',
        reservedBy: 'user-1',
        quantity: 15.0,
        unit: 'KG',
        status: 'ACTIVE',
        notes: 'Needs urgent distribution',
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        inventory: {
          id: 'inv-1',
          foodCategory: 'VEGETABLES',
          description: 'Carrots batch',
          location: 'Cold Room A',
        },
        reserver: {
          id: 'user-1',
          firstName: 'Test',
          lastName: 'Worker',
          email: 'worker@example.com',
          role: 'WORKER',
        },
      });

      render(
        <MemoryRouter initialEntries={['/reservations/res-100']}>
          <Routes>
            <Route path="/reservations/:reservationId" element={<ReservationDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByText('Reservation Detail')).toBeInTheDocument();
      expect(screen.getByText('15.00 KG')).toBeInTheDocument();
      expect(screen.getByText('Release Reservation')).toBeInTheDocument();
      expect(screen.getByText('Fulfill Distribution')).toBeInTheDocument();
    });
  });

  describe('CreateDistributionPage Component (Active Reservation Fulfillment Mode)', () => {
    it('1. switches to Fulfill Active Reservation mode and displays active reservations', async () => {
      vi.spyOn(inventoryService, 'getItems').mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 100, total: 0, totalPages: 1 },
      });

      vi.spyOn(reservationService, 'getReservations').mockResolvedValue({
        items: [
          {
            id: 'res-99',
            inventoryId: 'inv-99',
            reservedBy: 'user-1',
            quantity: 30.0,
            unit: 'PORTIONS',
            status: 'ACTIVE',
            expiresAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            inventory: {
              id: 'inv-99',
              foodCategory: 'COOKED_MEALS',
              description: '30 Soup Portions',
            },
            reserver: {
              id: 'user-1',
              firstName: 'Test',
              lastName: 'Worker',
              email: 'worker@example.com',
              role: 'WORKER',
            },
          },
        ],
        pagination: { page: 1, limit: 100, totalItems: 1, totalPages: 1 },
      });

      render(
        <MemoryRouter initialEntries={['/distributions/new?reservationId=res-99']}>
          <Routes>
            <Route path="/distributions/new" element={<CreateDistributionPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByText('Create New Distribution')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Active Reservation Details')).toBeInTheDocument();
        expect(screen.getByText(/Exact Fulfillment Quantity:/i)).toBeInTheDocument();
      });
    });
  });
});
