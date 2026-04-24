/**
 * POST /api/wealth-practice/loans/[id]/pledge
 *
 * A group member pledges an amount toward a loan request.
 * Requires SIWE session — lender identity derived from session.
 * Validates group membership before allowing pledge.
 *
 * Auto-activates loans from 'pending' to 'open' on first pledge.
 * When total pledges reach the requested amount, loan moves to 'funded'
 * and a stellar_payment_transfers record is created for disbursement.
 *
 * Security:
 *  - SIWE session required (dev fallback: body-supplied lenderMemberId)
 *  - Group membership validated
 *  - Rate limited: 10 requests per IP per minute
 *  - CORS restricted to allowlist origins
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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!checkRateLimit(req, res, 'wealth-practice/loans/pledge', { max: 10, windowMs: 60_000 })) return;

  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) {
    return res.status(401).json({ error: 'Wallet sign-in required to pledge' });
  }

  const { id: loanId } = req.query as { id: string };

  const {
    lenderMemberId: bodyLenderId,
    pledgeAmountUsd,
  } = req.body as {
    lenderMemberId?: string;
    pledgeAmountUsd?: string | number;
  };

  if (!loanId) return res.status(400).json({ error: 'loanId is required' });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(loanId)) {
    return res.status(400).json({ error: 'Invalid loanId format' });
  }

  const lenderMemberId = siweWallet === '__dev__' ? bodyLenderId?.trim() : siweWallet;
  if (!lenderMemberId) {
    return res.status(400).json({ error: 'Lender identity could not be determined from your session' });
  }

  if (siweWallet !== '__dev__' && bodyLenderId && bodyLenderId.trim().toLowerCase() !== siweWallet.toLowerCase()) {
    return res.status(403).json({ error: 'You may only pledge as your own connected wallet' });
  }

  const parsedPledge = parseFloat(String(pledgeAmountUsd ?? '0'));
  if (isNaN(parsedPledge) || parsedPledge < 1) {
    return res.status(400).json({ error: 'pledgeAmountUsd must be at least $1' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const loanResult = await client.query(
      `SELECT id, group_id, borrower_member_id, requested_amount_usd, funded_amount_usd,
              status, borrower_routing_number, borrower_account_number, borrower_account_name
       FROM wealth_practice_loans WHERE id = $1 FOR UPDATE`,
      [loanId]
    );

    if (loanResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loanResult.rows[0];

    if (!['pending', 'open'].includes(loan.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Loan cannot accept pledges in status: ${loan.status}` });
    }

    if (siweWallet !== '__dev__') {
      const memberCheck = await client.query(
        `SELECT id FROM susu_group_members WHERE group_id = $1 AND LOWER(member_address) = $2 AND status = 'active'`,
        [loan.group_id, lenderMemberId.toLowerCase()]
      );
      if (memberCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'You must be an active member of this group to pledge' });
      }
    }

    if (lenderMemberId.toLowerCase() === loan.borrower_member_id.toLowerCase()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Borrower cannot pledge to their own loan' });
    }

    const requestedAmount = parseFloat(loan.requested_amount_usd);
    const alreadyFunded = parseFloat(loan.funded_amount_usd || '0');
    const remaining = requestedAmount - alreadyFunded;

    if (remaining <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Loan is already fully funded' });
    }

    const actualPledge = Math.min(parsedPledge, remaining);
    const newFundedAmount = alreadyFunded + actualPledge;
    const pledgeId = uuidv4();

    await client.query(
      `INSERT INTO wealth_practice_loan_pledges (id, loan_id, lender_member_id, pledge_amount_usd, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [pledgeId, loanId, lenderMemberId, actualPledge.toFixed(2)]
    );

    const nowFullyFunded = newFundedAmount >= requestedAmount;
    let transferId: string | null = null;

    if (nowFullyFunded) {
      transferId = uuidv4();
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
          requestedAmount.toFixed(2),
          requestedAmount.toFixed(2),
          destinationAccount,
          memo,
          JSON.stringify({
            loanId,
            groupId: loan.group_id,
            borrowerMemberId: loan.borrower_member_id,
            disbursedAt: new Date().toISOString(),
          }),
        ]
      );

      await client.query(
        `UPDATE wealth_practice_loans
         SET status = 'funded', funded_amount_usd = $1, funded_at = NOW(), stellar_transfer_id = $2
         WHERE id = $3`,
        [newFundedAmount.toFixed(2), transferId, loanId]
      );

      await client.query(
        `UPDATE wealth_practice_loan_pledges SET fulfilled_at = NOW() WHERE loan_id = $1`,
        [loanId]
      );
    } else {
      const newStatus = loan.status === 'pending' ? 'open' : loan.status;
      await client.query(
        `UPDATE wealth_practice_loans SET funded_amount_usd = $1, status = $2 WHERE id = $3`,
        [newFundedAmount.toFixed(2), newStatus, loanId]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      pledgeId,
      loanId,
      lenderMemberId,
      pledgeAmountUsd: actualPledge.toFixed(2),
      fundedAmountUsd: newFundedAmount.toFixed(2),
      requestedAmountUsd: requestedAmount.toFixed(2),
      fullyFunded: nowFullyFunded,
      transferId: transferId ?? undefined,
      message: nowFullyFunded
        ? `Loan fully funded! Disbursement initiated via Axiom Rail (ACH).`
        : `Pledge recorded. $${(requestedAmount - newFundedAmount).toFixed(2)} still needed.`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[WealthPractice Loans] Pledge error:', err);
    return res.status(500).json({ error: 'Failed to record pledge' });
  } finally {
    client.release();
  }
}
