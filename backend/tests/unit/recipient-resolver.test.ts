import { RecipientResolverService } from '../../src/modules/notifications/services/recipient-resolver.service';
import { UserRole, UserStatus } from '@prisma/client';

describe('RecipientResolverService Unit Tests', () => {
  let service: RecipientResolverService;
  let mockTx: any;

  beforeEach(() => {
    service = new RecipientResolverService();
    mockTx = {
      donation: {
        findUnique: jest.fn(),
      },
      assignment: {
        findUnique: jest.fn(),
      },
      pickup: {
        findUnique: jest.fn(),
      },
      inventoryItem: {
        findUnique: jest.fn(),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'admin-1' },
          { id: 'admin-2' },
        ]),
      },
    };
  });

  it('should resolve DONATION_SUBMITTED to donor AND all active admins', async () => {
    const payload = { donorId: 'donor-100', donationId: 'don-1' };
    const recipients = await service.resolveRecipients('DONATION_SUBMITTED', payload, mockTx);

    expect(recipients).toContain('donor-100');
    expect(recipients).toContain('admin-1');
    expect(recipients).toContain('admin-2');
    expect(mockTx.user.findMany).toHaveBeenCalledWith({
      where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
      select: { id: true },
    });
  });

  it('should resolve DONATION_APPROVED to donor', async () => {
    const payload = { donorId: 'donor-100' };
    const recipients = await service.resolveRecipients('DONATION_APPROVED', payload, mockTx);

    expect(recipients).toEqual(['donor-100']);
  });

  it('should resolve DONATION_ASSIGNED to assigned worker only', async () => {
    const payload = { workerId: 'worker-50' };
    const recipients = await service.resolveRecipients('DONATION_ASSIGNED', payload, mockTx);

    expect(recipients).toEqual(['worker-50']);
    expect(recipients).not.toContain('worker-unrelated');
  });

  it('should resolve ASSIGNMENT_ACCEPTED to assigning admin', async () => {
    const payload = { assignedBy: 'admin-1' };
    const recipients = await service.resolveRecipients('ASSIGNMENT_ACCEPTED', payload, mockTx);

    expect(recipients).toEqual(['admin-1']);
  });

  it('should resolve PICKUP_STARTED, PICKUP_COMPLETED, PICKUP_FAILED to donor, assigned worker, AND active admins', async () => {
    const payload = { donorId: 'donor-100', workerId: 'worker-assigned', pickupId: 'pickup-1' };
    const recipientsStarted = await service.resolveRecipients('PICKUP_STARTED', payload, mockTx);
    const recipientsCompleted = await service.resolveRecipients('PICKUP_COMPLETED', payload, mockTx);
    const recipientsFailed = await service.resolveRecipients('PICKUP_FAILED', payload, mockTx);

    // Donor
    expect(recipientsStarted).toContain('donor-100');
    expect(recipientsCompleted).toContain('donor-100');
    expect(recipientsFailed).toContain('donor-100');

    // Assigned Worker
    expect(recipientsStarted).toContain('worker-assigned');
    expect(recipientsCompleted).toContain('worker-assigned');
    expect(recipientsFailed).toContain('worker-assigned');

    // Admins
    expect(recipientsStarted).toContain('admin-1');
    expect(recipientsCompleted).toContain('admin-1');
    expect(recipientsFailed).toContain('admin-1');

    // Unrelated worker excluded
    expect(recipientsStarted).not.toContain('worker-unrelated');
  });

  it('should resolve INVENTORY_DISTRIBUTED to donor, assigned worker, AND active admins', async () => {
    mockTx.inventoryItem.findUnique.mockResolvedValue({
      pickup: { workerId: 'worker-assigned' },
      donation: { donorId: 'donor-77', assignments: [{ workerId: 'worker-assigned' }] },
    });

    const payload = { inventoryId: 'inv-1', quantity: '10', unit: 'KG', recipientName: 'Food Bank' };
    const recipients = await service.resolveRecipients('INVENTORY_DISTRIBUTED', payload, mockTx);

    expect(recipients).toContain('donor-77');
    expect(recipients).toContain('worker-assigned');
    expect(recipients).toContain('admin-1');
    expect(recipients).toContain('admin-2');
    expect(recipients).not.toContain('worker-unrelated');
  });

  it('should throw error when no recipient can be resolved', async () => {
    mockTx.user.findMany.mockResolvedValue([]);
    await expect(
      service.resolveRecipients('UNKNOWN_EVENT', {}, mockTx)
    ).rejects.toThrow('Unable to resolve authoritative recipient(s)');
  });
});
