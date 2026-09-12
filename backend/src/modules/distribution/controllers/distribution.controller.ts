import { Request, Response, NextFunction } from 'express';
import { DistributionService } from '../services/distribution.service';
import { createDistributionSchema, distributionQuerySchema } from '../dto/create-distribution.dto';
import { BadRequestError } from '../../../shared/errors/app-error';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class DistributionController {
  private service: DistributionService;

  constructor(service?: DistributionService) {
    this.service = service || new DistributionService();
  }

  public createDistribution = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const parsedBody = createDistributionSchema.parse(req.body);
      const user = (req as any).user;

      const record = await this.service.createDistribution(
        parsedBody,
        user.id || user.userId,
        user.role
      );

      res.status(201).json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  };

  public getDistributions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const parsedQuery = distributionQuerySchema.parse(req.query);
      const result = await this.service.getDistributions(parsedQuery);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getDistributionDetail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { distributionId } = req.params;
      if (!UUID_REGEX.test(distributionId)) {
        throw new BadRequestError('Invalid distribution ID format', 'INVALID_UUID');
      }

      const record = await this.service.getDistributionDetail(distributionId);

      res.status(200).json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  };
}
