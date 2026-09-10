import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { updateProfileSchema } from '../dto/auth.dto';

export class UserController {
  private userService = new UserService();

  public getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const user = await this.userService.getCurrentUser(userId);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  };

  public updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const dto = updateProfileSchema.parse(req.body);

      const updatedUser = await this.userService.updateProfile(userId, dto);

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully',
      });
    } catch (err) {
      next(err);
    }
  };
}
