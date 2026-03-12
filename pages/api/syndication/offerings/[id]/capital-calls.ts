import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';
import { ethers } from 'ethers';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    return handleGet(req, res, id as string);
  } else if (req.method === 'POST') {
    return handlePost(req, res, id as string);
  } else if (req.method === 'PATCH') {
    return handlePatch(req, res, id as string);
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, offeringId: string) {
  try {
    const result = await pool.query(
      `SELECT cc.*, 
              s.amount AS subscription_amount, s.status AS subscription_status, s.payment_currency,
              ip.legal_name, ip.email AS investor_email, ip.entity_name
       FROM syn_capital_calls cc
       JOIN syn_subscriptions s ON s.id = cc.subscription_id
       LEFT JOIN syn_investor_profiles ip ON ip.id = s.investor_profile_id
       WHERE cc.offering_id = $1
       ORDER BY cc.created_at DESC`,
      [offeringId]
    );

    return res.status(200).json({ success: true, capitalCalls: result.rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, offeringId: string) {
  const wallet = await getAuthenticatedWallet(req);
  if (!wallet) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  const { subscriptionId, amountCalled, dueDate, currency, triggerACH } = req.body;

  if (!subscriptionId || !amountCalled) {
    return res.status(400).json({ success: false, error: 'subscriptionId and amountCalled are required.' });
  }

  try {
    const offeringResult = await pool.query(
      `SELECT o.id, o.name, o.slug, o.created_by FROM syn_offerings o WHERE o.id = $1`,
      [offeringId]
    );
    if (offeringResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Offering not found' });
    }
    const offering = offeringResult.rows[0];

    const isOperator = offering.created_by && offering.created_by.toLowerCase() === wallet.toLowerCase();
    if (!isOperator) {
      return res.status(403).json({ success: false, error: 'Only the offering operator can issue capital calls.' });
    }

    const subResult = await pool.query(
      `SELECT s.id, s.status, s.amount, s.payment_currency, s.investor_wallet, s.investor_profile_id,
              ip.legal_name, ip.email, ip.entity_name, ip.wallet_address AS profile_wallet, ip.meta AS investor_meta
       FROM syn_subscriptions s
       LEFT JOIN syn_investor_profiles ip ON ip.id = s.investor_profile_id
       WHERE s.id = $1 AND s.offering_id = $2`,
      [subscriptionId, offeringId]
    );

    if (subResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Subscription not found for this offering.' });
    }

    const sub = subResult.rows[0];
    if (sub.status !== 'approved') {
      return res.status(400).json({ success: false, error: `Subscription must be in "approved" status to issue a capital call. Current status: "${sub.status}".` });
    }

    const callCurrency = currency || sub.payment_currency || 'USD';
    const callAmount = parseFloat(amountCalled);
    if (isNaN(callAmount) || callAmount <= 0) {
      return res.status(400).json({ success: false, error: 'amountCalled must be a positive number.' });
    }

    const slugPart = (offering.slug || 'OFFER').substring(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const subPart = String(subscriptionId).substring(0, 8).toUpperCase();
    const memoCode = `AXIOM-${slugPart}-${subPart}`;

    let treasuryWallet: string | null = process.env.TREASURY_WALLET_ADDRESS || null;
    if (!treasuryWallet) {
      try {
        if (process.env.DEPLOYER_PRIVATE_KEY) {
          const w = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY);
          treasuryWallet = w.address;
        }
      } catch {}
    }

    const routingNumber = process.env.UNIT_ROUTING_NUMBER || null;
    const accountNumber = process.env.UNIT_ACCOUNT_NUMBER || null;

    let achTriggered = false;
    let unitPaymentId: string | null = null;

    if (callCurrency === 'USD' && triggerACH === true) {
      const unitCustomerId = sub.investor_meta?.unitCustomerId;
      if (unitCustomerId) {
        try {
          const { UnitPaymentService } = await import('../../../../../lib/services/UnitPaymentService');
          const paymentService = new UnitPaymentService();
          const achResult = await paymentService.createAchDebit({
            walletAddress: wallet,
            toAccountId: process.env.UNIT_TREASURY_ACCOUNT_ID || '',
            counterpartyId: unitCustomerId,
            amountCents: Math.round(callAmount * 100),
            description: `Capital Call — ${offering.name} — ${memoCode}`,
            purpose: 'capital_call',
          });
          if (achResult.success && achResult.unitPaymentId) {
            achTriggered = true;
            unitPaymentId = achResult.unitPaymentId;
          }
        } catch (err) {
          console.error('[CapitalCall] ACH trigger failed:', err);
        }
      }
    }

    const callResult = await pool.query(
      `INSERT INTO syn_capital_calls (
        subscription_id, offering_id, amount_called, currency, due_date, status,
        unit_payment_id, sent_at, meta, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'sent', $6, now(), $7, now(), now())
      RETURNING id`,
      [
        subscriptionId,
        offeringId,
        callAmount.toFixed(2),
        callCurrency,
        dueDate || null,
        unitPaymentId,
        JSON.stringify({
          issuedBy: wallet,
          memoCode,
          achTriggered,
          investorName: sub.legal_name || sub.entity_name,
          investorEmail: sub.email,
        }),
      ]
    );

    const callId = callResult.rows[0].id;

    let emailSent = false;
    if (sub.email) {
      try {
        const { getResendClient } = await import('../../../../../lib/email/resend');
        const { client, fromEmail } = await getResendClient();

        const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Upon receipt';
        const investorName = sub.legal_name || sub.entity_name || 'Investor';
        const platformUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${process.env.REPLIT_DEV_DOMAIN || 'axiomprotocol.app'}`;

        let instructionsHtml = '';
        let instructionsText = '';

        if (callCurrency === 'AXUSD') {
          instructionsHtml = `
            <div style="background:#f0f4ff;padding:20px;margin:16px 0;font-family:monospace;">
              <p style="margin:0 0 8px;font-weight:bold;">AXUSD Payment Instructions</p>
              <p style="margin:0 0 4px;">Send <strong>${callAmount.toLocaleString()} AXUSD</strong> to:</p>
              <p style="margin:0 0 4px;word-break:break-all;">${treasuryWallet || 'Contact operations'}</p>
              <p style="margin:0 0 4px;">Network: Arbitrum One</p>
              <p style="margin:0 0 4px;">Memo: <strong>${memoCode}</strong></p>
              <p style="margin:0;font-size:12px;color:#666;">AXUSD Contract: 0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C</p>
            </div>`;
          instructionsText = `\nAXUSD Payment Instructions\nSend ${callAmount.toLocaleString()} AXUSD to ${treasuryWallet || 'Contact operations'} on Arbitrum One.\nMemo: ${memoCode}\nContract: 0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C`;
        } else {
          instructionsHtml = `
            <div style="background:#f0f4ff;padding:20px;margin:16px 0;font-family:monospace;">
              <p style="margin:0 0 8px;font-weight:bold;">Wire/ACH Instructions</p>
              <p style="margin:0 0 4px;">Bank: Axiom Protocol Treasury (Unit Finance / Evolve Bank & Trust)</p>
              <p style="margin:0 0 4px;">Beneficiary: Axiom Protocol LLC</p>
              ${routingNumber ? `<p style="margin:0 0 4px;">Routing: ${routingNumber}</p>` : ''}
              ${accountNumber ? `<p style="margin:0 0 4px;">Account: ${accountNumber}</p>` : ''}
              <p style="margin:0 0 4px;">Amount: $${callAmount.toLocaleString()}</p>
              <p style="margin:0;font-weight:bold;">Memo: ${memoCode}</p>
              ${!routingNumber ? '<p style="margin:8px 0 0;font-size:12px;color:#666;">Wire details not yet configured. Contact operations for payment instructions.</p>' : ''}
            </div>`;
          instructionsText = `\nWire/ACH Instructions\nBank: Axiom Protocol Treasury\nBeneficiary: Axiom Protocol LLC\n${routingNumber ? `Routing: ${routingNumber}\n` : ''}${accountNumber ? `Account: ${accountNumber}\n` : ''}Amount: $${callAmount.toLocaleString()}\nMemo: ${memoCode}`;
        }

        const subject = `Capital Call — ${offering.name} — $${callAmount.toLocaleString()} due ${dueDateStr}`;

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;">
<tr><td style="background:#1a2744;padding:30px;text-align:center;">
  <h1 style="color:#ffffff;margin:0;font-size:22px;">Capital Call Notice</h1>
  <p style="color:#94a3b8;margin:8px 0 0;font-size:14px;">${offering.name}</p>
</td></tr>
<tr><td style="padding:30px;">
  <p style="color:#1f2937;font-size:16px;line-height:1.6;">Dear ${investorName},</p>
  <p style="color:#4b5563;font-size:15px;line-height:1.6;">
    A capital call has been issued for your subscription in <strong>${offering.name}</strong>.
  </p>
  <table width="100%" style="margin:16px 0;border-collapse:collapse;">
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">Amount Called</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold;font-size:15px;">$${callAmount.toLocaleString()} ${callCurrency}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">Due Date</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:15px;">${dueDateStr}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">Reference</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:14px;">${memoCode}</td></tr>
  </table>
  ${instructionsHtml}
  ${achTriggered ? '<p style="color:#059669;font-size:14px;">An ACH debit has been initiated automatically from your linked bank account.</p>' : ''}
  <p style="margin:24px 0 0;text-align:center;">
    <a href="${platformUrl}/syndication/offerings/${offeringId}" style="display:inline-block;background:#1a2744;color:#ffffff;text-decoration:none;padding:12px 32px;font-size:14px;">
      View Offering
    </a>
  </p>
</td></tr>
<tr><td style="background:#f9fafb;padding:20px;text-align:center;">
  <p style="color:#9ca3af;font-size:12px;margin:0;">Axiom Protocol | Capital Formation</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

        const text = `Capital Call Notice — ${offering.name}\n\nDear ${investorName},\n\nA capital call has been issued for your subscription.\n\nAmount: $${callAmount.toLocaleString()} ${callCurrency}\nDue: ${dueDateStr}\nReference: ${memoCode}\n${instructionsText}\n${achTriggered ? '\nAn ACH debit has been initiated from your linked bank account.\n' : ''}\nView: ${platformUrl}/syndication/offerings/${offeringId}`;

        await client.emails.send({
          from: fromEmail,
          to: [sub.email],
          subject,
          html,
          text,
        });

        emailSent = true;
      } catch (emailErr) {
        console.error('[CapitalCall] Email send failed:', emailErr);
      }
    }

    return res.status(200).json({
      success: true,
      callId,
      emailSent,
      achTriggered,
      investorEmail: sub.email || null,
    });
  } catch (error: any) {
    console.error('[CapitalCall] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function handlePatch(req: NextApiRequest, res: NextApiResponse, offeringId: string) {
  const wallet = await getAuthenticatedWallet(req);
  if (!wallet) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  const { callId, status } = req.body;

  if (!callId || !status) {
    return res.status(400).json({ success: false, error: 'callId and status are required.' });
  }

  const validStatuses = ['acknowledged', 'funded', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const existing = await pool.query(
      `SELECT cc.id, cc.status, o.created_by
       FROM syn_capital_calls cc
       JOIN syn_offerings o ON o.id = cc.offering_id
       WHERE cc.id = $1 AND cc.offering_id = $2`,
      [callId, offeringId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Capital call not found.' });
    }

    const call = existing.rows[0];
    const isOperator = call.created_by && call.created_by.toLowerCase() === wallet.toLowerCase();
    if (!isOperator) {
      return res.status(403).json({ success: false, error: 'Only the offering operator can update capital call status.' });
    }

    const statusOrder: Record<string, number> = { sent: 0, acknowledged: 1, funded: 2, cancelled: 3 };
    const currentOrder = statusOrder[call.status] ?? 0;
    const newOrder = statusOrder[status] ?? 0;

    if (status !== 'cancelled' && newOrder <= currentOrder) {
      return res.status(400).json({ success: false, error: `Cannot transition from "${call.status}" to "${status}". Status must move forward.` });
    }

    await pool.query(
      `UPDATE syn_capital_calls SET status = $1, updated_at = now() WHERE id = $2 AND offering_id = $3`,
      [status, callId, offeringId]
    );

    return res.status(200).json({ success: true, message: `Capital call status updated to "${status}".` });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
