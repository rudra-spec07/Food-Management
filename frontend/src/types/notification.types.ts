export type NotificationStatus = 'UNREAD' | 'READ';
export type NotificationChannel = 'IN_APP' | 'EMAIL';

export type NotificationEventType =
  | 'DONATION_SUBMITTED'
  | 'DONATION_APPROVED'
  | 'DONATION_REJECTED'
  | 'DONATION_ASSIGNED'
  | 'ASSIGNMENT_ACCEPTED'
  | 'ASSIGNMENT_REJECTED'
  | 'PICKUP_STARTED'
  | 'PICKUP_COMPLETED'
  | 'PICKUP_FAILED';

export interface NotificationContext {
  donationId?: string;
  category?: string;
  quantity?: number | string;
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

export interface AppNotification {
  id: string;
  eventId: string;
  recipientId: string;
  eventType: string;
  title: string;
  message: string;
  data?: NotificationContext | null;
  status: NotificationStatus;
  readAt?: string | null;
  createdAt: string;
}

export interface PaginatedNotifications {
  items: AppNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  eventType: string;
  channel: NotificationChannel;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePreferencePayload {
  eventType: string;
  channel: NotificationChannel;
  enabled: boolean;
}
