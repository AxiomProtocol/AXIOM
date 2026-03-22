import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { verifyCreditAuth, isAdminRequest } from '../../../lib/community-credit-auth';
import { CREDIT_MARKET_ADDRESS, FIXED_LOAN_NFT_ADDRESS } from '../../../src/config/activeContracts.generated';

const ARBITRUM_RPC = `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY ?? ''}`;

const CREDIT_MARKET_ABI = [
  'function originateLoan(bytes32 loanId, address borrower, uint256 principal, uint256 rateBps, uint256 feeBps, uint256 termDays, string calldata propAddress) external',
  'function approveLoan(bytes32 loanId) external',
  'function fundLoan(bytes32 loanId) external',
  'function markDelinquent(bytes32 loanId) external',
  'function cureDelinquent(bytes32 loanId) external',
  'function defaultLoan(bytes32 loanId) external',
  'function getLoan(bytes32 loanId) view returns (tuple(bytes32 loanId, address borrower, uint256 principalUsd6, uint256 interestRateBps, uint256 originationFeeUsd6, uint256 termSeconds, uint8 status, uint256 fundedAt, uint256 dueAt, uint256 lastAccrualAt, uint256 totalRepaidUsd6, uint256 totalInterestPaidUsd6, string propertyAddress))',
  'function accruedInterest(bytes32 loanId) view returns (uint256)',
] as const;

