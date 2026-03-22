import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { verifyCreditAuth, isAdminRequest } from '../../../lib/community-credit-auth';
import { CREDIT_MARKET_ADDRESS, FIXED_LOAN_NFT_ADDRESS } from '../../../src/config/activeContracts.generated';
import { CREDIT_MARKET_ABI as CM_ABI, FIXED_LOAN_ABI as FL_ABI } from '../../../src/config/creditMarket.generated';

const ARBITRUM_RPC = `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY ?? ''}`;

const CREDIT_MARKET_ABI = CM_ABI as readonly string[];
const FIXED_LOAN_ABI    = FL_ABI as readonly string[];

async function getFixedLoanSigner() {
  const ethersModule = await import('ethers');
  const ethers = ethersModule.ethers;
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerKey) throw new Error('DEPLOYER_PRIVATE_KEY not set');
  const provider  = new ethers.JsonRpcProvider(ARBITRUM_RPC);
  const signer    = new ethers.Wallet(deployerKey, provider);
  const fixedLoan = new ethers.Contract(FIXED_LOAN_NFT_ADDRESS, FIXED_LOAN_ABI, signer);
  const market    = new ethers.Contract(CREDIT_MARKET_ADDRESS, CREDIT_MARKET_ABI, signer);
  return { signer, fixedLoan, market, ethers };
}

function toLoanId32(loanId: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ethers } = require('ethers') as { ethers: typeof import('ethers') };
  return ethers.encodeBytes32String(loanId.replace(/-/g, '').slice(0, 31));
}

const GEF_OPERATOR_TIERS = new Set(['Operator', 'Steward', 'Architect']);

const LOAN_RATE_BPS = 1400;
const ORIGINATION_FEE_BPS = 300;
const PREPAY_PENALTY_BPS = 200;
const GRACE_PERIOD_DAYS = 15;
const DEFAULT_TERM_MONTHS = 12;

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
  total_interest_paid_usd: string;
  total_repaid_usd: string;
  interest_rate_bps: number;
  loan_term_months: number;
  status: string;
  gef_tier_at_origination: string;
  funded_at: string | null;
  due_date: string | null;
  created_at: string;
  last_payment_at: string | null;
  last_interest_accrual_at: string | null;
  disbursement_tx_hash: string | null;
}

