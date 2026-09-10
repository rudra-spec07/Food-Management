import request from 'supertest';
import app from '../../src/app';
import { PrismaClient, DonationStatus } from '@prisma/client';

const prisma = new PrismaClient();

describe('Real Neon Database Integration & Security Tests — Module 02 (Donation Management)', () => {
  const timestamp = Date.now();
  const donor1Email = `donor1-mod2-${timestamp}@example.test`;
  const donor2Email = `donor2-mod2-${timestamp}@example.test`;
  const password = 'Password123!';

  let donor1Token: string;
  let donor1Id: string;

  let donor2Token: string;
  let donor2Id: string;

  let createdDonationId: string;

  beforeAll(async () => {
    // 1. Register Donor 1
    const reg1Res = await request(app).post('/api/v1/auth/register').send({
      firstName: 'DonorOne',
      lastName: 'Tester',
      email: donor1Email,
      phone: '+919876543210',
      password,
    });
    expect(reg1Res.status).toBe(201);
    donor1Token = reg1Res.body.data.accessToken;
    donor1Id = reg1Res.body.data.user.id;

    // 2. Register Donor 2
    const reg2Res = await request(app).post('/api/v1/auth/register').send({
      firstName: 'DonorTwo',
      lastName: 'Tester',
      email: donor2Email,
      phone: '+919876543211',
      password,
    });
    expect(reg2Res.status).toBe(201);
    donor2Token = reg2Res.body.data.accessToken;
    donor2Id = reg2Res.body.data.user.id;
  });

  afterAll(async () => {
    // Cleanup synthetic test records
    if (donor1Id || donor2Id) {
      await prisma.donationStatusHistory.deleteMany({
        where: { changedBy: { in: [donor1Id, donor2Id].filter(Boolean) } },
      });
      await prisma.donation.deleteMany({
        where: { donorId: { in: [donor1Id, donor2Id].filter(Boolean) } },
      });
      await prisma.auditLog.deleteMany({
        where: { userId: { in: [donor1Id, donor2Id].filter(Boolean) } },
      });
      await prisma.authSession.deleteMany({
        where: { userId: { in: [donor1Id, donor2Id].filter(Boolean) } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [donor1Id, donor2Id].filter(Boolean) } },
      });
    }
    await prisma.$disconnect();
  });

  describe('1. Create Donation & Security Protection', () => {
    it('should create a valid donation and enforce PENDING_REVIEW status', async () => {
      const now = new Date();
      const preparedAt = new Date(now.getTime() - 1000 * 60 * 20).toISOString();
      const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 8).toISOString();

      const payload = {
        category: 'COOKED_MEAL',
        description: 'Fresh lunch packets for donation',
        quantity: 30,
        quantityUnit: 'PORTIONS',
        preparedAt,
        expiresAt,
        pickupAddress: '456 Ring Road, Indore',
        pickupLatitude: 22.7196,
        pickupLongitude: 75.8577,
        contactName: 'Donor One',
        contactPhone: '+919876543210',
        photoUrl: 'https://images.example.com/donation.png',
        notes: 'Call on arrival',
        // Injected fields (must be ignored/stripped)
        status: 'APPROVED',
        donorId: donor2Id,
        rejectionReason: 'Fake rejection',
      };

      const res = await request(app)
        .post('/api/v1/donations')
        .set('Authorization', `Bearer ${donor1Token}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();

      createdDonationId = res.body.data.id;

      // Security Checks
      expect(res.body.data.donorId).toBe(donor1Id); // Must be authenticated user, NOT injected donor2Id
      expect(res.body.data.status).toBe(DonationStatus.PENDING_REVIEW); // Forced initial status, NOT injected APPROVED
      expect(res.body.data.rejectionReason).toBeNull();

      // Verify DB persistence & status history
      const dbDonation = await prisma.donation.findUnique({
        where: { id: createdDonationId },
        include: { statusHistory: true },
      });
      expect(dbDonation).not.toBeNull();
      expect(dbDonation?.status).toBe(DonationStatus.PENDING_REVIEW);
      expect(dbDonation?.statusHistory.length).toBe(1);
      expect(dbDonation?.statusHistory[0].toStatus).toBe(DonationStatus.PENDING_REVIEW);
    });

    it('should reject creation when quantity is zero or negative', async () => {
      const now = new Date();
      const payload = {
        category: 'COOKED_MEAL',
        description: 'Zero quantity test',
        quantity: 0,
        quantityUnit: 'PORTIONS',
        preparedAt: new Date(now.getTime() - 1000 * 60 * 10).toISOString(),
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60).toISOString(),
        pickupAddress: 'Address',
        contactName: 'Name',
        contactPhone: '+919876543210',
      };

      const res = await request(app)
        .post('/api/v1/donations')
        .set('Authorization', `Bearer ${donor1Token}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Get Donation & IDOR Protection', () => {
    it('should allow Donor 1 to fetch their own donation by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/donations/${createdDonationId}`)
        .set('Authorization', `Bearer ${donor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdDonationId);
    });

    it('should prevent IDOR/BOLA by returning 404 when Donor 2 attempts to fetch Donor 1 donation', async () => {
      const res = await request(app)
        .get(`/api/v1/donations/${createdDonationId}`)
        .set('Authorization', `Bearer ${donor2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DONATION_NOT_FOUND');
    });
  });

  describe('3. List My Donations', () => {
    it('should return paginated list of donations belonging to Donor 1', async () => {
      const res = await request(app)
        .get('/api/v1/donations/my?page=1&limit=10')
        .set('Authorization', `Bearer ${donor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(10);
    });
  });

  describe('4. Update Donation & Mass Assignment Protection', () => {
    it('should allow Donor 1 to update pending donation details', async () => {
      const res = await request(app)
        .patch(`/api/v1/donations/${createdDonationId}`)
        .set('Authorization', `Bearer ${donor1Token}`)
        .send({
          description: 'Updated vegetarian meals description',
          quantity: 40,
          // Attempt mass assignment tampering
          status: 'COMPLETED',
          donorId: donor2Id,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toBe('Updated vegetarian meals description');
      expect(Number(res.body.data.quantity)).toBe(40);
      expect(res.body.data.status).toBe(DonationStatus.PENDING_REVIEW); // Preserved
      expect(res.body.data.donorId).toBe(donor1Id); // Preserved
    });

    it('should prevent IDOR by returning 404 when Donor 2 attempts to update Donor 1 donation', async () => {
      const res = await request(app)
        .patch(`/api/v1/donations/${createdDonationId}`)
        .set('Authorization', `Bearer ${donor2Token}`)
        .send({ description: 'Hacked description' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('5. Cancel Donation & State Transition Protection', () => {
    it('should allow Donor 1 to cancel their pending donation', async () => {
      const res = await request(app)
        .post(`/api/v1/donations/${createdDonationId}/cancel`)
        .set('Authorization', `Bearer ${donor1Token}`)
        .send({ reason: 'No longer available for pickup' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(DonationStatus.CANCELLED);
      expect(res.body.data.cancelledAt).not.toBeNull();

      // Verify status history
      const dbDonation = await prisma.donation.findUnique({
        where: { id: createdDonationId },
        include: { statusHistory: true },
      });
      expect(dbDonation?.status).toBe(DonationStatus.CANCELLED);
      expect(dbDonation?.statusHistory.length).toBe(2);
      expect(dbDonation?.statusHistory[1].toStatus).toBe(DonationStatus.CANCELLED);
    });

    it('should reject subsequent cancellation attempts on an already cancelled donation', async () => {
      const res = await request(app)
        .post(`/api/v1/donations/${createdDonationId}/cancel`)
        .set('Authorization', `Bearer ${donor1Token}`)
        .send({ reason: 'Second cancel attempt' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DONATION_CANNOT_BE_CANCELLED');
    });

    it('should reject update attempts on a cancelled donation', async () => {
      const res = await request(app)
        .patch(`/api/v1/donations/${createdDonationId}`)
        .set('Authorization', `Bearer ${donor1Token}`)
        .send({ description: 'Attempt edit after cancel' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DONATION_NOT_EDITABLE');
    });
  });
});
