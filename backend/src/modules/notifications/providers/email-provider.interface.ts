import { EmailMessage, EmailResult } from '../types/notification.types';

export interface IEmailProvider {
  send(message: EmailMessage): Promise<EmailResult>;
}
