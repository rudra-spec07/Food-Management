import { AssignmentRepository } from '../repositories/assignment.repository';
import { AssignWorkerDto } from '../types/assignment.types';
import { RejectAssignmentDto } from '../types/assignment.types';
import { AssignmentQueryDto, PaginatedAssignmentResult } from '../types/assignment.types';
import { NotFoundError } from '../../../shared/errors/app-error';

export class AssignmentService {
  private assignmentRepo: AssignmentRepository;

  constructor(repository?: AssignmentRepository) {
    this.assignmentRepo = repository || new AssignmentRepository();
  }

  public async getAssignmentQueue(
    query: AssignmentQueryDto
  ): Promise<PaginatedAssignmentResult<any>> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);

    const [items, total] = await this.assignmentRepo.findAssignmentQueue({ page, limit });
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

  public async assignWorker(
    donationId: string,
    adminId: string,
    dto: AssignWorkerDto
  ): Promise<any> {
    return this.assignmentRepo.executeAssignWorkerTransaction({
      donationId,
      workerId: dto.workerId,
      adminId,
    });
  }

  public async getAssignmentHistory(donationId: string): Promise<any[]> {
    return this.assignmentRepo.findAssignmentHistoryByDonationId(donationId);
  }

  public async getAdminAssignments(
    query: AssignmentQueryDto
  ): Promise<PaginatedAssignmentResult<any>> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);

    const [items, total] = await this.assignmentRepo.findAdminAssignments({
      page,
      limit,
      status: query.status,
    });
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

  public async getWorkerAssignments(
    workerId: string,
    query: AssignmentQueryDto
  ): Promise<PaginatedAssignmentResult<any>> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);

    const [items, total] = await this.assignmentRepo.findWorkerAssignments(workerId, {
      page,
      limit,
    });

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

  public async getWorkerAssignmentDetail(
    assignmentId: string,
    workerId: string
  ): Promise<any> {
    const assignment = await this.assignmentRepo.findWorkerAssignmentDetail(
      assignmentId,
      workerId
    );

    if (!assignment) {
      throw new NotFoundError('Assignment not found', 'ASSIGNMENT_NOT_FOUND');
    }

    return assignment;
  }

  public async acceptAssignment(assignmentId: string, workerId: string): Promise<any> {
    return this.assignmentRepo.executeAcceptAssignmentTransaction({
      assignmentId,
      workerId,
    });
  }

  public async rejectAssignment(
    assignmentId: string,
    workerId: string,
    dto: RejectAssignmentDto
  ): Promise<any> {
    const normalizedReason = dto.reason.trim();
    return this.assignmentRepo.executeRejectAssignmentTransaction({
      assignmentId,
      workerId,
      reason: normalizedReason,
    });
  }
}
