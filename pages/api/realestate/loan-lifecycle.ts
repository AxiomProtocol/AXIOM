import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { verifyCreditAuth, isAdminRequest } from '../../../lib/community-credit-auth';

const GEF_OPERATOR_TIERS = new Set(['Operator', 'Steward', 'Architect']);

const LOAN_RATE_BPS = 1400;
const ORIGINATION_FEE_BPS = 300;

interface LoanRow {
  loan_id: string;
  wallet_address: string;
  application_id: number | null;
  borrower_name: string;
  property_address: string;
  loan_amount_usd: string;
  origination_fee_usd: string;
  outstanding_principal_usd: string;
  accrued_interest_usd: string;
  total_repaid_usd: string;
  interest_rate_bps: number;
  loan_term_months: number;
  status: string;
  gef_tier_at_origination: string;
  funded_at: string | null;
  due_date: string | null;
  created_at: string;
  last_payment_at: string | null;
}

async function ensureTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS real_estate_loans (
      loan_id             VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      wallet_address      VARCHAR(42)  NOT NULL,
      application_id      INTEGER,
      borrower_name       VARCHAR(200) NOT NULL,
      property_address    VARCHAR(500) NOT NULL,
      loan_amount_usd     NUMERIC(18,2) NOT NULL,
      origination_fee_usd NUMERIC(18,2) NOT NULL DEFAULT 0,
      outstanding_principal_usd NUMERIC(18,2) NOT NULL,
      accrued_interest_usd      NUMERIC(18,6) NOT NULL DEFAULT 0,
      total_repaid_usd    NUMERIC(18,2) NOT NULL DEFAULT 0,
      interest_rate_bps   INTEGER NOT NULL DEFAULT 1400,
      loan_term_months    INTEGER NOT NULL DEFAULT 12,
      status              VARCHAR(30) NOT NULL DEFAULT 'pending_review',
      gef_tier_at_origination VARCHAR(30) NOT NULL DEFAULT 'Operator',
      funded_at           TIMESTAMP WITH TIME ZONE,
      due_date            TIMESTAMP WITH TIME ZONE,
      last_payment_at     TIMESTAMP WITH TIME ZONE,
      created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS real_estate_loan_payments (
      payment_id     VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      loan_id        VARCHAR(36) NOT NULL REFERENCES real_estate_loans(loan_id) ON DELETE CASCADE,
      wallet_address VARCHAR(42) NOT NULL,
      payment_usd    NUMERIC(18,2) NOT NULL,
      interest_portion_usd  NUMERIC(18,6) NOT NULL DEFAULT 0,
      principal_portion_usd NUMERIC(18,2) NOT NULL DEFAULT 0,
      remaining_principal_usd NUMERIC(18,2) NOT NULL DEFAULT 0,
      tx_hash        VARCHAR(66),
      paid_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);
}

async function getGefTier(wallet: string): Promise<string> {
  try {
    const r = await pool.query<{ tier_name: string }>(
      `SELECT gef_tier_thresholds.tier_name
       FROM gef_user_execution_profiles
       JOIN gef_tier_thresholds ON gef_user_execution_profiles.current_tier_id = gef_tier_thresholds.tier_id
       WHERE LOWER(gef_user_execution_profiles.wallet_address) = LOWER($1)
       LIMIT 1`,
      [wallet]
    );
    return r.rows[0]?.tier_name ?? 'Observer';
  } catch {
    return 'Observer';
  }
}

function computeAccruedInterest(
  principal: number,
  rateBps: number,
  fundedAtStr: string | null
): number {
  if (!fundedAtStr || principal <= 0) return 0;
  const fundedAt = new Date(fundedAtStr).getTime();
  const nowMs = Date.now();
  const daysFraction = (nowMs - fundedAt) / (1000 * 60 * 60 * 24);
  const annualRate = rateBps / 10000;
  return principal * annualRate * (daysFraction / 365);
}

