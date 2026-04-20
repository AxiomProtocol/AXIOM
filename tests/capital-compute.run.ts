import {
  computeRealizedPnl,
  computeUnrealizedPnl,
  computeFeesTotal,
  computeNetCapitalChange,
  computeReturnOnCapital,
  computeReturnOnDeployedCapital,
  computeDeployedCapital,
  computeCapitalEfficiencyScore,
  computeVarianceStabilityIndex,
  computeMaxDrawdown,
  computeRecoveryDuration,
  computeCapitalDrift,
  computeChecksum,
  getPeriodBounds,
  aggregateByDay,
  type PositionRecord,
  type FeeRecord,
  type MarkRecord,
} from '../lib/capital/computeEngine';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error('ASSERTION FAILED: ' + msg);
}

function approxEqual(a: number, b: number, tolerance = 0.0001): boolean {
  return Math.abs(a - b) < tolerance;
}

const closedPositions: PositionRecord[] = [
  { id: '1', instrument: 'BTC', status: 'CLOSED', side: 'BUY', quantity: 0.01, avgEntryPrice: 50000, avgExitPrice: 51000, realizedPnl: 10, openedAt: '2026-02-20T10:00:00Z', closedAt: '2026-02-20T14:00:00Z' },
  { id: '2', instrument: 'ETH', status: 'CLOSED', side: 'BUY', quantity: 0.1, avgEntryPrice: 3000, avgExitPrice: 2900, realizedPnl: -10, openedAt: '2026-02-20T11:00:00Z', closedAt: '2026-02-20T15:00:00Z' },
  { id: '3', instrument: 'AAPL', status: 'CLOSED', side: 'SELL', quantity: 5, avgEntryPrice: 180, avgExitPrice: 175, realizedPnl: 25, openedAt: '2026-02-21T09:00:00Z', closedAt: '2026-02-21T16:00:00Z' },
];

const openPositions: PositionRecord[] = [
  { id: '4', instrument: 'BTC', status: 'OPEN', side: 'BUY', quantity: 0.02, avgEntryPrice: 52000, avgExitPrice: null, realizedPnl: null, openedAt: '2026-02-22T10:00:00Z', closedAt: null },
  { id: '5', instrument: 'SOL', status: 'OPEN', side: 'BUY', quantity: 10, avgEntryPrice: 150, avgExitPrice: null, realizedPnl: null, openedAt: '2026-02-22T11:00:00Z', closedAt: null },
];

const fees: FeeRecord[] = [
  { id: 'f1', amount: 0.50, incurredAt: '2026-02-20T14:00:00Z' },
  { id: 'f2', amount: 0.25, incurredAt: '2026-02-21T16:00:00Z' },
];

