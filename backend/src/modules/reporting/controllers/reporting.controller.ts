import { Request, Response, NextFunction } from 'express';
import { ReportingService } from '../services/reporting.service';
import {
  donationReportQuerySchema,
  donationTrendQuerySchema,
  pickupReportQuerySchema,
  workerReportQuerySchema,
  activityQuerySchema,
} from '../dto/reporting.dto';
import { BadRequestError } from '../../../shared/errors/app-error';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ReportingController {
  private service: ReportingService;

  constructor(service?: ReportingService) {
    this.service = service || new ReportingService();
  }

  /**
   * GET /api/v1/admin/dashboard
   */
  public getAdminDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };
      const data = await this.service.getAdminDashboard(dateFrom, dateTo);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/reports/donations
   */
  public getDonationReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedQuery = donationReportQuerySchema.parse(req.query);
      const result = await this.service.getDonationReport(parsedQuery);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/reports/donations/trend
   */
  public getDonationTrend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedQuery = donationTrendQuerySchema.parse(req.query);
      const result = await this.service.getDonationTrend(parsedQuery);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/reports/donations/status-distribution
   */
  public getDonationStatusDistribution = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };
      const result = await this.service.getDonationStatusDistribution(dateFrom, dateTo);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/reports/pickups
   */
  public getPickupReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedQuery = pickupReportQuerySchema.parse(req.query);
      const result = await this.service.getPickupReport(parsedQuery);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/reports/workers
   */
  public getWorkerMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedQuery = workerReportQuerySchema.parse(req.query);
      const result = await this.service.getWorkerMetrics(parsedQuery);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/reports/workers/:workerId
   */
  public getWorkerDetailMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { workerId } = req.params;
      if (!UUID_REGEX.test(workerId)) {
        throw new BadRequestError('Invalid worker ID format', 'INVALID_UUID');
      }

      const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };
      const data = await this.service.getWorkerDetailMetrics(workerId, dateFrom, dateTo);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/activity
   */
  public getActivityLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedQuery = activityQuerySchema.parse(req.query);
      const result = await this.service.getActivityLogs(parsedQuery);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/admin/reports/donations/export
   */
  public exportDonationsCSV = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedQuery = donationReportQuerySchema.omit({ page: true, limit: true }).parse(req.query);
      const csvContent = await this.service.exportDonationsCSV(parsedQuery);

      const filename = `donations-report-${Date.now()}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/worker/dashboard
   * IDOR Protection: authenticated worker ID comes strictly from req.user.id.
   * Any workerId query parameter supplied by the client is completely ignored.
   */
  public getWorkerDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authenticatedUser = (req as any).user;
      if (!authenticatedUser || !authenticatedUser.id) {
        throw new BadRequestError('User context missing', 'AUTH_REQUIRED');
      }

      const workerId = authenticatedUser.id;
      const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };

      const data = await this.service.getWorkerDashboard(workerId, dateFrom, dateTo);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  };
}
