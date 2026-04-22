import { db } from '../../server/db';
import { reservePositions, disclosureSnapshots, treasuryAccounts } from '../../shared/treasurySchema';
import { TrustSource, classify, type TrustClassification } from '../types/trustSource';
import { bitGoTreasuryExtension } from './BitGoTreasuryExtension';
import { increaseTreasuryService } from './IncreaseTreasuryService';
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
    const oracle = new ethers.Contract(CHAINLINK_XAU_USD_ADDRESS, CHAINLINK_ABI, provider);
    const [roundData, decimals] = await Promise.all([oracle.latestRoundData(), oracle.decimals()]);
    const price = Number(roundData.answer) / 10 ** Number(decimals);
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
    USD: { price: number; trustSource: TrustClassification };
    XAU: { price: number | null; trustSource: TrustClassification };
  }> {
    const xau = await fetchXauUsdPrice();
    return {
      PAXG: { price: xau.price, trustSource: xau.trustSource },
      XAU: { price: xau.price, trustSource: xau.trustSource },
      USDC: { price: 1.0, trustSource: classify(TrustSource.PROVIDER_API_REPORTED, new Date().toISOString(), 'USDC pegged 1:1 USD') },
      USD: { price: 1.0, trustSource: classify(TrustSource.BANK_REPORTED, new Date().toISOString(), 'Fiat USD par value') },
    };
  }

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
        const usdValue = markPrice !== null ? pos.quantity * markPrice : null;

        inserts.push({
          assetSymbol: pos.assetSymbol,
          positionType: pos.positionType,
          quantity: pos.quantity.toFixed(8),
          markPrice: markPrice?.toFixed(8) ?? null,
          usdValue: usdValue?.toFixed(2) ?? null,
          valuationSource: pos.trustSource.source === TrustSource.ONCHAIN_VERIFIED ? 'chainlink' : 'custodian',
          valuationConfidence: pos.trustSource.confidence,
          snapshotAt: now,
          metadata: { provider: 'bitgo', trustNote: pos.trustSource.note },
        });
      }

      if (fiatBalance.balanceUsd !== null) {
        inserts.push({
          assetSymbol: 'USD',
          positionType: 'fiat_reserve',
          quantity: fiatBalance.balanceUsd.toFixed(8),
          markPrice: '1.00000000',
          usdValue: fiatBalance.balanceUsd.toFixed(2),
          valuationSource: 'bank',
          valuationConfidence: 'high',
          snapshotAt: now,
          metadata: { provider: 'increase', trustSource: fiatBalance.trustSource },
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
      const source = (pos.valuationSource ?? 'manual') as any;
      const sourceMap: Record<string, TrustSource> = {
        chainlink: TrustSource.ONCHAIN_VERIFIED,
        bank: TrustSource.BANK_REPORTED,
        custodian: TrustSource.CUSTODIAN_REPORTED,
        manual: TrustSource.MANUALLY_ENTERED,
        founder_attested: TrustSource.FOUNDER_ATTESTED,
      };
      const trustSource = classify(
        sourceMap[source] ?? TrustSource.MANUALLY_ENTERED,
        pos.snapshotAt?.toISOString() ?? null,
      );

      if (pos.assetSymbol === 'USD') totalFiatUsd += usdValue;
      else if (pos.assetSymbol === 'USDC') totalUsdcUsd += usdValue;
      else if (pos.assetSymbol === 'PAXG') totalPaxgUsd += usdValue;
      else if (pos.assetSymbol === 'AXUSD') totalAxusdSupplyUsd += usdValue;

      breakdown.push({
        assetSymbol: pos.assetSymbol,
        positionType: pos.positionType,
        quantity: Number(pos.quantity),
        markPrice: pos.markPrice !== null ? Number(pos.markPrice) : null,
        usdValue,
        pct: 0,
        trustSource,
      });
    }

    const totalUsd = totalFiatUsd + totalUsdcUsd + totalPaxgUsd;
    for (const item of breakdown) {
      item.pct = totalUsd > 0 ? (item.usdValue / totalUsd) * 100 : 0;
    }

    const paxgPrice = seen.get('PAXG')?.markPrice ? Number(seen.get('PAXG')!.markPrice) : null;
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
}

export const reserveAccountingService = new ReserveAccountingService();
