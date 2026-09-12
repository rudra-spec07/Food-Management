import request from 'supertest';
import app from '../../src/app';
import {
  PrismaClient,
  UserRole,
  DonationCategory,
  DonationQuantityUnit,
  InventoryStatus,
} from '@prisma/client';
import { PasswordService } from '../../src/modules/auth-user/services/password.service';

const prisma = new PrismaClient();

describe('Module 05 — Distribution Concurrency Tests', () => {
  jest.setTimeout(30000);

  let donorId: string;
  let adminId: string;
  let workerId: string;
  let workerToken: string;

  let donationId: string;
  let pickupId: string;
  let inventoryId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    const passwordHash = await PasswordService.hashPassword('Password123!');

    // Create Donor
    const donor = await prisma.user.create({
      data: {
        firstName: 'ConcDonor',
        lastName: 'Test',
        email: `concdonor_${timestamp}@test.com`,
        passwordHash,
        role: UserRole.DONOR,
      },
    });
    donorId = donor.id;

    // Create Admin
    const admin = await prisma.user.create({
      data: {
        firstName: 'ConcAdmin',
        lastName: 'Test',
        email: `concadmin_${timestamp}@test.com`,
        passwordHash,
        role: UserRole.ADMIN,
      },
    });
    adminId = admin.id;

    // Create Worker & Login
    const worker = await prisma.user.create({
      data: {
        firstName: 'ConcWorker',
        lastName: 'Test',
        email: `concworker_${timestamp}@test.com`,
        passwordHash,
        role: UserRole.WORKER,
      },
    });
    workerId = worker.id;

    const workerLogin = await request(app).post('/api/v1/auth/login').send({
      email: worker.email,
      password: 'Password123!',
    });
    workerToken = workerLogin.body.data.accessToken;

    // Create Donation & Pickup
    const donation = await prisma.donation.create({
      data: {
        donorId,
        category: DonationCategory.PACKAGED_FOOD,
        description: '10 Packets Emergency Meal',
        quantity: 10.0,
        quantityUnit: DonationQuantityUnit.PACKETS,
        preparedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        pickupAddress: 'Depot 1',
        contactName: 'Donor Contact',
        contactPhone: '+1234567890',
        status: 'COMPLETED' as any,
      },
    });
    donationId = donation.id;

    const assignment = await prisma.assignment.create({
      data: {
        donationId,
        workerId,
        assignedBy: adminId,
        status: 'ACCEPTED' as any,
      },
    });

    const pickup = await prisma.pickup.create({
      data: {
        donationId,
        assignmentId: assignment.id,
        workerId,
        status: 'COMPLETED' as any,
      },
    });
    pickupId = pickup.id;

    // Create Inventory item with availableQuantity = 10
    const inv = await prisma.inventoryItem.create({
      data: {
        donationId,
        pickupId,
        foodCategory: DonationCategory.PACKAGED_FOOD,
        description: '10 Packets Emergency Meal',
        totalQuantity: 10.0,
        availableQuantity: 10.0,
        reservedQuantity: 0.0,
        distributedQuantity: 0.0,
        unit: DonationQuantityUnit.PACKETS,
        status: InventoryStatus.AVAILABLE,
      },
    });
    inventoryId = inv.id;
  });

  afterAll(async () => {
    // Teardown
    await prisma.inventoryMovement.deleteMany({
      where: { inventoryId },
    });
    await prisma.distributionRecord.deleteMany({
      where: { inventoryId },
    });
    await prisma.inventoryItem.deleteMany({
      where: { id: inventoryId },
    });
    await prisma.pickup.deleteMany({
      where: { id: pickupId },
    });
    await prisma.assignment.deleteMany({
      where: { donationId },
    });
    await prisma.donation.deleteMany({
      where: { id: donationId },
    });
    await prisma.authSession.deleteMany({
      where: { userId: { in: [donorId, adminId, workerId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [donorId, adminId, workerId] } },
    });
    await prisma.$disconnect();
  });

  it('Concurrent distribution requests for 7 units from 10 available units: exactly 1 succeeds, 1 fails with 409 INSUFFICIENT_INVENTORY', async () => {
    const reqA = request(app)
      .post('/api/v1/distributions')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        inventoryId,
        recipientName: 'Shelter Alpha',
        quantity: 7.0,
        unit: DonationQuantityUnit.PACKETS,
      });

    const reqB = request(app)
      .post('/api/v1/distributions')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        inventoryId,
        recipientName: 'Shelter Beta',
        quantity: 7.0,
        unit: DonationQuantityUnit.PACKETS,
      });

    const [resA, resB] = await Promise.all([reqA, reqB]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]);

    const successRes = resA.status === 201 ? resA : resB;
    const conflictRes = resA.status === 409 ? resA : resB;

    expect(successRes.body.success).toBe(true);
    expect(conflictRes.body.success).toBe(false);
    expect(conflictRes.body.error.code).toBe('INSUFFICIENT_INVENTORY');

    // Verify DB State
    const dbItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryId },
      include: {
        movements: true,
        distributionRecords: true,
      },
    });

    expect(dbItem).not.toBeNull();
    expect(Number(dbItem?.totalQuantity)).toBe(10);
    expect(Number(dbItem?.availableQuantity)).toBe(3);
    expect(Number(dbItem?.distributedQuantity)).toBe(7);
    expect(dbItem?.status).toBe(InventoryStatus.AVAILABLE);

    // Invariant check: 3 + 0 + 7 = 10
    expect(
      Number(dbItem?.availableQuantity) +
        Number(dbItem?.reservedQuantity) +
        Number(dbItem?.distributedQuantity)
    ).toBe(Number(dbItem?.totalQuantity));

    expect(dbItem?.distributionRecords.length).toBe(1);
    expect(dbItem?.movements.length).toBe(1);
  });
});
