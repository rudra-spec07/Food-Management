import { Request, Response, NextFunction } from 'express';
import { AiEstimatorService } from '../services/ai-estimator.service';
import { aiEstimateRequestSchema } from '../dto/ai-estimator.dto';
import { BadRequestError } from '../../../shared/errors/app-error';

export class AiEstimatorController {
  private service: AiEstimatorService;

  constructor(service?: AiEstimatorService) {
    this.service = service || new AiEstimatorService();
  }

  public estimateQuantity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validationResult = aiEstimateRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        const firstIssue = validationResult.error.issues[0];
        const errorMsg = firstIssue
          ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
          : 'Invalid AI estimate request parameters';
        throw new BadRequestError(errorMsg, 'INVALID_INPUT');
      }

      const estimates = await this.service.estimateQuantity(validationResult.data);

      res.status(200).json({
        success: true,
        data: estimates,
      });
    } catch (err) {
      next(err);
    }
  };
}
