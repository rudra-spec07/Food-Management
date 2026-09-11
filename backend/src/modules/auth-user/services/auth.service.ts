import { AuditEventType, UserRole, UserStatus } from '@prisma/client';
import { prisma } from '../../../config/database';
import { UserRepository } from '../repositories/user.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { RegisterDto, LoginDto, ChangePasswordDto } from '../dto/auth.dto';
import { AuthResponseDto, UserResponseDto } from '../types/auth.types';
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from '../../../shared/errors/app-error';

export class AuthService {
  private userRepository = new UserRepository();
  private auditLogRepository = new AuditLogRepository();
  private sessionService = new SessionService();

  public mapToUserResponse(user: any): UserResponseDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  public async register(dto: RegisterDto, ipAddress?: string, userAgent?: string): Promise<AuthResponseDto> {
    const normalizedEmail = dto.email.toLowerCase();

    // Check duplicate email first
    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictError('Email address is already registered', 'AUTH_EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await PasswordService.hashPassword(dto.password);

    // Transactional user creation and audit log
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await this.userRepository.create(
        {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: normalizedEmail,
          phone: dto.phone,
          passwordHash,
          role: UserRole.DONOR, // Explicitly hardcoded to DONOR
          status: UserStatus.ACTIVE,
        },
        tx
      );

      await this.auditLogRepository.create(
        {
          userId: newUser.id,
          action: AuditEventType.USER_REGISTERED,
          entityType: 'user',
          entityId: newUser.id,
          metadata: { email: newUser.email, role: newUser.role },
          ipAddress,
          userAgent,
        },
        tx
      );

      return newUser;
    });

    const { token } = await this.sessionService.createSession(user.id, user.role);

    return {
      user: this.mapToUserResponse(user),
      accessToken: token,
    };
  }

  public async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponseDto> {
    const normalizedEmail = dto.email.toLowerCase();
    const user = await this.userRepository.findByEmail(normalizedEmail);

    // Generic error to prevent account enumeration
    if (!user) {
      await this.auditLogRepository.create({
        action: AuditEventType.USER_LOGIN_FAILED,
        entityType: 'user',
        metadata: { email: normalizedEmail, reason: 'user_not_found' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedError('Invalid email or password', 'AUTH_INVALID_CREDENTIALS');
    }

    const isPasswordValid = await PasswordService.verifyPassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.auditLogRepository.create({
        userId: user.id,
        action: AuditEventType.USER_LOGIN_FAILED,
        entityType: 'user',
        entityId: user.id,
        metadata: { reason: 'invalid_password' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedError('Invalid email or password', 'AUTH_INVALID_CREDENTIALS');
    }

    if (user.status !== UserStatus.ACTIVE) {
      await this.auditLogRepository.create({
        userId: user.id,
        action: AuditEventType.USER_LOGIN_FAILED,
        entityType: 'user',
        entityId: user.id,
        metadata: { reason: 'account_inactive' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedError('User account is inactive', 'AUTH_ACCOUNT_INACTIVE');
    }

    // Transactional login update & audit log
    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await this.userRepository.updateLastLogin(user.id, tx);
      await this.auditLogRepository.create(
        {
          userId: user.id,
          action: AuditEventType.USER_LOGIN_SUCCESS,
          entityType: 'user',
          entityId: user.id,
          metadata: { role: user.role },
          ipAddress,
          userAgent,
        },
        tx
      );
      return updated;
    });

    const { token } = await this.sessionService.createSession(updatedUser.id, updatedUser.role);

    return {
      user: this.mapToUserResponse(updatedUser),
      accessToken: token,
    };
  }

  public async logout(userId: string, jti: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.sessionService.revokeSession(jti);
    await this.auditLogRepository.create({
      userId,
      action: AuditEventType.USER_LOGOUT,
      entityType: 'user',
      entityId: userId,
      ipAddress,
      userAgent,
    });
  }

  public async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    const isCurrentPasswordValid = await PasswordService.verifyPassword(dto.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new BadRequestError('Current password is incorrect', 'AUTH_CURRENT_PASSWORD_INCORRECT');
    }

    const newPasswordHash = await PasswordService.hashPassword(dto.newPassword);

    await prisma.$transaction(async (tx) => {
      await this.userRepository.updatePassword(userId, newPasswordHash, tx);
      await this.sessionService.revokeAllUserSessions(userId);
      await this.auditLogRepository.create(
        {
          userId,
          action: AuditEventType.PASSWORD_CHANGED,
          entityType: 'user',
          entityId: userId,
          ipAddress,
          userAgent,
        },
        tx
      );
    });
  }
}
