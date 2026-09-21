import nodemailer, { Transporter } from 'nodemailer';
import { IEmailProvider } from './email-provider.interface';
import { EmailMessage, EmailResult } from '../types/notification.types';
import { env } from '../../../config/env';

export class SmtpEmailProvider implements IEmailProvider {
  private transporter: Transporter;

  constructor(customTransporter?: Transporter) {
    if (customTransporter) {
      this.transporter = customTransporter;
    } else {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT || 587,
        secure: env.SMTP_SECURE || false,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    }
  }

  public async send(message: EmailMessage): Promise<EmailResult> {
    const fromAddress = env.SMTP_FROM || env.SMTP_USER || 'no-reply@foodshare.com';

    const info = await this.transporter.sendMail({
      from: fromAddress,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    console.log(`[SmtpEmailProvider] Email delivered to ${message.to} (messageId: ${info.messageId})`);

    return {
      messageId: info.messageId || `smtp-${Date.now()}`,
      sentAt: new Date(),
    };
  }
}
