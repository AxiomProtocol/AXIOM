/**
 * POST /api/wealth-practice/loans/[id]/repay
 *
 * Records a repayment for a funded loan. Requires SIWE session.
 * Only the borrower may submit a repayment. Repayment amount is
 * allocated proportionally to lenders. When total repaid meets
 * or exceeds funded amount + interest, loan is automatically closed.
 *
 * Security:
 *  - SIWE session required (dev fallback: body-supplied borrowerMemberId)
 *  - Only loan borrower may repay
 *  - Rate limited: 10 requests per IP per minute
 *  - CORS restricted to allowlist origins
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { setRailCors, handlePreflight } from '../../../../../lib/multichain/stellar/axiom-rail/corsUtils';
import { checkRateLimit } from '../../../../../lib/multichain/stellar/axiom-rail/rateLimiter';
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

  if (!checkRateLimit(req, res, 'wealth-practice/loans/repay', { max: 10, windowMs: 60_000 })) return;

  const siweWallet = await getSiweWallet(req);
  if (!siweWallet) {
    return res.status(401).json({ error: 'Wallet sign-in required to repay' });
  }

  const { id: loanId } = req.query as { id: string };

  const {
    borrowerMemberId: bodyBorrowerId,
    repaymentAmountUsd,
    routingNumber,
    accountNumber,
    accountName,
  } = req.body as {
    borrowerMemberId?: string;
    repaymentAmountUsd?: string | number;
    routingNumber?: string;
    accountNumber?: string;
    accountName?: string;
  };

  if (!loanId) return res.status(400).json({ error: 'loanId is required' });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(loanId)) {
    return res.status(400).json({ error: 'Invalid loanId format' });
  }

  const callerMemberId = siweWallet === '__dev__' ? bodyBorrowerId?.trim() : siweWallet;
  if (!callerMemberId) {
    return res.status(400).json({ error: 'Repayer identity could not be determined from your session' });
  }

  if (siweWallet !== '__dev__' && bodyBorrowerId && bodyBorrowerId.trim().toLowerCase() !== siweWallet.toLowerCase()) {
    return res.status(403).json({ error: 'You may only repay as your own connected wallet' });
  }

  const parsedAmount = parseFloat(String(repaymentAmountUsd ?? '0'));
  if (isNaN(parsedAmount) || parsedAmount < 1) {
    return res.status(400).json({ error: 'repaymentAmountUsd must be at least $1' });
  }

  if (routingNumber && !/^\d{9}$/.test(routingNumber)) {
    return res.status(400).json({ error: 'routingNumber must be exactly 9 digits' });
  }

  try {
    const loanResult = await pool.query(
      `SELECT id, group_id, borrower_member_id, requested_amount_usd, funded_amount_usd,
              interest_rate, status
       FROM wealth_practice_loans WHERE id = $1`,
      [loanId]
    );

    if (loanResult.rows.length === 0) return res.status(404).json({ error: 'Loan not found' });

    const loan = loanResult.rows[0];

    if (!['funded', 'repaying'].includes(loan.status)) {
      return res.status(400).json({
        error: `Loan cannot be repaid in its current status (${loan.status}). Must be funded or repaying.`,
      });
    }

    if (loan.borrower_member_id.toLowerCase() !== callerMemberId.toLowerCase()) {
      return res.status(403).json({ error: 'Only the borrower may submit a repayment for this loan' });
    }

    const pledgesResult = await pool.query(
      `SELECT lender_member_id, pledge_amount_usd FROM wealth_practice_loan_pledges WHERE loan_id = $1`,
      [loanId]
    );

    const totalFunded = parseFloat(loan.funded_amount_usd || '0');
    const interestRate = parseFloat(loan.interest_rate || '0') / 100;
    const totalOwed = totalFunded * (1 + interestRate);

    const repayExistingResult = await pool.query(
      `SELECT COALESCE(SUM(CAST(source_amount_axusd AS NUMERIC)), 0) as total_repaid
       FROM stellar_payment_transfers
       WHERE anchor_raw_response->>'loanId' = $1 AND corridor_id = 'usd-to-usd-peer-loan-repayment-axiom-rail'`,
      [loanId]
    );
    const alreadyRepaid = parseFloat(repayExistingResult.rows[0]?.total_repaid || '0');
    const remaining = Math.max(0, totalOwed - alreadyRepaid);

    const actualRepayment = Math.min(parsedAmount, remaining);
    const transferId = uuidv4();
    const memo = transferId.replace(/-/g, '').slice(0, 28).toUpperCase();

    const lenderAllocations = pledgesResult.rows.map((pledge) => {
      const pledgeAmt = parseFloat(pledge.pledge_amount_usd);
      const share = totalFunded > 0 ? pledgeAmt / totalFunded : 0;
      const allocated = actualRepayment * share;
      return {
        lenderMemberId: pledge.lender_member_id,
        pledgeAmountUsd: pledgeAmt.toFixed(2),
        allocationUsd: allocated.toFixed(2),
      };
    });

    const destinationAccount = accountName && routingNumber && accountNumber
      ? `${accountName.trim()} | Account: ${accountNumber.trim()} | Routing: ${routingNumber} | ACH`
      : `Lender pool allocation — Loan ${loanId}`;

    await pool.query(
      `INSERT INTO stellar_payment_transfers (
        id, axiom_wallet_address, anchor_id, corridor_id,
        source_amount_axusd, destination_currency, destination_amount,
        destination_account, status, sep_protocol, sep31_stellar_memo,
        anchor_raw_response, initiated_at, updated_at
      ) VALUES ($1,'0x0000000000000000000000000000000000000000','axiom-rail',
        'usd-to-usd-peer-loan-repayment-axiom-rail',$2,'USD',$3,$4,
        'pending_user_transfer_start','peer-repay',$5,$6,NOW(),NOW())`,
      [
        transferId,
        actualRepayment.toFixed(2),
        actualRepayment.toFixed(2),
        destinationAccount,
        memo,
        JSON.stringify({
          loanId,
          groupId: loan.group_id,
          borrowerMemberId: loan.borrower_member_id,
          lenderAllocations,
          repaidAt: new Date().toISOString(),
        }),
      ]
    );

    const newTotalRepaid = alreadyRepaid + actualRepayment;
    const isFullyRepaid = newTotalRepaid >= totalOwed - 0.01;

    if (isFullyRepaid) {
      await pool.query(
        `UPDATE wealth_practice_loans SET status = 'closed', closed_at = NOW() WHERE id = $1`,
        [loanId]
      );
    } else if (loan.status === 'funded') {
      await pool.query(
        `UPDATE wealth_practice_loans SET status = 'repaying' WHERE id = $1`,
        [loanId]
      );
    }

    return res.status(201).json({
      success: true,
      transferId,
      memo,
      loanId,
      repaymentAmountUsd: actualRepayment.toFixed(2),
      totalRepaidUsd: newTotalRepaid.toFixed(2),
      totalOwedUsd: totalOwed.toFixed(2),
      remainingUsd: Math.max(0, totalOwed - newTotalRepaid).toFixed(2),
      loanClosed: isFullyRepaid,
      lenderAllocations,
      message: isFullyRepaid
        ? 'Loan fully repaid and closed. Lender distributions allocated proportionally.'
        : `Repayment recorded. $${Math.max(0, totalOwed - newTotalRepaid).toFixed(2)} remaining.`,
    });
  } catch (err) {
    console.error('[WealthPractice Loans] Repay error:', err);
    return res.status(500).json({ error: 'Failed to record repayment' });
  }
}
