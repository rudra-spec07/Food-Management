import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../../modules/auth-user/services/session.service';
import { UnauthorizedError } from '../errors/app-error';

const sessionService = new SessionService();

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authorization header missing or malformed', 'AUTH_HEADER_MISSING');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Bearer token missing', 'AUTH_TOKEN_MISSING');
    }

    const decoded = sessionService.verifyToken(token);

    if (!decoded || !decoded.jti || !decoded.sub) {
      throw new UnauthorizedError('Invalid token claims', 'AUTH_TOKEN_INVALID');
    }

    const { userId, role } = await sessionService.validateSession(decoded.jti);

    req.user = {
      id: userId,
      role,
      sessionId: decoded.jti,
    };

    next();
  } catch (err) {
    next(err);
  }
};
