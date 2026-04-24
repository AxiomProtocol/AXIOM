/**
 * GET /api/axiom-rail/rent/dashboard
 *
 * Landlord dashboard — returns all properties and associated payment records.
 * Requires the management token in the X-Mgmt-Token header.
 * Token is compared constant-time against all stored hashes for the query set.
 *
 * Security:
 *  - Management token required (X-Mgmt-Token header)
 *  - Constant-time hash comparison (timingSafeEqual)
 *  - BSA identity stripped from all transfer records (stripBsaFromRecord)
 *  - Rate limited: 20 req/min/IP
 *  - CORS restricted to allowlist origins
 *  - No bank account numbers in transfer records returned
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash, timingSafeEqual } from 'crypto';
import { eq, and, sql } from 'drizzle-orm';
import { setRailCors, handlePreflight } from '../../../../lib/multichain/stellar/axiom-rail/corsUtils';
import { checkRateLimit } from '../../../../lib/multichain/stellar/axiom-rail/rateLimiter';
import { stripBsaFromRecord } from '../../../../lib/multichain/stellar/axiom-rail/stripBsa';
import { db } from '../../../../server/db';
import { axiomRailRentProperties } from '../../../../shared/rentSchema';
import { stellarPaymentTransfers } from '../../../../shared/stellarSchema';

const TOKEN_SALT = 'axiom-rail-rent-mgmt-token-v1';

function hashToken(plaintext: string): string {
  return createHash('sha256').update(`${TOKEN_SALT}:${plaintext}`).digest('hex');
}

function constantTimeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setRailCors(req, res);
  if (handlePreflight(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!checkRateLimit(req, res, 'rent/dashboard', { max: 20, windowMs: 60_000 })) return;

  const rawToken = req.headers['x-mgmt-token'];
  if (!rawToken || typeof rawToken !== 'string' || !rawToken.trim()) {
    return res.status(401).json({ error: 'Management token required (X-Mgmt-Token header)' });
  }

  const providedHash = hashToken(rawToken.trim());

  try {
    const allProperties = await db
      .select()
      .from(axiomRailRentProperties)
      .orderBy(axiomRailRentProperties.createdAt);

    // Find all properties whose token hash matches the provided token (constant-time)
    const matchingProps = allProperties.filter(p =>
      constantTimeCompare(p.managementTokenHash, providedHash)
    );

    if (matchingProps.length === 0) {
      return res.status(403).json({ error: 'Invalid management token' });
    }

    const propertiesWithPayments = await Promise.all(
      matchingProps.map(async (prop) => {
        const propPayments = await db
          .select()
          .from(stellarPaymentTransfers)
          .where(
            and(
              eq(stellarPaymentTransfers.corridorId, 'usd-to-usd-rent-axiom-rail'),
              sql`${stellarPaymentTransfers.anchorRawResponse}->>'propertySlug' = ${prop.slug}`
            )
          );

        const safePayments = propPayments.map(payment => {
          const stripped = stripBsaFromRecord(payment);
          const raw = stripped.anchorRawResponse as Record<string, unknown> | null;
          return {
            transferId: stripped.id,
            amountUsd: stripped.sourceAmountAxusd,
            fee: stripped.feeEstimate,
            status: stripped.status,
            transferType: (raw?.transferType as string) ?? null,
            tenantAccountName: (raw?.tenantAccountName as string) ?? null,
            submittedAt: raw?.submittedAt ?? null,
            initiatedAt: stripped.initiatedAt,
            completedAt: stripped.completedAt,
          };
        });

        return {
          id: prop.id,
          slug: prop.slug,
          landlordName: prop.landlordName,
          propertyAddress: prop.propertyAddress,
          defaultRentAmount: prop.defaultRentAmount ?? null,
          receivingBankName: prop.receivingBankName,
          createdAt: prop.createdAt,
          payments: safePayments,
          totalReceived: safePayments
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + parseFloat(p.amountUsd ?? '0'), 0)
            .toFixed(2),
          pendingCount: safePayments.filter(p =>
            p.status === 'pending_user_transfer_start' || p.status === 'pending_anchor'
          ).length,
        };
      })
    );

    return res.status(200).json({
      properties: propertiesWithPayments,
      propertyCount: propertiesWithPayments.length,
    });
  } catch (err) {
    console.error('[AxiomRail Rent] Dashboard error:', err);
    return res.status(500).json({ error: 'Failed to retrieve dashboard data' });
  }
}
