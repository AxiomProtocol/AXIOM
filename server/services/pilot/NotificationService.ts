import { Pool } from 'pg';
import { Resend } from 'resend';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.PILOT_FROM_EMAIL || 'pilot@axiomprotocol.com';

interface NotificationPayload {
  investorId?: string;
  type: string;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  static async sendNotification(payload: NotificationPayload): Promise<{ success: boolean; id?: string; error?: string }> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO pilot_notifications (investor_id, notification_type, subject, body, metadata)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [payload.investorId || null, payload.type, payload.subject, payload.body, payload.metadata ? JSON.stringify(payload.metadata) : null]
      );
      const notificationId = result.rows[0].id;

      if (payload.investorId) {
        const investor = await client.query('SELECT email, name FROM pilot_investors WHERE id = $1', [payload.investorId]);
        if (investor.rows.length > 0 && investor.rows[0].email) {
          try {
            await resend.emails.send({
              from: FROM_EMAIL,
              to: investor.rows[0].email,
              subject: payload.subject,
              html: buildEmailHtml(investor.rows[0].name, payload.subject, payload.body),
            });
            await client.query(
              'UPDATE pilot_notifications SET email_sent = true, email_sent_at = now() WHERE id = $1',
              [notificationId]
            );
          } catch (emailErr) {
            console.error('Email send failed:', emailErr);
          }
        }
      }

      return { success: true, id: notificationId };
    } finally {
      client.release();
    }
  }

  static async sendBulkNotification(type: string, subject: string, body: string, metadata?: Record<string, unknown>): Promise<{ success: boolean; sent: number }> {
    const client = await pool.connect();
    try {
      const investors = await client.query(
        "SELECT id, email, name FROM pilot_investors WHERE status IN ('committed', 'funded', 'active')"
      );
      let sent = 0;
      for (const investor of investors.rows) {
        await this.sendNotification({
          investorId: investor.id,
          type, subject, body, metadata
        });
        sent++;
      }
      return { success: true, sent };
    } finally {
      client.release();
    }
  }

  static async notifyReportPublished(reportType: string, period: string): Promise<void> {
    await this.sendBulkNotification(
      'report_published',
      `New Report Published: ${formatReportType(reportType)}`,
      `A new ${formatReportType(reportType)} report for ${period} is now available in your dashboard. Log in to view the full report.`,
      { reportType, period }
    );
  }

  static async notifyDistributionProcessed(amount: string, period: string): Promise<void> {
    await this.sendBulkNotification(
      'distribution_processed',
      `Distribution Processed: $${Number(amount).toLocaleString()}`,
      `A distribution of $${Number(amount).toLocaleString()} for ${period} has been processed. Your individual distribution amount is available in your dashboard.`,
      { totalAmount: amount, period }
    );
  }

  static async notifyCapitalCall(callNumber: number, amount: string, dueDate: string, purpose: string): Promise<void> {
    await this.sendBulkNotification(
      'capital_call_issued',
      `Capital Call #${callNumber}: $${Number(amount).toLocaleString()}`,
      `Capital Call #${callNumber} has been issued for $${Number(amount).toLocaleString()}. Purpose: ${purpose}. Due date: ${new Date(dueDate).toLocaleDateString()}. Please fund your pro-rata share by the due date.`,
      { callNumber, amount, dueDate, purpose }
    );
  }

  static async notifyValuationUpdate(spvName: string, newValuation: string): Promise<void> {
    await this.sendBulkNotification(
      'valuation_updated',
      `Asset Valuation Updated: ${spvName}`,
      `The valuation for ${spvName} has been updated to $${Number(newValuation).toLocaleString()}. View the full details in your dashboard.`,
      { spvName, newValuation }
    );
  }

  static async getInvestorNotifications(investorId: string, limit = 20): Promise<unknown[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM pilot_notifications WHERE investor_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [investorId, limit]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async markRead(notificationId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('UPDATE pilot_notifications SET read_at = now() WHERE id = $1', [notificationId]);
    } finally {
      client.release();
    }
  }
}

function formatReportType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function buildEmailHtml(name: string, subject: string, body: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <div style="border-bottom: 3px solid #0d9488; padding-bottom: 16px; margin-bottom: 24px;">
        <h1 style="font-size: 20px; font-weight: 700; color: #0d9488; margin: 0;">AXIOM</h1>
        <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0;">Axiom Capital Program</p>
      </div>
      <p style="font-size: 15px; color: #374151;">Dear ${name},</p>
      <h2 style="font-size: 18px; color: #111827; margin: 24px 0 12px;">${subject}</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #374151;">${body}</p>
      <div style="margin-top: 32px; padding: 16px; background: #f0fdfa; border-radius: 8px; border: 1px solid #99f6e4;">
        <p style="font-size: 14px; color: #0d9488; margin: 0;">
          <a href="https://axiomprotocol.com/pilot" style="color: #0d9488; font-weight: 600;">View Your Dashboard</a>
        </p>
      </div>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #9ca3af;">This is an automated notification from the Axiom Capital Program. Do not reply to this email.</p>
      </div>
    </body>
    </html>
  `;
}
