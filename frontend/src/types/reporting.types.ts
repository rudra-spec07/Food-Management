export type GroupByPeriod = 'DAY' | 'WEEK' | 'MONTH';

export interface AdminDashboardData {
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

export interface DonationReportItem {
  id: string;
  donorId: string;
  donorName: string;
  category: string;
  description: string;
  quantity: number;
  quantityUnit: string;
  status: string;
  preparedAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface DonationReportData {
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

export interface DonationTrendPoint {
  period: string; // YYYY-MM-DD
  count: number;
  totalQuantity: number;
}

export interface DonationTrendData {
  items: DonationTrendPoint[];
  groupBy: GroupByPeriod;
}

export interface DonationStatusDistributionData {
  distribution: Record<string, number>;
  total: number;
}

export interface PickupReportData {
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  failed: number;
  cancelled: number;
  avgDurationMinutes: number | null;
}

export interface WorkerPerformanceItem {
  workerId: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  assignedCount: number;
  completedCount: number;
  failedCount: number;
  successRate: number;
  avgCompletionTimeMinutes: number | null;
}

export interface WorkerReportData {
  items: WorkerPerformanceItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WorkerDetailData extends WorkerPerformanceItem {
  activePickupsCount: number;
  pendingAssignmentsCount: number;
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
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface ActivityReportData {
  items: ActivityLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WorkerDashboardData {
  workerId: string;
  assignedPickupsCount: number;
  inProgressPickupsCount: number;
  completedPickupsCount: number;
  failedPickupsCount: number;
  successRate: number;
  activeAssignmentsCount: number;
}

export interface DateFilterParams {
  dateFrom?: string;
  dateTo?: string;
}

export interface DonationReportFilterParams extends DateFilterParams {
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface PickupReportFilterParams extends DateFilterParams {
  status?: string;
  workerId?: string;
}

export interface WorkerReportFilterParams extends DateFilterParams {
  page?: number;
  limit?: number;
}

export interface ActivityReportFilterParams extends DateFilterParams {
  action?: string;
  userId?: string;
  page?: number;
  limit?: number;
}
