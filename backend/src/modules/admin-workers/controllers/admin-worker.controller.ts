import { Request, Response, NextFunction } from 'express';
import { AdminWorkerService } from '../services/admin-worker.service';
import { createWorkerSchema } from '../dto/create-worker.dto';
import { listWorkersQuerySchema } from '../dto/list-workers-query.dto';

export class AdminWorkerController {
  private adminWorkerService = new AdminWorkerService();

  public createWorker = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const dto = createWorkerSchema.parse(req.body);
      const adminId = req.user!.id;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await this.adminWorkerService.createWorker(
        dto,
        adminId,
        ipAddress,
        userAgent
      );

      res.status(201).json({
        success: true,
        data: result,
        message: 'Worker account created successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  public listWorkers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Parse and validate query parameters using the project's standard DTO pattern
      const dto = listWorkersQuerySchema.parse(req.query);
      const result = await this.adminWorkerService.listWorkers(dto);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };
}
