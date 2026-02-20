import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { pool } from '../../../server/db';
import { SignalEngine } from '../../../server/services/mirdt/SignalEngine';
import { CoinGeckoProvider } from '../../../server/services/mirdt/CoinGeckoProvider';
import { AlphaVantageProvider } from '../../../server/services/mirdt/AlphaVantageProvider';

function isAuthorized(req: NextApiRequest): boolean {
  const scanKey = process.env.MIRDT_SCAN_KEY;
  if (!scanKey) {
    return process.env.NODE_ENV === 'development';
  }
  return req.headers['x-scan-key'] === scanKey;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({
      endpoint: '/api/mirdt/run-scan',
      method: 'POST',
      description: 'Trigger MIRDT market scan',
      modelVersion: SignalEngine.MODEL_VERSION,
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const typeFilter = (req.query.type as string || 'all').toLowerCase();

    const coinGecko = new CoinGeckoProvider();
    const alphaVantage = new AlphaVantageProvider();
    const engine = new SignalEngine();

    let universe: { symbol: string; name: string; assetType: 'CRYPTO' | 'EQUITY'; venue: string }[] = [];

    if (typeFilter === 'all' || typeFilter === 'crypto') {
      const cryptoAssets = await coinGecko.getUniverse();
      universe = universe.concat(cryptoAssets);
    }

    if (typeFilter === 'all' || typeFilter === 'equity') {
      const equityAssets = await alphaVantage.getUniverse();
      universe = universe.concat(equityAssets);
    }

    let assetsScanned = 0;
    let setupsGenerated = 0;
    let errors = 0;

    for (const asset of universe) {
      try {
        assetsScanned++;

        const provider = asset.assetType === 'CRYPTO' ? coinGecko : alphaVantage;
        const bars = await provider.fetchOHLCV(asset.symbol, 100);

        if (bars.length === 0) {
          errors++;
          continue;
        }

        const result = engine.analyzeAsset(asset.symbol, asset.assetType, asset.venue, bars);

        if (!result) continue;

        const barsString = JSON.stringify(bars);
        const checksum = crypto.createHash('sha256').update(barsString).digest('hex');

        const snapshotResult = await pool.query(
          `INSERT INTO mirdt_data_snapshots (id, created_at, provider, raw_ref, checksum)
           VALUES (gen_random_uuid(), NOW(), $1, $2, $3)
           RETURNING id`,
          [provider.name, JSON.stringify({ checksum }), checksum]
        );
        const snapshotId = snapshotResult.rows[0].id;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + result.horizonDays);

        await pool.query(
          `INSERT INTO mirdt_setups (
            id, created_at, asset_type, symbol, venue, horizon_days,
            entry_zone_low, entry_zone_high, invalidation_price,
            thesis_summary, confidence_score, signal_z,
            expected_p5, expected_p50, expected_p95,
            volatility_estimate, liquidity_notes,
            model_version, data_snapshot_ref, rationale_trace_json,
            status, expires_at
          ) VALUES (
            gen_random_uuid(), NOW(), $1, $2, $3, $4,
            $5, $6, $7,
            $8, $9, $10,
            $11, $12, $13,
            $14, $15,
            $16, $17, $18,
            'ACTIVE', $19
          )`,
          [
            result.assetType, result.symbol, result.venue, result.horizonDays,
            result.entryZoneLow, result.entryZoneHigh, result.invalidationPrice,
            result.thesisSummary, result.confidenceScore, result.signalZ,
            result.expectedP5, result.expectedP50, result.expectedP95,
            result.volatilityEstimate, result.liquidityNotes,
            SignalEngine.MODEL_VERSION, snapshotId, JSON.stringify(result.rationaleTrace),
            expiresAt,
          ]
        );

        setupsGenerated++;
      } catch (err) {
        console.error(`[run-scan] Error processing ${asset.symbol}:`, err);
        errors++;
      }
    }

    return res.status(200).json({
      success: true,
      assetsScanned,
      setupsGenerated,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[run-scan] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
