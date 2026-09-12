import { ReservationStatus, UserRole } from '@prisma/client';

export interface CreateReservationInput {
  inventoryId: string;
  quantity: number;
  notes?: string;
  durationHours?: number;
}

export interface ReservationFilterOptions {
  page: number;
  limit: number;
  status?: ReservationStatus;
  inventoryId?: string;
  reservedBy?: string;
}

export interface CreateReservationParams {
  inventoryId: string;
  quantity: number;
  notes?: string;
  durationHours?: number;
  reservedBy: string;
  actorRole: UserRole;
}
