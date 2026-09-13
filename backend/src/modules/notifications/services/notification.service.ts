import { Notification, NotificationPreference } from '@prisma/client';
import { NotificationRepository } from '../repositories/notification.repository';
import { PreferenceRepository } from '../repositories/preference.repository';
import { NotificationQueryDto, UpdatePreferenceDto } from '../dto/notification.dto';
import { PaginatedResult } from '../types/notification.types';
import { NotFoundError } from '../../../shared/errors/app-error';

export class NotificationService {
  private notificationRepo: NotificationRepository;
  private preferenceRepo: PreferenceRepository;

  constructor(
    notificationRepo?: NotificationRepository,
    preferenceRepo?: PreferenceRepository
  ) {
    this.notificationRepo = notificationRepo || new NotificationRepository();
    this.preferenceRepo = preferenceRepo || new PreferenceRepository();
  }

  public async getUserNotifications(
    userId: string,
    query: NotificationQueryDto
  ): Promise<PaginatedResult<Notification>> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);

    const [items, total] = await this.notificationRepo.findUserNotifications(
      userId,
      page,
      limit,
      query.status
    );

    const totalPages = Math.ceil(total / limit) || 0;

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  public async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.notificationRepo.countUnreadUserNotifications(userId);
    return { unreadCount };
  }

  public async markRead(notificationId: string, userId: string): Promise<Notification> {
    const updated = await this.notificationRepo.markNotificationAsRead(notificationId, userId);

    if (!updated) {
      // 404 IDOR Defense: return 404 if notification not found or doesn't belong to authenticated user
      throw new NotFoundError('Notification not found', 'NOTIFICATION_NOT_FOUND');
    }

    return updated;
  }

  public async markAllRead(userId: string): Promise<{ updatedCount: number }> {
    const updatedCount = await this.notificationRepo.markAllNotificationsAsRead(userId);
    return { updatedCount };
  }

  public async getUserPreferences(userId: string): Promise<NotificationPreference[]> {
    return this.preferenceRepo.findUserPreferences(userId);
  }

  public async updateUserPreference(
    userId: string,
    dto: UpdatePreferenceDto
  ): Promise<NotificationPreference> {
    return this.preferenceRepo.upsertPreference(
      userId,
      dto.eventType,
      dto.channel,
      dto.enabled
    );
  }
}
