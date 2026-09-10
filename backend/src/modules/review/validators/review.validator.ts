import { Request, Response, NextFunction } from 'express';
import { z, ZodTypeAny } from 'zod';
import { BadRequestError } from '../../../shared/errors/app-error';

const uuidSchema = z.string().uuid({ message: 'Invalid donation ID format' });

export const validateDonationIdParam = (req: Request, _res: Response, next: NextFunction): void => {
  const result = uuidSchema.safeParse(req.params.donationId);
  if (!result.success) {
    throw new BadRequestError('Invalid donation ID format (must be UUID)', 'INVALID_UUID');
  }
  next();
};

export const validateRequestBody = (schema: ZodTypeAny) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw result.error;
    }
    req.body = result.data;
    next();
  };
};

export const validateRequestQuery = (schema: ZodTypeAny) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      throw result.error;
    }
    req.query = result.data as any;
    next();
  };
};
