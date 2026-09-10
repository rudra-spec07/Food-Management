import { User, UserRole, UserStatus, Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';

export class UserRepository {
  public async findById(id: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    const client = tx || prisma;
    return client.user.findUnique({ where: { id } });
  }

  public async findByEmail(email: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    const client = tx || prisma;
    return client.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  public async create(
    data: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string | null;
      passwordHash: string;
      role?: UserRole;
      status?: UserStatus;
    },
    tx?: Prisma.TransactionClient
  ): Promise<User> {
    const client = tx || prisma;
    return client.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        phone: data.phone || null,
        passwordHash: data.passwordHash,
        role: data.role || UserRole.DONOR,
        status: data.status || UserStatus.ACTIVE,
      },
    });
  }

  public async updateProfile(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
    },
    tx?: Prisma.TransactionClient
  ): Promise<User> {
    const client = tx || prisma;
    return client.user.update({
      where: { id },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.phone !== undefined && { phone: data.phone }),
      },
    });
  }

  public async updatePassword(id: string, passwordHash: string, tx?: Prisma.TransactionClient): Promise<User> {
    const client = tx || prisma;
    return client.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  public async updateStatus(id: string, status: UserStatus, tx?: Prisma.TransactionClient): Promise<User> {
    const client = tx || prisma;
    return client.user.update({
      where: { id },
      data: { status },
    });
  }

  public async updateLastLogin(id: string, tx?: Prisma.TransactionClient): Promise<User> {
    const client = tx || prisma;
    return client.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }
}
