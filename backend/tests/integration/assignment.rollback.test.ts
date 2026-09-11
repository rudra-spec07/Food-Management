import { prisma } from '../../src/config/database';
import { UserRole, UserStatus, DonationStatus } from '@prisma/client';
import { PasswordService } from '../../src/modules/auth-user/services/password.service';

describe('Module 04 — Transaction Rollback Tests', () => {
  let adminId: string;
  let workerId: string;
  let donorId: string;
  let donationId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    const passwordHash = await PasswordService.hashPassword('Password123!');

    const admin = await prisma.user.create({
      data: {
        firstName: 'RollbackAdmin',
        lastName: 'Tester',
        email: `rollback-admin-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    adminId = admin.id;

    const worker = await prisma.user.create({
      data: {
        firstName: 'RollbackWorker',
        lastName: 'Tester',
        email: `rollback-worker-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.WORKER,
        status: UserStatus.ACTIVE,
      },
    });
    workerId = worker.id;

    const donor = await prisma.user.create({
      data: {
        firstName: 'RollbackDonor',
        lastName: 'Tester',
        email: `rollback-donor-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.DONOR,
        status: UserStatus.ACTIVE,
      },
    });
    donorId = donor.id;

    const donation = await prisma.donation.create({
      data: {
        donorId,
        category: 'COOKED_MEAL',
        description: 'Rollback Test Donation',
        quantity: 10,
        quantityUnit: 'PORTIONS',
        preparedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        pickupAddress: 'Rollback St',
        contactName: 'Donor Test',
        contactPhone: '1234567890',
        status: DonationStatus.APPROVED,
      },
    });
    donationId = donation.id;
  });

  afterAll(async () => {
    try {
      await prisma.outboxEvent.deleteMany({ where: { aggregateId: donationId } });
      await prisma.auditLog.deleteMany({ where: { userId: { in: [adminId, workerId, donorId] } } });
      await prisma.donationStatusHistory.deleteMany({ where: { donationId } });
      await prisma.assignment.deleteMany({ where: { donationId } });
      await prisma.donation.delete({ where: { id: donationId } });
      await prisma.user.deleteMany({ where: { id: { in: [adminId, workerId, donorId] } } });
    } catch (e) {
      console.error(e);
    }
    await prisma.$disconnect();
  });

  it('should verify total transaction rollback when an error occurs mid-transaction', async () => {
    try {
      await prisma.$transaction(async (tx) => {
        // Step 1: Update donation status
        await tx.donation.update({
          where: { id: donationId },
          data: { status: DonationStatus.ASSIGNED },
        });

        // Step 2: Create assignment
        await tx.assignment.create({
          data: {
            donationId,
            workerId,
            assignedBy: adminId,
            status: 'PENDING',
          },
        });

        // Step 3: Create status history
        await tx.donationStatusHistory.create({
          data: {
            donationId,
            fromStatus: DonationStatus.APPROVED,
            toStatus: DonationStatus.ASSIGNED,
            changedBy: adminId,
            reason: 'Rollback test mutation',
          },
        });

        // Step 4: Intentional failure before commit
        throw new Error('Simulated transactional failure');
      });
    } catch (e: any) {
      expect(e.message).toBe('Simulated transactional failure');
    }

    // VERIFY ROLLBACK: Donation remains APPROVED
    const dbDonation = await prisma.donation.findUnique({ where: { id: donationId } });
    expect(dbDonation?.status).toBe(DonationStatus.APPROVED);

    // VERIFY ROLLBACK: No Assignment record exists
    const dbAssignments = await prisma.assignment.findMany({ where: { donationId } });
    expect(dbAssignments.length).toBe(0);

    // VERIFY ROLLBACK: No status history created
    const dbHistory = await prisma.donationStatusHistory.findMany({ where: { donationId } });
    expect(dbHistory.length).toBe(0);
  });
});
