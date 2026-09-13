import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { UpdatePreferenceSchema } from '../dto/notification.dto';

export class PreferenceController {
  private service: NotificationService;

  constructor(service?: NotificationService) {
    this.service = service || new NotificationService();
  }

  public getPreferences = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = (req as any).user;

      const preferences = await this.service.getUserPreferences(user.id || user.userId);

      res.status(200).json({
        success: true,
        data: { preferences },
      });
    } catch (error) {
      next(error);
    }
  };

  public updatePreference = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const parsedBody = UpdatePreferenceSchema.parse(req.body);
      const user = (req as any).user;

      const updated = await this.service.updateUserPreference(
        user.id || user.userId,
        parsedBody
      );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };
}
