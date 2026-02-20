import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import {
  isAttomConfigured,
  fetchAttomExpandedProfile,
  fetchAttomSalesHistory,
  fetchAttomTaxHistory,
  parseAttomAddress,
} from '../../../lib/re/attom';
import { isRentcastConfigured, fetchRentEstimate, fetchValueEstimate } from '../../../lib/re/rentcast';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const { property_id } = req.body || {};
  if (typeof property_id !== 'string' || !UUID_RE.test(property_id)) {
    return res.status(400).json({ error: { message: 'Invalid property_id.' } });
  }

  try {
    const propResult = await pool.query(
      `SELECT id, address_raw, address_normalized, street_number, street_name,
              city, state, zip, property_type, sqft, bedrooms, bathrooms
       FROM re_properties WHERE id = $1 AND is_active = true`,
      [property_id]
    );

    if (propResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Property not found.' } });
    }

    const prop = propResult.rows[0];
    const address1 =
      [prop.street_number, prop.street_name].filter(Boolean).join(' ') || prop.address_raw;
    const address2 = [prop.city, prop.state, prop.zip].filter(Boolean).join(', ');
    const fullAddress = [address1, address2].filter(Boolean).join(', ');

    const warnings: string[] = [];
    let written = 0;
    const now = new Date().toISOString().split('T')[0];

    if (isAttomConfigured()) {
      const [profile, salesHistory, taxHistory] = await Promise.all([
        fetchAttomExpandedProfile(address1, address2),
        fetchAttomSalesHistory(address1, address2),
        fetchAttomTaxHistory(address1, address2),
      ]);

      if (profile) {
        const { address1: a1 } = parseAttomAddress(profile);
        const normalized = a1.toLowerCase().trim();
        if (normalized) {
          await pool.query(
            `UPDATE re_properties SET address_normalized = $1, updated_at = NOW()
             WHERE id = $2`,
            [normalized, property_id]
          );
        }

        if (profile.building?.size?.universalSize) {
          await pool.query(
            `UPDATE re_properties SET sqft = $1, updated_at = NOW() WHERE id = $2`,
            [profile.building.size.universalSize, property_id]
          );
        }
      }

      for (const sale of salesHistory) {
        if (!sale.saleTransDate) continue;
        const price = sale.amount?.saleAmt ?? null;
        const pricePerSqft = sale.amount?.pricePerSqft ?? null;
        const buyer = sale.buyer1FullName ?? null;
        const seller = sale.seller1FullName ?? null;
        const deedType = sale.amount?.saleDocType ?? null;
        const isArmsLength = sale.multi?.isArmsLength ?? true;

        await pool.query(
          `INSERT INTO re_sales (id, property_id, sale_date, sale_price, price_per_sqft,
                                  buyer, seller, deed_type, is_arms_length)
           SELECT gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8
           WHERE NOT EXISTS (
             SELECT 1 FROM re_sales WHERE property_id = $1 AND sale_date = $2
           )`,
          [property_id, sale.saleTransDate, price, pricePerSqft, buyer, seller, deedType, isArmsLength]
        );
        written++;
      }

      for (const tax of taxHistory) {
        if (!tax.assessedYear) continue;
        await pool.query(
          `INSERT INTO re_taxes (id, property_id, tax_year, assessed_total,
                                  market_value, tax_amount, tax_rate)
           SELECT gen_random_uuid(), $1, $2, $3, $4, $5, $6
           WHERE NOT EXISTS (
             SELECT 1 FROM re_taxes WHERE property_id = $1 AND tax_year = $2
           )`,
          [
            property_id,
            tax.assessedYear,
            tax.assessed?.assdTtlValue ?? null,
            tax.market?.mktTtlValue ?? null,
            tax.tax?.taxAmt ?? null,
            tax.calcTaxRate ?? null,
          ]
        );
        written++;
      }
    } else {
      warnings.push('Property data provider not configured — no external data fetched.');
    }

    if (isRentcastConfigured()) {
      const [rentEst, valueEst] = await Promise.all([
        fetchRentEstimate({
          address: fullAddress,
          propertyType: prop.property_type ?? undefined,
          squareFootage: prop.sqft ?? undefined,
          bedrooms: prop.bedrooms ?? undefined,
          bathrooms: prop.bathrooms ? parseFloat(prop.bathrooms) : undefined,
        }),
        fetchValueEstimate({
          address: fullAddress,
          propertyType: prop.property_type ?? undefined,
          squareFootage: prop.sqft ?? undefined,
          bedrooms: prop.bedrooms ?? undefined,
          bathrooms: prop.bathrooms ? parseFloat(prop.bathrooms) : undefined,
        }),
      ]);

      if (rentEst) {
        await pool.query(
          `INSERT INTO re_property_facts (id, property_id, fact_type, fact_numeric, as_of, confidence)
           VALUES (gen_random_uuid(), $1, 'rent_estimate', $2, $3, $4)`,
          [property_id, rentEst.rent, now, 0.8]
        );
        written++;
      }

      if (valueEst) {
        await pool.query(
          `INSERT INTO re_property_facts (id, property_id, fact_type, fact_numeric, as_of, confidence)
           VALUES (gen_random_uuid(), $1, 'value_estimate', $2, $3, $4)`,
          [property_id, valueEst.price, now, 0.8]
        );
        written++;
      }
    }

    return res.status(200).json({
      data: { total_records_written: written },
      meta: { warnings },
    });
  } catch (error: any) {
    console.error('[api/re/ingest]', error);
    return res.status(500).json({ error: { message: 'Data fetch failed.' } });
  }
}
