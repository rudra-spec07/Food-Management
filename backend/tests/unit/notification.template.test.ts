import {
  escapeHtml,
  sanitizeContext,
  renderTemplate,
} from '../../src/modules/notifications/templates/notification-template.map';

describe('Module 06 — Template Engine & Security Unit Tests', () => {
  describe('HTML Escaping Security', () => {
    it('should correctly escape HTML special characters to prevent XSS injection', () => {
      const maliciousInput = '<script>alert("XSS")</script> & \'quote\'';
      const escaped = escapeHtml(maliciousInput);

      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt; &amp; &#39;quote&#39;');
    });

    it('should handle null or undefined input gracefully', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });
  });

  describe('Context Sanitization & Allowlist Enforcement', () => {
    it('should extract allowlisted fields and strip blacklisted sensitive fields', () => {
      const rawPayload = {
        donationId: 'don-123',
        category: 'COOKED_MEAL',
        quantity: '50',
        quantityUnit: 'PORTIONS',
        passwordHash: 'secret-hash-value',
        JWT_SECRET: 'super-secret-key',
        sessionId: 'session-uuid',
        internalNotes: 'Top secret admin note',
      };

      const sanitized = sanitizeContext(rawPayload);

      expect(sanitized.donationId).toBe('don-123');
      expect(sanitized.category).toBe('COOKED_MEAL');
      expect(sanitized.quantity).toBe('50');
      expect(sanitized.quantityUnit).toBe('PORTIONS');

      // Blacklisted fields must be absent
      expect((sanitized as any).passwordHash).toBeUndefined();
      expect((sanitized as any).JWT_SECRET).toBeUndefined();
      expect((sanitized as any).sessionId).toBeUndefined();
      expect((sanitized as any).internalNotes).toBeUndefined();
    });
  });

  describe('Template Rendering for All 9 Supported Events', () => {
    const context = {
      donationId: 'don-999',
      category: 'PACKAGED_FOOD',
      quantity: '10',
      quantityUnit: 'BOXES',
      reason: 'Expired food items',
      failureReason: 'Address not reachable <tag>',
    };

    it('should render DONATION_SUBMITTED template safely for admin recipients', () => {
      const adminContext = {
        ...context,
        contactName: 'Rahul Sharma',
      };
      const rendered = renderTemplate('DONATION_SUBMITTED', adminContext);
      expect(rendered.title).toBe('Donation Submitted');
      expect(rendered.message).toBe('You have a new donation from Rahul Sharma. They have donated 10 BOXES of PACKAGED_FOOD.');
      expect(rendered.message).not.toContain('Your food donation');
      expect(rendered.message).not.toContain('pending review');
      expect(rendered.emailHtml).toContain('Rahul Sharma');
    });

    it('should render DONATION_APPROVED template', () => {
      const rendered = renderTemplate('DONATION_APPROVED', context);
      expect(rendered.title).toBe('Donation Approved');
    });

    it('should render DONATION_REJECTED template', () => {
      const rendered = renderTemplate('DONATION_REJECTED', context);
      expect(rendered.title).toBe('Donation Rejected');
      expect(rendered.message).toContain('Expired food items');
    });

    it('should render DONATION_ASSIGNED template', () => {
      const rendered = renderTemplate('DONATION_ASSIGNED', context);
      expect(rendered.title).toBe('New Pickup Assignment');
    });

    it('should render ASSIGNMENT_ACCEPTED template', () => {
      const rendered = renderTemplate('ASSIGNMENT_ACCEPTED', context);
      expect(rendered.title).toBe('Assignment Accepted');
    });

    it('should render ASSIGNMENT_REJECTED template', () => {
      const rendered = renderTemplate('ASSIGNMENT_REJECTED', context);
      expect(rendered.title).toBe('Assignment Rejected');
    });

    it('should render PICKUP_STARTED template', () => {
      const rendered = renderTemplate('PICKUP_STARTED', context);
      expect(rendered.title).toBe('Food Pickup In Progress');
    });

    it('should render PICKUP_COMPLETED template', () => {
      const rendered = renderTemplate('PICKUP_COMPLETED', context);
      expect(rendered.title).toBe('Donation Completed & Picked Up');
    });

    it('should render PICKUP_FAILED template with escaped failure reason', () => {
      const contextWithXss = {
        category: 'PACKAGED_FOOD',
        failureReason: 'Address not reachable <tag>',
      };
      const rendered = renderTemplate('PICKUP_FAILED', contextWithXss);
      expect(rendered.title).toBe('Pickup Issue Reported');
      expect(rendered.emailHtml).toContain('&lt;tag&gt;');
      expect(rendered.emailHtml).not.toContain('<tag>');
    });

    it('should render INVENTORY_DISTRIBUTED template safely with recipientName', () => {
      const distContext = {
        quantity: '20',
        unit: 'KG',
        recipientName: 'Community Kitchen <script>',
      };
      const rendered = renderTemplate('INVENTORY_DISTRIBUTED', distContext);
      expect(rendered.title).toBe('Food Donation Distributed');
      expect(rendered.message).toContain('20 KG');
      expect(rendered.emailHtml).toContain('Community Kitchen &lt;script&gt;');
      expect(rendered.emailHtml).not.toContain('<script>');
    });

    it('should render PASSWORD_RESET_REQUESTED template safely with resetUrl', () => {
      const resetContext = {
        firstName: 'John <script>',
        resetUrl: 'http://localhost:5173/reset-password?token=12345',
      };
      const rendered = renderTemplate('PASSWORD_RESET_REQUESTED', resetContext);
      expect(rendered.title).toBe('Password Reset Request');
      expect(rendered.emailHtml).toContain('Hello John &lt;script&gt;,');
      expect(rendered.emailHtml).toContain('http://localhost:5173/reset-password?token=12345');
      expect(rendered.emailHtml).not.toContain('<script>');
    });
  });
});
