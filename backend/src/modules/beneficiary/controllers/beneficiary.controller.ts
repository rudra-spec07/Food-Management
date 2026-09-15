import { Request, Response, NextFunction } from 'express';
import { BeneficiaryService } from '../services/beneficiary.service';
import {
  createBeneficiarySchema,
  updateBeneficiarySchema,
  beneficiaryQuerySchema,
} from '../dto/beneficiary.dto';
import { BadRequestError } from '../../../shared/errors/app-error';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class BeneficiaryController {
  private service: BeneficiaryService;

  constructor(service?: BeneficiaryService) {
    this.service = service || new BeneficiaryService();
  }

  public createBeneficiary = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const parsedBody = createBeneficiarySchema.parse(req.body);
      const user = (req as any).user;

      const record = await this.service.createBeneficiary(
        parsedBody,
        user.id || user.userId
      );

      res.status(201).json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  };

  public getBeneficiaries = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const parsedQuery = beneficiaryQuerySchema.parse(req.query);
      const result = await this.service.getBeneficiaries(parsedQuery);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getBeneficiaryDetail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { beneficiaryId } = req.params;
      if (!UUID_REGEX.test(beneficiaryId)) {
        throw new BadRequestError('Invalid beneficiary ID format', 'INVALID_UUID');
      }

      const record = await this.service.getBeneficiaryDetail(beneficiaryId);

      res.status(200).json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateBeneficiary = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { beneficiaryId } = req.params;
      if (!UUID_REGEX.test(beneficiaryId)) {
        throw new BadRequestError('Invalid beneficiary ID format', 'INVALID_UUID');
      }

      const parsedBody = updateBeneficiarySchema.parse(req.body);
      const user = (req as any).user;

      const record = await this.service.updateBeneficiary(
        beneficiaryId,
        parsedBody,
        user.id || user.userId
      );

      res.status(200).json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  };

  public getBeneficiaryHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { beneficiaryId } = req.params;
      if (!UUID_REGEX.test(beneficiaryId)) {
        throw new BadRequestError('Invalid beneficiary ID format', 'INVALID_UUID');
      }

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const result = await this.service.getBeneficiaryHistory(beneficiaryId, page, limit);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
