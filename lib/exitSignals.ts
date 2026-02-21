export type ExitBadge = 'STOP' | 'TAKE_PROFIT' | 'TIME_EXIT' | 'HOLD';

export interface ExitSignalResult {
  badge: ExitBadge;
  pnlUsd: number;
  pnlPct: number;
  distToStop: number;
  distToTP: number;
}

export function computeExitSignal(params: {
  direction: string;
  entryPrice: number;
  livePrice: number;
  stopPrice: number;
  takeProfitP50: number;
  openedAt: string;
  horizonDays?: number;
}): ExitSignalResult {
  const { direction, entryPrice, livePrice, stopPrice, takeProfitP50, openedAt, horizonDays } = params;

  const isLong = direction === 'LONG';
  const pnlUsd = isLong ? livePrice - entryPrice : entryPrice - livePrice;
  const pnlPct = entryPrice > 0 ? (pnlUsd / entryPrice) * 100 : 0;

  const distToStop = isLong
    ? ((livePrice - stopPrice) / livePrice) * 100
    : ((stopPrice - livePrice) / livePrice) * 100;

  const distToTP = isLong
    ? ((takeProfitP50 - livePrice) / livePrice) * 100
    : ((livePrice - takeProfitP50) / livePrice) * 100;

  const hitStop = isLong ? livePrice <= stopPrice : livePrice >= stopPrice;
  const hitTP = isLong ? livePrice >= takeProfitP50 : livePrice <= takeProfitP50;

  const maxDays = horizonDays || 14;
  const elapsedMs = Date.now() - new Date(openedAt).getTime();
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  const timeExpired = elapsedDays >= maxDays;

  let badge: ExitBadge = 'HOLD';
  if (hitStop) badge = 'STOP';
  else if (hitTP) badge = 'TAKE_PROFIT';
  else if (timeExpired) badge = 'TIME_EXIT';

  return {
    badge,
    pnlUsd: Math.round(pnlUsd * 100) / 100,
    pnlPct: Math.round(pnlPct * 100) / 100,
    distToStop: Math.round(distToStop * 100) / 100,
    distToTP: Math.round(distToTP * 100) / 100,
  };
}

export function badgeColor(badge: ExitBadge): string {
  switch (badge) {
    case 'STOP': return 'bg-red-100 text-red-800 border-red-300';
    case 'TAKE_PROFIT': return 'bg-green-100 text-green-800 border-green-300';
    case 'TIME_EXIT': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'HOLD': return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}
