/**
 * POST /api/axiom-rail/rent/setup
 *
 * Registers a landlord property and returns the shareable payment URL
 * plus a plaintext management token (shown once — hash stored only).
 *
 * Slug: deterministic kebab-case from address + random suffix (URL-safe).
 * Management token: 32 random hex bytes; stored as SHA-256 + static salt hash.
 *
 * Security:
 *  - Rate limited: 5 setup requests per IP per hour
 *  - CORS restricted to allowlist origins
 *  - Bank details stored; never exposed in public tenant-facing endpoints
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash, randomBytes } from 'crypto';
import { setRailCors, handlePreflight } from '../../../../lib/multichain/stellar/axiom-rail/corsUtils';
import { checkRateLimit } from '../../../../lib/multichain/stellar/axiom-rail/rateLimiter';
import { db } from '../../../../server/db';
import { axiomRailRentProperties } from '../../../../shared/rentSchema';

// Salt baked into the management token hash. Not secret — just prevents
// pre-computed rainbow tables against the plaintext token.
const TOKEN_SALT = 'axiom-rail-rent-mgmt-token-v1';

function hashToken(plaintext: string): string {
  return createHash('sha256').update(`${TOKEN_SALT}:${plaintext}`).digest('hex');
}

function generateSlug(address: string, suffix: string): string {
  const base = address
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join('-');
  return `${base}-${suffix}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setRailCors(req, res);
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!checkRateLimit(req, res, 'rent/setup', { max: 5, windowMs: 3600_000 })) return;

  const {
    landlordName,
    propertyAddress,
    receivingBankRouting,
    receivingBankAccount,
    receivingBankName,
    defaultRentAmount,
  } = req.body as {
    landlordName?: string;
    propertyAddress?: string;
    receivingBankRouting?: string;
    receivingBankAccount?: string;
    receivingBankName?: string;
    defaultRentAmount?: string;
  };

  if (!landlordName?.trim()) return res.status(400).json({ error: 'landlordName is required' });
  if (!propertyAddress?.trim()) return res.status(400).json({ error: 'propertyAddress is required' });
  if (!receivingBankRouting || !/^\d{9}$/.test(receivingBankRouting)) {
    return res.status(400).json({ error: 'receivingBankRouting must be exactly 9 digits' });
  }
  if (!receivingBankAccount?.trim()) return res.status(400).json({ error: 'receivingBankAccount is required' });
  if (!receivingBankName?.trim()) return res.status(400).json({ error: 'receivingBankName is required' });

  const parsedDefault = defaultRentAmount ? parseFloat(defaultRentAmount) : null;
  if (defaultRentAmount && (isNaN(parsedDefault!) || parsedDefault! <= 0)) {
    return res.status(400).json({ error: 'defaultRentAmount must be a positive number' });
  }

  const slugSuffix = randomBytes(3).toString('hex');
  const slug = generateSlug(propertyAddress.trim(), slugSuffix);

  const plainToken = randomBytes(32).toString('hex');
  const tokenHash = hashToken(plainToken);

  try {
    await db.insert(axiomRailRentProperties).values({
      slug,
      landlordName: landlordName.trim(),
      propertyAddress: propertyAddress.trim(),
      receivingBankRouting,
      receivingBankAccount: receivingBankAccount.trim(),
      receivingBankName: receivingBankName.trim(),
      defaultRentAmount: parsedDefault != null ? parsedDefault.toFixed(2) : null,
      managementTokenHash: tokenHash,
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://axiomprotocol.app';
    const paymentUrl = `${baseUrl}/rent-collection/pay/${slug}`;

    return res.status(201).json({
      slug,
      paymentUrl,
      managementToken: plainToken,
      landlordName: landlordName.trim(),
      propertyAddress: propertyAddress.trim(),
      defaultRentAmount: parsedDefault?.toFixed(2) ?? null,
    });
  } catch (err) {
    console.error('[AxiomRail Rent] Setup error:', err);
    return res.status(500).json({ error: 'Failed to create property' });
  }
}
