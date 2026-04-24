import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { CoinGeckoProvider } from '../../../server/services/mirdt/CoinGeckoProvider';
import { AlphaVantageProvider } from '../../../server/services/mirdt/AlphaVantageProvider';

const BATCH_LIMIT = 50;

function isAuthorized(req: NextApiRequest): boolean {
  const scanKey = process.env.MIRDT_SCAN_KEY;
  if (!scanKey) {
    return process.env.NODE_ENV === 'development';
  }
  return req.headers['x-scan-key'] === scanKey;
}

function inferDirection(
  entryZoneLow: number,
  entryZoneHigh: number,
  invalidationPrice: number
): 'LONG' | 'SHORT' {
  if (invalidationPrice < entryZoneLow) return 'LONG';
  if (invalidationPrice > entryZoneHigh) return 'SHORT';
  return 'LONG';
}

function isInvalidated(
  direction: 'LONG' | 'SHORT',
  currentPrice: number,
  invalidationPrice: number
): boolean {
  if (direction === 'LONG') return currentPrice <= invalidationPrice;
  return currentPrice >= invalidationPrice;
}

async function fetchCurrentPrice(
  symbol: string,
  assetType: string,
  coinGecko: CoinGeckoProvider,
  alphaVantage: AlphaVantageProvider
): Promise<number | null> {
  try {
    if (assetType === 'CRYPTO') {
      const bars = await coinGecko.fetchOHLCV(symbol, 1);
      if (bars.length > 0) return bars[bars.length - 1].close;
    } else {
      const bars = await alphaVantage.fetchOHLCV(symbol, 5);
      if (bars.length > 0) return bars[bars.length - 1].close;
    }
    return null;
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const activeResult = await pool.query(
      `SELECT id, symbol, asset_type, entry_zone_low, entry_zone_high,
              invalidation_price, rationale_trace_json
       FROM mirdt_setups
       WHERE status = 'ACTIVE'
       ORDER BY created_at ASC
       LIMIT $1`,
      [BATCH_LIMIT]
    );

    const setups = activeResult.rows;
    if (setups.length === 0) {
      return res.status(200).json({
        success: true,
        checkedCount: 0,
        invalidatedCount: 0,
        invalidatedIds: [],
        timestamp: new Date().toISOString(),
      });
    }

    const coinGecko = new CoinGeckoProvider();
    const alphaVantage = new AlphaVantageProvider();

    const checkPromises = setups.map(async (setup) => {
      const currentPrice = await fetchCurrentPrice(
        setup.symbol,
        setup.asset_type,
        coinGecko,
        alphaVantage
      );

      if (currentPrice === null) {
        return { id: setup.id, symbol: setup.symbol, status: 'SKIPPED', reason: 'price_unavailable' };
      }

      const entryZoneLow = parseFloat(setup.entry_zone_low);
      const entryZoneHigh = parseFloat(setup.entry_zone_high);
      const invalidationPrice = parseFloat(setup.invalidation_price);

      const direction = inferDirection(entryZoneLow, entryZoneHigh, invalidationPrice);

      if (!isInvalidated(direction, currentPrice, invalidationPrice)) {
        return { id: setup.id, symbol: setup.symbol, status: 'STILL_ACTIVE' };
      }

      const invalidationEntry = {
        ts: new Date().toISOString(),
        event: 'INVALIDATED',
        currentPrice,
        invalidationPrice,
        direction,
        provider: setup.asset_type === 'CRYPTO' ? 'CoinGecko' : 'AlphaVantage',
        reason: direction === 'LONG'
          ? `Price ${currentPrice} breached invalidation level ${invalidationPrice} (below entry zone)`
          : `Price ${currentPrice} breached invalidation level ${invalidationPrice} (above entry zone)`,
      };

      const existingTrace = setup.rationale_trace_json || {};
      const updatedTrace = {
        ...existingTrace,
        invalidation: invalidationEntry,
      };

      await pool.query(
        `UPDATE mirdt_setups
         SET status = 'INVALIDATED', rationale_trace_json = $1
         WHERE id = $2 AND status = 'ACTIVE'`,
        [JSON.stringify(updatedTrace), setup.id]
      );

      return { id: setup.id, symbol: setup.symbol, status: 'INVALIDATED', currentPrice, invalidationPrice };
    });

    const results = await Promise.allSettled(checkPromises);

    const invalidatedIds: string[] = [];
    let checkedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        checkedCount++;
        if (result.value.status === 'INVALIDATED') {
          invalidatedIds.push(result.value.id);
        } else if (result.value.status === 'SKIPPED') {
          skippedCount++;
        }
      } else {
        errors.push(result.reason?.message || 'Unknown error');
      }
    }

    return res.status(200).json({
      success: true,
      checkedCount,
      invalidatedCount: invalidatedIds.length,
      invalidatedIds,
      skippedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[check-invalidations] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
