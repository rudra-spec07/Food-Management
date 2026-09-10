import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { registerSchema, loginSchema, changePasswordSchema } from '../dto/auth.dto';

export class AuthController {
  private authService = new AuthService();

  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = registerSchema.parse(req.body);
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await this.authService.register(dto, ipAddress, userAgent);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Registration successful',
      });
    } catch (err) {
      next(err);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = loginSchema.parse(req.body);
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await this.authService.login(dto, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Login successful',
      });
    } catch (err) {
      next(err);
    }
  };

  public logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const sessionId = req.user!.sessionId;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      await this.authService.logout(userId, sessionId, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (err) {
      next(err);
    }
  };

  public changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const dto = changePasswordSchema.parse(req.body);
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      await this.authService.changePassword(userId, dto, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully. All active sessions have been revoked. Please log in again.',
      });
    } catch (err) {
      next(err);
    }
  };
}
