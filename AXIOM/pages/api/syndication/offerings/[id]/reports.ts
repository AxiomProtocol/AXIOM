import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

const OPERATOR_WALLETS = [
  '0xb0cefc7e3f1c7de3b98e8c39384e9e084c9eb75c',
];

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';')
      .map(cookie => {
        const [key, ...val] = cookie.trim().split('=');
        const sanitizedKey = key.replace(/[^\w\-_.]/g, '');
        const sanitizedVal = val.join('=').replace(/[^\w\-_.=]/g, '');
        return [sanitizedKey, sanitizedVal];
      })
      .filter(([key]) => key.length > 0)
  );
}

async function getAuthenticatedWallet(req: NextApiRequest): Promise<string | null> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies['siwe_session'];
  if (!sessionToken) return null;
  try {
    const result = await pool.query(
      `SELECT wallet_address FROM wallet_sessions WHERE session_token = $1 AND expires_at > NOW()`,
      [sessionToken]
    );
    return result.rows.length > 0 ? result.rows[0].wallet_address : null;
  } catch {
    return null;
  }
}

function isOperator(wallet: string): boolean {
  return OPERATOR_WALLETS.includes(wallet.toLowerCase());
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  quarterly: 'Quarterly Update',
  annual: 'Annual Report',
  tax: 'Tax Document (K-1)',
  operational: 'Operational Update',
  distribution: 'Distribution Notice',
  capital_call: 'Capital Call Notice',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  const wallet = await getAuthenticatedWallet(req);
  if (!wallet) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  if (!isOperator(wallet)) {
    return res.status(403).json({ success: false, error: 'Operator access required.' });
  }

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT * FROM syn_reports WHERE offering_id = $1 ORDER BY created_at DESC`,
        [id]
      );
      return res.status(200).json({ success: true, reports: result.rows });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { title, reportType, content, notifyInvestors } = req.body;
      if (!title || !reportType) {
        return res.status(400).json({ success: false, error: 'title and reportType are required' });
      }

      const result = await pool.query(
        `INSERT INTO syn_reports (offering_id, title, report_type, content, published_at, published_by)
         VALUES ($1, $2, $3, $4, now(), $5) RETURNING id`,
        [id, title, reportType, content || null, wallet.toLowerCase()]
      );

      let notifiedCount = 0;

      if (notifyInvestors) {
        try {
          const offeringRes = await pool.query(
            `SELECT name FROM syn_offerings WHERE id = $1`,
            [id]
          );
          const offeringName = offeringRes.rows[0]?.name || 'Offering';

          const investorsRes = await pool.query(
            `SELECT DISTINCT ip.email, ip.legal_name, ip.entity_name
             FROM syn_investor_profiles ip
             JOIN syn_cap_table ct ON ct.investor_profile_id = ip.id
             WHERE ct.offering_id = $1 AND ip.email IS NOT NULL AND ip.email != ''`,
            [id]
          );

          if (investorsRes.rows.length > 0) {
            const { getResendClient } = await import('../../../../../lib/email/resend');
            const { client, fromEmail } = await getResendClient();

            const typeLabel = REPORT_TYPE_LABELS[reportType] || reportType;
            const subject = `[Axiom Protocol] ${typeLabel} — ${offeringName}`;
            const platformUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${process.env.REPLIT_DEV_DOMAIN || 'axiomprotocol.app'}`;
            const offeringUrl = `${platformUrl}/syndication/offerings/${id}`;
            const publishDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            const contentPreview = content ? (content.length > 500 ? content.substring(0, 500) + '...' : content) : '';

            for (const investor of investorsRes.rows) {
              try {
                const investorName = investor.legal_name || investor.entity_name || 'Investor';

                const text = `${typeLabel} — ${offeringName}\n\nDear ${investorName},\n\nA new report has been published for ${offeringName}.\n\nTitle: ${title}\nType: ${typeLabel}\nDate: ${publishDate}\n${contentPreview ? `\n${contentPreview}\n` : ''}\nView the full report: ${offeringUrl}\n\nAxiom Protocol | Capital Formation`;

                await client.emails.send({
                  from: fromEmail,
                  to: [investor.email],
                  subject,
                  text,
                });

                notifiedCount++;
              } catch (emailErr) {
                console.error(`[Reports] Failed to email ${investor.email}:`, emailErr);
              }
            }
          }
        } catch (resendErr) {
          console.error('[Reports] Email delivery skipped (Resend not configured):', resendErr);
          return res.status(201).json({ success: true, reportId: result.rows[0].id, notifiedCount: 0, emailSkipped: true });
        }
      }

      return res.status(201).json({ success: true, reportId: result.rows[0].id, notifiedCount });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
