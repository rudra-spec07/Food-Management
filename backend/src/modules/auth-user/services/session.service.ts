import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { UserRole, UserStatus } from '@prisma/client';
import { env } from '../../../config/env';
import { AuthSessionRepository } from '../repositories/auth-session.repository';
import { UserRepository } from '../repositories/user.repository';
import { JwtPayload } from '../types/auth.types';
import { UnauthorizedError } from '../../../shared/errors/app-error';

export class SessionService {
  private authSessionRepository = new AuthSessionRepository();
  private userRepository = new UserRepository();

  public generateToken(userId: string, role: UserRole, jti: string): string {
    const payload: JwtPayload = {
      sub: userId,
      role,
      jti,
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
  }

  public verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (err: any) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token expired', 'AUTH_TOKEN_EXPIRED');
      }
      throw new UnauthorizedError('Invalid token', 'AUTH_TOKEN_INVALID');
    }
  }

  public async createSession(userId: string, role: UserRole): Promise<{ token: string; jti: string }> {
    const jti = uuidv4();
    const token = this.generateToken(userId, role, jti);

    // Calculate expiration timestamp from decoded token
    const decoded = jwt.decode(token) as JwtPayload;
    const expiresAt = decoded && decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 3600 * 1000);

    await this.authSessionRepository.create({
      userId,
      tokenJti: jti,
      expiresAt,
    });

    return { token, jti };
  }

  public async validateSession(jti: string): Promise<{ userId: string; role: UserRole }> {
    const session = await this.authSessionRepository.findByTokenJti(jti);

    if (!session) {
      throw new UnauthorizedError('Invalid session', 'AUTH_SESSION_INVALID');
    }

    if (session.revokedAt) {
      throw new UnauthorizedError('Session has been revoked', 'AUTH_SESSION_REVOKED');
    }

    if (session.expiresAt <= new Date()) {
      throw new UnauthorizedError('Session has expired', 'AUTH_SESSION_EXPIRED');
    }

    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      throw new UnauthorizedError('User does not exist', 'AUTH_USER_NOT_FOUND');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedError('User account is inactive', 'AUTH_USER_INACTIVE');
    }

    // Update last used timestamp async
    this.authSessionRepository.updateLastUsed(jti).catch(() => {});

    return { userId: user.id, role: user.role };
  }

  public async revokeSession(jti: string): Promise<void> {
    await this.authSessionRepository.revoke(jti);
  }

  public async revokeAllUserSessions(userId: string): Promise<void> {
    await this.authSessionRepository.revokeAllForUser(userId);
  }
}
