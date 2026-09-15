import { DonationCategory, DonationStatus, PickupStatus, UserStatus, AuditEventType } from '@prisma/client';

export type GroupByPeriod = 'DAY' | 'WEEK' | 'MONTH';

export interface DateRangeFilter {
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginationFilter {
  page: number;
  limit: number;
}

export interface AdminDashboardMetrics {
  donations: {
    total: number;
    pending: number;
    approved: number;
    assigned: number;
    completed: number;
    rejected: number;
    cancelled: number;
  };
  pickups: {
    total: number;
    notStarted: number;
    inProgress: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
  workers: {
    active: number;
    assigned: number;
  };
  inventory: {
    totalItems: number;
    availableQuantity: number;
    reservedQuantity: number;
    distributedQuantity: number;
  };
}

export interface DonationReportFilter extends DateRangeFilter, PaginationFilter {
  status?: DonationStatus;
  category?: DonationCategory;
}

export interface DonationReportItem {
  id: string;
  donorId: string;
  donorName: string;
  category: DonationCategory;
  description: string;
  quantity: number;
  quantityUnit: string;
  status: DonationStatus;
  preparedAt: Date;
  expiresAt: Date;
  createdAt: Date;
}

export interface DonationReportSummary {
  items: DonationReportItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    totalQuantity: number;
    statusCounts: Record<string, number>;
  };
}

export interface DonationTrendFilter extends DateRangeFilter {
  groupBy: GroupByPeriod;
}

export interface DonationTrendPoint {
  period: string;
  count: number;
  totalQuantity: number;
}

export interface DonationStatusDistributionResult {
  distribution: Record<DonationStatus, number>;
  total: number;
}

export interface PickupReportFilter extends DateRangeFilter {
  status?: PickupStatus;
  workerId?: string;
}

export interface PickupReportMetrics {
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  failed: number;
  cancelled: number;
  avgDurationMinutes: number | null;
}

export interface WorkerReportFilter extends DateRangeFilter, PaginationFilter {}

export interface WorkerPerformanceMetric {
  workerId: string;
  firstName: string;
  lastName: string;
  email: string;
  status: UserStatus;
  assignedCount: number;
  completedCount: number;
  failedCount: number;
  successRate: number; // percentage 0 - 100
  avgCompletionTimeMinutes: number | null;
}

export interface WorkerDetailMetrics extends WorkerPerformanceMetric {
  activePickupsCount: number;
  pendingAssignmentsCount: number;
}

export interface ActivityFilter extends DateRangeFilter, PaginationFilter {
  action?: AuditEventType;
  userId?: string;
}

export interface ActivityLogItem {
  id: string;
  userId: string | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
  action: AuditEventType;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: Date;
}

export interface WorkerDashboardMetrics {
  workerId: string;
  assignedPickupsCount: number;
  inProgressPickupsCount: number;
  completedPickupsCount: number;
  failedPickupsCount: number;
  successRate: number;
  activeAssignmentsCount: number;
}