async function ensureTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS real_estate_loans (
      loan_id                   VARCHAR(36)   PRIMARY KEY DEFAULT gen_random_uuid()::text,
      wallet_address            VARCHAR(42)   NOT NULL,
      application_id            INTEGER,
      borrower_name             VARCHAR(200)  NOT NULL,
      property_address          VARCHAR(500)  NOT NULL,
      loan_amount_usd           NUMERIC(18,2) NOT NULL,
      origination_fee_usd       NUMERIC(18,2) NOT NULL DEFAULT 0,
      outstanding_principal_usd NUMERIC(18,2) NOT NULL,
      accrued_interest_usd      NUMERIC(18,6) NOT NULL DEFAULT 0,
      total_interest_paid_usd   NUMERIC(18,6) NOT NULL DEFAULT 0,
      total_repaid_usd          NUMERIC(18,2) NOT NULL DEFAULT 0,
      interest_rate_bps         INTEGER       NOT NULL DEFAULT 1400,
      loan_term_months          INTEGER       NOT NULL DEFAULT 12,
      status                    VARCHAR(30)   NOT NULL DEFAULT 'pending_review',
      gef_tier_at_origination   VARCHAR(30)   NOT NULL DEFAULT 'Operator',
      funded_at                 TIMESTAMP WITH TIME ZONE,
      due_date                  TIMESTAMP WITH TIME ZONE,
      last_payment_at           TIMESTAMP WITH TIME ZONE,
      last_interest_accrual_at  TIMESTAMP WITH TIME ZONE,
      disbursement_tx_hash      VARCHAR(66),
      created_at                TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at                TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  // Idempotent column additions
  await pool.query(`ALTER TABLE real_estate_loans ADD COLUMN IF NOT EXISTS total_interest_paid_usd NUMERIC(18,6) NOT NULL DEFAULT 0`).catch(() => {});
  await pool.query(`ALTER TABLE real_estate_loans ADD COLUMN IF NOT EXISTS last_interest_accrual_at TIMESTAMP WITH TIME ZONE`).catch(() => {});
  await pool.query(`ALTER TABLE real_estate_loans ADD COLUMN IF NOT EXISTS disbursement_tx_hash VARCHAR(66)`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS real_estate_loan_payments (
      payment_id              VARCHAR(36)   PRIMARY KEY DEFAULT gen_random_uuid()::text,
      loan_id                 VARCHAR(36)   NOT NULL REFERENCES real_estate_loans(loan_id) ON DELETE CASCADE,
      wallet_address          VARCHAR(42)   NOT NULL,
      payment_usd             NUMERIC(18,2) NOT NULL,
      interest_portion_usd    NUMERIC(18,6) NOT NULL DEFAULT 0,
      principal_portion_usd   NUMERIC(18,2) NOT NULL DEFAULT 0,
      remaining_principal_usd NUMERIC(18,2) NOT NULL DEFAULT 0,
      tx_hash                 VARCHAR(66),
      paid_at                 TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
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
  accrualStartStr: string | null
): number {
  if (!accrualStartStr || principal <= 0) return 0;
  const accrualStart = new Date(accrualStartStr).getTime();
  const nowMs = Date.now();
  if (nowMs <= accrualStart) return 0;
  const daysFraction = (nowMs - accrualStart) / (1000 * 60 * 60 * 24);
  const annualRate = rateBps / 10000;
  return principal * annualRate * (daysFraction / 365);
}

function computeMonthlyPayment(principal: number, rateBps: number, termMonths: number): number {
  const r = (rateBps / 10000) / 12;
  if (r === 0) return principal / termMonths;
  return (principal * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
}

function buildPaymentSchedule(
  principal: number,
  rateBps: number,
  termMonths: number,
  fundedAtStr: string | null
): Array<{ month: number; dueDate: string; payment: string; interest: string; principalPortion: string; balance: string }> {
  if (!fundedAtStr || principal <= 0) return [];
  const monthlyPayment = computeMonthlyPayment(principal, rateBps, termMonths);
  const r = (rateBps / 10000) / 12;
  const fundedAt = new Date(fundedAtStr);
  const schedule: Array<{ month: number; dueDate: string; payment: string; interest: string; principalPortion: string; balance: string }> = [];
  let balance = principal;

  for (let i = 1; i <= termMonths; i++) {
    const dueDate = new Date(fundedAt);
    dueDate.setMonth(dueDate.getMonth() + i);
    const interestCharge = balance * r;
    const principalPortion = Math.min(monthlyPayment - interestCharge, balance);
    balance = Math.max(0, balance - principalPortion);
    schedule.push({
      month: i,
      dueDate: dueDate.toISOString().slice(0, 10),
      payment: (interestCharge + principalPortion).toFixed(2),
      interest: interestCharge.toFixed(6),
      principalPortion: principalPortion.toFixed(2),
      balance: balance.toFixed(2),
    });
    if (balance < 0.01) break;
  }
  return schedule;
}

function computeDaysDelinquent(dueDateStr: string | null, status: string): number {
  if (status !== 'active' && status !== 'delinquent') return 0;
  if (!dueDateStr) return 0;
  const dueDate = new Date(dueDateStr).getTime();
  const now = Date.now();
  if (now <= dueDate) return 0;
  return Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
}

function enrichLoan(loan: LoanRow) {
  const accrualStart = loan.last_payment_at ?? loan.funded_at;
  const liveAccrued = computeAccruedInterest(
    parseFloat(loan.outstanding_principal_usd),
    loan.interest_rate_bps,
    accrualStart
  );
  const principal = parseFloat(loan.outstanding_principal_usd);
  const totalDue = principal + liveAccrued;
  const daysDelinquent = computeDaysDelinquent(loan.due_date, loan.status);
  const monthlyPayment = (loan.status === 'active' || loan.status === 'delinquent')
    ? computeMonthlyPayment(principal, loan.interest_rate_bps, loan.loan_term_months)
    : 0;

  let nextDueDate: string | null = null;
  if (loan.funded_at && (loan.status === 'active' || loan.status === 'delinquent')) {
    const funded = new Date(loan.funded_at);
    const now = new Date();
    for (let m = 1; m <= loan.loan_term_months; m++) {
      const d = new Date(funded);
      d.setMonth(d.getMonth() + m);
      if (d > now) { nextDueDate = d.toISOString().slice(0, 10); break; }
    }
  }

  return {
    ...loan,
    live_accrued_interest_usd: liveAccrued.toFixed(6),
    total_due_usd: totalDue.toFixed(2),
    days_delinquent: daysDelinquent,
    monthly_payment_estimate: monthlyPayment.toFixed(2),
    next_due_date: nextDueDate,
    cumulative_interest_paid_usd: loan.total_interest_paid_usd,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await ensureTable();
  } catch (err) {
    console.error('[loan-lifecycle] Table creation failed:', err);
    return res.status(500).json({ success: false, error: 'Database initialisation error' });
  }

  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handlePost(req, res);
  if (req.method === 'PATCH') return handlePatch(req, res);
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { walletAddress, loanId } = req.query;

  if (loanId && typeof loanId === 'string') {
    if (!isAdminRequest(req)) {
      const sig = req.headers['x-wallet-signature'];
      const msg = req.headers['x-wallet-message'];
      if (!sig || !msg) {
        return res.status(401).json({
          success: false,
          error: 'Loan detail requires wallet ownership proof. Provide x-wallet-signature and x-wallet-message headers.',
        });
      }
    }

    const r = await pool.query<LoanRow>(
      `SELECT * FROM real_estate_loans WHERE loan_id = $1 LIMIT 1`,
      [loanId]
    );
    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Loan not found' });
    }
    const loan = r.rows[0];

    if (!isAdminRequest(req)) {
      const authResult = verifyCreditAuth(req, loan.wallet_address);
      if (!authResult.ok) {
        return res.status(403).json({ success: false, error: 'Access denied: you do not own this loan' });
      }
      if (authResult.verifiedAddress.toLowerCase() !== loan.wallet_address.toLowerCase()) {
        return res.status(403).json({ success: false, error: 'Signature verified but does not match loan owner' });
      }
    }

    const payments = await pool.query(
      `SELECT * FROM real_estate_loan_payments WHERE loan_id = $1 ORDER BY paid_at DESC LIMIT 20`,
      [loanId]
    );

    const paymentSchedule = buildPaymentSchedule(
      parseFloat(loan.outstanding_principal_usd),
      loan.interest_rate_bps,
      loan.loan_term_months,
      loan.funded_at
    );

    // ── On-chain state enrichment via AXIOMFixedLoan ────────────────────────
    let chainState: {
      onChainStatus: string | null;
      onChainAccruedInterestUsd: string | null;
      onChainPrincipalUsd: string | null;
      onChainNextPaymentDue: { amountUsd: string; dueTimestamp: number } | null;
      onChainDaysDelinquent: number | null;
      explorerFixedLoan: string | null;
      explorerMarket: string | null;
    } = {
      onChainStatus: null,
      onChainAccruedInterestUsd: null,
      onChainPrincipalUsd: null,
      onChainNextPaymentDue: null,
      onChainDaysDelinquent: null,
      explorerFixedLoan: `https://arbitrum.blockscout.com/address/${FIXED_LOAN_NFT_ADDRESS}`,
      explorerMarket: `https://arbitrum.blockscout.com/address/${CREDIT_MARKET_ADDRESS}`,
    };

    if (loan.status === 'active' || loan.status === 'delinquent' || loan.status === 'approved') {
      try {
        const { ethers } = await import('ethers');
        const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
        const fixedLoanContract = new ethers.Contract(FIXED_LOAN_NFT_ADDRESS, FIXED_LOAN_ABI, provider);
        const { CREDIT_MARKET_DEPLOYMENT } = await import('../../../src/config/creditMarket.generated');

        const loanId32 = toLoanId32(loan.loan_id);

        const [chainLoan, accruedWei, nextPayment, daysDeliq] = await Promise.allSettled([
          fixedLoanContract.getLoan(loanId32),
          fixedLoanContract.accruedInterest(loanId32),
          fixedLoanContract.nextPaymentDue(loanId32),
          fixedLoanContract.daysDelinquent(loanId32),
        ]);

        if (chainLoan.status === 'fulfilled') {
          const cl = chainLoan.value as {
            state: bigint;
            outstandingPrincipal: bigint;
            drawnPrincipal: bigint;
          };
          const statusNum = Number(cl.state);
          chainState.onChainStatus = CREDIT_MARKET_DEPLOYMENT.loanStatusMap[statusNum] ?? `STATUS_${statusNum}`;
          chainState.onChainPrincipalUsd = ethers.formatUnits(cl.outstandingPrincipal, 6);
        }

        if (accruedWei.status === 'fulfilled') {
          chainState.onChainAccruedInterestUsd = ethers.formatUnits(accruedWei.value as bigint, 6);
        }

        if (nextPayment.status === 'fulfilled') {
          const np = nextPayment.value as { amount: bigint; dueTimestamp: bigint };
          chainState.onChainNextPaymentDue = {
            amountUsd: ethers.formatUnits(np.amount, 6),
            dueTimestamp: Number(np.dueTimestamp),
          };
        }

        if (daysDeliq.status === 'fulfilled') {
          chainState.onChainDaysDelinquent = Number(daysDeliq.value as bigint);
        }

      } catch (chainReadErr: unknown) {
        const msg = chainReadErr instanceof Error ? chainReadErr.message : String(chainReadErr);
        console.warn('[loan-lifecycle] GET chain read failed (non-fatal):', msg);
      }
    }

    return res.status(200).json({
      success: true,
      loan: enrichLoan(loan),
      chainState,
      paymentSchedule,
      payments: payments.rows,
    });
  }

  if (walletAddress && typeof walletAddress === 'string') {
    if (!isAdminRequest(req)) {
      const sig = req.headers['x-wallet-signature'];
      const msg = req.headers['x-wallet-message'];
      if (!sig || !msg) {
        return res.status(401).json({
          success: false,
          error: 'Wallet ownership proof required. Provide x-wallet-signature and x-wallet-message headers.',
        });
      }
      const authResult = verifyCreditAuth(req, walletAddress);
      if (!authResult.ok) {
        return res.status(401).json({ success: false, error: authResult.reason });
      }
    }

    const r = await pool.query<LoanRow>(
      `SELECT * FROM real_estate_loans WHERE LOWER(wallet_address) = LOWER($1) ORDER BY created_at DESC`,
      [walletAddress]
    );
    return res.status(200).json({ success: true, loans: r.rows.map(enrichLoan) });
  }

  if (isAdminRequest(req)) {
    const r = await pool.query<LoanRow>(
      `SELECT * FROM real_estate_loans ORDER BY created_at DESC LIMIT 200`
    );
    return res.status(200).json({ success: true, loans: r.rows.map(enrichLoan) });
  }

  // Public portfolio view: ?status=active,delinquent,approved
  const { status: statusFilter } = req.query;
  if (statusFilter && typeof statusFilter === 'string') {
    const allowed = ['active', 'delinquent', 'approved', 'repaid', 'defaulted', 'pending'];
    const requested = statusFilter.split(',').map(s => s.trim()).filter(s => allowed.includes(s));
    if (requested.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid status values provided' });
    }
    const placeholders = requested.map((_, i) => `$${i + 1}`).join(', ');
    const r = await pool.query<LoanRow>(
      `SELECT loan_id, loan_amount_usd, outstanding_principal_usd, interest_rate_bps,
              loan_term_months, status, funded_at, due_date, last_payment_at,
              property_address, total_repaid_usd, total_interest_paid_usd, created_at
       FROM real_estate_loans
       WHERE status IN (${placeholders})
       ORDER BY funded_at DESC NULLS LAST, created_at DESC
       LIMIT 50`,
      requested
    );
    return res.status(200).json({
      success: true,
      loans: r.rows.map(loan => ({
        loan_id: loan.loan_id,
        loan_amount_usd: loan.loan_amount_usd,
        outstanding_principal_usd: loan.outstanding_principal_usd,
        interest_rate_bps: loan.interest_rate_bps,
        term_days: loan.loan_term_months * 30,
        status: loan.status,
        funded_at: loan.funded_at,
        due_at: loan.due_date,
        last_payment_at: loan.last_payment_at,
        property_address: loan.property_address ? `${loan.property_address.split(',')[0].trim()}, ...` : null,
        total_repaid_usd: loan.total_repaid_usd,
        total_interest_paid_usd: loan.total_interest_paid_usd,
        lpInterestEarnedUsd: computeAccruedInterest(
          parseFloat(loan.outstanding_principal_usd),
          loan.interest_rate_bps,
          loan.last_payment_at ?? loan.funded_at
        ).toFixed(4),
      })),
    });
  }

  return res.status(400).json({ success: false, error: 'walletAddress or loanId query param required' });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const body = req.body as { action?: string; [k: string]: unknown };
  if (body.action === 'originate') return handleOriginate(req, res);
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
      error: `GEF Operator tier required for real estate credit. Your current tier: ${gefTier}.`,
      gefTier,
    });
  }

  const principal = parseFloat(String(loanAmountUsd));
  if (isNaN(principal) || principal < 50000 || principal > 500000) {
    return res.status(400).json({ success: false, error: 'Loan amount must be between $50,000 and $500,000' });
  }

  const termMonths = parseInt(String(loanTermMonths || DEFAULT_TERM_MONTHS), 10);
  if (isNaN(termMonths) || termMonths < 1 || termMonths > 24) {
    return res.status(400).json({ success: false, error: 'Loan term must be 1 to 24 months' });
  }

  const originationFee = principal * (ORIGINATION_FEE_BPS / 10000);
  const appIdNum = applicationId ? parseInt(String(applicationId), 10) : null;

  const dbResult = await pool.query<{ loan_id: string }>(
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

  const loanId = dbResult.rows[0].loan_id;

  // Anchor on-chain: originateLoan() on AXIOMFixedLoan
  // Single AMORTIZED tranche covering full principal amount
  let chainTxHash: string | null = null;
  try {
    const { ethers } = await import('ethers');
    const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (deployerKey) {
      const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
      const signer   = new ethers.Wallet(deployerKey, provider);
      const fixedLoan = new ethers.Contract(FIXED_LOAN_NFT_ADDRESS, FIXED_LOAN_ABI, signer);

      const loanId32    = ethers.encodeBytes32String(loanId.replace(/-/g, '').slice(0, 31));
      const principalWei = ethers.parseUnits(principal.toFixed(6), 6);
      const termSecs    = BigInt(Math.round((termMonths * 365 * 24 * 3600) / 12));
      const graceSecs   = BigInt(GRACE_PERIOD_DAYS * 24 * 3600);
      const paymentMode = 0n; // AMORTIZED
      const rateBps     = BigInt(LOAN_RATE_BPS);
      const prepayBps   = BigInt(PREPAY_PENALTY_BPS);
      const releaseNow  = BigInt(Math.floor(Date.now() / 1000)); // immediately releasable

      const tx = await fixedLoan.originateLoan(
        loanId32,
        auth.verifiedAddress,
        paymentMode,
        rateBps,
        prepayBps,
        graceSecs,
        termSecs,
        propertyAddress,
        [principalWei],
        [releaseNow]
      );
      const receipt = await tx.wait(1);
      chainTxHash = receipt?.hash ?? tx.hash;

      await pool.query(
        `UPDATE real_estate_loans SET disbursement_tx_hash = $2, updated_at = NOW() WHERE loan_id = $1`,
        [loanId, chainTxHash]
      );
    }
  } catch (chainErr: unknown) {
    const msg = chainErr instanceof Error ? chainErr.message : String(chainErr);
    console.error('[loan-lifecycle] Chain originate failed (non-fatal):', msg);
  }

  return res.status(201).json({
    success: true,
    loanId,
    chainTxHash,
    gefTier,
    originationFeeUsd: originationFee.toFixed(2),
    annualRateBps: LOAN_RATE_BPS,
    monthlyPaymentEstimate: computeMonthlyPayment(principal, LOAN_RATE_BPS, termMonths).toFixed(2),
    message: 'Loan application anchored on-chain. Under review — approval typically within 24-48 hours.',
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

  if (!loanId) return res.status(400).json({ success: false, error: 'loanId required' });

  const loanResult = await pool.query<LoanRow>(
    `SELECT * FROM real_estate_loans WHERE loan_id = $1 LIMIT 1`,
    [loanId]
  );
  if (loanResult.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Loan not found' });
  }
  const loan = loanResult.rows[0];

  const ADMIN_ACTIONS = new Set(['fund', 'approve', 'close', 'default', 'mark_delinquent', 'cure_delinquent']);
  if (action && ADMIN_ACTIONS.has(action)) {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ success: false, error: 'Admin key required for this action' });
    }
    return handleAdminAction(res, loan, action);
  }

  if (action === 'repay') {
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'walletAddress required for repayment' });
    }
    const auth = verifyCreditAuth(req, walletAddress);
    if (!auth.ok) return res.status(401).json({ success: false, error: auth.reason });
    if (auth.verifiedAddress.toLowerCase() !== loan.wallet_address.toLowerCase()) {
      return res.status(403).json({ success: false, error: 'You do not own this loan' });
    }
    return handleRepay(res, loan, paymentUsd, txHash);
  }

  return res.status(400).json({ success: false, error: 'Unknown action. Valid: repay | approve | fund | close | default | mark_delinquent | cure_delinquent' });
}

