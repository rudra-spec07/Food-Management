import { AuditEventType, AuditLog, Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';

export class AuditLogRepository {
  public async create(
    data: {
      userId?: string | null;
      action: AuditEventType;
      entityType: string;
      entityId?: string | null;
      metadata?: Record<string, any> | null;
      ipAddress?: string | null;
      userAgent?: string | null;
    },
    tx?: Prisma.TransactionClient
  ): Promise<AuditLog> {
    const client = tx || prisma;
    return client.auditLog.create({
      data: {
        userId: data.userId || null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId || null,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  }
}
