import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';
import { fetchComparableSales } from '../../../../../server/services/real-estate/rentcast';
import { successResponse, errorResponse, buildMeta } from '../../../../../server/services/real-estate/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return errorResponse(res, 400, 'INVALID_ID', 'Deal ID is required');
  }

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT * FROM re_comparables WHERE deal_id = $1 ORDER BY distance_miles ASC NULLS LAST, sale_date DESC NULLS LAST`,
        [id]
      );

      const avmResult = await pool.query(
        `SELECT meta->'avm' as avm FROM re_deals WHERE id = $1`,
        [id]
      );
      const avm = avmResult.rows[0]?.avm || null;

      return successResponse(res, {
        comps: result.rows,
        count: result.rows.length,
        avm,
      }, buildMeta(['internal_db'], result.rows.length > 0 ? 0.8 : 0.3));
    } catch (err: any) {
      return errorResponse(res, 500, 'INTERNAL_ERROR', err.message);
    }
  }

  if (req.method === 'POST') {
    try {
      const dealResult = await pool.query(
        `SELECT d.id, d.property_id, p.address_raw, p.address_normalized
         FROM re_deals d
         JOIN re_properties p ON d.property_id = p.id
         WHERE d.id = $1`,
        [id]
      );

      if (dealResult.rows.length === 0) {
        return errorResponse(res, 404, 'DEAL_NOT_FOUND', 'Deal does not exist');
      }

      const deal = dealResult.rows[0];
      const address = deal.address_normalized || deal.address_raw;

      if (!address) {
        return errorResponse(res, 400, 'NO_ADDRESS', 'Property has no address for comp lookup');
      }

      const compCount = req.body?.compCount || 15;
      const result = await fetchComparableSales(address, compCount);

      await pool.query(`DELETE FROM re_comparables WHERE deal_id = $1`, [id]);

      let inserted = 0;
      for (const comp of result.comparables) {
        const salePrice = comp.price || comp.lastSalePrice;
        if (!salePrice) continue;

        const pricePerSqft = comp.squareFootage && comp.squareFootage > 0
          ? Math.round((salePrice / comp.squareFootage) * 100) / 100
          : null;

        await pool.query(
          `INSERT INTO re_comparables (
            id, deal_id, property_id, address, city, state, zip,
            lat, lon, distance_miles, property_type, sqft, lot_sqft,
            bedrooms, bathrooms, year_built, sale_price, sale_date,
            price_per_sqft, days_on_market, source, similarity_score,
            is_selected, meta, created_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12,
            $13, $14, $15, $16, $17,
            $18, $19, $20, $21,
            true, $22, now()
          )`,
          [
            id,
            deal.property_id,
            comp.formattedAddress,
            comp.city || null,
            comp.state || null,
            comp.zipCode || null,
            comp.latitude || null,
            comp.longitude || null,
            comp.distance || null,
            comp.propertyType || null,
            comp.squareFootage || null,
            comp.lotSize || null,
            comp.bedrooms || null,
            comp.bathrooms || null,
            comp.yearBuilt || null,
            salePrice,
            comp.lastSaleDate || null,
            pricePerSqft,
            comp.daysOnMarket || null,
            'rentcast',
            comp.correlation || null,
            JSON.stringify({
              rentcastId: comp.id,
              listingType: comp.listingType,
              fetchedAt: new Date().toISOString(),
            }),
          ]
        );
        inserted++;
      }

      if (result.value) {
        await pool.query(
          `UPDATE re_deals SET meta = COALESCE(meta, '{}'::jsonb) || $1::jsonb WHERE id = $2`,
          [
            JSON.stringify({
              avm: {
                value: result.value,
                rangeLow: result.valueRangeLow,
                rangeHigh: result.valueRangeHigh,
                pricePerSqft: result.pricePerSqft,
                fetchedAt: new Date().toISOString(),
                source: 'rentcast',
              },
            }),
            id,
          ]
        );
      }

      const allComps = await pool.query(
        `SELECT * FROM re_comparables WHERE deal_id = $1 ORDER BY distance_miles ASC NULLS LAST`,
        [id]
      );

      return successResponse(res, {
        comps: allComps.rows,
        count: inserted,
        avm: result.value ? {
          value: result.value,
          rangeLow: result.valueRangeLow,
          rangeHigh: result.valueRangeHigh,
          pricePerSqft: result.pricePerSqft,
        } : null,
      }, buildMeta(['rentcast_api', 'internal_db'], 0.85));
    } catch (err: any) {
      console.error('Comps fetch error:', err.message);
      return errorResponse(res, 500, 'COMPS_FETCH_FAILED', `Failed to fetch comparable sales: ${err.message}`);
    }
  }

  return errorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'GET or POST only');
}