const FIXED_LOAN_ABI = [
  'function mintReceipt(bytes32 loanId, address borrower, uint256 principalUsd6, uint256 rateBps, uint256 termDays, uint256 dueAt, string calldata propAddress) external returns (uint256)',
  'function burnReceipt(bytes32 loanId) external',
] as const;

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

  await pool.query(`
    ALTER TABLE real_estate_loans
      ADD COLUMN IF NOT EXISTS total_interest_paid_usd NUMERIC(18,6) NOT NULL DEFAULT 0
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE real_estate_loans
      ADD COLUMN IF NOT EXISTS last_interest_accrual_at TIMESTAMP WITH TIME ZONE
  `).catch(() => {});

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
  fundedAtStr: string | null,
  totalRepaidUsd: number
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

    const principal = parseFloat(loan.outstanding_principal_usd);
    const paymentSchedule = buildPaymentSchedule(
      principal,
      loan.interest_rate_bps,
      loan.loan_term_months,
      loan.funded_at,
      parseFloat(loan.total_repaid_usd)
    );

    return res.status(200).json({
      success: true,
      loan: enrichLoan(loan),
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
          error: 'Wallet ownership proof required to view loan history. Provide x-wallet-signature and x-wallet-message headers.',
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
      error: `GEF Operator tier required for real estate credit. Your current tier: ${gefTier}. Advance through the Graduated Execution Framework.`,
      gefTier,
    });
  }

  const principal = parseFloat(String(loanAmountUsd));
  if (isNaN(principal) || principal < 50000 || principal > 500000) {
    return res.status(400).json({ success: false, error: 'Loan amount must be between $50,000 and $500,000' });
  }

  const termMonths = parseInt(String(loanTermMonths || 12), 10);
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

  // Anchor origination on-chain: register the loan in AXIOMCreditMarket
  let chainTxHash: string | null = null;
  try {
    const { ethers } = await import('ethers');
    const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (deployerKey) {
      const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
      const signer   = new ethers.Wallet(deployerKey, provider);
      const market   = new ethers.Contract(CREDIT_MARKET_ADDRESS, CREDIT_MARKET_ABI, signer);

      const loanId32   = ethers.encodeBytes32String(loanId.replace(/-/g, '').slice(0, 31));
      const principalWei = ethers.parseUnits(principal.toFixed(6), 18);
      const termDays     = BigInt(Math.round((termMonths * 365) / 12));

      const tx = await market.originateLoan(
        loanId32,
        auth.verifiedAddress,
        principalWei,
        BigInt(LOAN_RATE_BPS),
        BigInt(ORIGINATION_FEE_BPS),
        termDays,
        propertyAddress
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
    message: 'Loan application recorded on-chain. Under review — approval typically within 24-48 hours.',
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
    approve:          { from: ['pending_review'],       to: 'approved'    },
    fund:             { from: ['approved'],              to: 'active'      },
    mark_delinquent:  { from: ['active'],                to: 'delinquent'  },
    cure_delinquent:  { from: ['delinquent'],            to: 'active'      },
    close:            { from: ['active', 'delinquent'],  to: 'repaid'      },
    default:          { from: ['active', 'delinquent'],  to: 'defaulted'   },
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

  if (action === 'fund') {
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + loan.loan_term_months);

    // On-chain: call AXIOMCreditMarket.fundLoan() — disburses AXUSD to borrower
    // and mint AXIOMFixedLoan NFT receipt
    let fundTxHash: string | null = null;
    let nftTokenId: string | null = null;
    try {
      const { ethers } = await import('ethers');
      const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
      if (deployerKey) {
        const provider   = new ethers.JsonRpcProvider(ARBITRUM_RPC);
        const signer     = new ethers.Wallet(deployerKey, provider);
        const market     = new ethers.Contract(CREDIT_MARKET_ADDRESS, CREDIT_MARKET_ABI, signer);
        const fixedLoan  = new ethers.Contract(FIXED_LOAN_NFT_ADDRESS, FIXED_LOAN_ABI, signer);

        const loanId32 = ethers.encodeBytes32String(loan.loan_id.replace(/-/g, '').slice(0, 31));

        // 1. Call fundLoan on-chain (sends AXUSD principal to borrower)
        const fundTx = await market.fundLoan(loanId32);
        const fundReceipt = await fundTx.wait(1);
        fundTxHash = fundReceipt?.hash ?? fundTx.hash;

        // 2. Mint loan receipt NFT to borrower
        const principalWei = ethers.parseUnits(loan.loan_amount_usd, 18);
        const termDays = BigInt(Math.round((loan.loan_term_months * 365) / 12));
        const dueAtUnix = BigInt(Math.floor(dueDate.getTime() / 1000));

        const mintTx = await fixedLoan.mintReceipt(
          loanId32,
          loan.wallet_address,
          principalWei,
          BigInt(loan.interest_rate_bps),
          termDays,
          dueAtUnix,
          loan.property_address
        );
        const mintReceipt = await mintTx.wait(1);
        // Extract tokenId from event log (Transfer from zero address)
        const transferEvent = mintReceipt?.logs?.find(
          (l: { topics?: string[] }) => l.topics && l.topics[1] === '0x0000000000000000000000000000000000000000000000000000000000000000'
        );
        if (transferEvent?.topics?.[3]) {
          nftTokenId = BigInt(transferEvent.topics[3]).toString();
        }
      }
    } catch (chainErr: unknown) {
      const msg = chainErr instanceof Error ? chainErr.message : String(chainErr);
      console.error('[loan-lifecycle] Chain fund failed (non-fatal):', msg);
    }

    await pool.query(
      `UPDATE real_estate_loans
         SET status = $2, funded_at = NOW(), last_interest_accrual_at = NOW(), due_date = $3,
             disbursement_tx_hash = $4, updated_at = NOW()
       WHERE loan_id = $1`,
      [loan.loan_id, transition.to, dueDate.toISOString(), fundTxHash]
    );
    return res.status(200).json({
      success: true,
      message: 'Loan funded on-chain and now active',
      newStatus: transition.to,
      chainTxHash: fundTxHash,
      nftTokenId,
    });
  }

  // All other admin state transitions (approve, mark_delinquent, cure_delinquent, close, default)
  await pool.query(
    `UPDATE real_estate_loans SET status = $2, updated_at = NOW() WHERE loan_id = $1`,
    [loan.loan_id, transition.to]
  );

  // For terminal states (repaid/defaulted), burn the NFT receipt on-chain
  if (transition.to === 'repaid' || transition.to === 'defaulted') {
    try {
      const { ethers } = await import('ethers');
      const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
      if (deployerKey) {
        const provider  = new ethers.JsonRpcProvider(ARBITRUM_RPC);
        const signer    = new ethers.Wallet(deployerKey, provider);
        const fixedLoan = new ethers.Contract(FIXED_LOAN_NFT_ADDRESS, FIXED_LOAN_ABI, signer);
        const loanId32  = ethers.encodeBytes32String(loan.loan_id.replace(/-/g, '').slice(0, 31));
        const burnTx    = await fixedLoan.burnReceipt(loanId32);
        await burnTx.wait(1);
      }
    } catch (chainErr: unknown) {
      const msg = chainErr instanceof Error ? chainErr.message : String(chainErr);
      console.error('[loan-lifecycle] Chain burn NFT failed (non-fatal):', msg);
    }
  }

  return res.status(200).json({ success: true, message: `Loan transitioned to '${transition.to}'`, newStatus: transition.to });
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

  const principal = parseFloat(loan.outstanding_principal_usd);
  const accrualStart = loan.last_payment_at ?? loan.funded_at;
  const accrued = computeAccruedInterest(principal, loan.interest_rate_bps, accrualStart);
  const totalDue = principal + accrued;

  if (paymentUsd > totalDue + 0.01) {
    return res.status(400).json({
      success: false,
      error: `Overpayment guard: total outstanding is $${totalDue.toFixed(2)} (principal $${principal.toFixed(2)} + accrued interest $${accrued.toFixed(6)}). Payment of $${paymentUsd.toFixed(2)} exceeds this.`,
    });
  }

  const interestPortion = Math.min(paymentUsd, accrued);
  const principalPortion = paymentUsd - interestPortion;
  const newPrincipal = Math.max(0, principal - principalPortion);
  const newTotalRepaid = parseFloat(loan.total_repaid_usd) + paymentUsd;
  const newTotalInterestPaid = parseFloat(loan.total_interest_paid_usd) + interestPortion;

  const newStatus: string = newPrincipal < 0.01 ? 'repaid' : (loan.status === 'delinquent' ? 'active' : 'active');

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
      txHash ?? null,
    ]
  );

  return res.status(200).json({
    success: true,
    paymentRecorded: paymentUsd.toFixed(2),
    interestPortionUsd: interestPortion.toFixed(6),
    principalPortionUsd: principalPortion.toFixed(2),
    remainingPrincipalUsd: newPrincipal.toFixed(2),
    totalInterestPaidUsd: newTotalInterestPaid.toFixed(6),
    loanStatus: newStatus,
    message: newStatus === 'repaid'
      ? 'Loan fully repaid. Status updated to Repaid.'
      : 'Payment recorded. Interest-first allocation applied.',
  });
}
