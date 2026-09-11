import { Request, Response, NextFunction } from 'express';
import { AssignmentService } from '../services/assignment.service';
import { assignWorkerSchema } from '../dto/assign-worker.dto';
import { rejectAssignmentSchema } from '../dto/reject-assignment.dto';
import { assignmentQuerySchema } from '../dto/assignment-query.dto';

export class AssignmentController {
  private assignmentService: AssignmentService;

  constructor(service?: AssignmentService) {
    this.assignmentService = service || new AssignmentService();
  }

  // GET /api/v1/admin/donations/assignment-queue (ADMIN)
  public getAssignmentQueue = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = assignmentQuerySchema.parse(req.query);
      const result = await this.assignmentService.getAssignmentQueue(query);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/v1/admin/donations/:donationId/assign (ADMIN)
  public assignWorker = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { donationId } = req.params;
      const adminId = req.user!.id;
      const dto = assignWorkerSchema.parse(req.body);

      const result = await this.assignmentService.assignWorker(donationId, adminId, dto);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Worker assigned successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  // GET /api/v1/admin/donations/:donationId/assignments (ADMIN)
  public getAssignmentHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { donationId } = req.params;
      const history = await this.assignmentService.getAssignmentHistory(donationId);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (err) {
      next(err);
    }
  };

  // GET /api/v1/worker/assignments (WORKER)
  public getWorkerAssignments = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const workerId = req.user!.id;
      const query = assignmentQuerySchema.parse(req.query);
      const result = await this.assignmentService.getWorkerAssignments(workerId, query);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  // GET /api/v1/worker/assignments/:assignmentId (WORKER)
  public getWorkerAssignmentDetail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { assignmentId } = req.params;
      const workerId = req.user!.id;

      const assignment = await this.assignmentService.getWorkerAssignmentDetail(
        assignmentId,
        workerId
      );

      res.status(200).json({
        success: true,
        data: assignment,
      });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/v1/worker/assignments/:assignmentId/accept (WORKER)
  public acceptAssignment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { assignmentId } = req.params;
      const workerId = req.user!.id;

      const result = await this.assignmentService.acceptAssignment(assignmentId, workerId);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Assignment accepted successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  // POST /api/v1/worker/assignments/:assignmentId/reject (WORKER)
  public rejectAssignment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { assignmentId } = req.params;
      const workerId = req.user!.id;
      const dto = rejectAssignmentSchema.parse(req.body);

      const result = await this.assignmentService.rejectAssignment(
        assignmentId,
        workerId,
        dto
      );

      res.status(200).json({
        success: true,
        data: result,
        message: 'Assignment rejected successfully. Donation returned to approved queue.',
      });
    } catch (err) {
      next(err);
    }
  };
}
