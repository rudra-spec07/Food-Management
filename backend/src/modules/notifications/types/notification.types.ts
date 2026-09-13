export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  messageId: string;
  sentAt: Date;
}

export interface NotificationContext {
  donationId?: string;
  category?: string;
  quantity?: string;
  quantityUnit?: string;
  contactName?: string;
  status?: string;
  rejectionReason?: string;
  failureReason?: string;
  completionNotes?: string;
  assignmentId?: string;
  workerId?: string;
  donorId?: string;
  reviewerId?: string;
  firstName?: string;
  lastName?: string;
  [key: string]: any;
}

export interface RenderedTemplate {
  title: string;
  message: string;
  emailSubject: string;
  emailHtml: string;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
