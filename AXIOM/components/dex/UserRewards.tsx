// Fix 1 (regression) + Fix 7 (stale UI) + Fix 8 (Design Law)
// - Uses typed TradingRewardsData from fixed useUserRewards hook
// - Shows "not yet available" informational state when available===false (from API)
// - No teal/rounded-xl/shadow; uses Design Law navy/forest palette

import { useUserRewards, useUserLimitOrders } from '../../lib/hooks/useDex';
import { useWallet } from '../../lib/web3/useWallet';

const DL_NAVY = '#1B2A4A';
const DL_BORDER = '#D4CFC5';
const DL_BG = '#FAFAF8';
const DL_MUTED = '#6B7280';

export default function UserRewards() {
  const { isConnected, address } = useWallet();
  const {
    rewards,
    available: rewardsAvailable,
    loading: rewardsLoading,
    refetch: refetchRewards,
  } = useUserRewards(address ?? undefined);
  const {
    orders,
    available: ordersAvailable,
    loading: ordersLoading,
    refetch: refetchOrders,
  } = useUserLimitOrders(address ?? undefined);

  if (!isConnected) {
    return (
      <div
        style={{ border: `1px solid ${DL_BORDER}`, background: DL_BG }}
        className="p-6 text-center"
      >
        <p style={{ color: DL_MUTED }} className="font-mono text-sm">
          Connect wallet to view rewards and orders.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Trading Rewards */}
      <div style={{ border: `1px solid ${DL_BORDER}`, background: DL_BG }} className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ color: DL_NAVY }} className="font-serif text-base font-semibold tracking-wide">
            Trading Rewards
          </h3>
          <button
            onClick={refetchRewards}
            style={{ color: DL_NAVY }}
            className="opacity-50 hover:opacity-100 p-1"
            aria-label="Refresh rewards"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        {rewardsLoading ? (
          <p style={{ color: DL_MUTED }} className="font-mono text-xs">Loading…</p>
        ) : !rewardsAvailable ? (
          // Fix 7: feature-gated by available flag — shows informational state, not misleading UI
          <div style={{ borderLeft: `3px solid ${DL_BORDER}` }} className="pl-3">
            <p style={{ color: DL_NAVY }} className="font-mono text-sm">
              Trading rewards are not yet active.
            </p>
            <p style={{ color: DL_MUTED }} className="font-mono text-xs mt-1">
              Rewards will accrue automatically once the rewards module launches.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <div style={{ color: DL_NAVY }} className="font-mono text-2xl font-semibold">
                {parseFloat(rewards.claimable).toFixed(4)} AXM
              </div>
              <div style={{ color: DL_MUTED }} className="font-mono text-xs mt-0.5">
                Claimable · {parseFloat(rewards.earned).toFixed(4)} earned · {parseFloat(rewards.claimed).toFixed(4)} claimed
              </div>
            </div>
            <button
              disabled={parseFloat(rewards.claimable) === 0}
              style={{
                background: parseFloat(rewards.claimable) > 0 ? DL_NAVY : 'transparent',
                color: parseFloat(rewards.claimable) > 0 ? '#FAFAF8' : DL_MUTED,
                border: `1px solid ${parseFloat(rewards.claimable) > 0 ? DL_NAVY : DL_BORDER}`,
              }}
              className="px-4 py-2 font-mono text-sm disabled:cursor-not-allowed"
            >
              Claim
            </button>
          </div>
        )}
      </div>

      {/* Limit Orders */}
      <div style={{ border: `1px solid ${DL_BORDER}`, background: DL_BG }} className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ color: DL_NAVY }} className="font-serif text-base font-semibold tracking-wide">
            Limit Orders
          </h3>
          <button
            onClick={refetchOrders}
            style={{ color: DL_NAVY }}
            className="opacity-50 hover:opacity-100 p-1"
            aria-label="Refresh orders"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        {ordersLoading ? (
          <p style={{ color: DL_MUTED }} className="font-mono text-xs">Loading…</p>
        ) : !ordersAvailable ? (
          // Fix 7: limit orders not live — clear informational state
          <div style={{ borderLeft: `3px solid ${DL_BORDER}` }} className="pl-3">
            <p style={{ color: DL_NAVY }} className="font-mono text-sm">
              Limit orders are not yet active.
            </p>
            <p style={{ color: DL_MUTED }} className="font-mono text-xs mt-1">
              This feature will be enabled in a future protocol upgrade.
            </p>
          </div>
        ) : orders.length === 0 ? (
          <p style={{ color: DL_MUTED }} className="font-mono text-sm text-center py-3">
            No active limit orders.
          </p>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <div
                key={order.id}
                style={{ border: `1px solid ${DL_BORDER}` }}
                className="flex items-center justify-between px-3 py-3"
              >
                <div>
                  <div style={{ color: DL_NAVY }} className="font-mono text-sm font-semibold">
                    Order #{order.id}
                  </div>
                  <div style={{ color: DL_MUTED }} className="font-mono text-xs">
                    {parseFloat(order.amountIn).toFixed(4)} @ {parseFloat(order.targetPrice).toFixed(6)}
                  </div>
                </div>
                <div className="text-right">
                  <div style={{ color: DL_MUTED }} className="font-mono text-xs">
                    Expires {new Date(order.expiresAt * 1000).toLocaleDateString()}
                  </div>
                  <button
                    style={{ color: '#8B1A1A' }}
                    className="font-mono text-xs hover:opacity-70 mt-0.5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
