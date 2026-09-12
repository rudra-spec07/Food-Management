import { PrismaClient, UserRole, UserStatus, DonationStatus, PickupStatus } from '@prisma/client';
import { PasswordService } from '../../src/modules/auth-user/services/password.service';

const prisma = new PrismaClient();
jest.setTimeout(30000);

describe('Module 05 — Transactional Integrity & Rollback Tests', () => {
  let workerId: string;
  let donorId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    const passwordHash = await PasswordService.hashPassword('Password123!');

    const worker = await prisma.user.create({
      data: {
        firstName: 'RollWorker',
        lastName: 'Test',
        email: `roll-worker-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.WORKER,
        status: UserStatus.ACTIVE,
      },
    });
    workerId = worker.id;

    const donor = await prisma.user.create({
      data: {
        firstName: 'RollDonor',
        lastName: 'Test',
        email: `roll-donor-${timestamp}@example.test`,
        passwordHash,
        role: UserRole.DONOR,
        status: UserStatus.ACTIVE,
      },
    });
    donorId = donor.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Transaction Rollback on Error during Complete Pickup', async () => {
    // Create donation, assignment, and pickup
    const donation = await prisma.donation.create({
      data: {
        donorId,
        category: 'COOKED_MEAL',
        description: 'Rollback Meal',
        quantity: 5,
        quantityUnit: 'PORTIONS',
        preparedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        pickupAddress: 'Rollback address',
        contactName: 'Contact',
        contactPhone: '+123456',
        status: DonationStatus.ACCEPTED,
      },
    });

    const assignment = await prisma.assignment.create({
      data: {
        donationId: donation.id,
        workerId,
        assignedBy: workerId,
        status: 'ACCEPTED',
      },
    });

    const pickup = await prisma.pickup.create({
      data: {
        donationId: donation.id,
        assignmentId: assignment.id,
        workerId,
        status: PickupStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });

    // Move donation to PICKED_UP
    await prisma.donation.update({
      where: { id: donation.id },
      data: { status: DonationStatus.PICKED_UP },
    });

    let throwError = true;

    try {
      await prisma.$transaction(async (tx) => {
        // Run standard complete logic but throw inside transaction
        await tx.pickup.update({
          where: { id: pickup.id },
          data: { status: PickupStatus.COMPLETED, completedAt: new Date() },
        });

        await tx.donation.update({
          where: { id: donation.id },
          data: { status: DonationStatus.COMPLETED, completedAt: new Date() },
        });

        if (throwError) {
          throw new Error('SIMULATED_TRANSACTION_FAILURE');
        }
      });
    } catch (err: any) {
      expect(err.message).toBe('SIMULATED_TRANSACTION_FAILURE');
    }

    // Verify rollback: Pickup is still IN_PROGRESS, Donation is still PICKED_UP
    const dbPickup = await prisma.pickup.findUnique({ where: { id: pickup.id } });
    expect(dbPickup!.status).toBe(PickupStatus.IN_PROGRESS);
    expect(dbPickup!.completedAt).toBeNull();

    const dbDonation = await prisma.donation.findUnique({ where: { id: donation.id } });
    expect(dbDonation!.status).toBe(DonationStatus.PICKED_UP);
    expect(dbDonation!.completedAt).toBeNull();
  });
});
