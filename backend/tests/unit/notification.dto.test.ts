import { NotificationQuerySchema, UpdatePreferenceSchema } from '../../src/modules/notifications/dto/notification.dto';
import { NotificationChannel, NotificationStatus } from '@prisma/client';

describe('Module 06 — Notification DTO Unit Tests', () => {
  describe('NotificationQuerySchema', () => {
    it('should set default page=1 and limit=20 when query is empty', () => {
      const parsed = NotificationQuerySchema.parse({});
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(20);
      expect(parsed.status).toBeUndefined();
    });

    it('should parse valid query strings for page, limit, and status', () => {
      const parsed = NotificationQuerySchema.parse({
        page: '2',
        limit: '50',
        status: 'UNREAD',
      });
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(50);
      expect(parsed.status).toBe(NotificationStatus.UNREAD);
    });

    it('should reject invalid page numbers less than 1', () => {
      expect(() => NotificationQuerySchema.parse({ page: 0 })).toThrow();
    });

    it('should clamp/reject limit greater than 100', () => {
      expect(() => NotificationQuerySchema.parse({ limit: 101 })).toThrow();
    });
  });

  describe('UpdatePreferenceSchema', () => {
    it('should validate valid preference update payload', () => {
      const parsed = UpdatePreferenceSchema.parse({
        eventType: 'DONATION_APPROVED',
        channel: NotificationChannel.EMAIL,
        enabled: false,
      });
      expect(parsed.eventType).toBe('DONATION_APPROVED');
      expect(parsed.channel).toBe(NotificationChannel.EMAIL);
      expect(parsed.enabled).toBe(false);
    });

    it('should reject empty eventType', () => {
      expect(() =>
        UpdatePreferenceSchema.parse({
          eventType: '',
          channel: NotificationChannel.EMAIL,
          enabled: true,
        })
      ).toThrow();
    });

    it('should reject invalid channel enum', () => {
      expect(() =>
        UpdatePreferenceSchema.parse({
          eventType: 'DONATION_APPROVED',
          channel: 'SMS',
          enabled: true,
        })
      ).toThrow();
    });
  });
});
