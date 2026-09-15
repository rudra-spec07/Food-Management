import request from 'supertest';
import { PrismaClient, UserRole, BeneficiaryStatus, DonationCategory, DonationQuantityUnit } from '@prisma/client';
import app from '../../src/app';

jest.setTimeout(60000);

const prisma = new PrismaClient();

describe('Module 06 — Beneficiary Management & Integration Real API Tests', () => {
  let adminToken: string;
  let adminId: string;
  let workerToken: string;
  let workerId: string;
  let donorToken: string;
  let donorId: string;
  let testBeneficiaryId: string;
  let testInventoryId: string;

  beforeAll(async () => {
    // 1. Setup test users
    const timestamp = Date.now();
    
    // Create Admin
    const adminEmail = `ben_admin_${timestamp}@example.test`;
    const adminRes = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Admin',
      lastName: 'Tester',
      email: adminEmail,
      password: 'Password123!',
    });
    adminId = adminRes.body.data.user.id;
    await prisma.user.update({
      where: { id: adminId },
      data: { role: UserRole.ADMIN },
    });
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: adminEmail,
      password: 'Password123!',
    });
    adminToken = adminLogin.body.data.accessToken;

    // Create Worker
    const workerEmail = `ben_worker_${timestamp}@example.test`;
    const workerRes = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Worker',
      lastName: 'Tester',
      email: workerEmail,
      password: 'Password123!',
    });
    workerId = workerRes.body.data.user.id;
    await prisma.user.update({
      where: { id: workerId },
      data: { role: UserRole.WORKER },
    });
    const workerLogin = await request(app).post('/api/v1/auth/login').send({
      email: workerEmail,
      password: 'Password123!',
    });
    workerToken = workerLogin.body.data.accessToken;

    // Create Donor
    const donorEmail = `ben_donor_${timestamp}@example.test`;
    const donorRes = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Donor',
      lastName: 'Tester',
      email: donorEmail,
      password: 'Password123!',
    });
    donorId = donorRes.body.data.user.id;
    const donorLogin = await request(app).post('/api/v1/auth/login').send({
      email: donorEmail,
      password: 'Password123!',
    });
    donorToken = donorLogin.body.data.accessToken;

    // Create sample inventory item directly for distribution testing
    const donation = await prisma.donation.create({
      data: {
        donorId,
        category: DonationCategory.PACKAGED_FOOD,
        description: 'Canned Goods Box',
        quantity: 100,
        quantityUnit: DonationQuantityUnit.BOXES,
        preparedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        pickupAddress: 'Warehouse A',
        contactName: 'Donor Contact',
        contactPhone: '555-0100',
        status: 'COMPLETED',
      },
    });

    const assignment = await prisma.assignment.create({
      data: {
        donationId: donation.id,
        workerId,
        assignedBy: adminId,
        status: 'ACCEPTED',
      },
    });

    const pickup = await prisma.pickup.create({
      data: {
        donationId: donation.id,
        assignmentId: assignment.id,
        workerId,
        status: 'COMPLETED',
      },
    });

    const inventory = await prisma.inventoryItem.create({
      data: {
        donationId: donation.id,
        pickupId: pickup.id,
        foodCategory: DonationCategory.PACKAGED_FOOD,
        description: 'Canned Goods Box',
        totalQuantity: 100,
        availableQuantity: 100,
        reservedQuantity: 0,
        distributedQuantity: 0,
        unit: DonationQuantityUnit.BOXES,
        status: 'AVAILABLE',
      },
    });

    testInventoryId = inventory.id;
  });

  describe('1. Beneficiary RBAC & Authorization Controls', () => {
    it('returns 401 Unauthorized when no auth token is provided', async () => {
      const res = await request(app).get('/api/v1/beneficiaries');
      expect(res.status).toBe(401);
    });

    it('returns 403 Forbidden when DONOR attempts to access beneficiary endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/beneficiaries')
        .set('Authorization', `Bearer ${donorToken}`);
      expect(res.status).toBe(403);
    });

    it('returns 403 Forbidden when WORKER attempts to create a beneficiary (Safeguard 3)', async () => {
      const res = await request(app)
        .post('/api/v1/beneficiaries')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          name: 'Unauthorized Worker Creation',
          address: '456 Worker Way',
        });
      expect(res.status).toBe(403);
    });

    it('allows ADMIN to create a new beneficiary with ACTIVE default status (Safeguards 3 & 4)', async () => {
      const res = await request(app)
        .post('/api/v1/beneficiaries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Hope Community Shelter',
          contactPerson: 'Sarah Connor',
          email: 'contact@hopeshelter.org',
          phone: '555-0199',
          address: '777 Hope Ave',
          notes: 'Primary shelter recipient',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('Hope Community Shelter');
      expect(res.body.data.status).toBe(BeneficiaryStatus.ACTIVE);
      testBeneficiaryId = res.body.data.id;
    });

    it('allows WORKER and ADMIN to list active beneficiaries', async () => {
      const res = await request(app)
        .get('/api/v1/beneficiaries?status=ACTIVE')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.some((b: any) => b.id === testBeneficiaryId)).toBe(true);
    });

    it('allows WORKER and ADMIN to fetch beneficiary details', async () => {
      const res = await request(app)
        .get(`/api/v1/beneficiaries/${testBeneficiaryId}`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Hope Community Shelter');
    });

    it('allows ADMIN to update beneficiary details and status', async () => {
      const res = await request(app)
        .patch(`/api/v1/beneficiaries/${testBeneficiaryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          contactPerson: 'Sarah Connor Updated',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.contactPerson).toBe('Sarah Connor Updated');
    });
  });

  describe('2. Distribution Integration & Revalidation (Safeguards 5, 6, 7)', () => {
    it('snapshots beneficiary name into recipientName when beneficiaryId is used', async () => {
      const res = await request(app)
        .post('/api/v1/distributions')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          inventoryId: testInventoryId,
          beneficiaryId: testBeneficiaryId,
          quantity: 10,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.beneficiaryId).toBe(testBeneficiaryId);
      expect(res.body.data.recipientName).toBe('Hope Community Shelter');
    });

    it('revalidates beneficiary status and rejects distribution to INACTIVE beneficiary', async () => {
      // 1. Create an inactive beneficiary
      const createRes = await request(app)
        .post('/api/v1/beneficiaries')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Inactive Food Bank',
          address: '999 Closed Rd',
          status: BeneficiaryStatus.INACTIVE,
        });
      const inactiveId = createRes.body.data.id;

      // 2. Attempt distribution
      const distRes = await request(app)
        .post('/api/v1/distributions')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          inventoryId: testInventoryId,
          beneficiaryId: inactiveId,
          quantity: 5,
        });

      expect(distRes.status).toBe(409);
      expect(distRes.body.error.code).toBe('BENEFICIARY_INACTIVE');
    });

    it('returns 404 when non-existent beneficiaryId is provided', async () => {
      const nonExistentUuid = '00000000-0000-4000-8000-000000000000';
      const res = await request(app)
        .post('/api/v1/distributions')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          inventoryId: testInventoryId,
          beneficiaryId: nonExistentUuid,
          quantity: 5,
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('BENEFICIARY_NOT_FOUND');
    });

    it('preserves backward compatibility for distributions with manual recipientName (Safeguard 6)', async () => {
      const res = await request(app)
        .post('/api/v1/distributions')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          inventoryId: testInventoryId,
          recipientName: 'Direct Walk-in Recipient',
          quantity: 15,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.beneficiaryId).toBeNull();
      expect(res.body.data.recipientName).toBe('Direct Walk-in Recipient');
    });
  });

  describe('3. Beneficiary History API (Safeguard 9)', () => {
    it('returns paginated distribution history for a beneficiary', async () => {
      const res = await request(app)
        .get(`/api/v1/beneficiaries/${testBeneficiaryId}/history`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.items[0].recipientName).toBe('Hope Community Shelter');
      expect(res.body.data.pagination.totalItems).toBeGreaterThanOrEqual(1);
    });

    it('returns 404 for history of non-existent beneficiary', async () => {
      const nonExistentUuid = '00000000-0000-4000-8000-000000000000';
      const res = await request(app)
        .get(`/api/v1/beneficiaries/${nonExistentUuid}/history`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(404);
    });
  });
});
