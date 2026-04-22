/**
 * GET /api/axiom-rail/rent/property/[slug]
 *
 * Public endpoint — returns display-safe property info for the tenant
 * payment page. No bank details, no management token in response.
 *
 * Security:
 *  - CORS open (public discovery endpoint)
 *  - No authentication required
 *  - Bank details (routing/account) never returned
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { eq } from 'drizzle-orm';
import { setOpenCors, handlePreflight } from '../../../../../lib/multichain/stellar/axiom-rail/corsUtils';
import { db } from '../../../../../server/db';
import { axiomRailRentProperties } from '../../../../../shared/rentSchema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setOpenCors(res);
  if (handlePreflight(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { slug } = req.query;
  if (!slug || typeof slug !== 'string') return res.status(400).json({ error: 'slug is required' });

  try {
    const props = await db
      .select()
      .from(axiomRailRentProperties)
      .where(eq(axiomRailRentProperties.slug, slug))
      .limit(1);

    if (props.length === 0) return res.status(404).json({ error: 'Property not found' });

    const p = props[0];

    // Return only display-safe fields — no bank routing/account, no token hash
    const landlordFirstName = p.landlordName.split(' ')[0];

    return res.status(200).json({
      slug: p.slug,
      propertyAddress: p.propertyAddress,
      landlordFirstName,
      defaultRentAmount: p.defaultRentAmount ?? null,
    });
  } catch (err) {
    console.error('[AxiomRail Rent] Property lookup error:', err);
    return res.status(500).json({ error: 'Failed to retrieve property' });
  }
}