async function handleAdminAction(res: NextApiResponse, loan: LoanRow, action: string) {
  const VALID_TRANSITIONS: Record<string, { from: string[]; to: string }> = {
    approve:          { from: ['pending_review'],       to: 'approved'   },
    fund:             { from: ['approved'],              to: 'active'     },
    mark_delinquent:  { from: ['active'],                to: 'delinquent' },
    cure_delinquent:  { from: ['delinquent'],            to: 'active'     },
    close:            { from: ['active', 'delinquent'],  to: 'repaid'     },
    default:          { from: ['active', 'delinquent'],  to: 'defaulted'  },
  };

  const transition = VALID_TRANSITIONS[action];
  if (!transition) {
    return res.status(400).json({ success: false, error: `Unknown admin action: ${action}` });
  }
  if (!transition.from.includes(loan.status)) {
    return res.status(400).json({
      success: false,
      error: `Cannot ${action} from status '${loan.status}'. Required: ${transition.from.join(' or ')}`,
    });
  }

  const loanId32 = toLoanId32(loan.loan_id);

  // ── fund: approveLoan() then disburseTranche(0) on AXIOMFixedLoan ─────────
  if (action === 'fund') {
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + loan.loan_term_months);

    const { fixedLoan } = await getFixedLoanSigner();

    // First approve (if not already approved on-chain)
    try {
      const approveTx = await fixedLoan.approveLoan(loanId32);
      await approveTx.wait(1);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // Ignore if already approved (state machine revert)
      if (!msg.includes('revert') && !msg.includes('APPROVED')) throw e;
    }

    // Disburse tranche 0 (the single-tranche origination)
    const disburseTx = await fixedLoan.disburseTranche(loanId32, 0);
    const disburseReceipt = await disburseTx.wait(1);
    const fundTxHash: string = disburseReceipt?.hash ?? disburseTx.hash;

    await pool.query(
      `UPDATE real_estate_loans
         SET status = $2, funded_at = NOW(), last_interest_accrual_at = NOW(), due_date = $3,
             disbursement_tx_hash = $4, updated_at = NOW()
       WHERE loan_id = $1`,
      [loan.loan_id, transition.to, dueDate.toISOString(), fundTxHash]
    );
    return res.status(200).json({
      success: true,
      message: 'Loan funded on-chain via AXIOMFixedLoan.disburseTranche(0)',
      newStatus: transition.to,
      chainTxHash: fundTxHash,
      explorerUrl: `https://arbitrum.blockscout.com/tx/${fundTxHash}`,
    });
  }

  // ── approve: approveLoan() on AXIOMFixedLoan ──────────────────────────────
  if (action === 'approve') {
    const { fixedLoan } = await getFixedLoanSigner();
    const tx = await fixedLoan.approveLoan(loanId32);
    const receipt = await tx.wait(1);
    const chainTxHash: string = receipt?.hash ?? tx.hash;
    await pool.query(`UPDATE real_estate_loans SET status = $2, updated_at = NOW() WHERE loan_id = $1`, [loan.loan_id, transition.to]);
    return res.status(200).json({ success: true, message: `Loan approved on-chain`, newStatus: transition.to, chainTxHash });
  }

  // ── mark_delinquent: markDelinquent() on AXIOMFixedLoan ──────────────────
  if (action === 'mark_delinquent') {
    const { fixedLoan } = await getFixedLoanSigner();
    const tx = await fixedLoan.markDelinquent(loanId32);
    const receipt = await tx.wait(1);
    const chainTxHash: string = receipt?.hash ?? tx.hash;
    await pool.query(`UPDATE real_estate_loans SET status = $2, updated_at = NOW() WHERE loan_id = $1`, [loan.loan_id, transition.to]);
    return res.status(200).json({ success: true, message: `Loan marked delinquent on-chain`, newStatus: transition.to, chainTxHash });
  }

  // ── cure_delinquent: cureDelinquent() on AXIOMFixedLoan ──────────────────
  if (action === 'cure_delinquent') {
    const { fixedLoan } = await getFixedLoanSigner();
    const tx = await fixedLoan.cureDelinquent(loanId32);
    const receipt = await tx.wait(1);
    const chainTxHash: string = receipt?.hash ?? tx.hash;
    await pool.query(`UPDATE real_estate_loans SET status = $2, updated_at = NOW() WHERE loan_id = $1`, [loan.loan_id, transition.to]);
    return res.status(200).json({ success: true, message: `Loan delinquency cured on-chain`, newStatus: transition.to, chainTxHash });
  }

  // ── close (admin reconciliation): closeLoan() on AXIOMFixedLoan ──────────
  if (action === 'close') {
    const { fixedLoan } = await getFixedLoanSigner();
    const tx = await fixedLoan.closeLoan(loanId32);
    const receipt = await tx.wait(1);
    const chainTxHash: string = receipt?.hash ?? tx.hash;

    await pool.query(
      `UPDATE real_estate_loans
         SET status = $2, outstanding_principal_usd = 0, accrued_interest_usd = 0,
             disbursement_tx_hash = $3, last_payment_at = NOW(), updated_at = NOW()
       WHERE loan_id = $1`,
      [loan.loan_id, transition.to, chainTxHash]
    );
    return res.status(200).json({
      success: true,
      message: 'Loan administratively closed on-chain (AXIOMFixedLoan.closeLoan)',
      newStatus: transition.to,
      chainTxHash,
    });
  }

  // ── default: defaultLoan() on AXIOMFixedLoan ─────────────────────────────
  if (action === 'default') {
    const { fixedLoan } = await getFixedLoanSigner();
    const tx = await fixedLoan.defaultLoan(loanId32);
    const receipt = await tx.wait(1);
    const chainTxHash: string = receipt?.hash ?? tx.hash;

    await pool.query(
      `UPDATE real_estate_loans SET status = $2, disbursement_tx_hash = $3, updated_at = NOW() WHERE loan_id = $1`,
      [loan.loan_id, transition.to, chainTxHash]
    );
    return res.status(200).json({
      success: true,
      message: 'Loan defaulted on-chain (AXIOMFixedLoan.defaultLoan)',
      newStatus: transition.to,
      chainTxHash,
    });
  }

  return res.status(400).json({ success: false, error: `Unhandled admin action: ${action}` });
}

