import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../lib/db';
import { getResendClient } from '../../lib/email/resend';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const INQUIRY_TYPES = [
  'Capital Allocation',
  'Partnership',
  'Regulatory',
  'Media',
  'Community',
  'General'
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, organization, inquiryType, message } = req.body;

    if (!name || !email || !inquiryType || !message) {
      return res.status(400).json({ error: 'Name, email, inquiry type, and message are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    if (!INQUIRY_TYPES.includes(inquiryType)) {
      return res.status(400).json({ error: 'Invalid inquiry type.' });
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || null;

    try {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS contact_submissions (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          organization VARCHAR(255),
          inquiry_type VARCHAR(100),
          subject VARCHAR(255),
          message TEXT NOT NULL,
          ip_address VARCHAR(45),
          created_at TIMESTAMP DEFAULT NOW()
        )`
      );
      await pool.query(
        `INSERT INTO contact_submissions (name, email, organization, inquiry_type, subject, message, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [name.trim(), email.toLowerCase().trim(), organization?.trim() || null, inquiryType, `[${inquiryType}] ${name}`, message.trim(), ipAddress]
      );
    } catch (dbErr) {
      console.error('DB save error (non-fatal):', dbErr);
    }

    try {
      const { client, fromEmail } = await getResendClient('Axiom Contact <noreply@axiom.money>');

      const safeName = escapeHtml(name);
      const safeEmail = escapeHtml(email);
      const safeOrg = organization ? escapeHtml(organization) : '';
      const safeMsg = escapeHtml(message);

      await client.emails.send({
        from: fromEmail || 'Axiom Contact <noreply@axiom.money>',
        to: ['info@axiomprotocol.app'],
        replyTo: email,
        subject: `[${inquiryType}] Contact Inquiry from ${safeName}`,
        html: `
<div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; color: #1a2332;">
  <div style="border-bottom: 2px solid #1a2332; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">AXIOM PROTOCOL</h1>
    <p style="margin: 4px 0 0; font-size: 14px; color: #6b7280;">Contact Form Submission</p>
  </div>
  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
    <tr>
      <td style="padding: 8px 0; color: #6b7280; width: 140px; font-family: 'Courier New', monospace;">Name</td>
      <td style="padding: 8px 0; font-weight: bold;">${safeName}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #6b7280; font-family: 'Courier New', monospace;">Email</td>
      <td style="padding: 8px 0;"><a href="mailto:${safeEmail}" style="color: #1a2332;">${safeEmail}</a></td>
    </tr>
    ${safeOrg ? `<tr>
      <td style="padding: 8px 0; color: #6b7280; font-family: 'Courier New', monospace;">Organization</td>
      <td style="padding: 8px 0;">${safeOrg}</td>
    </tr>` : ''}
    <tr>
      <td style="padding: 8px 0; color: #6b7280; font-family: 'Courier New', monospace;">Inquiry Type</td>
      <td style="padding: 8px 0;">${inquiryType}</td>
    </tr>
  </table>
  <div style="margin-top: 24px; padding: 16px; border: 1px solid #d1d5db; background: #f9fafb;">
    <p style="margin: 0 0 8px; color: #6b7280; font-family: 'Courier New', monospace; font-size: 12px;">MESSAGE</p>
    <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${safeMsg}</p>
  </div>
  <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #d1d5db; font-size: 12px; color: #9ca3af;">
    <p style="margin: 0;">Submitted via axiomprotocol.app/contact</p>
    <p style="margin: 4px 0 0;">Timestamp: ${new Date().toISOString()}</p>
  </div>
</div>
        `.trim()
      });
    } catch (emailErr) {
      console.error('Email send error (non-fatal):', emailErr);
    }

    return res.status(200).json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
}
