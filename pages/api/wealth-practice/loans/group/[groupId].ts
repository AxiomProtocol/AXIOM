/**
 * GET /api/wealth-practice/loans/group/[groupId]
 *
 * Returns all loans for a given Wealth Practice group.
 * Requires SIWE session and active group membership.
 * BSA data is only stored as a hash and is not returned.
 * Bank account details are NOT returned (stored encrypted server-side only).
 *
 * POST ?body.action=default — group admin (creator_wallet only) marks loan defaulted.
 *   Requires SIWE session. Only the group creator may use this action.
 *
 * POST ?body.action=accept-partial — borrower accepts partial funding and
 *   triggers disbursement for the funded amount. Requires SIWE session;
 *   only the borrower may do this.
 *
 * Security:
 *  - SIWE session required for all methods (dev fallback: __dev__)
 *  - Active group membership required for GET
 *  - Only group creator can mark loans defaulted
 *  - Only loan borrower can accept partial funding
 *  - Rate limited: 20 GET requests per IP per minute
 *  - CORS restricted to allowlist origins
 *  - BSA hash and encrypted bank fields NOT returned to callers
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { setRailCors, handlePreflight } from '../../../../../lib/multichain/stellar/axiom-rail/corsUtils';
import { checkRateLimit } from '../../../../../lib/multichain/stellar/axiom-rail/rateLimiter';
import { decryptBankField } from '../../../../../lib/multichain/stellar/axiom-rail/bankEncryption';
import { pool } from '../../../../../server/db';

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k.trim(), v.join('=')];
    }).filter(([k]) => k.length > 0)
  );
}

async function getSiweWallet(req: NextApiRequest): Promise<string | null> {
  if (process.env.NODE_ENV === 'development') return '__dev__';
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies['siwe_session'];
  if (!token) return null;
  try {
    const result = await pool.query(
      `SELECT wallet_address FROM wallet_sessions WHERE session_token = $1 AND expires_at > NOW() LIMIT 1`,
      [token]
    );
    return result.rows[0]?.wallet_address ?? null;
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setRailCors(req, res);
  if (handlePreflight(req, res)) return;

  if (!checkRateLimit(req, res, 'wealth-practice/loans/group', { max: 20, windowMs: 60_000 })) return;

  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) {
    return res.status(401).json({ error: 'Wallet sign-in required' });
  }

  const { groupId } = req.query as { groupId: string };

  if (!groupId) return res.status(400).json({ error: 'groupId is required' });

  if (req.method === 'GET') {
    return handleGet(req, res, groupId, siweWallet);
  }

  if (req.method === 'POST') {
    return handlePost(req, res, groupId, siweWallet);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, groupId: string, siweWallet: string) {
  try {
    if (siweWallet !== '__dev__') {
      const memberCheck = await pool.query(
        `SELECT id FROM susu_group_members WHERE group_id = $1 AND LOWER(member_address) = $2 AND status = 'active'`,
        [Number(groupId), siweWallet.toLowerCase()]
      );
      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: 'You must be an active member of this group to view its loans' });
      }
    }

    const loansResult = await pool.query(
      `SELECT
        id, group_id, borrower_member_id,
        requested_amount_usd, funded_amount_usd,
        purpose, repayment_terms, interest_rate,
        status, stellar_transfer_id,
        created_at, funded_at, closed_at
       FROM wealth_practice_loans
       WHERE group_id = $1
       ORDER BY created_at DESC`,
      [Number(groupId)]
    );

    const loans = loansResult.rows;

    if (loans.length === 0) {
      return res.status(200).json({ success: true, loans: [], total: 0 });
    }

    const loanIds = loans.map((l) => l.id);
    const pledgesResult = await pool.query(
      `SELECT id, loan_id, lender_member_id, pledge_amount_usd, fulfilled_at, created_at
       FROM wealth_practice_loan_pledges
       WHERE loan_id = ANY($1)
       ORDER BY created_at ASC`,
      [loanIds]
    );

    const pledgesByLoan: Record<string, typeof pledgesResult.rows> = {};
    for (const pledge of pledgesResult.rows) {
      if (!pledgesByLoan[pledge.loan_id]) pledgesByLoan[pledge.loan_id] = [];
      pledgesByLoan[pledge.loan_id].push({
        id: pledge.id,
        lenderMemberId: pledge.lender_member_id,
        pledgeAmountUsd: pledge.pledge_amount_usd,
        fulfilledAt: pledge.fulfilled_at,
        createdAt: pledge.created_at,
      });
    }

    const result = loans.map((loan) => ({
      id: loan.id,
      groupId: loan.group_id,
      borrowerMemberId: loan.borrower_member_id,
      requestedAmountUsd: loan.requested_amount_usd,
      fundedAmountUsd: loan.funded_amount_usd,
      purpose: loan.purpose,
      repaymentTerms: loan.repayment_terms,
      interestRate: loan.interest_rate,
      status: loan.status,
      stellarTransferId: loan.stellar_transfer_id,
      createdAt: loan.created_at,
      fundedAt: loan.funded_at,
      closedAt: loan.closed_at,
      pledges: pledgesByLoan[loan.id] || [],
      pledgeCount: (pledgesByLoan[loan.id] || []).length,
    }));

    return res.status(200).json({
      success: true,
      loans: result,
      total: result.length,
    });
  } catch (err) {
    console.error('[WealthPractice Loans] Group GET error:', err);
    return res.status(500).json({ error: 'Failed to fetch group loans' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, groupId: string, siweWallet: string) {
  const { action, loanId } = req.body as { action?: string; loanId?: string };

  if (!loanId) return res.status(400).json({ error: 'loanId is required' });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(loanId)) {
    return res.status(400).json({ error: 'Invalid loanId format' });
  }

  if (action === 'default') {
    return handleDefaultAction(res, groupId, loanId, siweWallet);
  }

  if (action === 'accept-partial') {
    return handleAcceptPartial(res, groupId, loanId, siweWallet);
  }

  return res.status(400).json({ error: 'Unsupported action. Use action=default or action=accept-partial.' });
}

async function handleDefaultAction(
  res: NextApiResponse,
  groupId: string,
  loanId: string,
  siweWallet: string
) {
  try {
    const loanResult = await pool.query(
      `SELECT id, group_id, status FROM wealth_practice_loans WHERE id = $1 AND group_id = $2`,
      [loanId, Number(groupId)]
    );

    if (loanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found in this group' });
    }

    const loan = loanResult.rows[0];
    if (['closed', 'defaulted'].includes(loan.status)) {
      return res.status(400).json({ error: `Loan is already ${loan.status}` });
    }

    if (siweWallet !== '__dev__') {
      const groupResult = await pool.query(
        `SELECT creator_wallet FROM susu_purpose_groups WHERE id = $1`,
        [Number(groupId)]
      );
      const creatorWallet = groupResult.rows[0]?.creator_wallet;
      const isAdmin = creatorWallet && creatorWallet.toLowerCase() === siweWallet.toLowerCase();

      if (!isAdmin) {
        return res.status(403).json({ error: 'Only the group creator (admin) may mark loans as defaulted' });
      }
    }

    await pool.query(
      `UPDATE wealth_practice_loans SET status = 'defaulted', closed_at = NOW() WHERE id = $1`,
      [loanId]
    );

    return res.status(200).json({
      success: true,
      loanId,
      status: 'defaulted',
      message: 'Loan marked as defaulted by group admin.',
    });
  } catch (err) {
    console.error('[WealthPractice Loans] Default action error:', err);
    return res.status(500).json({ error: 'Failed to update loan status' });
  }
}

async function handleAcceptPartial(
  res: NextApiResponse,
  groupId: string,
  loanId: string,
  siweWallet: string
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const loanResult = await client.query(
      `SELECT id, group_id, borrower_member_id, requested_amount_usd, funded_amount_usd,
              status, borrower_routing_number, borrower_account_number, borrower_account_name
       FROM wealth_practice_loans WHERE id = $1 AND group_id = $2 FOR UPDATE`,
      [loanId, Number(groupId)]
    );

    if (loanResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Loan not found in this group' });
    }

    const loan = loanResult.rows[0];

    if (siweWallet !== '__dev__' && loan.borrower_member_id.toLowerCase() !== siweWallet.toLowerCase()) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only the borrower can accept partial funding' });
    }

    if (!['pending', 'open'].includes(loan.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Loan cannot accept partial funding in status: ${loan.status}` });
    }

    const fundedAmount = parseFloat(loan.funded_amount_usd || '0');
    if (fundedAmount < 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No pledges have been made yet — nothing to accept' });
    }

    const transferId = uuidv4();
    const memo = transferId.replace(/-/g, '').slice(0, 28).toUpperCase();

    let decryptedRoutingNumber = '';
    let decryptedAccountNumber = '';
    let decryptedAccountName = '';
    try {
      decryptedRoutingNumber = decryptBankField(loan.borrower_routing_number);
      decryptedAccountNumber = decryptBankField(loan.borrower_account_number);
      decryptedAccountName = decryptBankField(loan.borrower_account_name);
    } catch (e) {
      console.error('[WealthPractice Loans] Bank field decryption failed:', e);
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Failed to prepare disbursement — bank field decryption error' });
    }

    const destinationAccount = `${decryptedAccountName} | Account: ${decryptedAccountNumber} | Routing: ${decryptedRoutingNumber} | ACH`;

    await client.query(
      `INSERT INTO stellar_payment_transfers (
        id, axiom_wallet_address, anchor_id, corridor_id,
        source_amount_axusd, destination_currency, destination_amount,
        destination_account, status, sep_protocol, sep31_stellar_memo,
        anchor_raw_response, initiated_at, updated_at
      ) VALUES ($1,'0x0000000000000000000000000000000000000000','axiom-rail',
        'usd-to-usd-peer-loan-axiom-rail',$2,'USD',$3,$4,
        'pending_user_transfer_start','peer-loan',$5,$6,NOW(),NOW())`,
      [
        transferId,
        fundedAmount.toFixed(2),
        fundedAmount.toFixed(2),
        destinationAccount,
        memo,
        JSON.stringify({
          loanId,
          groupId: loan.group_id,
          borrowerMemberId: loan.borrower_member_id,
          partialAcceptance: true,
          acceptedAt: new Date().toISOString(),
        }),
      ]
    );

    await client.query(
      `UPDATE wealth_practice_loans
       SET status = 'funded', funded_at = NOW(), stellar_transfer_id = $1
       WHERE id = $2`,
      [transferId, loanId]
    );

    await client.query(
      `UPDATE wealth_practice_loan_pledges SET fulfilled_at = NOW() WHERE loan_id = $1`,
      [loanId]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      loanId,
      transferId,
      fundedAmountUsd: fundedAmount.toFixed(2),
      status: 'funded',
      message: `Partial funding of $${fundedAmount.toFixed(2)} accepted. Disbursement initiated via Axiom Rail (ACH).`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[WealthPractice Loans] Accept-partial error:', err);
    return res.status(500).json({ error: 'Failed to accept partial funding' });
  } finally {
    client.release();
  }
}
