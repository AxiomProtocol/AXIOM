import { pool } from '../../db';
import { transferUnitsFromSeller, getPosition } from './positions';
import { auditLog } from './audit';
import { emitAnalyticsEvent } from './analytics';
import { notifyParticipants } from './notifications';

export async function createSettlementInstruction(matchedTradeId: string): Promise<string> {
  const tradeResult = await pool.query(
    `SELECT mt.*, tr.seller_id, tr.buyer_id, s.settlement_asset,
            sw.wallet_address as seller_wallet, bw.wallet_address as buyer_wallet
     FROM sec_matched_trades mt
     JOIN sec_transfer_requests tr ON tr.id = mt.transfer_request_id
     JOIN sec_series s ON s.id = mt.series_id
     LEFT JOIN sec_wallets sw ON sw.investor_id = tr.seller_id AND sw.is_primary = TRUE
     LEFT JOIN sec_wallets bw ON bw.investor_id = tr.buyer_id AND bw.is_primary = TRUE
     WHERE mt.id = $1 LIMIT 1`,
    [matchedTradeId]
  );
  if (!tradeResult.rows[0]) throw new Error('Matched trade not found');
  const trade = tradeResult.rows[0];

  const fundingDeadline = new Date(Date.now() + (trade.settlement_window_days || 5) * 24 * 60 * 60 * 1000);

  const result = await pool.query(
    `INSERT INTO sec_settlement_instructions (
       matched_trade_id, transfer_request_id, status, settlement_asset,
       gross_amount, fees_amount, net_seller_amount,
       buyer_wallet_address, seller_wallet_address, funding_deadline
     ) VALUES ($1, $2, 'instruction_created', $3::sec_settlement_asset_type, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      matchedTradeId, trade.transfer_request_id, trade.settlement_asset,
      trade.gross_amount, trade.fees_amount, trade.net_seller_proceeds,
      trade.buyer_wallet, trade.seller_wallet, fundingDeadline,
    ]
  );
  const instructionId = result.rows[0].id;

  await pool.query(
    `UPDATE sec_matched_trades SET settlement_instruction_id = $2, status = 'settlement_pending', updated_at = NOW()
     WHERE id = $1`,
    [matchedTradeId, instructionId]
  );

  await pool.query(
    `UPDATE sec_transfer_requests SET status = 'settling', updated_at = NOW()
     WHERE id = $1`,
    [trade.transfer_request_id]
  );

  await auditLog({
    actorId: 'system',
    actorType: 'system',
    objectType: 'settlement_instruction',
    objectId: instructionId,
    action: 'settlement_instruction_created',
  });

  await notifyParticipants(trade.transfer_request_id, 'settlement_funding_required', { instructionId, fundingDeadline });

  return instructionId;
}

export async function confirmFunding(
  instructionId: string,
  txHash: string,
  amount: number
): Promise<void> {
  await pool.query(
    `UPDATE sec_settlement_instructions SET status = 'funded', updated_at = NOW() WHERE id = $1`,
    [instructionId]
  );

  await pool.query(
    `INSERT INTO sec_payment_confirmations (settlement_instruction_id, status, tx_hash, amount, confirmed_at)
     VALUES ($1, 'confirmed', $2, $3, NOW())`,
    [instructionId, txHash, amount]
  );

  await executeDelivery(instructionId);
}

async function executeDelivery(instructionId: string): Promise<void> {
  const instrResult = await pool.query(
    `SELECT si.*, mt.seller_id, mt.buyer_id, mt.series_id, mt.units_traded, mt.agreed_price_per_unit,
            mt.fees_amount, tr.id as transfer_request_id
     FROM sec_settlement_instructions si
     JOIN sec_matched_trades mt ON mt.id = si.matched_trade_id
     JOIN sec_transfer_requests tr ON tr.id = si.transfer_request_id
     WHERE si.id = $1 LIMIT 1`,
    [instructionId]
  );
  if (!instrResult.rows[0]) throw new Error('Settlement instruction not found');
  const instr = instrResult.rows[0];

  await pool.query(
    `UPDATE sec_settlement_instructions SET status = 'delivery_in_progress', updated_at = NOW() WHERE id = $1`,
    [instructionId]
  );

  try {
    const sellerPosition = await getPosition(instr.seller_id, instr.series_id);
    if (!sellerPosition) throw new Error('Seller position not found');

    await transferUnitsFromSeller(
      sellerPosition.id,
      instr.buyer_id,
      instr.series_id,
      parseFloat(instr.units_traded),
      parseFloat(instr.agreed_price_per_unit),
      instructionId
    );

    await pool.query(
      `UPDATE sec_settlement_instructions
       SET status = 'ownership_updated', delivery_tx_hash = $2, updated_at = NOW()
       WHERE id = $1`,
      [instructionId, instr.delivery_tx_hash || `off_chain_${Date.now()}`]
    );

    // Record fee events
    if (parseFloat(instr.fees_amount) > 0) {
      await pool.query(
        `INSERT INTO sec_fee_events (settlement_instruction_id, fee_type, amount)
         VALUES ($1, 'platform_fee', $2)`,
        [instructionId, instr.fees_amount]
      );
    }

    await pool.query(
      `UPDATE sec_settlement_instructions SET status = 'funds_released', updated_at = NOW() WHERE id = $1`,
      [instructionId]
    );

    await pool.query(
      `UPDATE sec_settlement_instructions SET status = 'settled', settled_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [instructionId]
    );

    await pool.query(
      `UPDATE sec_matched_trades SET status = 'settled', updated_at = NOW() WHERE id = $1`,
      [instr.matched_trade_id]
    );

    await pool.query(
      `UPDATE sec_transfer_requests SET status = 'settled', completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [instr.transfer_request_id]
    );

    // Record trade mark
    const navResult = await pool.query(
      `SELECT nav_per_unit FROM sec_nav_marks WHERE series_id = $1 AND nav_status = 'current' ORDER BY effective_date DESC LIMIT 1`,
      [instr.series_id]
    );
    const nav = navResult.rows[0]?.nav_per_unit;
    const pricePerUnit = parseFloat(instr.gross_amount) / parseFloat(instr.units_traded);
    const premiumDiscount = nav ? (pricePerUnit - parseFloat(nav)) / parseFloat(nav) : null;

    await pool.query(
      `INSERT INTO sec_trade_marks (series_id, matched_trade_id, price_per_unit, units_traded, premium_discount_to_nav, status)
       VALUES ($1, $2, $3, $4, $5, 'confirmed')`,
      [instr.series_id, instr.matched_trade_id, pricePerUnit, instr.units_traded, premiumDiscount]
    );

    await emitAnalyticsEvent({
      seriesId: instr.series_id, investorId: instr.seller_id,
      eventType: 'settlement_completed',
      objectId: instructionId, objectType: 'settlement_instruction',
      valueCurrency: parseFloat(instr.gross_amount),
      valueUnits: parseFloat(instr.units_traded),
    });

    await auditLog({
      actorId: 'system',
      actorType: 'system',
      objectType: 'settlement_instruction',
      objectId: instructionId,
      action: 'settlement_completed',
      newState: { status: 'settled' },
    });

    await notifyParticipants(instr.transfer_request_id, 'settlement_completed', { instructionId });

  } catch (err: any) {
    await pool.query(
      `UPDATE sec_settlement_instructions
       SET status = 'failed', failed_at = NOW(), failure_reason = $2, updated_at = NOW()
       WHERE id = $1`,
      [instructionId, err.message]
    );

    await pool.query(
      `INSERT INTO sec_settlement_failures (settlement_instruction_id, reason) VALUES ($1, $2)`,
      [instructionId, err.message]
    );

    await pool.query(
      `UPDATE sec_matched_trades SET status = 'failed', updated_at = NOW() WHERE id = $1`,
      [instr.matched_trade_id]
    );

    await pool.query(
      `UPDATE sec_transfer_requests SET status = 'failed', updated_at = NOW() WHERE id = $1`,
      [instr.transfer_request_id]
    );

    await emitAnalyticsEvent({
      seriesId: instr.series_id, investorId: instr.seller_id,
      eventType: 'settlement_failed',
      objectId: instructionId, objectType: 'settlement_instruction',
    });

    await notifyParticipants(instr.transfer_request_id, 'settlement_failed', { instructionId, reason: err.message });
    throw err;
  }
}

export async function handleFundingTimeout(instructionId: string): Promise<void> {
  const result = await pool.query(
    `SELECT * FROM sec_settlement_instructions
     WHERE id = $1 AND status = 'awaiting_funding' AND funding_deadline < NOW() LIMIT 1`,
    [instructionId]
  );
  if (!result.rows[0]) return;

  await pool.query(
    `UPDATE sec_settlement_instructions SET status = 'failed', failed_at = NOW(), failure_reason = 'Buyer funding timeout', updated_at = NOW()
     WHERE id = $1`,
    [instructionId]
  );

  await pool.query(
    `INSERT INTO sec_settlement_failures (settlement_instruction_id, reason) VALUES ($1, 'Buyer funding timeout — settlement window expired')`,
    [instructionId]
  );

  const instr = result.rows[0];
  await pool.query(
    `UPDATE sec_matched_trades SET status = 'failed', updated_at = NOW() WHERE id = $1`,
    [instr.matched_trade_id]
  );
  await pool.query(
    `UPDATE sec_transfer_requests SET status = 'failed', updated_at = NOW() WHERE id = $1`,
    [instr.transfer_request_id]
  );
}

export async function getSettlementStatus(instructionId: string) {
  const result = await pool.query(
    `SELECT si.*, mt.series_id, mt.seller_id, mt.buyer_id, mt.units_traded, mt.agreed_price_per_unit,
            mt.status as trade_status, s.name as series_name,
            pc.tx_hash as payment_tx_hash, pc.confirmed_at as payment_confirmed_at
     FROM sec_settlement_instructions si
     JOIN sec_matched_trades mt ON mt.id = si.matched_trade_id
     JOIN sec_series s ON s.id = mt.series_id
     LEFT JOIN sec_payment_confirmations pc ON pc.settlement_instruction_id = si.id AND pc.status = 'confirmed'
     WHERE si.id = $1 LIMIT 1`,
    [instructionId]
  );
  return result.rows[0] || null;
}
