import { IEmailProvider } from './email-provider.interface';
import { EmailMessage, EmailResult } from '../types/notification.types';
import { v4 as uuidv4 } from 'uuid';

export class ConsoleEmailProvider implements IEmailProvider {
  public async send(message: EmailMessage): Promise<EmailResult> {
    const messageId = `console-${uuidv4()}`;
    const sentAt = new Date();

    console.log(`[ConsoleEmailProvider] Sending Email [${messageId}]`);
    console.log(`  To: ${message.to}`);
    console.log(`  Subject: ${message.subject}`);
    console.log(`  Body (HTML): ${message.html}`);
    if (message.text) {
      console.log(`  Body (Text): ${message.text}`);
    }

    return {
      messageId,
      sentAt,
    };
  }
}
