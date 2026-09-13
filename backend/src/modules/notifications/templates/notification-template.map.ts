import { NotificationContext, RenderedTemplate } from '../types/notification.types';

export function escapeHtml(unsafe: any): string {
  if (unsafe === undefined || unsafe === null) return '';
  const str = String(unsafe);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeContext(payload: Record<string, any>): NotificationContext {
  const allowlist = [
    'donationId',
    'category',
    'quantity',
    'quantityUnit',
    'unit',
    'contactName',
    'status',
    'rejectionReason',
    'failureReason',
    'completionNotes',
    'assignmentId',
    'workerId',
    'donorId',
    'reviewerId',
    'firstName',
    'lastName',
    'reason',
    'recipientName',
    'distributionId',
    'inventoryId',
  ];

  const sanitized: NotificationContext = {};

  for (const key of allowlist) {
    if (payload && payload[key] !== undefined && payload[key] !== null) {
      sanitized[key] = String(payload[key]);
    }
  }

  return sanitized;
}

export function renderTemplate(eventType: string, context: NotificationContext): RenderedTemplate {
  const category = escapeHtml(context.category || 'Food');
  const quantity = escapeHtml(context.quantity || '');
  const quantityUnit = escapeHtml(context.unit || context.quantityUnit || '');
  const reason = escapeHtml(context.reason || context.rejectionReason || context.failureReason || '');
  const notes = escapeHtml(context.completionNotes || '');
  const donationId = escapeHtml(context.donationId || '');
  const recipientName = escapeHtml(context.recipientName || 'community partner');

  switch (eventType) {
    case 'DONATION_SUBMITTED':
      return {
        title: 'Donation Submitted',
        message: `Your food donation (${quantity} ${quantityUnit} of ${category}) has been submitted and is pending review.`,
        emailSubject: 'Food Share — Donation Submitted Successfully',
        emailHtml: `<p>Hello,</p><p>Your food donation of <strong>${quantity} ${quantityUnit}</strong> of <strong>${category}</strong> has been submitted successfully and is pending administrative review.</p><p>Donation Reference: ${donationId}</p>`,
      };

    case 'DONATION_APPROVED':
      return {
        title: 'Donation Approved',
        message: `Your donation (${category}) has been approved and is queued for worker assignment.`,
        emailSubject: 'Food Share — Donation Approved',
        emailHtml: `<p>Hello,</p><p>Great news! Your food donation of <strong>${category}</strong> has been approved by our review team. We will assign a delivery worker shortly.</p>`,
      };

    case 'DONATION_REJECTED':
      return {
        title: 'Donation Rejected',
        message: `Your donation (${category}) was not accepted.${reason ? ' Reason: ' + reason : ''}`,
        emailSubject: 'Food Share — Donation Review Update',
        emailHtml: `<p>Hello,</p><p>We regret to inform you that your food donation of <strong>${category}</strong> could not be accepted at this time.</p>${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}`,
      };

    case 'DONATION_ASSIGNED':
      return {
        title: 'New Pickup Assignment',
        message: `You have been assigned a new food pickup (${category}, ${quantity} ${quantityUnit}). Please respond to your assignment.`,
        emailSubject: 'Food Share — New Pickup Assignment Available',
        emailHtml: `<p>Hello,</p><p>You have been assigned a food pickup task for <strong>${quantity} ${quantityUnit}</strong> of <strong>${category}</strong>. Please check your worker dashboard to accept or decline.</p>`,
      };

    case 'ASSIGNMENT_ACCEPTED':
      return {
        title: 'Assignment Accepted',
        message: `A worker accepted the pickup assignment for donation ${donationId}.`,
        emailSubject: 'Food Share — Worker Accepted Assignment',
        emailHtml: `<p>Hello Admin,</p><p>A worker has accepted the pickup assignment for donation reference <strong>${donationId}</strong>.</p>`,
      };

    case 'ASSIGNMENT_REJECTED':
      return {
        title: 'Assignment Rejected',
        message: `A worker declined the assignment for donation ${donationId}.${reason ? ' Reason: ' + reason : ''}`,
        emailSubject: 'Food Share — Worker Declined Assignment',
        emailHtml: `<p>Hello Admin,</p><p>A worker declined the assignment for donation <strong>${donationId}</strong>.</p>${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}`,
      };

    case 'PICKUP_STARTED':
      return {
        title: 'Food Pickup In Progress',
        message: `A worker has started the pickup for your donation (${category}).`,
        emailSubject: 'Food Share — Pickup Started',
        emailHtml: `<p>Hello,</p><p>A delivery worker is currently en route to pick up your food donation of <strong>${category}</strong>.</p>`,
      };

    case 'PICKUP_COMPLETED':
      return {
        title: 'Donation Completed & Picked Up',
        message: `Your food donation (${category}) has been successfully picked up and added to community inventory! Thank you!`,
        emailSubject: 'Food Share — Donation Pickup Completed',
        emailHtml: `<p>Hello,</p><p>Your food donation of <strong>${category}</strong> has been successfully picked up and received into our inventory! Thank you for your contribution to reducing food waste.</p>${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}`,
      };

    case 'PICKUP_FAILED':
      return {
        title: 'Pickup Issue Reported',
        message: `There was an issue with the food pickup (${category}).${reason ? ' Reason: ' + reason : ''}`,
        emailSubject: 'Food Share — Pickup Exception Report',
        emailHtml: `<p>Hello,</p><p>A pickup attempt for food donation <strong>${category}</strong> was reported as unsuccessful.</p>${reason ? `<p><strong>Reported Reason:</strong> ${reason}</p>` : ''}`,
      };

    case 'INVENTORY_DISTRIBUTED':
      return {
        title: 'Food Donation Distributed',
        message: `Your donated food (${quantity} ${quantityUnit}) was successfully distributed to ${recipientName}. Thank you!`,
        emailSubject: 'Food Share — Food Donation Distributed',
        emailHtml: `<p>Hello,</p><p>Great news! Your donated food of <strong>${quantity} ${quantityUnit}</strong> was successfully distributed to <strong>${recipientName}</strong>.</p><p>Thank you for helping nourish our community!</p>`,
      };

    default:
      return {
        title: 'System Notification',
        message: `Update regarding your food donation account (${eventType}).`,
        emailSubject: 'Food Share — Account Update',
        emailHtml: `<p>Hello,</p><p>There is a new update regarding your account (Event: ${escapeHtml(eventType)}).</p>`,
      };
  }
}
