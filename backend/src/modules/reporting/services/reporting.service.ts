import { ReportingRepository } from '../repositories/reporting.repository';
import { parseDateParam, validateDateRange } from '../dto/reporting.dto';
import {
  AdminDashboardMetrics,
  DonationReportSummary,
  DonationTrendPoint,
  DonationStatusDistributionResult,
  PickupReportMetrics,
  WorkerPerformanceMetric,
  WorkerDetailMetrics,
  ActivityLogItem,
  WorkerDashboardMetrics,
  GroupByPeriod,
} from '../types/reporting.types';
import { DonationStatus, DonationCategory, PickupStatus, AuditEventType } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../../shared/errors/app-error';

const MAX_EXPORT_ROW_LIMIT = 10000;

export class ReportingService {
  private repository: ReportingRepository;

  constructor(repository?: ReportingRepository) {
    this.repository = repository || new ReportingRepository();
  }

  /**
   * Admin Dashboard KPI overview.
   */
  public async getAdminDashboard(dateFromStr?: string, dateToStr?: string): Promise<AdminDashboardMetrics> {
    const dateFrom = parseDateParam(dateFromStr, false);
    const dateTo = parseDateParam(dateToStr, true);
    validateDateRange(dateFrom, dateTo);

    return this.repository.getAdminDashboardMetrics(dateFrom, dateTo);
  }

