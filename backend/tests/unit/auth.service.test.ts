import { registerSchema, updateProfileSchema } from '../../src/modules/auth-user/dto/auth.dto';
import { AuthService } from '../../src/modules/auth-user/services/auth.service';
import { PasswordService } from '../../src/modules/auth-user/services/password.service';
import { BadRequestError } from '../../src/shared/errors/app-error';

describe('Auth & DTO Unit Tests', () => {
  describe('Email Normalization', () => {
    it('should lowercase and trim email during registration DTO parsing', () => {
      const input = {
        firstName: '  John ',
        lastName: ' Doe ',
        email: '  USER@Example.COM  ',
        password: 'Password123!',
      };

      const parsed = registerSchema.parse(input);
      expect(parsed.email).toBe('user@example.com');
      expect(parsed.firstName).toBe('John');
      expect(parsed.lastName).toBe('Doe');
    });
  });

  describe('Mass Assignment & Role Tampering Protection', () => {
    it('should block extra role or status fields injected into profile update', () => {
      const payload = {
        firstName: 'UpdatedName',
        role: 'ADMIN',
        status: 'INACTIVE',
        id: 'fake-uuid',
      };

      const parsed = updateProfileSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).toEqual({ firstName: 'UpdatedName' });
        expect((parsed.data as any).role).toBeUndefined();
        expect((parsed.data as any).status).toBeUndefined();
        expect((parsed.data as any).id).toBeUndefined();
      }
    });

    it('should not permit changing role to ADMIN in registration body', () => {
      const payload = {
        firstName: 'Attacker',
        lastName: 'User',
        email: 'attacker@example.com',
        password: 'Password123!',
        role: 'ADMIN',
        status: 'ACTIVE',
      };

      const parsed = registerSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
      // DTO strip/ignores role field so it cannot reach service layer
      expect((parsed as any).data.role).toBeUndefined();
    });
  });

  describe('Change Password Error Handling', () => {
    it('should throw BadRequestError with AUTH_CURRENT_PASSWORD_INCORRECT when current password is wrong', async () => {
      const authService = new AuthService();
      const mockUser = {
        id: 'user-123',
        passwordHash: await PasswordService.hashPassword('CorrectPassword123!'),
      };

      jest.spyOn((authService as any).userRepository, 'findById').mockResolvedValue(mockUser);

      try {
        await authService.changePassword('user-123', {
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!',
        });
        expect(true).toBe(false); // Should not reach here
      } catch (err: any) {
        expect(err instanceof BadRequestError).toBe(true);
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe('AUTH_CURRENT_PASSWORD_INCORRECT');
        expect(err.message).toBe('Current password is incorrect');
      }
    });
  });
});
