/**
 * lib/services/ReserveAccountingService.ts
 *
 * DB-backed reserve accounting service. Writes position snapshots to the
 * `reserve_positions` table and computes composition views.
 *
 * Two refresh paths:
 *   refreshPositions()         — existing path: BitGo custodian + fiat (Increase bank)
 *   refreshOnChainPositions()  — new path: live on-chain balances for all assets
 *                                via getCanonicalReserveSnapshot(). Call this to
 *                                keep the DB in sync with the canonical model.
 *
 * Coverage denominator: all methods that compute AXUSD coverage use
 * getCanonicalReserveSnapshot() to obtain a live totalSupply() denominator.
 * DB-snapshot AXUSD supply figures are NOT used for coverage because the
 * treasury wallet balance is often 0, making coverage appear undefined.
 *
 * Composition view differentiation:
 *   getComposition()                  — DB-snapshot data only (may be stale)
 *   getCompositionWithLiveDenominator — DB totals + live AXUSD totalSupply()
 *
 * Schema: additive metadata approach. No new columns are required. Per-row
 * provenance (bucketType, sourceType, walletAddress, inclusion flags) is
 * stored in the existing `metadata` JSONB field. This avoids migrations
 * while preserving full auditability.
 */

import { db } from '../../server/db';
import { reservePositions, disclosureSnapshots, treasuryAccounts } from '../../shared/treasurySchema';
import { TrustSource, classify, type TrustClassification } from '../types/trustSource';
import { bitGoTreasuryExtension } from './BitGoTreasuryExtension';
import { increaseTreasuryService } from './IncreaseTreasuryService';
import { getCanonicalReserveSnapshot, type ReserveBucketType, type SourceType } from '../reserves/getCanonicalReserveSnapshot';
import { desc, eq } from 'drizzle-orm';
import { ethers } from 'ethers';

const CHAINLINK_XAU_USD_ADDRESS = '0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c';
const CHAINLINK_ABI = [
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() view returns (uint8)',
];

async function fetchXauUsdPrice(): Promise<{ price: number | null; trustSource: TrustClassification }> {
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
      ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
      : null;
    if (!rpcUrl) {
      return { price: null, trustSource: classify(TrustSource.UNAVAILABLE, null, 'Alchemy API key not set') };
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const oracle   = new ethers.Contract(CHAINLINK_XAU_USD_ADDRESS, CHAINLINK_ABI, provider);
    const [roundData, decimals] = await Promise.all([oracle.latestRoundData(), oracle.decimals()]);
    const price     = Number(roundData.answer) / 10 ** Number(decimals);
    const updatedAt = new Date(Number(roundData.updatedAt) * 1000).toISOString();
    return {
      price,
      trustSource: classify(TrustSource.ONCHAIN_VERIFIED, updatedAt, 'Chainlink XAU/USD on Arbitrum One'),
    };
  } catch (err: any) {
    console.warn('[ReserveAccountingService.fetchXauUsdPrice]', err?.message);
    return { price: null, trustSource: classify(TrustSource.UNAVAILABLE, null, err?.message) };
  }
}

export interface ReserveComposition {
  totalUsd: number;
  totalFiatUsd: number;
  totalUsdcUsd: number;
  totalPaxgUsd: number;
  totalAxusdSupplyUsd: number;
  reserveRatio: number | null;
  paxgPrice: number | null;
  breakdown: Array<{
    assetSymbol: string;
    positionType: string;
    quantity: number;
    markPrice: number | null;
    usdValue: number;
    pct: number;
    trustSource: TrustClassification;
  }>;
}

export class ReserveAccountingService {
  async getMarkPrices(): Promise<{
    PAXG: { price: number | null; trustSource: TrustClassification };
    USDC: { price: number; trustSource: TrustClassification };
    USD:  { price: number; trustSource: TrustClassification };
    XAU:  { price: number | null; trustSource: TrustClassification };
  }> {
    const xau = await fetchXauUsdPrice();
    return {
      PAXG: { price: xau.price, trustSource: xau.trustSource },
      XAU:  { price: xau.price, trustSource: xau.trustSource },
      USDC: { price: 1.0, trustSource: classify(TrustSource.PROVIDER_API_REPORTED, new Date().toISOString(), 'USDC pegged 1:1 USD') },
      USD:  { price: 1.0, trustSource: classify(TrustSource.BANK_REPORTED,          new Date().toISOString(), 'Fiat USD par value') },
    };
  }