async function runTests() {
  console.log('Running capital compute engine tests...\n');
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log('  PASS: ' + name);
      passed++;
    } catch (err: any) {
      console.log('  FAIL: ' + name + ' - ' + err.message);
      failed++;
    }
  }

  test('computeRealizedPnl sums closed position PnL', () => {
    const result = computeRealizedPnl(closedPositions);
    assert(approxEqual(result, 25), 'Expected 25, got ' + result);
  });

  test('computeRealizedPnl ignores open positions', () => {
    const all = [...closedPositions, ...openPositions];
    const result = computeRealizedPnl(all);
    assert(approxEqual(result, 25), 'Expected 25, got ' + result);
  });

  test('computeUnrealizedPnl uses marks for open BUY positions', () => {
    const marks = new Map<string, number>([['BTC', 53000], ['SOL', 155]]);
    const result = computeUnrealizedPnl(openPositions, marks);
    const expected = 1 * 0.02 * (53000 - 52000) + 1 * 10 * (155 - 150);
    assert(approxEqual(result, expected), 'Expected ' + expected + ', got ' + result);
  });

  test('computeUnrealizedPnl returns 0 when no marks', () => {
    const marks = new Map<string, number>();
    const result = computeUnrealizedPnl(openPositions, marks);
    assert(result === 0, 'Expected 0, got ' + result);
  });

  test('computeFeesTotal sums all fees', () => {
    const result = computeFeesTotal(fees);
    assert(approxEqual(result, 0.75), 'Expected 0.75, got ' + result);
  });

  test('computeNetCapitalChange combines realized + unrealized - fees', () => {
    const result = computeNetCapitalChange(25, 70, 0.75);
    assert(approxEqual(result, 94.25), 'Expected 94.25, got ' + result);
  });

  test('computeReturnOnCapital divides by total capital', () => {
    const result = computeReturnOnCapital(10, 1000);
    assert(approxEqual(result, 0.01), 'Expected 0.01, got ' + result);
  });

  test('computeReturnOnCapital returns 0 for zero capital', () => {
    const result = computeReturnOnCapital(10, 0);
    assert(result === 0, 'Expected 0, got ' + result);
  });

  test('computeReturnOnDeployedCapital divides by deployed', () => {
    const result = computeReturnOnDeployedCapital(10, 500);
    assert(approxEqual(result, 0.02), 'Expected 0.02, got ' + result);
  });

  test('computeDeployedCapital sums open position notional', () => {
    const result = computeDeployedCapital(openPositions);
    const expected = 0.02 * 52000 + 10 * 150;
    assert(approxEqual(result, expected), 'Expected ' + expected + ', got ' + result);
  });

  test('computeVarianceStabilityIndex for stable returns near 1', () => {
    const returns = [0.01, 0.01, 0.01, 0.01, 0.01];
    const result = computeVarianceStabilityIndex(returns);
    assert(result > 0.9, 'Expected > 0.9, got ' + result);
  });

  test('computeVarianceStabilityIndex for volatile returns lower', () => {
    const returns = [0.05, -0.10, 0.15, -0.08, 0.02];
    const result = computeVarianceStabilityIndex(returns);
    assert(result < 0.9, 'Expected < 0.9, got ' + result);
  });

  test('computeVarianceStabilityIndex returns 1 for single value', () => {
    const result = computeVarianceStabilityIndex([0.01]);
    assert(result === 1.0, 'Expected 1.0, got ' + result);
  });

  test('computeMaxDrawdown detects correct peak and trough', () => {
    const curve = [
      { value: 1000, at: '2026-02-20T00:00:00Z' },
      { value: 1050, at: '2026-02-21T00:00:00Z' },
      { value: 980, at: '2026-02-22T00:00:00Z' },
      { value: 1020, at: '2026-02-23T00:00:00Z' },
    ];
    const result = computeMaxDrawdown(curve);
    assert(result !== null, 'Expected non-null');
    assert(approxEqual(result.peakValue, 1050), 'Peak expected 1050, got ' + result.peakValue);
    assert(approxEqual(result.troughValue, 980), 'Trough expected 980, got ' + result.troughValue);
    const expectedDepth = (1050 - 980) / 1050;
    assert(approxEqual(result.depthPct, expectedDepth), 'Depth expected ' + expectedDepth + ', got ' + result.depthPct);
  });

  test('computeMaxDrawdown returns null for empty curve', () => {
    const result = computeMaxDrawdown([]);
    assert(result === null, 'Expected null');
  });

  test('computeMaxDrawdown returns null for single point', () => {
    const result = computeMaxDrawdown([{ value: 100, at: '2026-01-01T00:00:00Z' }]);
    assert(result === null, 'Expected null');
  });

  test('computeRecoveryDuration returns null when not recovered', () => {
    const dd = {
      peakValue: 1050, troughValue: 980, depthPct: 0.067,
      peakAt: '2026-02-21T00:00:00Z', troughAt: '2026-02-22T00:00:00Z',
      recoveredAt: null, status: 'ACTIVE' as const,
    };
    const result = computeRecoveryDuration(dd);
    assert(result === null, 'Expected null');
  });

  test('computeCapitalDrift computes variance ratio', () => {
    const result = computeCapitalDrift(1000, 1050);
    assert(approxEqual(result, 0.05), 'Expected 0.05, got ' + result);
  });

  test('computeCapitalDrift returns 0 for zero expected', () => {
    const result = computeCapitalDrift(0, 100);
    assert(result === 0, 'Expected 0, got ' + result);
  });

  test('computeChecksum is deterministic', () => {
    const input = {
      lines: [
        { metricKey: 'realized_pnl', metricValue: '25', period: 'ALL', instrument: null },
        { metricKey: 'fees_total', metricValue: '0.75', period: 'ALL', instrument: null },
      ],
      sourcesUsed: ['MIRDT'],
      asOf: '2026-02-23T00:00:00Z',
    };
    const c1 = computeChecksum(input);
    const c2 = computeChecksum(input);
    assert(c1 === c2, 'Checksums should be identical');
    assert(c1.length === 64, 'SHA-256 hex should be 64 chars');
  });

  test('computeChecksum changes with different data', () => {
    const input1 = {
      lines: [{ metricKey: 'pnl', metricValue: '10', period: 'ALL', instrument: null }],
      sourcesUsed: ['MIRDT'],
      asOf: '2026-02-23T00:00:00Z',
    };
    const input2 = {
      lines: [{ metricKey: 'pnl', metricValue: '20', period: 'ALL', instrument: null }],
      sourcesUsed: ['MIRDT'],
      asOf: '2026-02-23T00:00:00Z',
    };
    assert(computeChecksum(input1) !== computeChecksum(input2), 'Different data should produce different checksums');
  });

  test('getPeriodBounds returns correct day bounds', () => {
    const bounds = getPeriodBounds('day', '2026-02-23T15:00:00Z');
    assert(bounds.start.includes('2026-02-23'), 'Start should be 2026-02-23');
    assert(bounds.end.includes('2026-02-23'), 'End should be 2026-02-23');
  });

  test('getPeriodBounds returns correct month bounds', () => {
    const bounds = getPeriodBounds('month', '2026-02-15T00:00:00Z');
    assert(bounds.start.includes('2026-02-01'), 'Start should be 2026-02-01');
    assert(bounds.end.includes('2026-02-28'), 'End should include Feb 28');
  });

  test('aggregateByDay groups trades by date', () => {
    const trades = [
      { executedAt: '2026-02-20T10:00:00Z', pnl: 5 },
      { executedAt: '2026-02-20T14:00:00Z', pnl: -3 },
      { executedAt: '2026-02-21T09:00:00Z', pnl: 10 },
    ];
    const result = aggregateByDay(trades);
    assert(result.get('2026-02-20') === 2, 'Feb 20 should be 2');
    assert(result.get('2026-02-21') === 10, 'Feb 21 should be 10');
  });

  console.log('\nResults: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
}

runTests().catch(err => { console.error(err); process.exit(1); });
