import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DistributionListPage } from '../pages/distributions/DistributionListPage';
import { CreateDistributionPage } from '../pages/distributions/CreateDistributionPage';
import { DistributionDetailPage } from '../pages/distributions/DistributionDetailPage';
import { distributionService } from '../services/distribution.service';
import { inventoryService } from '../modules/inventory/services/inventory.service';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', firstName: 'Test', lastName: 'User', role: 'WORKER' },
    status: 'authenticated',
  }),
}));

describe('Frontend Module 05 — Distribution Unit & Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('DistributionListPage Component', () => {
    it('1. renders distribution list page heading, create button, search input, and real records', async () => {
      vi.spyOn(distributionService, 'getDistributions').mockResolvedValue({
        items: [
          {
            id: 'dist-1',
            inventoryId: 'inv-1',
            distributedBy: 'user-1',
            recipientName: 'Hope Shelter',
            quantity: 30.0,
            unit: 'PORTIONS',
            status: 'COMPLETED',
            notes: 'Delivered successfully',
            distributedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            inventory: {
              id: 'inv-1',
              foodCategory: 'COOKED_MEAL',
              description: '30 Hot Meals',
            },
          },
        ],
        pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
      });

      render(
        <MemoryRouter initialEntries={['/distributions']}>
          <Routes>
            <Route path="/distributions" element={<DistributionListPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByText('Food Distribution Records')).toBeInTheDocument();
      expect(screen.getByText('Create Distribution')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search distribution records...')).toBeInTheDocument();
      expect(await screen.findByText('Hope Shelter')).toBeInTheDocument();
      expect(screen.getByText('30.00 PORTIONS')).toBeInTheDocument();
    });

    it('2. renders empty state when no distribution records exist', async () => {
      vi.spyOn(distributionService, 'getDistributions').mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 1 },
      });

      render(
        <MemoryRouter initialEntries={['/distributions']}>
          <Routes>
            <Route path="/distributions" element={<DistributionListPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByText('No distribution records found.')).toBeInTheDocument();
    });
  });

  describe('CreateDistributionPage Component', () => {
    it('1. renders create form and populates available inventory choices from real API', async () => {
      vi.spyOn(inventoryService, 'getItems').mockResolvedValue({
        items: [
          {
            id: 'inv-100',
            donationId: 'don-1',
            pickupId: 'pick-1',
            foodCategory: 'COOKED_MEAL' as any,
            description: '50 Fresh Meals',
            totalQuantity: 50,
            availableQuantity: 50,
            reservedQuantity: 0,
            distributedQuantity: 0,
            unit: 'PORTIONS' as any,
            status: 'AVAILABLE' as any,
            receivedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
      });

      render(
        <MemoryRouter initialEntries={['/distributions/new']}>
          <Routes>
            <Route path="/distributions/new" element={<CreateDistributionPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByText('Create New Distribution')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/50.00 PORTIONS available/i)).toBeInTheDocument();
      });

      expect(screen.getByPlaceholderText(/Hope Community Shelter/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter quantity')).toBeInTheDocument();
    });
  });

  describe('DistributionDetailPage Component', () => {
    it('1. renders distribution details from backend API', async () => {
      vi.spyOn(distributionService, 'getDistributionDetail').mockResolvedValue({
        id: 'dist-123',
        inventoryId: 'inv-1',
        distributedBy: 'user-1',
        recipientName: 'City Orphanage',
        quantity: 25.0,
        unit: 'KG',
        status: 'COMPLETED',
        notes: 'Handed to manager',
        distributedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        inventory: {
          id: 'inv-1',
          foodCategory: 'GROCERIES',
          description: 'Rice Bag 25kg',
          location: 'Shelf B',
        },
        distributor: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          role: 'WORKER',
        },
      });

      render(
        <MemoryRouter initialEntries={['/distributions/dist-123']}>
          <Routes>
            <Route path="/distributions/:distributionId" element={<DistributionDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect((await screen.findAllByText('City Orphanage')).length).toBeGreaterThan(0);
      expect(screen.getByText('25.00 KG')).toBeInTheDocument();
      expect(screen.getAllByText('COMPLETED').length).toBeGreaterThan(0);
      expect(screen.getByText('Rice Bag 25kg')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
