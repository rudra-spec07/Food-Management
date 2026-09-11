import { AssignmentStatus } from '@prisma/client';

export interface AssignWorkerDto {
  workerId: string;
}

export interface RejectAssignmentDto {
  reason: string;
}

export interface AssignmentQueryDto {
  page?: number;
  limit?: number;
  status?: AssignmentStatus;
}

export interface PaginatedAssignmentResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AssignmentResponseDto {
  id: string;
  donationId: string;
  workerId: string;
  assignedBy: string;
  status: AssignmentStatus;
  rejectionReason: string | null;
  assignedAt: Date;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  worker?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  assigner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  donation?: any;
}