function computeMonthlyPayment(principal: number, rateBps: number, termMonths: number): number {
  const r = (rateBps / 10000) / 12;
  if (r === 0) return principal / termMonths;
  return (principal * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await ensureTable();
  } catch (err) {
    console.error('[loan-lifecycle] Table creation failed:', err);
    return res.status(500).json({ success: false, error: 'Database initialisation error' });
  }

  if (req.method === 'GET') {
    return handleGet(req, res);
  }
  if (req.method === 'POST') {
    return handlePost(req, res);
  }
  if (req.method === 'PATCH') {
    return handlePatch(req, res);
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { walletAddress, loanId } = req.query;

  if (loanId && typeof loanId === 'string') {
    const r = await pool.query<LoanRow>(
      `SELECT * FROM real_estate_loans WHERE loan_id = $1 LIMIT 1`,
      [loanId]
    );
    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Loan not found' });
    }
    const loan = r.rows[0];
    const accrued = computeAccruedInterest(
      parseFloat(loan.outstanding_principal_usd),
      loan.interest_rate_bps,
      loan.funded_at
    );
    const monthlyPayment = loan.status === 'active'
      ? computeMonthlyPayment(
          parseFloat(loan.outstanding_principal_usd),
          loan.interest_rate_bps,
          loan.loan_term_months
        )
      : 0;

    const payments = await pool.query(
      `SELECT * FROM real_estate_loan_payments WHERE loan_id = $1 ORDER BY paid_at DESC LIMIT 20`,
      [loanId]
    );

    return res.status(200).json({
      success: true,
      loan: { ...loan, live_accrued_interest_usd: accrued.toFixed(6) },
      monthlyPayment: monthlyPayment.toFixed(2),
      payments: payments.rows,
    });
  }

  if (walletAddress && typeof walletAddress === 'string') {
    const r = await pool.query<LoanRow>(
      `SELECT * FROM real_estate_loans WHERE LOWER(wallet_address) = LOWER($1) ORDER BY created_at DESC`,
      [walletAddress]
    );
    const loans = r.rows.map(loan => ({
      ...loan,
      live_accrued_interest_usd: computeAccruedInterest(
        parseFloat(loan.outstanding_principal_usd),
        loan.interest_rate_bps,
        loan.funded_at
      ).toFixed(6),
    }));
    return res.status(200).json({ success: true, loans });
  }

  if (isAdminRequest(req)) {
    const r = await pool.query<LoanRow>(
      `SELECT * FROM real_estate_loans ORDER BY created_at DESC LIMIT 200`
    );
    return res.status(200).json({ success: true, loans: r.rows });
  }

  return res.status(400).json({ success: false, error: 'walletAddress or loanId query param required' });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { walletAddress, action } = req.body as {
    walletAddress?: string;
    action?: string;
    [k: string]: unknown;
  };

  if (action === 'originate') {
    return handleOriginate(req, res);
  }

  return res.status(400).json({ success: false, error: 'Unknown action. Use action: "originate"' });
}

