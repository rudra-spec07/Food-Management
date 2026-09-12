import { Request, Response, NextFunction } from 'express';
import { ReservationService } from '../services/reservation.service';
import {
  createReservationSchema,
  reservationQuerySchema,
  releaseReservationSchema,
} from '../dto/create-reservation.dto';
import { BadRequestError } from '../../../shared/errors/app-error';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ReservationController {
  private service: ReservationService;

  constructor(service?: ReservationService) {
    this.service = service || new ReservationService();
  }

  public createReservation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const parsedBody = createReservationSchema.parse(req.body);
      const user = (req as any).user;

      const record = await this.service.createReservation(
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

  public getReservations = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const parsedQuery = reservationQuerySchema.parse(req.query);
      const user = (req as any).user;

      const result = await this.service.getReservations(parsedQuery, user);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getReservationDetail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { reservationId } = req.params;
      if (!UUID_REGEX.test(reservationId)) {
        throw new BadRequestError('Invalid reservation ID format', 'INVALID_UUID');
      }

      const user = (req as any).user;
      const record = await this.service.getReservationDetail(reservationId, user);

      res.status(200).json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  };

  public releaseReservation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { reservationId } = req.params;
      if (!UUID_REGEX.test(reservationId)) {
        throw new BadRequestError('Invalid reservation ID format', 'INVALID_UUID');
      }

      const parsedBody = releaseReservationSchema.parse(req.body || {});
      const user = (req as any).user;

      const record = await this.service.releaseReservation(
        reservationId,
        user,
        parsedBody.reason
      );

      res.status(200).json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  };
}
