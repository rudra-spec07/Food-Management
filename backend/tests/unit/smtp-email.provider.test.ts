import nodemailer from 'nodemailer';
import { SmtpEmailProvider } from '../../src/modules/notifications/providers/smtp-email.provider';
import { OutboxNotificationWorker } from '../../src/modules/notifications/worker/outbox-notification.worker';
import { ConsoleEmailProvider } from '../../src/modules/notifications/providers/console-email.provider';
import { env } from '../../src/config/env';

jest.mock('nodemailer');

describe('SmtpEmailProvider & Provider Selection Unit Tests', () => {
  let mockSendMail: jest.Mock;
  let mockTransporter: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail = jest.fn();
    mockTransporter = {
      sendMail: mockSendMail,
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
  });

  describe('SmtpEmailProvider', () => {
    it('1: should initialize Nodemailer transporter with environment configuration or custom transporter', () => {
      const provider = new SmtpEmailProvider(mockTransporter);
      expect(provider).toBeInstanceOf(SmtpEmailProvider);

      // Testing initialization without customTransporter
      new SmtpEmailProvider();
      expect(nodemailer.createTransport).toHaveBeenCalled();
    });

    it('2 & 3: send() should pass from, to, subject, html, text to sendMail and return mapped messageId', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'msg-12345' });
      const provider = new SmtpEmailProvider(mockTransporter);

      const message = {
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      };

      const result = await provider.send(message);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Test Subject',
          html: '<p>Test HTML</p>',
          text: 'Test Text',
        })
      );
      expect(result.messageId).toBe('msg-12345');
      expect(result.sentAt).toBeInstanceOf(Date);
    });

    it('4 & 5: send() should handle fallback messageId if missing and propagate sendMail rejection', async () => {
      mockSendMail.mockResolvedValueOnce({});
      const provider = new SmtpEmailProvider(mockTransporter);

      const res = await provider.send({
        to: 'user2@example.com',
        subject: 'Test',
        html: 'test',
      });
      expect(res.messageId).toContain('smtp-');

      mockSendMail.mockRejectedValueOnce(new Error('SMTP Connection Timeout'));
      await expect(
        provider.send({
          to: 'user3@example.com',
          subject: 'Test Failure',
          html: 'test',
        })
      ).rejects.toThrow('SMTP Connection Timeout');
    });
  });

  describe('OutboxNotificationWorker Provider Selection', () => {
    it('CASE 1: should ALWAYS use injected emailProvider if options.emailProvider is passed', () => {
      const customMockProvider = { send: jest.fn() };
      const worker = new OutboxNotificationWorker({ emailProvider: customMockProvider as any });

      expect((worker as any).emailProvider).toBe(customMockProvider);
    });

    it('CASE 2 & CASE 3: should select SmtpEmailProvider when SMTP env is complete, else ConsoleEmailProvider', () => {
      // Backup env
      const origHost = env.SMTP_HOST;
      const origUser = env.SMTP_USER;
      const origPass = env.SMTP_PASS;
      const origEnv = env.NODE_ENV;

      // Mock SMTP present + NODE_ENV != 'test'
      (env as any).SMTP_HOST = 'smtp.gmail.com';
      (env as any).SMTP_USER = 'test@example.com';
      (env as any).SMTP_PASS = 'secretpass';
      (env as any).NODE_ENV = 'development';

      const smtpWorker = new OutboxNotificationWorker();
      expect((smtpWorker as any).emailProvider).toBeInstanceOf(SmtpEmailProvider);

      // Mock SMTP missing
      (env as any).SMTP_HOST = undefined;
      (env as any).SMTP_USER = undefined;
      (env as any).SMTP_PASS = undefined;

      const consoleWorker = new OutboxNotificationWorker();
      expect((consoleWorker as any).emailProvider).toBeInstanceOf(ConsoleEmailProvider);

      // Restore env
      (env as any).SMTP_HOST = origHost;
      (env as any).SMTP_USER = origUser;
      (env as any).SMTP_PASS = origPass;
      (env as any).NODE_ENV = origEnv;
    });
  });
});
