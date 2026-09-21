import crypto from 'crypto';
import { AuthService } from '../../src/modules/auth-user/services/auth.service';
import { UserRepository } from '../../src/modules/auth-user/repositories/user.repository';
import { PasswordService } from '../../src/modules/auth-user/services/password.service';
import { SessionService } from '../../src/modules/auth-user/services/session.service';
import { prisma } from '../../src/config/database';
import { forgotPasswordSchema, resetPasswordSchema } from '../../src/modules/auth-user/dto/auth.dto';
import { AuditEventType, UserRole, UserStatus } from '@prisma/client';

describe('Password Reset & Forgot Password Unit & Integration Tests', () => {
  const authService = new AuthService();
  const userRepository = new UserRepository();
  const sessionService = new SessionService();

  let testUser: any;
  const testEmail = `pwd-reset-test-${Date.now()}@example.com`;
  const rawPassword = 'Password123!';

  beforeAll(async () => {
    // Create test user in db
    const passwordHash = await PasswordService.hashPassword(rawPassword);
    testUser = await userRepository.create({
      firstName: 'Test',
      lastName: 'ResetUser',
      email: testEmail,
      passwordHash,
      role: UserRole.DONOR,
      status: UserStatus.ACTIVE,
    });
  });

  afterAll(async () => {
    if (testUser?.id) {
      await prisma.passwordResetToken.deleteMany({ where: { userId: testUser.id } });
      await prisma.auditLog.deleteMany({ where: { userId: testUser.id } });
      await prisma.authSession.deleteMany({ where: { userId: testUser.id } });
      await prisma.notification.deleteMany({ where: { recipientId: testUser.id } });
      await prisma.outboxEvent.deleteMany({ where: { aggregateId: testUser.id } });
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
  });

  describe('DTO Validation Schemas', () => {
    it('should validate valid email for forgotPasswordSchema and transform to lowercase', () => {
      const parsed = forgotPasswordSchema.parse({ email: '   TEST.Reset@Example.COM  ' });
      expect(parsed.email).toBe('test.reset@example.com');
    });

    it('should reject invalid email in forgotPasswordSchema', () => {
      expect(() => forgotPasswordSchema.parse({ email: 'invalid-email' })).toThrow();
    });

    it('should validate 64-char raw token and strong password in resetPasswordSchema', () => {
      const validToken = 'a'.repeat(64);
      const parsed = resetPasswordSchema.parse({
        token: validToken,
        newPassword: 'NewSecurePass123!',
      });
      expect(parsed.token).toBe(validToken);
      expect(parsed.newPassword).toBe('NewSecurePass123!');
    });

    it('should reject non-64-char token in resetPasswordSchema', () => {
      expect(() =>
        resetPasswordSchema.parse({
          token: 'short-token',
          newPassword: 'NewSecurePass123!',
        })
      ).toThrow();
    });

    it('should enforce existing password policy on newPassword in resetPasswordSchema', () => {
      const validToken = 'b'.repeat(64);
      // Weak password missing digit and special char
      expect(() =>
        resetPasswordSchema.parse({
          token: validToken,
          newPassword: 'weakpassword',
        })
      ).toThrow();
    });
  });

  describe('AuthService.forgotPassword', () => {
    it('1 & 3: should return generic message for existing email', async () => {
      const result = await authService.forgotPassword(testEmail);
      expect(result.message).toBe('If an account exists with that email, a password reset link has been sent.');
    });

    it('2 & 3: should return exact same generic response for non-existing email without revealing account absence', async () => {
      const result = await authService.forgotPassword('nonexistent-email-9999@example.com');
      expect(result.message).toBe('If an account exists with that email, a password reset link has been sent.');
    });

    it('4, 5, 6 & 7: should create PasswordResetToken with tokenHash and outbox event when email exists', async () => {
      await authService.forgotPassword(testEmail);

      // Check DB tokens for testUser
      const tokens = await prisma.passwordResetToken.findMany({
        where: { userId: testUser.id, usedAt: null },
      });

      expect(tokens.length).toBeGreaterThan(0);
      const latestToken = tokens[tokens.length - 1];

      // 5: Database stores tokenHash (SHA-256 hex string of 64 chars)
      expect(latestToken.tokenHash).toHaveLength(64);
      expect(latestToken.userId).toBe(testUser.id);

      // 7: Expires in approx 15 minutes
      const now = new Date();
      const diffMs = latestToken.expiresAt.getTime() - now.getTime();
      expect(diffMs).toBeGreaterThan(14 * 60 * 1000);
      expect(diffMs).toBeLessThanOrEqual(15 * 60 * 1000 + 5000);

      // 4: Outbox event published
      const outboxEvent = await prisma.outboxEvent.findFirst({
        where: { aggregateId: testUser.id, eventType: 'PASSWORD_RESET_REQUESTED' },
        orderBy: { createdAt: 'desc' },
      });

      expect(outboxEvent).not.toBeNull();
      const payload: any = outboxEvent?.payload;
      expect(payload.userId).toBe(testUser.id);
      expect(payload.resetUrl).toContain('/reset-password?token=');

      // 6: Raw token is present in resetUrl in email payload, but raw token is NOT stored in tokenHash column
      const rawTokenFromUrl = payload.resetUrl.split('token=')[1];
      expect(rawTokenFromUrl).toHaveLength(64);

      const expectedHash = crypto.createHash('sha256').update(rawTokenFromUrl).digest('hex');
      expect(latestToken.tokenHash).toBe(expectedHash);
      expect(latestToken.tokenHash).not.toBe(rawTokenFromUrl);
    });

    it('12: new reset request should invalidate previous unused tokens for the user', async () => {
      // First request
      await authService.forgotPassword(testEmail);
      const activeTokens1 = await prisma.passwordResetToken.findMany({
        where: { userId: testUser.id, usedAt: null },
      });

      // Second request
      await authService.forgotPassword(testEmail);
      const activeTokens2 = await prisma.passwordResetToken.findMany({
        where: { userId: testUser.id, usedAt: null },
      });

      // Exactly 1 active token remaining
      expect(activeTokens2.length).toBe(1);
      expect(activeTokens2[0].id).not.toBe(activeTokens1[0].id);
    });
  });

  describe('AuthService.resetPassword', () => {
    let currentRawToken: string;

    beforeEach(async () => {
      await authService.forgotPassword(testEmail);
      const outboxEvent = await prisma.outboxEvent.findFirst({
        where: { aggregateId: testUser.id, eventType: 'PASSWORD_RESET_REQUESTED' },
        orderBy: { createdAt: 'desc' },
      });
      const payload: any = outboxEvent?.payload;
      currentRawToken = payload.resetUrl.split('token=')[1];
    });

    it('9: should reject invalid token', async () => {
      const invalidToken = 'f'.repeat(64);
      await expect(authService.resetPassword(invalidToken, 'NewPass123!')).rejects.toThrow(
        'Invalid or expired password reset token.'
      );
    });

    it('8: should reject expired token', async () => {
      // Manually set expiresAt in past
      const tokenHash = crypto.createHash('sha256').update(currentRawToken).digest('hex');
      await prisma.passwordResetToken.update({
        where: { tokenHash },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await expect(authService.resetPassword(currentRawToken, 'NewPass123!')).rejects.toThrow(
        'Invalid or expired password reset token.'
      );
    });

    it('10 & 11: should reject used token and prevent token reuse', async () => {
      // First successful reset
      const newPassword = 'BrandNewPassword123!';
      const res = await authService.resetPassword(currentRawToken, newPassword);
      expect(res.message).toContain('successfully reset');

      // Second reset attempt with same token must fail
      await expect(authService.resetPassword(currentRawToken, 'AnotherPass123!')).rejects.toThrow(
        'Invalid or expired password reset token.'
      );
    });

    it('13, 14, 15, 16 & 17: successful reset updates password hash, revokes sessions, creates audit log without raw token', async () => {
      // Create an active session first
      const { jti } = await sessionService.createSession(testUser.id, testUser.role);
      const sessionBefore = await prisma.authSession.findUnique({ where: { tokenJti: jti } });
      expect(sessionBefore?.revokedAt).toBeNull();

      const newPass = 'UpdatedSecurePassword123!';
      const result = await authService.resetPassword(currentRawToken, newPass);
      expect(result.message).toContain('successfully reset');

      // 13: Password hash updated
      const updatedUser = await userRepository.findById(testUser.id);
      expect(updatedUser?.passwordHash).not.toBe(testUser.passwordHash);
      const isNewPasswordValid = await PasswordService.verifyPassword(newPass, updatedUser!.passwordHash);
      expect(isNewPasswordValid).toBe(true);

      // 15: Session revoked
      const sessionAfter = await prisma.authSession.findUnique({ where: { tokenJti: jti } });
      expect(sessionAfter?.revokedAt).not.toBeNull();

      // 16 & 17: Audit event PASSWORD_CHANGED created without raw token in metadata
      const auditLog = await prisma.auditLog.findFirst({
        where: { userId: testUser.id, action: AuditEventType.PASSWORD_CHANGED },
        orderBy: { createdAt: 'desc' },
      });

      expect(auditLog).not.toBeNull();
      const metadata = auditLog?.metadata as any;
      expect(metadata?.method).toBe('reset_token');
      expect(JSON.stringify(metadata)).not.toContain(currentRawToken);
    });

    it('18: concurrent reset attempts allow only one success', async () => {
      // Create a fresh reset token
      await authService.forgotPassword(testEmail);
      const outboxEvent = await prisma.outboxEvent.findFirst({
        where: { aggregateId: testUser.id, eventType: 'PASSWORD_RESET_REQUESTED' },
        orderBy: { createdAt: 'desc' },
      });
      const payload: any = outboxEvent?.payload;
      const rawToken = payload.resetUrl.split('token=')[1];

      // Execute 2 concurrent reset attempts simultaneously
      const resetPromise1 = authService.resetPassword(rawToken, 'ConcurrentPass123!');
      const resetPromise2 = authService.resetPassword(rawToken, 'ConcurrentPass123!');

      const results = await Promise.allSettled([resetPromise1, resetPromise2]);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
    });
  });

  describe('Generic Multi-Domain Recipient Resolution & Outbox Targeting', () => {
    const testDomains = [
      `domain-test-${Date.now()}@gmail.com`,
      `domain-test-${Date.now()}@outlook.com`,
    ];
    const createdUsers: any[] = [];

    beforeAll(async () => {
      const passwordHash = await PasswordService.hashPassword('Pass12345!');
      for (const email of testDomains) {
        const u = await userRepository.create({
          firstName: 'Domain',
          lastName: 'User',
          email,
          passwordHash,
          role: UserRole.DONOR,
          status: UserStatus.ACTIVE,
        });
        createdUsers.push(u);
      }
    });

    afterAll(async () => {
      for (const u of createdUsers) {
        await prisma.passwordResetToken.deleteMany({ where: { userId: u.id } });
        await prisma.notificationDelivery.deleteMany({ where: { notification: { recipientId: u.id } } });
        await prisma.notification.deleteMany({ where: { recipientId: u.id } });
        await prisma.outboxEvent.deleteMany({ where: { aggregateId: u.id } });
        await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
      }
    });

    it('should correctly target the exact requesting user and exact email address across arbitrary email domains', async () => {
      const { OutboxNotificationWorker } = require('../../src/modules/notifications/worker/outbox-notification.worker');

      for (const targetUser of createdUsers) {
        // 1. Trigger forgot password
        const res = await authService.forgotPassword(targetUser.email);
        expect(res.message).toBe('If an account exists with that email, a password reset link has been sent.');

        // 2. Verify PasswordResetToken belongs to exact target user
        const token = await prisma.passwordResetToken.findFirst({
          where: { userId: targetUser.id, usedAt: null },
          orderBy: { createdAt: 'desc' },
        });
        expect(token).not.toBeNull();
        expect(token?.userId).toBe(targetUser.id);

        // 3. Verify OutboxEvent payload matches exact target user
        const outbox = await prisma.outboxEvent.findFirst({
          where: { aggregateId: targetUser.id, eventType: 'PASSWORD_RESET_REQUESTED' },
          orderBy: { createdAt: 'desc' },
        });
        expect(outbox).not.toBeNull();
        const payload: any = outbox?.payload;
        expect(payload.userId).toBe(targetUser.id);
        expect(payload.email).toBe(targetUser.email);

        // 4. Verify OutboxNotificationWorker resolves EXACT recipient and creates single delivery
        const mockEmailProvider = { send: jest.fn().mockResolvedValue({ messageId: 'mock-id', sentAt: new Date() }) };
        const worker = new OutboxNotificationWorker({ emailProvider: mockEmailProvider });

        await worker.processOutboxBatch();
        await worker.processDeliveryBatch();

        expect(mockEmailProvider.send).toHaveBeenCalledWith(
          expect.objectContaining({
            to: targetUser.email,
          })
        );
      }
    }, 15000);
  });
});
