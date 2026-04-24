import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../lib/db';
import { ensureMatrixRoomForDeal, postStructuredMatrixEvent } from '../../../../../server/services/matrix/workflow';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Listing ID is required' });
  }

  const { strategy = 'brrrr', walletAddress } = req.body;

  const validStrategies = ['brrrr', 'flip', 'hold', 'note', 'multifamily'];
  if (!validStrategies.includes(strategy)) {
    return res.status(400).json({ error: `Strategy must be one of: ${validStrategies.join(', ')}` });
  }

  const client = await pool.connect();
  try {
    const listingRes = await client.query(
      `SELECT * FROM dp_listings WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (listingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    const listing = listingRes.rows[0];

    const fullAddress = [listing.address, listing.city, listing.state, listing.zip]
      .filter(Boolean).join(', ');

    let propertyId: string;

    const existingPropRes = await client.query(
      `SELECT id FROM re_properties WHERE address_raw = $1 LIMIT 1`,
      [listing.address]
    );

    if (existingPropRes.rows.length > 0) {
      propertyId = existingPropRes.rows[0].id;
    } else {
      const propInsert = await client.query(
        `INSERT INTO re_properties (
          address_raw, address_normalized, city, state, zip,
          property_type, bedrooms, bathrooms, sqft, year_built,
          lot_sqft, lat, lon, external_id,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14,
          NOW(), NOW()
        ) RETURNING id`,
        [
          listing.address,
          fullAddress,
          listing.city,
          listing.state,
          listing.zip,
          listing.property_type || 'single_family',
          listing.bedrooms || null,
          listing.bathrooms || null,
          listing.sqft || null,
          listing.year_built || null,
          listing.lot_sqft || null,
          listing.lat || null,
          listing.lon || null,
          `dp_${listing.id}`,
        ]
      );
      propertyId = propInsert.rows[0].id;
    }

    const dealIdRes = await client.query(`SELECT gen_random_uuid() as id`);
    const dealId = dealIdRes.rows[0].id;
    const dealName = `${strategy.toUpperCase()} — ${fullAddress}`;

    await client.query(
      `INSERT INTO re_deals (id, property_id, strategy, status, deal_name, notes, created_by_wallet, created_at, updated_at)
       VALUES ($1, $2, $3::deal_strategy, 'draft', $4, $5, $6, NOW(), NOW())`,
      [
        dealId,
        propertyId,
        strategy,
        dealName,
        `Promoted from distressed feed. Source: ${listing.source}. Distress type: ${listing.distress_type}.${listing.source_url ? ` Original listing: ${listing.source_url}` : ''}`,
        walletAddress || null,
      ]
    );

    const scenIdRes = await client.query(`SELECT gen_random_uuid() as id`);
    const scenarioId = scenIdRes.rows[0].id;

    await client.query(
      `INSERT INTO re_deal_scenarios (id, deal_id, scenario_name, is_primary, created_at, updated_at)
       VALUES ($1, $2, 'Base Case', true, NOW(), NOW())`,
      [scenarioId, dealId]
    );

    const purchasePrice = listing.list_price || 200000;
    const estimatedValue = listing.estimated_value || purchasePrice;
    const arv = estimatedValue > purchasePrice ? estimatedValue : purchasePrice * 1.3;
    const rehabBudget = listing.discount_pct
      ? Math.round(purchasePrice * (listing.discount_pct / 100) * 0.7)
      : 40000;
    const sqft = listing.sqft || 1200;
    const monthlyRent = Math.round(sqft * 1.1);

    await client.query(
      `INSERT INTO re_deal_assumptions (
        id, scenario_id,
        purchase_price, arv_estimate, rehab_budget,
        down_payment_pct, interest_rate, loan_term_years, closing_cost_pct,
        monthly_rent, vacancy_pct, property_mgmt_pct,
        annual_insurance, annual_taxes, annual_capex, annual_maintenance,
        hold_period_months, appreciation_pct,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1,
        $2, $3, $4,
        20, 7.5, 30, 3,
        $5, 8, 10,
        1800, 3600, 2000, 2000,
        6, 3,
        NOW(), NOW()
      )`,
      [scenarioId, purchasePrice, arv, rehabBudget, monthlyRent]
    );

    await client.query(
      `INSERT INTO re_decision_log (id, deal_id, decision, decided_by, rationale, decided_at)
       VALUES (gen_random_uuid(), $1, 'DEAL_CREATED', 'system', $2, NOW())`,
      [dealId, `Deal workspace created from distressed feed listing. Source: ${listing.source}. List price: $${purchasePrice.toLocaleString()}. Address: ${fullAddress}.`]
    );

    setImmediate(async () => {
      try {
        const room = await ensureMatrixRoomForDeal(dealId, dealName);
        await postStructuredMatrixEvent(room.roomId, {
          eventType: 'axiom.deal.created',
          payload: {
            dealId,
            dealName,
            strategy,
            propertyAddress: fullAddress,
            status: 'draft',
            source: 'distressed_feed',
            listingId: listing.id,
          },
        }, 'deal', dealId);
      } catch (_) {}
    });

    return res.status(201).json({ dealId, dealName, propertyId, scenarioId });
  } catch (err: any) {
    console.error('promote-to-deal error:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
