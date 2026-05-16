/**
 * DashboardEulerWidget — WITHDRAWN STATE
 * Euler EVK/Earn/EulerSwap vaults withdrawn 2026-05-13. All balances confirmed zero.
 * Static notice only — no fetch, no interval.
 */
export default function DashboardEulerWidget() {
  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
          <span className="text-gray-400 text-sm font-bold">E</span>
        </div>
        <div>
          <p className="text-white font-medium text-sm">AXUSD Lending</p>
          <p className="text-gray-400 text-xs">Euler Finance</p>
        </div>
      </div>
      <p className="text-gray-400 text-xs leading-relaxed">
        Euler EVK vault withdrawn 2026-05-13. All positions closed. Liquidity
        has migrated to Axiom-native on-chain financial rails.
      </p>
    </div>
  );
}
