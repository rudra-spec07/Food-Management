import { PasswordService } from '../../src/modules/auth-user/services/password.service';
import { registerSchema } from '../../src/modules/auth-user/dto/auth.dto';

describe('PasswordService & Validation Unit Tests', () => {
  const rawPassword = 'StrongPassword123!';

  it('should generate a hash different from plaintext password', async () => {
    const hash = await PasswordService.hashPassword(rawPassword);
    expect(hash).not.toEqual(rawPassword);
    expect(typeof hash).toBe('string');
  });

  it('should correctly verify valid password against hash', async () => {
    const hash = await PasswordService.hashPassword(rawPassword);
    const isValid = await PasswordService.verifyPassword(rawPassword, hash);
    expect(isValid).toBe(true);
  });

  it('should reject invalid password against hash', async () => {
    const hash = await PasswordService.hashPassword(rawPassword);
    const isValid = await PasswordService.verifyPassword('WrongPassword123!', hash);
    expect(isValid).toBe(false);
  });

  describe('Password Policy Validation', () => {
    it('should pass strong password validation', () => {
      const validData = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'ValidPassword1!',
      };
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject password under 8 characters', () => {
      const result = registerSchema.safeParse({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'Val1!',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password lacking special characters', () => {
      const result = registerSchema.safeParse({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'NoSpecialChar123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password lacking digits', () => {
      const result = registerSchema.safeParse({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'NoDigitsChar!',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password lacking uppercase letters', () => {
      const result = registerSchema.safeParse({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'nouppercase123!',
      });
      expect(result.success).toBe(false);
    });
  });
});
