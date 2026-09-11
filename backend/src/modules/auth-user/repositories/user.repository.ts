import { User, UserRole, UserStatus, Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';

// Safe worker fields — passwordHash is explicitly excluded via `select`
export type SafeWorkerRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
};


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

  /**
   * Paginated list of WORKER users.
   *
   * Security: `role: UserRole.WORKER` is always applied at DB level.
   * The caller cannot override this regardless of query parameters.
   * `select` explicitly excludes `passwordHash` and all auth internals.
   *
   * @returns [SafeWorkerRecord[], total count]
   */
  public async findWorkers(options: {
    page: number;
    limit: number;
    status?: UserStatus;
  }): Promise<[SafeWorkerRecord[], number]> {
    const skip = (options.page - 1) * options.limit;

    const where: Prisma.UserWhereInput = {
      role: UserRole.WORKER, // Always forced — client cannot override
      ...(options.status ? { status: options.status } : {}),
    };

    const [workers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          // passwordHash, resetToken, etc. are NOT selected — safe by default
        },
      }),
      prisma.user.count({ where }),
    ]);

    return [workers as SafeWorkerRecord[], total];
  }
}
