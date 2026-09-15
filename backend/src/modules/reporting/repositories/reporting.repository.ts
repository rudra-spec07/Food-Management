import { PrismaClient, DonationStatus, PickupStatus, UserRole, UserStatus, DonationCategory } from '@prisma/client';
import {
  AdminDashboardMetrics,
  DonationReportFilter,
  DonationReportSummary,
  DonationTrendFilter,
  DonationTrendPoint,
  DonationStatusDistributionResult,
  PickupReportFilter,
  PickupReportMetrics,
  WorkerReportFilter,
  WorkerPerformanceMetric,
  WorkerDetailMetrics,
  ActivityFilter,
  ActivityLogItem,
  WorkerDashboardMetrics,
} from '../types/reporting.types';

export class ReportingRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Fetches Admin Dashboard KPIs using efficient Prisma count & aggregate queries.
   */
  public async getAdminDashboardMetrics(dateFrom?: Date, dateTo?: Date): Promise<AdminDashboardMetrics> {
    const donationWhere: any = {};
    const pickupWhere: any = {};

    if (dateFrom || dateTo) {
      donationWhere.createdAt = {};
      pickupWhere.createdAt = {};
      if (dateFrom) {
        donationWhere.createdAt.gte = dateFrom;
        pickupWhere.createdAt.gte = dateFrom;
      }
      if (dateTo) {
        donationWhere.createdAt.lt = dateTo;
        pickupWhere.createdAt.lt = dateTo;
      }
    }

    // Parallel aggregate queries to prevent sequential waterfall
    const [donationGroup, pickupGroup, activeWorkersCount, assignedWorkersCount, inventoryStats] =
      await Promise.all([
        this.prisma.donation.groupBy({
          by: ['status'],
          where: donationWhere,
          _count: { _all: true },
        }),
        this.prisma.pickup.groupBy({
          by: ['status'],
          where: pickupWhere,
          _count: { _all: true },
        }),
        this.prisma.user.count({
          where: {
            role: UserRole.WORKER,
            status: UserStatus.ACTIVE,
          },
        }),
        this.prisma.assignment.findMany({
          where: {
            status: { in: ['PENDING', 'ACCEPTED'] },
          },
          select: { workerId: true },
          distinct: ['workerId'],
        }),
        this.prisma.inventoryItem.aggregate({
          _count: { _all: true },
          _sum: {
            availableQuantity: true,
            reservedQuantity: true,
            distributedQuantity: true,
          },
        }),
      ]);

    // Build Donation Counts
    const donationCounts: Record<string, number> = {};
    let donationTotal = 0;
    for (const item of donationGroup) {
      const count = item._count._all;
      donationCounts[item.status] = count;
      donationTotal += count;
    }

    // Build Pickup Counts
    const pickupCounts: Record<string, number> = {};
    let pickupTotal = 0;
    for (const item of pickupGroup) {
      const count = item._count._all;
      pickupCounts[item.status] = count;
      pickupTotal += count;
    }

    return {
      donations: {
        total: donationTotal,
        pending: donationCounts[DonationStatus.PENDING_REVIEW] || 0,
        approved: donationCounts[DonationStatus.APPROVED] || 0,
        assigned: (donationCounts[DonationStatus.ASSIGNED] || 0) + (donationCounts[DonationStatus.ACCEPTED] || 0),
        completed: (donationCounts[DonationStatus.COMPLETED] || 0) + (donationCounts[DonationStatus.PICKED_UP] || 0),
        rejected: donationCounts[DonationStatus.REJECTED] || 0,
        cancelled: donationCounts[DonationStatus.CANCELLED] || 0,
      },
      pickups: {
        total: pickupTotal,
        notStarted: pickupCounts[PickupStatus.NOT_STARTED] || 0,
        inProgress: pickupCounts[PickupStatus.IN_PROGRESS] || 0,
        completed: pickupCounts[PickupStatus.COMPLETED] || 0,
        failed: pickupCounts[PickupStatus.FAILED] || 0,
        cancelled: pickupCounts[PickupStatus.CANCELLED] || 0,
      },
      workers: {
        active: activeWorkersCount,
        assigned: assignedWorkersCount.length,
      },
      inventory: {
        totalItems: inventoryStats._count._all,
        availableQuantity: Number(inventoryStats._sum.availableQuantity || 0),
        reservedQuantity: Number(inventoryStats._sum.reservedQuantity || 0),
        distributedQuantity: Number(inventoryStats._sum.distributedQuantity || 0),
      },
    };
  }

  /**
   * Fetches paginated donation report list with summary metrics.
   */
  public async getDonationReport(filter: DonationReportFilter): Promise<DonationReportSummary> {
    const where: any = {};

    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) where.createdAt.gte = filter.dateFrom;
      if (filter.dateTo) where.createdAt.lt = filter.dateTo;
    }

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.category) {
      where.category = filter.category;
    }

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total, aggregate, statusGroup] = await Promise.all([
      this.prisma.donation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          donor: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.donation.count({ where }),
      this.prisma.donation.aggregate({
        where,
        _sum: { quantity: true },
      }),
      this.prisma.donation.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const sg of statusGroup) {
      statusCounts[sg.status] = sg._count._all;
    }

    const mappedItems = items.map((d) => ({
      id: d.id,
      donorId: d.donorId,
      donorName: `${d.donor.firstName} ${d.donor.lastName}`.trim(),
      category: d.category,
      description: d.description,
      quantity: Number(d.quantity),
      quantityUnit: d.quantityUnit,
      status: d.status,
      preparedAt: d.preparedAt,
      expiresAt: d.expiresAt,
      createdAt: d.createdAt,
    }));

    return {
      items: mappedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      summary: {
        totalQuantity: Number(aggregate._sum.quantity || 0),
        statusCounts,
      },
    };
  }

  /**
   * Fetches donation trend grouped chronologically by DAY, WEEK, or MONTH.
   */
  public async getDonationTrend(filter: DonationTrendFilter): Promise<DonationTrendPoint[]> {
    const groupBy = filter.groupBy || 'DAY';
    const dateFrom = filter.dateFrom;
    const dateTo = filter.dateTo;

    // Use Prisma $queryRaw with strict parameterization to prevent SQL injection
    let truncField = 'day';
    if (groupBy === 'WEEK') truncField = 'week';
    if (groupBy === 'MONTH') truncField = 'month';

    let rawQuery = '';
    const params: any[] = [];

    if (dateFrom && dateTo) {
      rawQuery = `
        SELECT
          DATE_TRUNC('${truncField}', created_at) AS period,
          COUNT(*)::int AS count,
          COALESCE(SUM(quantity), 0)::float AS "totalQuantity"
        FROM donations
        WHERE created_at >= $1 AND created_at < $2
        GROUP BY 1
        ORDER BY 1 ASC
      `;
      params.push(dateFrom, dateTo);
    } else if (dateFrom) {
      rawQuery = `
        SELECT
          DATE_TRUNC('${truncField}', created_at) AS period,
          COUNT(*)::int AS count,
          COALESCE(SUM(quantity), 0)::float AS "totalQuantity"
        FROM donations
        WHERE created_at >= $1
        GROUP BY 1
        ORDER BY 1 ASC
      `;
      params.push(dateFrom);
    } else if (dateTo) {
      rawQuery = `
        SELECT
          DATE_TRUNC('${truncField}', created_at) AS period,
          COUNT(*)::int AS count,
          COALESCE(SUM(quantity), 0)::float AS "totalQuantity"
        FROM donations
        WHERE created_at < $1
        GROUP BY 1
        ORDER BY 1 ASC
      `;
      params.push(dateTo);
    } else {
      rawQuery = `
        SELECT
          DATE_TRUNC('${truncField}', created_at) AS period,
          COUNT(*)::int AS count,
          COALESCE(SUM(quantity), 0)::float AS "totalQuantity"
        FROM donations
        GROUP BY 1
        ORDER BY 1 ASC
      `;
    }

    const rawResults: Array<{ period: Date; count: number; totalQuantity: number }> =
      await this.prisma.$queryRawUnsafe(rawQuery, ...params);

    return rawResults.map((r) => ({
      period: new Date(r.period).toISOString().split('T')[0],
      count: Number(r.count),
      totalQuantity: Number(r.totalQuantity),
    }));
  }

  /**
   * Returns complete status distribution resilient to all valid DonationStatus enum values.
   */
  public async getDonationStatusDistribution(dateFrom?: Date, dateTo?: Date): Promise<DonationStatusDistributionResult> {
    const where: any = {};
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lt = dateTo;
    }

    const grouped = await this.prisma.donation.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    const distribution: Record<string, number> = {};
    let total = 0;

    // Initialize all enum values with 0
    Object.values(DonationStatus).forEach((statusVal) => {
      distribution[statusVal] = 0;
    });

    // Populate actual counts
    for (const item of grouped) {
      const count = item._count._all;
      distribution[item.status] = count;
      total += count;
    }

    return {
      distribution: distribution as Record<DonationStatus, number>,
      total,
    };
  }

  /**
   * Returns pickup operational metrics and average completion duration.
   */
  public async getPickupReport(filter: PickupReportFilter): Promise<PickupReportMetrics> {
    const where: any = {};
    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) where.createdAt.gte = filter.dateFrom;
      if (filter.dateTo) where.createdAt.lt = filter.dateTo;
    }
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.workerId) {
      where.workerId = filter.workerId;
    }

    const [grouped, totalCount] = await Promise.all([
      this.prisma.pickup.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      this.prisma.pickup.count({ where }),
    ]);

    const counts: Record<string, number> = {};
    for (const item of grouped) {
      counts[item.status] = item._count._all;
    }

    // Calculate average duration for completed pickups (startedAt to completedAt in minutes)
    let avgDurationMinutes: number | null = null;
    const completedWhere = {
      ...where,
      status: PickupStatus.COMPLETED,
      startedAt: { not: null },
      completedAt: { not: null },
    };

    const completedPickups = await this.prisma.pickup.findMany({
      where: completedWhere,
      select: { startedAt: true, completedAt: true },
    });

    if (completedPickups.length > 0) {
      let totalMinutes = 0;
      let validCount = 0;
      for (const p of completedPickups) {
        if (p.startedAt && p.completedAt) {
          const diffMs = p.completedAt.getTime() - p.startedAt.getTime();
          if (diffMs >= 0) {
            totalMinutes += diffMs / (1000 * 60);
            validCount++;
          }
        }
      }
      if (validCount > 0) {
        avgDurationMinutes = Math.round((totalMinutes / validCount) * 10) / 10;
      }
    }

    return {
      total: totalCount,
      notStarted: counts[PickupStatus.NOT_STARTED] || 0,
      inProgress: counts[PickupStatus.IN_PROGRESS] || 0,
      completed: counts[PickupStatus.COMPLETED] || 0,
      failed: counts[PickupStatus.FAILED] || 0,
      cancelled: counts[PickupStatus.CANCELLED] || 0,
      avgDurationMinutes,
    };
  }

  /**
   * Fetches aggregate performance for workers without N+1 queries.
   */
  public async getWorkerMetrics(filter: WorkerReportFilter): Promise<{
    items: WorkerPerformanceMetric[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const workerWhere: any = { role: UserRole.WORKER };

    const dateWhere: any = {};
    if (filter.dateFrom || filter.dateTo) {
      dateWhere.createdAt = {};
      if (filter.dateFrom) dateWhere.createdAt.gte = filter.dateFrom;
      if (filter.dateTo) dateWhere.createdAt.lt = filter.dateTo;
    }

    const [workers, totalWorkers] = await Promise.all([
      this.prisma.user.findMany({
        where: workerWhere,
        skip,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: workerWhere }),
    ]);

    if (workers.length === 0) {
      return { items: [], total: 0, page, limit, totalPages: 1 };
    }

    const workerIds = workers.map((w) => w.id);

    // Grouped queries over workerIds
    const [assignmentsGroup, pickupsGroup, completedPickups] = await Promise.all([
      this.prisma.assignment.groupBy({
        by: ['workerId'],
        where: {
          workerId: { in: workerIds },
          ...dateWhere,
        },
        _count: { _all: true },
      }),
      this.prisma.pickup.groupBy({
        by: ['workerId', 'status'],
        where: {
          workerId: { in: workerIds },
          ...dateWhere,
        },
        _count: { _all: true },
      }),
      this.prisma.pickup.findMany({
        where: {
          workerId: { in: workerIds },
          status: PickupStatus.COMPLETED,
          startedAt: { not: null },
          completedAt: { not: null },
          ...dateWhere,
        },
        select: {
          workerId: true,
          startedAt: true,
          completedAt: true,
        },
      }),
    ]);

    // Build lookup maps
    const assignedMap: Record<string, number> = {};
    for (const ag of assignmentsGroup) {
      assignedMap[ag.workerId] = ag._count._all;
    }

    const completedMap: Record<string, number> = {};
    const failedMap: Record<string, number> = {};
    for (const pg of pickupsGroup) {
      if (pg.status === PickupStatus.COMPLETED) {
        completedMap[pg.workerId] = (completedMap[pg.workerId] || 0) + pg._count._all;
      } else if (pg.status === PickupStatus.FAILED) {
        failedMap[pg.workerId] = (failedMap[pg.workerId] || 0) + pg._count._all;
      }
    }

    const durationMap: Record<string, { totalMs: number; count: number }> = {};
    for (const cp of completedPickups) {
      if (cp.startedAt && cp.completedAt) {
        const diffMs = cp.completedAt.getTime() - cp.startedAt.getTime();
        if (diffMs >= 0) {
          if (!durationMap[cp.workerId]) {
            durationMap[cp.workerId] = { totalMs: 0, count: 0 };
          }
          durationMap[cp.workerId].totalMs += diffMs;
          durationMap[cp.workerId].count += 1;
        }
      }
    }

    const items: WorkerPerformanceMetric[] = workers.map((w) => {
      const assignedCount = assignedMap[w.id] || 0;
      const completedCount = completedMap[w.id] || 0;
      const failedCount = failedMap[w.id] || 0;
      const totalFinished = completedCount + failedCount;
      const successRate = totalFinished > 0 ? Math.round((completedCount / totalFinished) * 1000) / 10 : 0;

      let avgCompletionTimeMinutes: number | null = null;
      if (durationMap[w.id] && durationMap[w.id].count > 0) {
        avgCompletionTimeMinutes =
          Math.round((durationMap[w.id].totalMs / (durationMap[w.id].count * 60000)) * 10) / 10;
      }

      return {
        workerId: w.id,
        firstName: w.firstName,
        lastName: w.lastName,
        email: w.email,
        status: w.status,
        assignedCount,
        completedCount,
        failedCount,
        successRate,
        avgCompletionTimeMinutes,
      };
    });

    return {
      items,
      total: totalWorkers,
      page,
      limit,
      totalPages: Math.ceil(totalWorkers / limit) || 1,
    };
  }

  /**
   * Fetches detailed performance metrics for a specific worker.
   */
  public async getWorkerDetailMetrics(
    workerId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<WorkerDetailMetrics | null> {
    const worker = await this.prisma.user.findFirst({
      where: { id: workerId, role: UserRole.WORKER },
      select: { id: true, firstName: true, lastName: true, email: true, status: true },
    });

    if (!worker) return null;

    const dateWhere: any = {};
    if (dateFrom || dateTo) {
      dateWhere.createdAt = {};
      if (dateFrom) dateWhere.createdAt.gte = dateFrom;
      if (dateTo) dateWhere.createdAt.lt = dateTo;
    }

    const [assignedCount, pickupsGroup, activePickupsCount, pendingAssignmentsCount, completedPickups] =
      await Promise.all([
        this.prisma.assignment.count({
          where: { workerId, ...dateWhere },
        }),
        this.prisma.pickup.groupBy({
          by: ['status'],
          where: { workerId, ...dateWhere },
          _count: { _all: true },
        }),
        this.prisma.pickup.count({
          where: { workerId, status: { in: [PickupStatus.NOT_STARTED, PickupStatus.IN_PROGRESS] } },
        }),
        this.prisma.assignment.count({
          where: { workerId, status: 'PENDING' },
        }),
        this.prisma.pickup.findMany({
          where: {
            workerId,
            status: PickupStatus.COMPLETED,
            startedAt: { not: null },
            completedAt: { not: null },
            ...dateWhere,
          },
          select: { startedAt: true, completedAt: true },
        }),
      ]);

    const counts: Record<string, number> = {};
    for (const pg of pickupsGroup) {
      counts[pg.status] = pg._count._all;
    }

    const completedCount = counts[PickupStatus.COMPLETED] || 0;
    const failedCount = counts[PickupStatus.FAILED] || 0;
    const totalFinished = completedCount + failedCount;
    const successRate = totalFinished > 0 ? Math.round((completedCount / totalFinished) * 1000) / 10 : 0;

    let avgCompletionTimeMinutes: number | null = null;
    if (completedPickups.length > 0) {
      let totalMs = 0;
      let validCount = 0;
      for (const cp of completedPickups) {
        if (cp.startedAt && cp.completedAt) {
          const diffMs = cp.completedAt.getTime() - cp.startedAt.getTime();
          if (diffMs >= 0) {
            totalMs += diffMs;
            validCount++;
          }
        }
      }
      if (validCount > 0) {
        avgCompletionTimeMinutes = Math.round((totalMs / (validCount * 60000)) * 10) / 10;
      }
    }

    return {
      workerId: worker.id,
      firstName: worker.firstName,
      lastName: worker.lastName,
      email: worker.email,
      status: worker.status,
      assignedCount,
      completedCount,
      failedCount,
      successRate,
      avgCompletionTimeMinutes,
      activePickupsCount,
      pendingAssignmentsCount,
    };
  }

  /**
   * Fetches audit log entries with user details.
   */
  public async getActivityLogs(filter: ActivityFilter): Promise<{
    items: ActivityLogItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const where: any = {};
    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) where.createdAt.gte = filter.dateFrom;
      if (filter.dateTo) where.createdAt.lt = filter.dateTo;
    }
    if (filter.action) {
      where.action = filter.action;
    }
    if (filter.userId) {
      where.userId = filter.userId;
    }

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const items: ActivityLogItem[] = logs.map((log) => {
      let safeMetadata: Record<string, any> | null = null;
      if (log.metadata && typeof log.metadata === 'object' && !Array.isArray(log.metadata)) {
        // Sanitize sensitive keys
        const metaObj = log.metadata as Record<string, any>;
        safeMetadata = {};
        for (const [k, v] of Object.entries(metaObj)) {
          if (!['password', 'passwordHash', 'token', 'refreshToken', 'secret'].includes(k)) {
            safeMetadata[k] = v;
          }
        }
      }

      return {
        id: log.id,
        userId: log.userId,
        user: log.user
          ? {
              firstName: log.user.firstName,
              lastName: log.user.lastName,
              email: log.user.email,
              role: log.user.role,
            }
          : null,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: safeMetadata,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Fetches donation records for CSV export (capped at 10,001 rows for limit check).
   */
  public async getDonationsForExport(filter: {
    dateFrom?: Date;
    dateTo?: Date;
    status?: DonationStatus;
    category?: DonationCategory;
  }): Promise<Array<{
    id: string;
    donorName: string;
    donorEmail: string;
    category: string;
    description: string;
    quantity: number;
    quantityUnit: string;
    status: string;
    pickupAddress: string;
    contactName: string;
    contactPhone: string;
    createdAt: Date;
  }>> {
    const where: any = {};
    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) where.createdAt.gte = filter.dateFrom;
      if (filter.dateTo) where.createdAt.lt = filter.dateTo;
    }
    if (filter.status) where.status = filter.status;
    if (filter.category) where.category = filter.category;

    const items = await this.prisma.donation.findMany({
      where,
      take: 10001, // 10,001 to detect if max allowable limit of 10,000 is exceeded
      orderBy: { createdAt: 'desc' },
      include: {
        donor: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    return items.map((d) => ({
      id: d.id,
      donorName: `${d.donor.firstName} ${d.donor.lastName}`.trim(),
      donorEmail: d.donor.email,
      category: d.category,
      description: d.description,
      quantity: Number(d.quantity),
      quantityUnit: d.quantityUnit,
      status: d.status,
      pickupAddress: d.pickupAddress,
      contactName: d.contactName,
      contactPhone: d.contactPhone,
      createdAt: d.createdAt,
    }));
  }

  /**
   * Worker operational dashboard metrics scoped strictly to workerId.
   */
  public async getWorkerDashboardMetrics(
    workerId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<WorkerDashboardMetrics> {
    const dateWhere: any = {};
    if (dateFrom || dateTo) {
      dateWhere.createdAt = {};
      if (dateFrom) dateWhere.createdAt.gte = dateFrom;
      if (dateTo) dateWhere.createdAt.lt = dateTo;
    }

    const [pickupsGroup, activeAssignmentsCount] = await Promise.all([
      this.prisma.pickup.groupBy({
        by: ['status'],
        where: {
          workerId,
          ...dateWhere,
        },
        _count: { _all: true },
      }),
      this.prisma.assignment.count({
        where: {
          workerId,
          status: 'PENDING',
        },
      }),
    ]);

    const counts: Record<string, number> = {};
    let totalPickups = 0;
    for (const pg of pickupsGroup) {
      const cnt = pg._count._all;
      counts[pg.status] = cnt;
      totalPickups += cnt;
    }

    const completedCount = counts[PickupStatus.COMPLETED] || 0;
    const failedCount = counts[PickupStatus.FAILED] || 0;
    const finishedTotal = completedCount + failedCount;
    const successRate = finishedTotal > 0 ? Math.round((completedCount / finishedTotal) * 1000) / 10 : 0;

    return {
      workerId,
      assignedPickupsCount: totalPickups,
      inProgressPickupsCount: counts[PickupStatus.IN_PROGRESS] || 0,
      completedPickupsCount: completedCount,
      failedPickupsCount: failedCount,
      successRate,
      activeAssignmentsCount,
    };
  }
}