  /**
   * Filtered donation report summary.
   */
  public async getDonationReport(query: {
    dateFrom?: string;
    dateTo?: string;
    status?: DonationStatus;
    category?: DonationCategory;
    page: number;
    limit: number;
  }): Promise<DonationReportSummary> {
    const dateFrom = parseDateParam(query.dateFrom, false);
    const dateTo = parseDateParam(query.dateTo, true);
    validateDateRange(dateFrom, dateTo);

    return this.repository.getDonationReport({
      dateFrom,
      dateTo,
      status: query.status,
      category: query.category,
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Donation trend grouped chronologically by DAY, WEEK, or MONTH.
   */
  public async getDonationTrend(query: {
    dateFrom?: string;
    dateTo?: string;
    groupBy: GroupByPeriod;
  }): Promise<{ items: DonationTrendPoint[]; groupBy: GroupByPeriod }> {
    const dateFrom = parseDateParam(query.dateFrom, false);
    const dateTo = parseDateParam(query.dateTo, true);
    validateDateRange(dateFrom, dateTo);

    const items = await this.repository.getDonationTrend({
      dateFrom,
      dateTo,
      groupBy: query.groupBy,
    });

    return { items, groupBy: query.groupBy };
  }

  /**
   * Status distribution breakdown for all valid DonationStatus values.
   */
  public async getDonationStatusDistribution(
    dateFromStr?: string,
    dateToStr?: string
  ): Promise<DonationStatusDistributionResult> {
    const dateFrom = parseDateParam(dateFromStr, false);
    const dateTo = parseDateParam(dateToStr, true);
    validateDateRange(dateFrom, dateTo);

    return this.repository.getDonationStatusDistribution(dateFrom, dateTo);
  }

  /**
   * Pickup operational metrics.
   */
  public async getPickupReport(query: {
    dateFrom?: string;
    dateTo?: string;
    status?: PickupStatus;
    workerId?: string;
  }): Promise<PickupReportMetrics> {
    const dateFrom = parseDateParam(query.dateFrom, false);
    const dateTo = parseDateParam(query.dateTo, true);
    validateDateRange(dateFrom, dateTo);

    return this.repository.getPickupReport({
      dateFrom,
      dateTo,
      status: query.status,
      workerId: query.workerId,
    });
  }

  /**
   * Aggregate worker performance metrics.
   */
  public async getWorkerMetrics(query: {
    dateFrom?: string;
    dateTo?: string;
    page: number;
    limit: number;
  }): Promise<{
    items: WorkerPerformanceMetric[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const dateFrom = parseDateParam(query.dateFrom, false);
    const dateTo = parseDateParam(query.dateTo, true);
    validateDateRange(dateFrom, dateTo);

    return this.repository.getWorkerMetrics({
      dateFrom,
      dateTo,
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Individual worker detailed performance report.
   */
  public async getWorkerDetailMetrics(
    workerId: string,
    dateFromStr?: string,
    dateToStr?: string
  ): Promise<WorkerDetailMetrics> {
    const dateFrom = parseDateParam(dateFromStr, false);
    const dateTo = parseDateParam(dateToStr, true);
    validateDateRange(dateFrom, dateTo);

    const metrics = await this.repository.getWorkerDetailMetrics(workerId, dateFrom, dateTo);
    if (!metrics) {
      throw new NotFoundError(`Worker with ID ${workerId} not found`, 'WORKER_NOT_FOUND');
    }

    return metrics;
  }

  /**
   * System audit activity feed.
   */
  public async getActivityLogs(query: {
    dateFrom?: string;
    dateTo?: string;
    action?: AuditEventType;
    userId?: string;
    page: number;
    limit: number;
  }): Promise<{
    items: ActivityLogItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const dateFrom = parseDateParam(query.dateFrom, false);
    const dateTo = parseDateParam(query.dateTo, true);
    validateDateRange(dateFrom, dateTo);

    return this.repository.getActivityLogs({
      dateFrom,
      dateTo,
      action: query.action,
      userId: query.userId,
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Generates CSV report with formula injection sanitization and 10,000 row cap enforcement.
   */
  public async exportDonationsCSV(query: {
    dateFrom?: string;
    dateTo?: string;
    status?: DonationStatus;
    category?: DonationCategory;
  }): Promise<string> {
    const dateFrom = parseDateParam(query.dateFrom, false);
    const dateTo = parseDateParam(query.dateTo, true);
    validateDateRange(dateFrom, dateTo);

    const rows = await this.repository.getDonationsForExport({
      dateFrom,
      dateTo,
      status: query.status,
      category: query.category,
    });

    if (rows.length > MAX_EXPORT_ROW_LIMIT) {
      throw new BadRequestError(
        `Export request exceeds maximum allowable limit of ${MAX_EXPORT_ROW_LIMIT} records. Please refine your date range or filters.`,
        'REPORT_EXPORT_TOO_LARGE'
      );
    }

    const headers = [
      'Donation ID',
      'Donor Name',
      'Donor Email',
      'Category',
      'Description',
      'Quantity',
      'Unit',
      'Status',
      'Pickup Address',
      'Contact Name',
      'Contact Phone',
      'Created At',
    ];

    const sanitizeCell = (val: any): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      // Formula injection protection: if value starts with =, +, -, @, prepend a single quote
      if (/^[=+\-@]/.test(str)) {
        str = `'${str}`;
      }
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvLines: string[] = [];
    csvLines.push(headers.map(sanitizeCell).join(','));

    for (const r of rows) {
      const line = [
        r.id,
        r.donorName,
        r.donorEmail,
        r.category,
        r.description,
        r.quantity,
        r.quantityUnit,
        r.status,
        r.pickupAddress,
        r.contactName,
        r.contactPhone,
        r.createdAt ? r.createdAt.toISOString() : '',
      ]
        .map(sanitizeCell)
        .join(',');
      csvLines.push(line);
    }

    return csvLines.join('\n');
  }

  /**
   * Worker operational dashboard metrics.
   * Strictly enforces IDOR protection: workerId comes ONLY from authenticated user token.
   */
  public async getWorkerDashboard(
    authenticatedWorkerId: string,
    dateFromStr?: string,
    dateToStr?: string
  ): Promise<WorkerDashboardMetrics> {
    const dateFrom = parseDateParam(dateFromStr, false);
    const dateTo = parseDateParam(dateToStr, true);
    validateDateRange(dateFrom, dateTo);

    return this.repository.getWorkerDashboardMetrics(authenticatedWorkerId, dateFrom, dateTo);
  }
}
