import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { NotificationQuerySchema } from '../dto/notification.dto';
import { BadRequestError } from '../../../shared/errors/app-error';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class NotificationController {
  private service: NotificationService;

  constructor(service?: NotificationService) {
    this.service = service || new NotificationService();
  }

  public getNotifications = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const parsedQuery = NotificationQuerySchema.parse(req.query);
      const user = (req as any).user;

      const result = await this.service.getUserNotifications(user.id || user.userId, parsedQuery);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getUnreadCount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = (req as any).user;

      const result = await this.service.getUnreadCount(user.id || user.userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public markAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { notificationId } = req.params;
      if (!UUID_REGEX.test(notificationId)) {
        throw new BadRequestError('Invalid notification ID format', 'INVALID_UUID');
      }

      const user = (req as any).user;
      const updated = await this.service.markRead(notificationId, user.id || user.userId);

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };

  public markAllAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = (req as any).user;
      const result = await this.service.markAllRead(user.id || user.userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