  /**
   * Existing custodian + fiat refresh path.
   * Writes BitGo positions and Increase (fiat) balance to `reserve_positions`.
   * For on-chain assets (ETH, AXAU, AXUSD, AXM), use refreshOnChainPositions().
   */
  async refreshPositions(): Promise<{
    success: boolean;
    positions: number;
    error?: string;
  }> {
    try {
      const [prices, bitgoPositions, fiatBalance] = await Promise.all([
        this.getMarkPrices(),
        bitGoTreasuryExtension.getReserveAssetBalances(),
        increaseTreasuryService.getCurrentBalance(),
      ]);

      const inserts = [];
      const now = new Date();

      for (const pos of bitgoPositions.positions) {
        const markPrice = prices[pos.assetSymbol as keyof typeof prices]?.price ?? null;
        const usdValue  = markPrice !== null ? pos.quantity * markPrice : null;

        inserts.push({
          assetSymbol:         pos.assetSymbol,
          positionType:        pos.positionType,
          quantity:            pos.quantity.toFixed(8),
          markPrice:           markPrice?.toFixed(8) ?? null,
          usdValue:            usdValue?.toFixed(2) ?? null,
          valuationSource:     pos.trustSource.source === TrustSource.ONCHAIN_VERIFIED ? 'chainlink' : 'custodian',
          valuationConfidence: pos.trustSource.confidence,
          snapshotAt:          now,
          metadata: {
            provider:                  'bitgo',
            sourceType:                'custodian_db' satisfies SourceType,
            bucketType:                (pos.assetSymbol === 'PAXG' ? 'hard_asset_backing' : 'fiat_reserve') satisfies ReserveBucketType,
            includedInTotalReserve:    true,
            includedInCoverageNumerator: pos.assetSymbol === 'PAXG',
            trustNote:                 pos.trustSource.note,
          },
        });
      }

      if (fiatBalance.balanceUsd !== null) {
        inserts.push({
          assetSymbol:         'USD',
          positionType:        'fiat_reserve',
          quantity:            fiatBalance.balanceUsd.toFixed(8),
          markPrice:           '1.00000000',
          usdValue:            fiatBalance.balanceUsd.toFixed(2),
          valuationSource:     'bank',
          valuationConfidence: 'high',
          snapshotAt:          now,
          metadata: {
            provider:                  'increase',
            sourceType:                'internal_db' satisfies SourceType,
            bucketType:                'fiat_reserve' satisfies ReserveBucketType,
            includedInTotalReserve:    true,
            includedInCoverageNumerator: false,
            trustSource:               fiatBalance.trustSource,
          },
        });
      }

      if (inserts.length > 0) {
        await db.insert(reservePositions).values(inserts);
      }

      return { success: true, positions: inserts.length };
    } catch (err: any) {
      console.error('[ReserveAccountingService.refreshPositions]', err?.message);
      return { success: false, positions: 0, error: err?.message };
    }
  }

