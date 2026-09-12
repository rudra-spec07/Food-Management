import { Request, Response, NextFunction } from 'express';
import { PickupService } from '../services/pickup.service';
import {
  startPickupSchema,
  completePickupSchema,
  failPickupSchema,
  workerPickupQuerySchema,
  adminPickupQuerySchema,
} from '../dto/pickup.dto';
import { UnauthorizedError } from '../../../shared/errors/app-error';

export class PickupController {
  private service: PickupService;

  constructor(service?: PickupService) {
    this.service = service || new PickupService();
  }

  // Worker endpoints
  public getWorkerPickups = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const query = workerPickupQuerySchema.parse(req.query);
      const result = await this.service.getWorkerPickups(req.user.id, query);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  public getWorkerPickupDetail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const pickup = await this.service.getWorkerPickupDetail(req.params.pickupId, req.user.id);
      res.status(200).json({
        status: 'success',
        data: pickup,
      });
    } catch (err) {
      next(err);
    }
  };

  public startPickup = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      startPickupSchema.parse(req.body);
      const result = await this.service.startPickup(req.params.pickupId, req.user.id);
      res.status(200).json({
        status: 'success',
        message: 'Pickup started successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  public completePickup = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const dto = completePickupSchema.parse(req.body);
      const result = await this.service.completePickup(req.params.pickupId, req.user.id, dto);
      res.status(200).json({
        status: 'success',
        message: 'Pickup completed successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  public failPickup = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const dto = failPickupSchema.parse(req.body);
      const result = await this.service.failPickup(req.params.pickupId, req.user.id, dto);
      res.status(200).json({
        status: 'success',
        message: 'Pickup marked as failed',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  // Admin endpoints
  public getAdminPickups = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = adminPickupQuerySchema.parse(req.query);
      const result = await this.service.getAdminPickups(query);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  public getAdminPickupDetail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const pickup = await this.service.getAdminPickupDetail(req.params.pickupId);
      res.status(200).json({
        status: 'success',
        data: pickup,
      });
    } catch (err) {
      next(err);
    }
  };

  public getAdminPickupEvents = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const events = await this.service.getAdminPickupEvents(req.params.pickupId);
      res.status(200).json({
        status: 'success',
        data: events,
      });
    } catch (err) {
      next(err);
    }
  };
}
