import { AuthSession, Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';

export class AuthSessionRepository {
  public async create(
    data: {
      userId: string;
      tokenJti: string;
      expiresAt: Date;
    },
    tx?: Prisma.TransactionClient
  ): Promise<AuthSession> {
    const client = tx || prisma;
    return client.authSession.create({
      data: {
        userId: data.userId,
        tokenJti: data.tokenJti,
        expiresAt: data.expiresAt,
      },
    });
  }

  public async findByTokenJti(tokenJti: string, tx?: Prisma.TransactionClient): Promise<AuthSession | null> {
    const client = tx || prisma;
    return client.authSession.findUnique({ where: { tokenJti } });
  }

  public async revoke(tokenJti: string, tx?: Prisma.TransactionClient): Promise<AuthSession | null> {
    const client = tx || prisma;
    const session = await client.authSession.findUnique({ where: { tokenJti } });
    if (!session) return null;

    return client.authSession.update({
      where: { tokenJti },
      data: { revokedAt: new Date() },
    });
  }

  public async revokeAllForUser(userId: string, tx?: Prisma.TransactionClient): Promise<Prisma.BatchPayload> {
    const client = tx || prisma;
    return client.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  public async updateLastUsed(tokenJti: string, tx?: Prisma.TransactionClient): Promise<AuthSession | null> {
    const client = tx || prisma;
    const session = await client.authSession.findUnique({ where: { tokenJti } });
    if (!session) return null;

    return client.authSession.update({
      where: { tokenJti },
      data: { lastUsedAt: new Date() },
    });
  }
}