async function handleOriginate(req: NextApiRequest, res: NextApiResponse) {
  const {
    walletAddress,
    borrowerName,
    propertyAddress,
    loanAmountUsd,
    loanTermMonths,
    applicationId,
  } = req.body as {
    walletAddress?: string;
    borrowerName?: string;
    propertyAddress?: string;
    loanAmountUsd?: number | string;
    loanTermMonths?: number | string;
    applicationId?: number | string;
  };

  if (!walletAddress || !borrowerName || !propertyAddress || !loanAmountUsd) {
    return res.status(400).json({
      success: false,
      error: 'Required: walletAddress, borrowerName, propertyAddress, loanAmountUsd',
    });
  }

  const auth = verifyCreditAuth(req, walletAddress);
  if (!auth.ok) {
    return res.status(401).json({ success: false, error: auth.reason });
  }

  const gefTier = await getGefTier(auth.verifiedAddress);
  if (!GEF_OPERATOR_TIERS.has(gefTier)) {
    return res.status(403).json({
      success: false,
      error: `GEF Operator tier required to access real estate credit. Your current tier: ${gefTier}. Advance to Operator tier through the Graduated Execution Framework.`,
      gefTier,
    });
  }

  const principal = parseFloat(String(loanAmountUsd));
  if (isNaN(principal) || principal < 50000 || principal > 500000) {
    return res.status(400).json({
      success: false,
      error: 'Loan amount must be between $50,000 and $500,000',
    });
  }

  const termMonths = parseInt(String(loanTermMonths || 12), 10);
  if (isNaN(termMonths) || termMonths < 1 || termMonths > 24) {
    return res.status(400).json({
      success: false,
      error: 'Loan term must be 1 to 24 months',
    });
  }

  const originationFee = principal * (ORIGINATION_FEE_BPS / 10000);

  const appIdNum = applicationId ? parseInt(String(applicationId), 10) : null;

  const r = await pool.query<{ loan_id: string }>(
    `INSERT INTO real_estate_loans
       (wallet_address, application_id, borrower_name, property_address,
        loan_amount_usd, origination_fee_usd, outstanding_principal_usd,
        interest_rate_bps, loan_term_months, status, gef_tier_at_origination)
     VALUES ($1,$2,$3,$4,$5,$6,$5,$7,$8,'pending_review',$9)
     RETURNING loan_id`,
    [
      auth.verifiedAddress,
      isNaN(appIdNum ?? NaN) ? null : appIdNum,
      borrowerName,
      propertyAddress,
      principal.toFixed(2),
      originationFee.toFixed(2),
      LOAN_RATE_BPS,
      termMonths,
      gefTier,
    ]
  );

  return res.status(201).json({
    success: true,
    loanId: r.rows[0].loan_id,
    gefTier,
    originationFeeUsd: originationFee.toFixed(2),
    annualRateBps: LOAN_RATE_BPS,
    monthlyPaymentEstimate: computeMonthlyPayment(principal, LOAN_RATE_BPS, termMonths).toFixed(2),
    message: 'Loan application recorded. Under review — approval typically within 24-48 hours.',
  });
}

async function handlePatch(req: NextApiRequest, res: NextApiResponse) {
  const { loanId, action, walletAddress, paymentUsd, txHash } = req.body as {
    loanId?: string;
    action?: string;
    walletAddress?: string;
    paymentUsd?: number | string;
    txHash?: string;
  };

  if (!loanId) {
    return res.status(400).json({ success: false, error: 'loanId required' });
  }

  const loanResult = await pool.query<LoanRow>(
    `SELECT * FROM real_estate_loans WHERE loan_id = $1 LIMIT 1`,
    [loanId]
  );
  if (loanResult.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Loan not found' });
  }
  const loan = loanResult.rows[0];

  if (action === 'fund' || action === 'approve' || action === 'close' || action === 'default') {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ success: false, error: 'Admin key required for this action' });
    }
    return handleAdminAction(req, res, loan, action);
  }

  if (action === 'repay') {
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'walletAddress required for repayment' });
    }
    const auth = verifyCreditAuth(req, walletAddress);
    if (!auth.ok) {
      return res.status(401).json({ success: false, error: auth.reason });
    }
    if (auth.verifiedAddress !== loan.wallet_address.toLowerCase()) {
      return res.status(403).json({ success: false, error: 'You do not own this loan' });
    }
    return handleRepay(res, loan, paymentUsd, txHash);
  }

  return res.status(400).json({ success: false, error: 'Unknown action. Use "repay", "fund", "approve", "close", or "default"' });
}

