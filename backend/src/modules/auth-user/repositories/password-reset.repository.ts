import { PasswordResetToken, Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';

export class PasswordResetRepository {
  public async create(
    data: {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    },
    tx?: Prisma.TransactionClient
  ): Promise<PasswordResetToken> {
    const client = tx || prisma;
    return client.passwordResetToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  public async findByTokenHash(
    tokenHash: string,
    tx?: Prisma.TransactionClient
  ): Promise<PasswordResetToken | null> {
    const client = tx || prisma;
    return client.passwordResetToken.findUnique({
      where: { tokenHash },
    });
  }

  public async invalidateUnusedTokensForUser(
    userId: string,
    tx?: Prisma.TransactionClient
  ): Promise<Prisma.BatchPayload> {
    const client = tx || prisma;
    return client.passwordResetToken.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });
  }

  public async markAsUsed(
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<boolean> {
    const client = tx || prisma;
    const result = await client.passwordResetToken.updateMany({
      where: {
        id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });
    return result.count > 0;
  }
}