async function handleRepay(
  res: NextApiResponse,
  loan: LoanRow,
  paymentUsdRaw: number | string | undefined,
  txHash: string | undefined
) {
  if (loan.status !== 'active' && loan.status !== 'delinquent') {
    return res.status(400).json({ success: false, error: `Cannot repay loan in status: ${loan.status}` });
  }

  const paymentUsd = parseFloat(String(paymentUsdRaw ?? 0));
  if (isNaN(paymentUsd) || paymentUsd <= 0) {
    return res.status(400).json({ success: false, error: 'paymentUsd must be a positive number' });
  }

  // txHash required: borrower calls AXIOMFixedLoan.repayLoan() from their wallet first
  if (!txHash || !txHash.match(/^0x[0-9a-fA-F]{64}$/)) {
    return res.status(400).json({
      success: false,
      error: 'txHash is required for on-chain repayments. Borrower must call repayLoan() from their wallet and submit the resulting tx hash.',
    });
  }

  const principal = parseFloat(loan.outstanding_principal_usd);
  const accrualStart = loan.last_payment_at ?? loan.funded_at;
  const accrued = computeAccruedInterest(principal, loan.interest_rate_bps, accrualStart);
  const totalDue = principal + accrued;

  if (paymentUsd > totalDue + 0.01) {
    return res.status(400).json({
      success: false,
      error: `Overpayment guard: total outstanding is $${totalDue.toFixed(2)}. Payment $${paymentUsd.toFixed(2)} exceeds this.`,
    });
  }

  // Interest-first allocation (mirrors AXIOMFixedLoan.repayLoan() logic)
  const interestPortion  = Math.min(paymentUsd, accrued);
  const principalPortion = paymentUsd - interestPortion;
  const newPrincipal     = Math.max(0, principal - principalPortion);
  const newTotalRepaid   = parseFloat(loan.total_repaid_usd) + paymentUsd;
  const newTotalInterestPaid = parseFloat(loan.total_interest_paid_usd) + interestPortion;
  // Dust threshold < $0.01 = fully repaid (mirrors contract 1e4 wei threshold on 6-decimal AXUSD)
  const newStatus: string = newPrincipal < 0.01 ? 'repaid' : 'active';

  await pool.query(
    `UPDATE real_estate_loans
       SET outstanding_principal_usd = $2,
           total_repaid_usd          = $3,
           total_interest_paid_usd   = $4,
           accrued_interest_usd      = 0,
           last_payment_at           = NOW(),
           last_interest_accrual_at  = NOW(),
           status                    = $5,
           updated_at                = NOW()
     WHERE loan_id = $1`,
    [loan.loan_id, newPrincipal.toFixed(2), newTotalRepaid.toFixed(2), newTotalInterestPaid.toFixed(6), newStatus]
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
      txHash,
    ]
  );

  return res.status(200).json({
    success: true,
    chainTxHash: txHash,
    paymentRecorded: paymentUsd.toFixed(2),
    interestPortionUsd: interestPortion.toFixed(6),
    principalPortionUsd: principalPortion.toFixed(2),
    remainingPrincipalUsd: newPrincipal.toFixed(2),
    totalInterestPaidUsd: newTotalInterestPaid.toFixed(6),
    loanStatus: newStatus,
    message: newStatus === 'repaid'
      ? 'Loan fully repaid. Status updated to Repaid.'
      : 'Payment recorded. Interest-first allocation applied (mirrors AXIOMFixedLoan.repayLoan).',
  });
}
