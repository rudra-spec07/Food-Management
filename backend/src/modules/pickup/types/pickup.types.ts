import { PickupStatus } from '@prisma/client';

export interface CompletePickupDto {
  completionNotes?: string;
}

export interface FailPickupDto {
  reason: string;
}

export interface WorkerPickupQueryDto {
  page?: number;
  limit?: number;
  status?: PickupStatus;
}

export interface AdminPickupQueryDto {
  page?: number;
  limit?: number;
  status?: PickupStatus;
  workerId?: string;
  donationId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedPickupResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
