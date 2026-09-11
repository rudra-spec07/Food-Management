import { UserRole, UserStatus, AuditEventType } from '@prisma/client';
import { prisma } from '../../../config/database';
import { UserRepository } from '../../auth-user/repositories/user.repository';
import { AuditLogRepository } from '../../auth-user/repositories/audit-log.repository';
import { PasswordService } from '../../auth-user/services/password.service';
import { CreateWorkerDto } from '../dto/create-worker.dto';
import { ListWorkersQueryDto } from '../dto/list-workers-query.dto';
import { ConflictError } from '../../../shared/errors/app-error';


export class AdminWorkerService {
  private userRepository = new UserRepository();
  private auditLogRepository = new AuditLogRepository();

  public async createWorker(
    dto: CreateWorkerDto,
    adminId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<any> {
    const normalizedEmail = dto.email.toLowerCase();

    // 1. Preliminary duplicate email check
    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictError('Email address is already registered', 'AUTH_EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await PasswordService.hashPassword(dto.password);

    try {
      // 2. Transactional Worker creation and AuditLog creation
      const newWorker = await prisma.$transaction(async (tx) => {
        const worker = await this.userRepository.create(
          {
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: normalizedEmail,
            phone: dto.phone || null,
            passwordHash,
            role: UserRole.WORKER, // Server explicitly sets role = WORKER
            status: UserStatus.ACTIVE, // Server explicitly sets status = ACTIVE
          },
          tx
        );

        await this.auditLogRepository.create(
          {
            userId: adminId,
            action: AuditEventType.WORKER_CREATED,
            entityType: 'user',
            entityId: worker.id,
            metadata: {
              workerId: worker.id,
              workerEmail: worker.email,
              workerRole: UserRole.WORKER,
              createdByAdminId: adminId,
            },
            ipAddress,
            userAgent,
          },
          tx
        );

        return worker;
      });

      return {
        id: newWorker.id,
        firstName: newWorker.firstName,
        lastName: newWorker.lastName,
        email: newWorker.email,
        phone: newWorker.phone,
        role: newWorker.role,
        status: newWorker.status,
        createdAt: newWorker.createdAt,
        updatedAt: newWorker.updatedAt,
      };
    } catch (err: any) {
      // 3. Database unique constraint error handling (P2002) for concurrency safety
      if (err.code === 'P2002' || err.message?.includes('Unique constraint failed')) {
        throw new ConflictError('Email address is already registered', 'AUTH_EMAIL_ALREADY_EXISTS');
      }
      throw err;
    }
  }

  /**
   * Returns a paginated list of WORKER users.
   *
   * Role is always forced to WORKER at the repository/DB level.
   * The DTO does not accept a role parameter — clients cannot override filtering.
   */
  public async listWorkers(dto: ListWorkersQueryDto): Promise<{
    items: object[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const [workers, total] = await this.userRepository.findWorkers({
      page: dto.page,
      limit: dto.limit,
      status: dto.status,
    });

    const totalPages = Math.ceil(total / dto.limit);

    return {
      items: workers,
      pagination: {
        page: dto.page,
        limit: dto.limit,
        total,
        totalPages,
      },
    };
  }
}
