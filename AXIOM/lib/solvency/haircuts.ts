const HAIRCUT_RATES: Record<string, Record<string, number>> = {
  ETH: { standard: 0.15, severe: 0.30, extreme: 0.50 },
  USDC: { standard: 0.00, severe: 0.02, extreme: 0.05 },
  AXM: { standard: 0.50, severe: 0.75, extreme: 0.95 },
  'T-Bill': { standard: 0.02, severe: 0.05, extreme: 0.10 },
  Other: { standard: 0.20, severe: 0.40, extreme: 0.60 },
};

export function getHaircutRate(
  assetType: string,
  severity: 'standard' | 'severe' | 'extreme'
): number {
  const rates = HAIRCUT_RATES[assetType] || HAIRCUT_RATES['Other'];
  return rates[severity];
}

export function applyHaircut(
  valueUsd: number,
  assetType: string,
  severity: 'standard' | 'severe' | 'extreme'
): number {
  const rate = getHaircutRate(assetType, severity);
  return Math.round((valueUsd * (1 - rate)) * 100) / 100;
}

export function classifyAsset(label: string): string {
  const upper = label.toUpperCase();

  if (upper.startsWith('ETH') || upper.includes('ETHER')) {
    return 'ETH';
  }
  if (upper.startsWith('USDC') || upper.includes('USD COIN')) {
    return 'USDC';
  }
  if (upper.startsWith('AXM') || upper.includes('AXIOM')) {
    return 'AXM';
  }
  if (upper.includes('T-BILL') || upper.includes('TBILL') || upper.includes('TREASURY BILL')) {
    return 'T-Bill';
  }

  return 'Other';
}
