import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beneficiaryService } from '../services/beneficiary.service';
import { BeneficiaryListPage } from '../pages/beneficiaries/BeneficiaryListPage';
import { Beneficiary } from '../types/beneficiary.types';
let mockUserRole: 'ADMIN' | 'WORKER' | 'DONOR' = 'ADMIN';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
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

vi.mock('../services/beneficiary.service', () => ({
  beneficiaryService: {
    getBeneficiaries: vi.fn(),
    getBeneficiary: vi.fn(),
    createBeneficiary: vi.fn(),
    updateBeneficiary: vi.fn(),
    getBeneficiaryHistory: vi.fn(),
  },
}));

const mockBeneficiaries: Beneficiary[] = [
  {
    id: 'ben-1',
    name: 'Hope Community Shelter',
    contactPerson: 'Sarah Connor',
    email: 'contact@hopeshelter.org',
    phone: '9876543210',
    address: '777 Hope Ave',
    status: 'ACTIVE',
    notes: 'Primary shelter',
    createdAt: '2026-09-15T10:00:00.000Z',
    updatedAt: '2026-09-15T10:00:00.000Z',
  },
  {
    id: 'ben-2',
    name: 'City Food Pantry',
    contactPerson: 'John Smith',
    email: 'info@citypantry.org',
    phone: '9123456789',
    address: '123 Pantry St',
    status: 'INACTIVE',
    createdAt: '2026-09-15T11:00:00.000Z',
    updatedAt: '2026-09-15T11:00:00.000Z',
  },
];

describe('Module 06 — Beneficiary Management Frontend Unit & Integration Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMockAuth = (role: 'ADMIN' | 'WORKER' | 'DONOR') => {
    mockUserRole = role;
  };

  describe('BeneficiaryListPage Component', () => {
    it('renders heading and Add Beneficiary button for ADMIN role', async () => {
      setupMockAuth('ADMIN');
      vi.mocked(beneficiaryService.getBeneficiaries).mockResolvedValue({
        items: mockBeneficiaries,
        pagination: { page: 1, limit: 10, totalItems: 2, totalPages: 1 },
      });

      render(
        <MemoryRouter>
          <BeneficiaryListPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Beneficiary Organizations')).toBeInTheDocument();
        expect(screen.getByText('Add Beneficiary')).toBeInTheDocument();
        expect(screen.getByText('Hope Community Shelter')).toBeInTheDocument();
        expect(screen.getByText('City Food Pantry')).toBeInTheDocument();
      });
    });

    it('hides Add Beneficiary button for WORKER role (Safeguard 3)', async () => {
      setupMockAuth('WORKER');
      vi.mocked(beneficiaryService.getBeneficiaries).mockResolvedValue({
        items: mockBeneficiaries,
        pagination: { page: 1, limit: 10, totalItems: 2, totalPages: 1 },
      });

      render(
        <MemoryRouter>
          <BeneficiaryListPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Beneficiary Organizations')).toBeInTheDocument();
        expect(screen.queryByText('Add Beneficiary')).not.toBeInTheDocument();
      });
    });

    it('opens create modal on button click and submits new beneficiary', async () => {
      setupMockAuth('ADMIN');
      vi.mocked(beneficiaryService.getBeneficiaries).mockResolvedValue({
        items: mockBeneficiaries,
        pagination: { page: 1, limit: 10, totalItems: 2, totalPages: 1 },
      });
      vi.mocked(beneficiaryService.createBeneficiary).mockResolvedValue(mockBeneficiaries[0]);

      render(
        <MemoryRouter>
          <BeneficiaryListPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Add Beneficiary')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Add Beneficiary'));

      await waitFor(() => {
        expect(screen.getByText('Add Beneficiary Organization')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText(/St. Jude Food Shelter/i), {
        target: { value: 'New Shelter' },
      });
      fireEvent.change(screen.getByPlaceholderText(/Full physical address/i), {
        target: { value: '999 New St' },
      });

      const createBtn = screen.getByRole('button', { name: /Create Beneficiary/i });
      fireEvent.click(createBtn);

      await waitFor(() => {
        expect(beneficiaryService.createBeneficiary).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Shelter',
            address: '999 New St',
            status: 'ACTIVE',
          })
        );
      });
    });

    it('opens history modal when History button is clicked', async () => {
      setupMockAuth('WORKER');
      vi.mocked(beneficiaryService.getBeneficiaries).mockResolvedValue({
        items: mockBeneficiaries,
        pagination: { page: 1, limit: 10, totalItems: 2, totalPages: 1 },
      });
      vi.mocked(beneficiaryService.getBeneficiaryHistory).mockResolvedValue({
        items: [
          {
            id: 'dist-1',
            inventoryId: 'inv-1',
            distributedBy: 'user-1',
            recipientName: 'Hope Community Shelter',
            quantity: 50,
            unit: 'BOXES',
            status: 'COMPLETED',
            distributedAt: '2026-09-15T12:00:00.000Z',
            createdAt: '2026-09-15T12:00:00.000Z',
            updatedAt: '2026-09-15T12:00:00.000Z',
            inventory: {
              id: 'inv-1',
              foodCategory: 'GROCERIES',
              description: 'Canned Beans',
            },
          },
        ],
        pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
      });

      render(
        <MemoryRouter>
          <BeneficiaryListPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Hope Community Shelter')).toBeInTheDocument();
      });

      const historyBtns = screen.getAllByText('History');
      fireEvent.click(historyBtns[0]);

      await waitFor(() => {
        expect(screen.getByText('Distribution History')).toBeInTheDocument();
        expect(screen.getByText('Canned Beans')).toBeInTheDocument();
        expect(screen.getByText('50 BOXES')).toBeInTheDocument();
      });
    });
  });
});
