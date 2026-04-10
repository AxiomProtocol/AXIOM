/**
 * POST /api/axiom-rail/sep24/submit
 *
 * Records bank details and BSA identity submitted from the SEP-24 interactive UI.
 * Called by the withdraw or deposit interactive page after the user
 * provides their banking information and identity (BSA compliance).
 *
 * Identity data is stored in anchorRawResponse.bsa and never returned
 * in public-facing API responses.
 *
 * Security:
 *  - JWT is verified and bound to stellarAccount in the request body.
 *  - Rate limited: 10 submissions per IP per minute.
 *  - CORS restricted to our origin only (called by our own interactive pages).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyRailJwt, AXIOM_RAIL_DEPOSIT_ACCOUNT, AXIOM_RAIL_FEE_FIXED_USD, AXIOM_RAIL_FEE_PERCENT } from '../../../../lib/multichain/stellar/axiom-rail/AxiomRailService';
import { setRailCors, handlePreflight } from '../../../../lib/multichain/stellar/axiom-rail/corsUtils';
import { checkRateLimit } from '../../../../lib/multichain/stellar/axiom-rail/rateLimiter';
import { db } from '../../../../server/db';
import { stellarPaymentTransfers } from '../../../../shared/stellarSchema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setRailCors(req, res);
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!checkRateLimit(req, res, 'sep24/submit', { max: 10, windowMs: 60_000 })) return;

  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { account: jwtAccount, valid } = verifyRailJwt(token);
  if (!valid) return res.status(403).json({ error: 'Invalid or expired SEP-10 token' });

  const {
    txId,
    kind,
    asset,
    amount,
    stellarAccount,
    routingNumber,
    accountNumber,
    accountName,
    transferType,
    bsaLegalName,
    bsaDob,
    bsaCountry,
    bsaIdType,
    bsaIdNumber,
  } = req.body as {
    txId?: string;
    kind?: 'withdraw' | 'deposit';
    asset?: string;
    amount?: string;
    stellarAccount?: string;
    routingNumber?: string;
    accountNumber?: string;
    accountName?: string;
    transferType?: string;
    bsaLegalName?: string;
    bsaDob?: string;
    bsaCountry?: string;
    bsaIdType?: string;
    bsaIdNumber?: string;
  };

  if (!txId) return res.status(400).json({ error: 'txId required' });
  if (!kind || !['withdraw', 'deposit'].includes(kind)) return res.status(400).json({ error: 'kind must be withdraw or deposit' });

  if (!routingNumber || !accountNumber || !accountName) {
    return res.status(400).json({ error: 'routingNumber, accountNumber, and accountName are required' });
  }

  // ── JWT-to-record ownership binding ──────────────────────────────────────
  // The stellarAccount in the body must match the account from the JWT.
  // This prevents a valid token holder from forging records on behalf of
  // a different account.
  const senderKey = stellarAccount ?? jwtAccount;
  if (stellarAccount && stellarAccount !== jwtAccount) {
    console.warn(`[sep24/submit] stellarAccount mismatch: JWT=${jwtAccount} body=${stellarAccount}`);
    return res.status(403).json({ error: 'stellarAccount does not match authenticated account' });
  }

  // ── BSA identity validation — presence check ──────────────────────────────
  const missingIdentity: string[] = [];
  if (!bsaLegalName) missingIdentity.push('bsaLegalName');
  if (!bsaDob) missingIdentity.push('bsaDob');
  if (!bsaCountry) missingIdentity.push('bsaCountry');
  if (!bsaIdType) missingIdentity.push('bsaIdType');
  if (!bsaIdNumber) missingIdentity.push('bsaIdNumber');
  if (missingIdentity.length > 0) {
    return res.status(400).json({ error: `Missing identity fields: ${missingIdentity.join(', ')}` });
  }

  // ── BSA identity validation — format/semantic checks ─────────────────────
  const allowedIdTypes = ['ssn', 'passport'];
  if (!allowedIdTypes.includes(bsaIdType!)) {
    return res.status(400).json({ error: `bsaIdType must be one of: ${allowedIdTypes.join(', ')}` });
  }
  const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dobRegex.test(bsaDob!)) {
    return res.status(400).json({ error: 'bsaDob must be in YYYY-MM-DD format' });
  }
  if (bsaIdType === 'ssn') {
    if (!/^\d{4}$/.test(bsaIdNumber!)) {
      return res.status(400).json({ error: 'bsaIdNumber must be exactly 4 digits for SSN' });
    }
  } else {
    if (!/^[A-Z0-9]{3,20}$/i.test(bsaIdNumber!)) {
      return res.status(400).json({ error: 'bsaIdNumber must be 3–20 alphanumeric characters for passport' });
    }
  }

  const parsedAmount = parseFloat(amount ?? '0');
  const feeFixed = AXIOM_RAIL_FEE_FIXED_USD;
  const feePercent = parsedAmount * AXIOM_RAIL_FEE_PERCENT;
  const totalFee = feeFixed + feePercent;
  const amountOut = Math.max(0, parsedAmount - totalFee);

  const destinationAccount = `${accountName} | Account: ${accountNumber} | Routing: ${routingNumber} | ${transferType ?? 'ACH'}`;
  const memo = txId.replace(/^axr-(wdr|dep)-/, '').replace(/-/g, '').slice(0, 28).toUpperCase();

  const corridorId = kind === 'withdraw'
    ? 'usdc-to-usd-axiom-rail-rtp'
    : 'usd-to-usdc-axiom-rail-ach';

  try {
    await db.insert(stellarPaymentTransfers).values({
      id: txId,
      axiomWalletAddress: senderKey.startsWith('G')
        ? '0x0000000000000000000000000000000000000000'
        : senderKey,
      stellarPublicKey: senderKey.startsWith('G') ? senderKey : null,
      anchorId: 'axiom-rail',
      corridorId,
      sourceAmountAxusd: parsedAmount > 0 ? parsedAmount.toFixed(2) : '0.00',
      destinationCurrency: 'USD',
      destinationAmount: amountOut > 0 ? amountOut.toFixed(2) : null,
      destinationAccount,
      feeEstimate: totalFee > 0 ? totalFee.toFixed(2) : null,
      status: 'pending_user_transfer_start',
      sepProtocol: 'sep24',
      sep31StellarAccountId: kind === 'withdraw' ? AXIOM_RAIL_DEPOSIT_ACCOUNT : null,
      sep31StellarMemo: kind === 'withdraw' ? memo : null,
      anchorRawResponse: {
        kind,
        asset: asset ?? 'USDC',
        submittedAt: new Date().toISOString(),
        bsa: {
          legalName: bsaLegalName,
          dob: bsaDob,
          country: bsaCountry,
          idType: bsaIdType,
          idNumber: bsaIdNumber,
          collectedAt: new Date().toISOString(),
        },
      },
    });

    return res.status(200).json({
      success: true,
      id: txId,
      message: kind === 'withdraw'
        ? `Bank details received. Send ${asset ?? 'USDC'} to Axiom Rail with memo ${memo}.`
        : 'Bank details received. Initiate your ACH or wire transfer to the account shown. We will credit your Stellar account after settlement.',
    });
  } catch (err) {
    console.error('[AxiomRail SEP-24 submit] DB error:', err);
    return res.status(500).json({ error: 'Failed to record submission' });
  }
}