async function handleAdminAction(
  _req: NextApiRequest,
  res: NextApiResponse,
  loan: LoanRow,
  action: string
) {
  if (action === 'approve') {
    if (loan.status !== 'pending_review') {
      return res.status(400).json({ success: false, error: 'Loan must be in pending_review to approve' });
    }
    await pool.query(
      `UPDATE real_estate_loans SET status = 'approved', updated_at = NOW() WHERE loan_id = $1`,
      [loan.loan_id]
    );
    return res.status(200).json({ success: true, message: 'Loan approved — ready to fund' });
  }

  if (action === 'fund') {
    if (loan.status !== 'approved') {
      return res.status(400).json({ success: false, error: 'Loan must be in approved state to fund' });
    }
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + loan.loan_term_months);
    await pool.query(
      `UPDATE real_estate_loans
         SET status = 'active', funded_at = NOW(), due_date = $2, updated_at = NOW()
       WHERE loan_id = $1`,
      [loan.loan_id, dueDate.toISOString()]
    );
    return res.status(200).json({ success: true, message: 'Loan funded and now active', dueDate: dueDate.toISOString() });
  }

  if (action === 'close') {
    await pool.query(
      `UPDATE real_estate_loans SET status = 'closed', updated_at = NOW() WHERE loan_id = $1`,
      [loan.loan_id]
    );
    return res.status(200).json({ success: true, message: 'Loan closed' });
  }

  if (action === 'default') {
    await pool.query(
      `UPDATE real_estate_loans SET status = 'defaulted', updated_at = NOW() WHERE loan_id = $1`,
      [loan.loan_id]
    );
    return res.status(200).json({ success: true, message: 'Loan marked as defaulted' });
  }

  return res.status(400).json({ success: false, error: 'Unknown admin action' });
}

async function handleRepay(
  res: NextApiResponse,
  loan: LoanRow,
  paymentUsdRaw: number | string | undefined,
  txHash: string | undefined
) {
  if (loan.status !== 'active') {
    return res.status(400).json({ success: false, error: `Cannot repay loan in status: ${loan.status}` });
  }

  const paymentUsd = parseFloat(String(paymentUsdRaw ?? 0));
  if (isNaN(paymentUsd) || paymentUsd <= 0) {
    return res.status(400).json({ success: false, error: 'paymentUsd must be a positive number' });
  }

  const principal = parseFloat(loan.outstanding_principal_usd);
  const accrued = computeAccruedInterest(principal, loan.interest_rate_bps, loan.funded_at);
  const totalDue = principal + accrued;

  if (paymentUsd > totalDue + 0.01) {
    return res.status(400).json({
      success: false,
      error: `Overpayment guard: total due is $${totalDue.toFixed(2)} (principal $${principal.toFixed(2)} + accrued interest $${accrued.toFixed(6)}). Payment of $${paymentUsd.toFixed(2)} exceeds this.`,
    });
  }

  const interestPortion = Math.min(paymentUsd, accrued);
  const principalPortion = paymentUsd - interestPortion;
  const newPrincipal = Math.max(0, principal - principalPortion);
  const newTotalRepaid = parseFloat(loan.total_repaid_usd) + paymentUsd;

  const newStatus = newPrincipal < 0.01 ? 'closed' : 'active';

  await pool.query(
    `UPDATE real_estate_loans
       SET outstanding_principal_usd = $2,
           total_repaid_usd = $3,
           accrued_interest_usd = 0,
           last_payment_at = NOW(),
           status = $4,
           updated_at = NOW()
     WHERE loan_id = $1`,
    [loan.loan_id, newPrincipal.toFixed(2), newTotalRepaid.toFixed(2), newStatus]
  );

  await pool.query(
    `INSERT INTO real_estate_loan_payments
       (loan_id, wallet_address, payment_usd, interest_portion_usd, principal_portion_usd, remaining_principal_usd, tx_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      loan.loan_id,
      loan.wallet_address,
      paymentUsd.toFixed(2),
      interestPortion.toFixed(6),
      principalPortion.toFixed(2),
      newPrincipal.toFixed(2),
      txHash ?? null,
    ]
  );

  return res.status(200).json({
    success: true,
    paymentRecorded: paymentUsd.toFixed(2),
    interestPortionUsd: interestPortion.toFixed(6),
    principalPortionUsd: principalPortion.toFixed(2),
    remainingPrincipalUsd: newPrincipal.toFixed(2),
    loanStatus: newStatus,
    message: newStatus === 'closed' ? 'Loan fully repaid and closed.' : 'Payment recorded. Thank you.',
  });
}
