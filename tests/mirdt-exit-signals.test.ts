/**
 * Unit tests for lib/mirdt/exitSignals.ts
 * Run with: npx tsx tests/mirdt-exit-signals.test.ts
 */
import { computeExitSignals } from '../lib/mirdt/exitSignals';

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string): void {
  if (condition) {
    console.log(`  PASS  ${description}`);
    passed++;
  } else {
    console.error(`  FAIL  ${description}`);
    failed++;
  }
}

function assertEq<T>(actual: T, expected: T, description: string): void {
  assert(actual === expected, `${description} (got ${actual}, expected ${expected})`);
}

// ── Long trade scenarios ───────────────────────────────────────────────────

const longBase = {
  direction: 'long' as const,
  entry: 100,
  stop: 90,
  target: 120,
  openedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  horizonDays: 30,
};

// 1. Active long — price between stop and target
const longHold = computeExitSignals({ ...longBase, livePrice: 105 });
assert(!longHold.stopHit, 'Long hold: stop not hit');
assert(!longHold.targetHit, 'Long hold: target not hit');
assert(!longHold.timeExit, 'Long hold: horizon not elapsed');
assertEq(longHold.badge, 'HOLD', 'Long hold: badge is HOLD');
assertEq(longHold.unrealizedPnl, 5, 'Long hold: correct unrealised P&L');
assert(Math.abs((longHold.rMultiple ?? 0) - 0.5) < 0.001, 'Long hold: R-multiple ≈ 0.5');

// 2. Long stop hit
const longStop = computeExitSignals({ ...longBase, livePrice: 89 });
assert(longStop.stopHit, 'Long stop hit: stopHit true');
assertEq(longStop.badge, 'STOP', 'Long stop hit: badge is STOP');
assert(longStop.unrealizedPnl < 0, 'Long stop hit: negative P&L');

// 3. Long target hit
const longTarget = computeExitSignals({ ...longBase, livePrice: 121 });
assert(!longTarget.stopHit, 'Long target hit: stop not hit');
assert(longTarget.targetHit, 'Long target hit: targetHit true');
assertEq(longTarget.badge, 'TAKE PROFIT', 'Long target hit: badge is TAKE PROFIT');
assert(longTarget.unrealizedPnl > 0, 'Long target hit: positive P&L');

// 4. Long time exit
const longTime = computeExitSignals({
  ...longBase,
  openedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days ago
  livePrice: 105,
});
assert(!longTime.stopHit, 'Long time exit: stop not hit');
assert(!longTime.targetHit, 'Long time exit: target not hit');
assert(longTime.timeExit, 'Long time exit: horizon elapsed');
assertEq(longTime.badge, 'TIME EXIT', 'Long time exit: badge is TIME EXIT');

// 5. Stop badge takes priority over time exit
const longStopAndTime = computeExitSignals({
  ...longBase,
  openedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
  livePrice: 89,
});
assertEq(longStopAndTime.badge, 'STOP', 'Priority: STOP beats TIME EXIT');

// 6. TAKE PROFIT badge takes priority over time exit
const longTargetAndTime = computeExitSignals({
  ...longBase,
  openedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
  livePrice: 121,
});
assertEq(longTargetAndTime.badge, 'TAKE PROFIT', 'Priority: TAKE PROFIT beats TIME EXIT');

// ── Short trade scenarios ──────────────────────────────────────────────────

const shortBase = {
  direction: 'short' as const,
  entry: 100,
  stop: 110,
  target: 80,
  openedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  horizonDays: 30,
};

// 7. Short hold
const shortHold = computeExitSignals({ ...shortBase, livePrice: 95 });
assert(!shortHold.stopHit, 'Short hold: stop not hit');
assert(!shortHold.targetHit, 'Short hold: target not hit');
assertEq(shortHold.badge, 'HOLD', 'Short hold: badge is HOLD');
assertEq(shortHold.unrealizedPnl, 5, 'Short hold: correct unrealised P&L');

// 8. Short stop hit (price rises above stop)
const shortStop = computeExitSignals({ ...shortBase, livePrice: 111 });
assert(shortStop.stopHit, 'Short stop hit: stopHit true');
assertEq(shortStop.badge, 'STOP', 'Short stop hit: badge is STOP');

// 9. Short target hit (price falls below target)
const shortTarget = computeExitSignals({ ...shortBase, livePrice: 79 });
assert(shortTarget.targetHit, 'Short target hit: targetHit true');
assertEq(shortTarget.badge, 'TAKE PROFIT', 'Short target hit: badge is TAKE PROFIT');

// ── Edge cases ─────────────────────────────────────────────────────────────

// 10. No target provided
const noTarget = computeExitSignals({
  direction: 'long',
  entry: 100,
  stop: 90,
  openedAt: new Date(),
  livePrice: 105,
});
assert(!noTarget.targetHit, 'No target: targetHit false');
assert(noTarget.distanceToTarget === null, 'No target: distanceToTarget null');

// 11. Entry equals stop — rMultiple should be null
const zeroRisk = computeExitSignals({
  direction: 'long',
  entry: 100,
  stop: 100,
  openedAt: new Date(),
  livePrice: 105,
});
assert(zeroRisk.rMultiple === null, 'Zero risk: rMultiple is null');

// 12. No horizonDays — timeExit always false
const noHorizon = computeExitSignals({
  direction: 'long',
  entry: 100,
  stop: 90,
  openedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
  livePrice: 95,
});
assert(!noHorizon.timeExit, 'No horizon: timeExit false');

// 13. openedAt as ISO string (not Date object)
const stringDate = computeExitSignals({
  direction: 'long',
  entry: 100,
  stop: 90,
  openedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
  horizonDays: 30,
  livePrice: 95,
});
assert(stringDate.timeExit, 'ISO string openedAt: timeExit works correctly');

// 14. Distance metrics
const distances = computeExitSignals({
  direction: 'long',
  entry: 100,
  stop: 90,
  target: 120,
  openedAt: new Date(),
  livePrice: 100,
});
assert(Math.abs(distances.distanceToStop - 0.1) < 0.001, 'Distance to stop: |(100-90)/100| = 0.1');
assert(
  distances.distanceToTarget !== null &&
    Math.abs(distances.distanceToTarget - 0.2) < 0.001,
  'Distance to target: |(100-120)/100| = 0.2'
);

// ── Summary ────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`Exit signal tests: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\nTEST SUITE FAILED: ${failed} test(s) did not pass.`);
  process.exit(1);
} else {
  console.log(`\nTEST SUITE PASSED`);
  process.exit(0);
}
