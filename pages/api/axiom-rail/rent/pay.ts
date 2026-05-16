/**
 * POST /api/axiom-rail/rent/pay
 *
 * Initiates a rent payment from a tenant to a registered landlord property.
 * Creates a stellar_payment_transfers record with:
 *  - corridorId: 'usd-to-usd-rent-axiom-rail'
 *  - destinationAccount: landlord bank (name | account | routing | type)
 *  - anchorRawResponse.bsa: tenant BSA identity (never returned to caller)
 *  - anchorRawResponse.propertySlug: for dashboard reconciliation
 *
 * Security:
 *  - Rate limited: 10 requests per IP per minute
 *  - CORS restricted to allowlist origins
 *  - BSA data stripped from all API responses (stripBsaFromRecord)
 *  - No SEP-10 JWT required — public-facing tenant payment flow
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { setRailCors, handlePreflight } from '../../../../lib/multichain/stellar/axiom-rail/corsUtils';
import { checkRateLimit } from '../../../../lib/multichain/stellar/axiom-rail/rateLimiter';
import { stripBsaFromRecord } from '../../../../lib/multichain/stellar/axiom-rail/stripBsa';
import { AXIOM_RAIL_FEE_FIXED_USD, AXIOM_RAIL_FEE_PERCENT } from '../../../../lib/multichain/stellar/axiom-rail/AxiomRailService';
import { db } from '../../../../server/db';
import { stellarPaymentTransfers } from '../../../../shared/stellarSchema';
import { axiomRailRentProperties } from '../../../../shared/rentSchema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setRailCors(req, res);
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!checkRateLimit(req, res, 'rent/pay', { max: 10, windowMs: 60_000 })) return;

  const {
    propertySlug,
    amountUsd,
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
    propertySlug?: string;
    amountUsd?: string;
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

  if (!propertySlug?.trim()) return res.status(400).json({ error: 'propertySlug is required' });

  const parsedAmount = parseFloat(amountUsd ?? '0');
  if (isNaN(parsedAmount) || parsedAmount < 10 || parsedAmount > 25000) {
    return res.status(400).json({ error: 'amountUsd must be between $10 and $25,000' });
  }

  if (!routingNumber || !/^\d{9}$/.test(routingNumber)) {
    return res.status(400).json({ error: 'routingNumber must be exactly 9 digits' });
  }
  if (!accountNumber?.trim()) return res.status(400).json({ error: 'accountNumber is required' });
  if (!accountName?.trim()) return res.status(400).json({ error: 'accountName is required' });
  if (!transferType || !['ACH', 'Wire'].includes(transferType)) {
    return res.status(400).json({ error: 'transferType must be ACH or Wire' });
  }

  const missingBsa: string[] = [];
  if (!bsaLegalName) missingBsa.push('bsaLegalName');
  if (!bsaDob) missingBsa.push('bsaDob');
  if (!bsaCountry) missingBsa.push('bsaCountry');
  if (!bsaIdType) missingBsa.push('bsaIdType');
  if (!bsaIdNumber) missingBsa.push('bsaIdNumber');
  if (missingBsa.length > 0) {
    return res.status(400).json({ error: `Missing identity fields: ${missingBsa.join(', ')}` });
  }

  if (!['ssn', 'passport'].includes(bsaIdType!)) {
    return res.status(400).json({ error: 'bsaIdType must be ssn or passport' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bsaDob!)) {
    return res.status(400).json({ error: 'bsaDob must be YYYY-MM-DD' });
  }
  if (bsaIdType === 'ssn' && !/^\d{4}$/.test(bsaIdNumber!)) {
    return res.status(400).json({ error: 'bsaIdNumber must be exactly 4 digits for SSN' });
  }
  if (bsaIdType === 'passport' && !/^[A-Z0-9]{3,20}$/i.test(bsaIdNumber!)) {
    return res.status(400).json({ error: 'bsaIdNumber must be 3–20 alphanumeric characters for passport' });
  }

  try {
    const props = await db
      .select()
      .from(axiomRailRentProperties)
      .where(eq(axiomRailRentProperties.slug, propertySlug.trim()))
      .limit(1);

    if (props.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const property = props[0];

    const fee = AXIOM_RAIL_FEE_FIXED_USD + parsedAmount * AXIOM_RAIL_FEE_PERCENT;
    const amountOut = Math.max(0, parsedAmount - fee);
    const txId = uuidv4();
    const memo = txId.replace(/-/g, '').slice(0, 28).toUpperCase();

    const destinationAccount = `${property.receivingBankName} | Account: ${property.receivingBankAccount} | Routing: ${property.receivingBankRouting} | ${transferType}`;

    const rawRecord = {
      id: txId,
      axiomWalletAddress: '0x0000000000000000000000000000000000000000',
      stellarPublicKey: null,
      anchorId: 'axiom-rail',
      corridorId: 'usd-to-usd-rent-axiom-rail',
      sourceAmountAxusd: parsedAmount.toFixed(2),
      destinationCurrency: 'USD',
      destinationAmount: amountOut.toFixed(2),
      destinationAccount,
      feeEstimate: fee.toFixed(2),
      status: 'pending_user_transfer_start' as const,
      sepProtocol: 'rent',
      anchorRawResponse: {
        propertySlug: propertySlug.trim(),
        propertyAddress: property.propertyAddress,
        landlordName: property.landlordName,
        transferType,
        tenantAccountName: accountName.trim(),
        tenantRoutingNumber: routingNumber,
        tenantAccountNumber: accountNumber.trim(),
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
    };

    await db.insert(stellarPaymentTransfers).values(rawRecord);

    const safe = stripBsaFromRecord({ ...rawRecord, anchorRawResponse: rawRecord.anchorRawResponse });

    return res.status(201).json({
      transferId: txId,
      memo,
      amountUsd: parsedAmount.toFixed(2),
      fee: fee.toFixed(2),
      amountOut: amountOut.toFixed(2),
      transferType,
      propertySlug: propertySlug.trim(),
      propertyAddress: property.propertyAddress,
      landlordName: property.landlordName,
      status: safe.status,
      message: `Rent payment recorded. Reference: ${memo}. Settlement via ${transferType === 'Wire' ? 'wire (same business day)' : 'ACH (1–3 business days)'}.`,
    });
  } catch (err) {
    console.error('[AxiomRail Rent] Pay error:', err);
    return res.status(500).json({ error: 'Failed to record payment' });
  }
}
