import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { InventoryDashboardPage } from '../modules/inventory/pages/InventoryDashboardPage';
import { InventoryListPage } from '../modules/inventory/pages/InventoryListPage';
import { InventoryDetailsPage } from '../modules/inventory/pages/InventoryDetailsPage';
import { InventoryHistoryPage } from '../modules/inventory/pages/InventoryHistoryPage';
import { inventoryService } from '../modules/inventory/services/inventory.service';

// Mock AuthContext hook
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', firstName: 'Admin', lastName: 'User', role: 'ADMIN' },
    status: 'authenticated',
  }),
}));

describe('Frontend Module 05 — Inventory Unit & Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('InventoryDashboardPage Component', () => {
    it('renders dashboard heading and metrics structure', async () => {
      vi.spyOn(inventoryService, 'getSummary').mockResolvedValue(null);

      render(
        <MemoryRouter initialEntries={['/inventory']}>
          <Routes>
            <Route path="/inventory" element={<InventoryDashboardPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByText('Inventory & Food Availability')).toBeInTheDocument();
      expect(screen.getByText('Total Food')).toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('Reserved')).toBeInTheDocument();
      expect(screen.getByText('Distributed')).toBeInTheDocument();
      expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();
    });
  });

  describe('InventoryListPage Component', () => {
    it('renders inventory search input, filters, and table headers', async () => {
      vi.spyOn(inventoryService, 'getItems').mockResolvedValue(null);

      render(
        <MemoryRouter initialEntries={['/inventory/items']}>
          <Routes>
            <Route path="/inventory/items" element={<InventoryListPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByText('Inventory Stock Items')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search by description, donor reference, or location/i)).toBeInTheDocument();
      expect(screen.getByText('All Categories')).toBeInTheDocument();
      expect(screen.getByText('All Statuses')).toBeInTheDocument();
    });
  });

  describe('InventoryDetailsPage Component', () => {
    it('renders inventory details page header and batch not found message', async () => {
      vi.spyOn(inventoryService, 'getItemDetail').mockResolvedValue(null);

      render(
        <MemoryRouter initialEntries={['/inventory/items/inv-123']}>
          <Routes>
            <Route path="/inventory/items/:inventoryId" element={<InventoryDetailsPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByText('Inventory Batch Detail')).toBeInTheDocument();
      expect(screen.getByText('ID: inv-123')).toBeInTheDocument();
      expect(await screen.findByText(/Inventory Batch Not Found/i)).toBeInTheDocument();
    });
  });

  describe('InventoryHistoryPage Component', () => {
    it('renders history page header and empty/pending integration notice', async () => {
      vi.spyOn(inventoryService, 'getItemHistory').mockResolvedValue(null);

      render(
        <MemoryRouter initialEntries={['/inventory/items/inv-123/history']}>
          <Routes>
            <Route path="/inventory/items/:inventoryId/history" element={<InventoryHistoryPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByText('Inventory Movement History')).toBeInTheDocument();
      expect(screen.getByText(/Batch ID: inv-123/i)).toBeInTheDocument();
      expect(await screen.findByText(/No Movement Records Found/i)).toBeInTheDocument();
    });
  });
});
