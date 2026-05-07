// Canonical asset list used by the allocation policy editor and the
// per-statement allocation panel.  Keys are stored lowercase in the
// pilot_allocation_policies.weights JSONB column.

export type AllocationAssetKey =
  | 'axau'
  | 'kag'
  | 'axusd'
  | 'usdc'
  | 'paxg'
  | 'wbtc'
  | 'cbeth'
  | 'cash_reserve'
  | 'operating_spend';

export interface AllocationAsset {
  key: AllocationAssetKey;
  label: string;
  category: 'reserve' | 'stablecoin' | 'crypto' | 'fiat';
  note: string;
}

export const ALLOCATION_ASSETS: ReadonlyArray<AllocationAsset> = [
  { key: 'axau',            label: 'AXAU',             category: 'reserve',    note: 'Axiom gold reserve instrument' },
  { key: 'kag',             label: 'KAG',              category: 'reserve',    note: 'Silver reserve' },
  { key: 'paxg',            label: 'PAXG',             category: 'reserve',    note: 'Paxos gold (AXAU underlying)' },
  { key: 'axusd',           label: 'AXUSD',            category: 'stablecoin', note: 'Axiom unified stablecoin' },
  { key: 'usdc',            label: 'USDC',             category: 'stablecoin', note: 'Circle USD' },
  { key: 'wbtc',            label: 'WBTC',             category: 'crypto',     note: 'Wrapped Bitcoin' },
  { key: 'cbeth',           label: 'cbETH',            category: 'crypto',     note: 'Coinbase staked ETH' },
  { key: 'cash_reserve',    label: 'Cash reserve',     category: 'fiat',       note: 'Off-chain emergency buffer' },
  { key: 'operating_spend', label: 'Operating spend',  category: 'fiat',       note: 'Kept in checking for weekly bills' },
];

export type AllocationWeights = Record<AllocationAssetKey, number>;

export const ZERO_WEIGHTS: AllocationWeights = {
  axau: 0, kag: 0, paxg: 0, axusd: 0, usdc: 0, wbtc: 0, cbeth: 0, cash_reserve: 0, operating_spend: 0,
};

export function normalizeWeights(input: unknown): AllocationWeights {
  const out: AllocationWeights = { ...ZERO_WEIGHTS };
  if (input && typeof input === 'object') {
    for (const a of ALLOCATION_ASSETS) {
      const v = (input as Record<string, unknown>)[a.key];
      const n = typeof v === 'number' ? v : Number(v);
      out[a.key] = Number.isFinite(n) && n >= 0 ? Math.round(n * 1000) / 1000 : 0;
    }
  }
  return out;
}

export function weightsSum(w: AllocationWeights): number {
  return ALLOCATION_ASSETS.reduce((s, a) => s + (w[a.key] || 0), 0);
}