  /**
   * On-chain sweep. Calls getCanonicalReserveSnapshot() and writes a row
   * for every location in every asset. Rows are annotated with:
   *   - bucketType (hard_asset_backing, gas_reserve, protocol_instrument, etc.)
   *   - sourceType (live_rpc, custodian_db)
   *   - walletOrContract (address queried)
   *   - includedInTotalReserve
   *   - includedInCoverageNumerator
   *
   * This makes the DB a faithful projection of the canonical accounting model.
   * Caller is responsible for scheduling (e.g. cron or bootstrap endpoint).
   */
  async refreshOnChainPositions(): Promise<{
    success: boolean;
    positions: number;
    axusdCirculatingSupply: number;
    error?: string;
  }> {
    try {
      const snap = await getCanonicalReserveSnapshot();
      const inserts = [];
      const now = new Date();

      for (const asset of snap.assets) {
        for (const loc of asset.locations) {
          if (loc.balance === 0 && loc.valueUsd === 0) continue; // skip zero rows

          inserts.push({
            assetSymbol:         asset.symbol,
            positionType:        asset.bucketType,
            quantity:            loc.balance.toFixed(8),
            markPrice:           asset.priceUsd != null ? asset.priceUsd.toFixed(8) : null,
            usdValue:            loc.valueUsd.toFixed(2),
            valuationSource:     loc.sourceType === 'live_rpc' ? 'onchain' : loc.sourceType,
            valuationConfidence: 'high',
            snapshotAt:          now,
            metadata: {
              sourceType:                 loc.sourceType satisfies SourceType,
              bucketType:                 asset.bucketType satisfies ReserveBucketType,
              walletOrContract:           loc.address ?? null,
              locationLabel:              loc.label,
              includedInTotalReserve:     asset.includedInTotalReserve,
              includedInCoverageNumerator: asset.includedInCoverageNumerator,
              pricingMethod:              asset.pricingMethod ?? null,
              dataAgeSeconds:             loc.dataAgeSeconds ?? 0,
              notes:                      loc.notes ?? asset.notes ?? null,
            },
          });
        }
      }

      // Write the AXUSD circulating supply as a separate metadata row so
      // getCompositionWithLiveDenominator() can use a recent DB value when
      // a live RPC call is not possible (e.g. read-only dashboard context).
      inserts.push({
        assetSymbol:         'AXUSD',
        positionType:        'circulating_supply',
        quantity:            snap.totals.axusdCirculatingSupply.toFixed(8),
        markPrice:           '1.00000000',
        usdValue:            snap.totals.axusdCirculatingSupply.toFixed(2),
        valuationSource:     'onchain',
        valuationConfidence: 'high',
        snapshotAt:          now,
        metadata: {
          sourceType:                 'live_rpc' satisfies SourceType,
          bucketType:                 'protocol_stable_inventory' satisfies ReserveBucketType,
          walletOrContract:           null,
          locationLabel:              'AXUSD totalSupply() — circulating supply denominator',
          includedInTotalReserve:     false,
          includedInCoverageNumerator: false,
          notes:                      'Coverage denominator. Not an asset position.',
        },
      });

      if (inserts.length > 0) {
        await db.insert(reservePositions).values(inserts);
      }

      return {
        success: true,
        positions: inserts.length,
        axusdCirculatingSupply: snap.totals.axusdCirculatingSupply,
      };
    } catch (err: any) {
      console.error('[ReserveAccountingService.refreshOnChainPositions]', err?.message);
      return { success: false, positions: 0, axusdCirculatingSupply: 0, error: err?.message };
    }
  }

