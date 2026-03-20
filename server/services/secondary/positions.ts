import { pool } from '../../db';

export async function getPosition(investorId: string, seriesId: string) {
  const result = await pool.query(
    `SELECT p.*, s.name as series_name, s.asset_class, s.current_nav, s.unit_price,
            s.hold_period_days, s.transferability_status, s.settlement_asset
     FROM sec_positions p
     JOIN sec_series s ON s.id = p.series_id
     WHERE p.investor_id = $1 AND p.series_id = $2 LIMIT 1`,
    [investorId, seriesId]
  );
  return result.rows[0] || null;
}

export async function getInvestorPositions(investorId: string) {
  const result = await pool.query(
    `SELECT p.*, s.name as series_name, s.slug as series_slug, s.asset_class,
            s.current_nav, s.unit_price, s.transferability_status, s.status as series_status,
            s.distribution_frequency, s.hold_period_days
     FROM sec_positions p
     JOIN sec_series s ON s.id = p.series_id
     WHERE p.investor_id = $1 AND p.status != 'fully_transferred'
     ORDER BY p.created_at DESC`,
    [investorId]
  );
  return result.rows;
}

export async function getLots(positionId: string) {
  const result = await pool.query(
    `SELECT * FROM sec_position_lots WHERE position_id = $1 ORDER BY acquired_at ASC`,
    [positionId]
  );
  return result.rows;
}

export async function lockUnits(positionId: string, units: number): Promise<boolean> {
  const result = await pool.query(
    `UPDATE sec_positions
     SET locked_units = locked_units + $2,
         available_units = available_units - $2,
         updated_at = NOW()
     WHERE id = $1 AND available_units >= $2
     RETURNING id`,
    [positionId, units]
  );
  return result.rows.length > 0;
}

export async function unlockUnits(positionId: string, units: number): Promise<void> {
  await pool.query(
    `UPDATE sec_positions
     SET locked_units = GREATEST(0, locked_units - $2),
         available_units = available_units + $2,
         updated_at = NOW()
     WHERE id = $1`,
    [positionId, units]
  );
}

export async function transferUnitsFromSeller(
  sellerPositionId: string,
  buyerInvestorId: string,
  seriesId: string,
  units: number,
  pricePerUnit: number,
  settlementId: string
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Deduct from seller
    const deductResult = await client.query(
      `UPDATE sec_positions
       SET locked_units = GREATEST(0, locked_units - $2),
           total_units = total_units - $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING investor_id, series_id`,
      [sellerPositionId, units]
    );

    if (deductResult.rows.length === 0) throw new Error('Seller position not found');
    const { investor_id: sellerId } = deductResult.rows[0];

    // Upsert buyer position
    const buyerPositionResult = await client.query(
      `INSERT INTO sec_positions (investor_id, series_id, total_units, available_units, locked_units, status)
       VALUES ($1, $2, $3, $3, 0, 'active')
       ON CONFLICT (investor_id, series_id)
       DO UPDATE SET
         total_units = sec_positions.total_units + $3,
         available_units = sec_positions.available_units + $3,
         updated_at = NOW()
       RETURNING id`,
      [buyerInvestorId, seriesId, units]
    );
    const buyerPositionId = buyerPositionResult.rows[0].id;

    // Add buyer lot
    const holdReleasesAt = new Date();
    holdReleasesAt.setDate(holdReleasesAt.getDate() + 180);

    await client.query(
      `INSERT INTO sec_position_lots (position_id, investor_id, series_id, source_type, units, price_per_unit, hold_releases_at, is_locked, source_transaction_id)
       VALUES ($1, $2, $3, 'secondary_purchase', $4, $5, $6, FALSE, $7)`,
      [buyerPositionId, buyerInvestorId, seriesId, units, pricePerUnit, holdReleasesAt, settlementId]
    );

    // Update seller position status
    await client.query(
      `UPDATE sec_positions
       SET status = CASE WHEN total_units <= 0 THEN 'fully_transferred' ELSE 'partially_transferred' END,
           updated_at = NOW()
       WHERE id = $1`,
      [sellerPositionId]
    );

    // Update beneficial ownership records
    await client.query(
      `UPDATE sec_beneficial_ownership_records
       SET status = 'superseded', end_date = NOW()
       WHERE series_id = $1 AND investor_id = $2 AND status = 'current'`,
      [seriesId, sellerId]
    );

    // Get total series units for ownership pct
    const totalResult = await client.query(
      `SELECT SUM(total_units) as total FROM sec_positions WHERE series_id = $1 AND status != 'fully_transferred'`,
      [seriesId]
    );
    const totalIssued = parseFloat(totalResult.rows[0].total || '0');

    const sellerRemaining = deductResult.rows[0];
    const newSellerUnits = await client.query(
      `SELECT total_units FROM sec_positions WHERE id = $1`, [sellerPositionId]
    );
    const sellerUnits = parseFloat(newSellerUnits.rows[0]?.total_units || '0');

    if (sellerUnits > 0) {
      await client.query(
        `INSERT INTO sec_beneficial_ownership_records (series_id, investor_id, units, ownership_percent, status, settlement_id)
         VALUES ($1, $2, $3, $4, 'current', $5)`,
        [seriesId, sellerId, sellerUnits, totalIssued > 0 ? sellerUnits / totalIssued : 0, settlementId]
      );
    }

    const buyerNewUnitsResult = await client.query(
      `SELECT total_units FROM sec_positions WHERE id = $1`, [buyerPositionId]
    );
    const buyerUnits = parseFloat(buyerNewUnitsResult.rows[0]?.total_units || '0');

    await client.query(
      `UPDATE sec_beneficial_ownership_records
       SET status = 'superseded', end_date = NOW()
       WHERE series_id = $1 AND investor_id = $2 AND status = 'current'`,
      [seriesId, buyerInvestorId]
    );

    await client.query(
      `INSERT INTO sec_beneficial_ownership_records (series_id, investor_id, units, ownership_percent, status, settlement_id)
       VALUES ($1, $2, $3, $4, 'current', $5)`,
      [seriesId, buyerInvestorId, buyerUnits, totalIssued > 0 ? buyerUnits / totalIssued : 0, settlementId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getBeneficialOwnershipRegistry(seriesId: string) {
  const result = await pool.query(
    `SELECT bor.*, i.legal_name, i.email, i.entity_type, i.investor_category
     FROM sec_beneficial_ownership_records bor
     JOIN sec_investors i ON i.id = bor.investor_id
     WHERE bor.series_id = $1 AND bor.status = 'current'
     ORDER BY bor.units DESC`,
    [seriesId]
  );
  return result.rows;
}

export async function reconcilePosition(positionId: string): Promise<void> {
  const position = await pool.query(
    `SELECT * FROM sec_positions WHERE id = $1 LIMIT 1`, [positionId]
  );
  if (!position.rows[0]) return;

  const pos = position.rows[0];
  const totalLots = await pool.query(
    `SELECT COALESCE(SUM(units), 0) as total FROM sec_position_lots WHERE position_id = $1`, [positionId]
  );
  const lotTotal = parseFloat(totalLots.rows[0].total);
  const posTotal = parseFloat(pos.total_units);

  const isReconciled = Math.abs(lotTotal - posTotal) < 0.000001;
  await pool.query(
    `UPDATE sec_positions SET reconciliation_status = $2, last_reconciled_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [positionId, isReconciled ? 'reconciled' : 'discrepancy']
  );
}
