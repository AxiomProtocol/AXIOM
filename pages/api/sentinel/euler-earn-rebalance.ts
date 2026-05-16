import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { authorizeAction } from '../../../lib/sentinel/authorizeAction';
import { isEulerEarnDeployed, EULER_EARN_VAULT_ADDRESS } from '../../../src/config/activeContracts.generated';
import { EULER_LENDING_CONTRACTS, AXUSD_GENIUS_CONTRACTS } from '../../../shared/contracts';

const STRATEGIES = [
  { id: 'credit_market', label: 'Phase 6 Credit Market', address: '0x85074a74774568692128eE97Da661Fe49dcF5fE4', targetWeightBps: 4000 },
  { id: 'evk_vault',     label: 'EVK Open Money Market', address: EULER_LENDING_CONTRACTS.EVK_OPEN_MARKET_VAULT,     targetWeightBps: 4000 },
  { id: 'tbill_vault',   label: 'T-Bill Reserve',        address: AXUSD_GENIUS_CONTRACTS.TBILL_VAULT,               targetWeightBps: 2000 },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expectedKey = process.env.MIRDT_SCAN_KEY;
  if (expectedKey) {
    const scanKey = req.headers['x-scan-key'];
    if (scanKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const { tvlUsd = 0, note } = req.body ?? {};

  try {
    const result = await authorizeAction({
      scope: 'EULER_EARN',
      actionType: 'EulerEarnRebalance',
      subject: EULER_EARN_VAULT_ADDRESS,
      requestedNotional: Number(tvlUsd),
      metadata: {
        vault: EULER_EARN_VAULT_ADDRESS,
        deployed: isEulerEarnDeployed(),
        strategies: STRATEGIES,
        note: note ?? 'Manual Sentinel-authorized rebalance',
        euler_earn: true,
      },
    });

    try {
      const nonceResult = await pool.query(`SELECT COALESCE(MAX(nonce), 0) + 1 AS next_nonce FROM sentinel_decisions`);
      const nextNonce = nonceResult.rows[0].next_nonce;
      const prevHashResult = await pool.query(`SELECT log_hash FROM sentinel_decisions ORDER BY nonce DESC LIMIT 1`);
      const prevHash = prevHashResult.rows[0]?.log_hash ?? '0'.repeat(64);
      const crypto = await import('crypto');
      const logPayload = JSON.stringify({
        nonce: nextNonce,
        scope: 'EULER_EARN',
        actionType: 'EULER_EARN_REBALANCE',
        subject: EULER_EARN_VAULT_ADDRESS,
        maxNotional: result.maxNotional,
        decision: result.decision,
        reasonCode: result.reasonCode,
        prevHash,
      });
      const logHash = crypto.createHash('sha256').update(logPayload).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const extendedNote = `[EulerEarn] vault=${EULER_EARN_VAULT_ADDRESS} | ${note ?? 'Manual Sentinel-authorized rebalance'} | ${result.plainLanguage}`;

      await pool.query(
        `INSERT INTO sentinel_decisions
           (scope, action_type, subject, max_notional, expires_at, decision, reason_code, plain_language, log_hash, prev_hash, nonce, created_at)
         VALUES ($1, $2::sentinel_action_type, $3, $4, $5, $6::sentinel_decision_outcome, $7, $8, $9, $10, $11, NOW())`,
        [
          'EULER_EARN',
          'EULER_EARN_REBALANCE',
          EULER_EARN_VAULT_ADDRESS,
          result.maxNotional,
          expiresAt,
          result.decision,
          result.reasonCode,
          extendedNote,
          logHash,
          prevHash,
          nextNonce,
        ]
      );
    } catch (dbErr: unknown) {
      const msg = dbErr instanceof Error ? dbErr.message : 'unknown';
      console.error('[sentinel/euler-earn-rebalance] DB log error:', msg);
    }

    return res.status(200).json({
      success: true,
      authorization: result,
      vault: EULER_EARN_VAULT_ADDRESS,
      deployed: isEulerEarnDeployed(),
      strategies: STRATEGIES,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('[sentinel/euler-earn-rebalance] Error:', error);
    return res.status(500).json({ error: msg });
  }
}