  /**
   * DB-snapshot composition view.
   * Uses DB rows only — may be stale if refreshPositions() has not been called.
   * For coverage denominator, use getCompositionWithLiveDenominator() instead.
   *
   * NOTE: This method computes reserveRatio using totalAxusdSupplyUsd from DB
   * rows. The DB AXUSD rows represent protocol HOLDINGS, not circulating supply.
   * This ratio is internally useful but should NOT be presented as public
   * "coverage ratio" — use getCompositionWithLiveDenominator() for that.
   */
  async getComposition(): Promise<ReserveComposition> {
    const latest = await db
      .select()
      .from(reservePositions)
      .orderBy(desc(reservePositions.snapshotAt))
      .limit(20);

    const seen = new Map<string, (typeof reservePositions.$inferSelect)>();
    for (const pos of latest) {
      if (!seen.has(pos.assetSymbol)) seen.set(pos.assetSymbol, pos);
    }

    let totalFiatUsd = 0;
    let totalUsdcUsd = 0;
    let totalPaxgUsd = 0;
    let totalAxusdSupplyUsd = 0;

    const breakdown: ReserveComposition['breakdown'] = [];

    for (const [, pos] of seen) {
      const usdValue = Number(pos.usdValue ?? 0);
      const source   = (pos.valuationSource ?? 'manual') as any;
      const sourceMap: Record<string, TrustSource> = {
        chainlink:       TrustSource.ONCHAIN_VERIFIED,
        onchain:         TrustSource.ONCHAIN_VERIFIED,
        bank:            TrustSource.BANK_REPORTED,
        custodian:       TrustSource.CUSTODIAN_REPORTED,
        manual:          TrustSource.MANUALLY_ENTERED,
        founder_attested: TrustSource.FOUNDER_ATTESTED,
      };
      const trustSource = classify(
        sourceMap[source] ?? TrustSource.MANUALLY_ENTERED,
        pos.snapshotAt?.toISOString() ?? null,
      );

      if (pos.assetSymbol === 'USD')    totalFiatUsd += usdValue;
      else if (pos.assetSymbol === 'USDC')  totalUsdcUsd += usdValue;
      else if (pos.assetSymbol === 'PAXG')  totalPaxgUsd += usdValue;
      else if (pos.assetSymbol === 'AXUSD') totalAxusdSupplyUsd += usdValue;

      breakdown.push({
        assetSymbol:  pos.assetSymbol,
        positionType: pos.positionType,
        quantity:     Number(pos.quantity),
        markPrice:    pos.markPrice !== null ? Number(pos.markPrice) : null,
        usdValue,
        pct:          0,
        trustSource,
      });
    }

    const totalUsd = totalFiatUsd + totalUsdcUsd + totalPaxgUsd;
    for (const item of breakdown) {
      item.pct = totalUsd > 0 ? (item.usdValue / totalUsd) * 100 : 0;
    }

    const paxgPrice    = seen.get('PAXG')?.markPrice ? Number(seen.get('PAXG')!.markPrice) : null;
    // Warning: this reserveRatio uses DB AXUSD holdings, not circulating supply.
    // For the canonical coverage ratio, call getCompositionWithLiveDenominator().
    const reserveRatio = totalAxusdSupplyUsd > 0 ? totalUsd / totalAxusdSupplyUsd : null;

    return {
      totalUsd,
      totalFiatUsd,
      totalUsdcUsd,
      totalPaxgUsd,
      totalAxusdSupplyUsd,
      reserveRatio,
      paxgPrice,
      breakdown,
    };
  }

  /**
   * Composition with live AXUSD totalSupply() denominator.
   *
   * Fetches reserve positions from DB (may be stale) but uses a live
   * on-chain totalSupply() call for the coverage denominator. This is
   * the canonical coverage ratio consistent with the public reserve page.
   *
   * Hard-asset coverage numerator: PAXG + USDC only (same rules as public page).
   *
   * Use this method anywhere the coverage ratio must be disclosed.
   */
  async getCompositionWithLiveDenominator(): Promise<
    ReserveComposition & {
      hardAssetCoverageUsd: number;
      axusdCirculatingSupply: number;
      canonicalCoverageRatio: number | null;
      coverageNote: string;
    }
  > {
    // Run DB composition and live canonical snapshot in parallel.
    // The canonical snapshot provides the live totalSupply() denominator
    // and also the live PAXG + USDC numerator for hard-asset coverage.
    const [dbComposition, liveSnap] = await Promise.all([
      this.getComposition(),
      getCanonicalReserveSnapshot(),
    ]);

    const axusdCirculatingSupply = liveSnap.totals.axusdCirculatingSupply;
    const hardAssetCoverageUsd   = liveSnap.totals.hardAssetCoverageUsd;
    const canonicalCoverageRatio = liveSnap.totals.coverageRatio;

    return {
      ...dbComposition,
      hardAssetCoverageUsd,
      axusdCirculatingSupply,
      canonicalCoverageRatio,
      coverageNote: liveSnap.notes.coverage,
    };
  }
}

export const reserveAccountingService = new ReserveAccountingService();
