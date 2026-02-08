import { useUserRewards, useUserLimitOrders } from '../../lib/hooks/useDex';
import { useWallet } from '../../lib/web3/useWallet';

export default function UserRewards() {
  const { isConnected, address } = useWallet();
  const { tradingRewards, loading: rewardsLoading, refetch: refetchRewards } = useUserRewards(address ?? undefined);
  const { orders, loading: ordersLoading, refetch: refetchOrders } = useUserLimitOrders(address ?? undefined);

  if (!isConnected) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">Connect wallet to view rewards</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Trading Rewards</h3>
          <button
            onClick={refetchRewards}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {rewardsLoading ? (
          <div className="flex items-center gap-3">
            <div className="animate-spin w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full" />
            <span className="text-gray-500 text-sm">Loading...</span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-teal-600">
                {parseFloat(tradingRewards).toFixed(4)} AXM
              </div>
              <div className="text-sm text-gray-500">Pending rewards</div>
            </div>
            <button
              disabled={parseFloat(tradingRewards) === 0}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                parseFloat(tradingRewards) > 0
                  ? 'bg-teal-500 hover:bg-teal-600 text-gray-900'
                  : 'bg-gray-100 text-gray-500 cursor-not-allowed'
              }`}
            >
              Claim
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Limit Orders</h3>
          <button
            onClick={refetchOrders}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {ordersLoading ? (
          <div className="flex items-center gap-3">
            <div className="animate-spin w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full" />
            <span className="text-gray-500 text-sm">Loading...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">No active limit orders</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 bg-gray-50/50 rounded-lg"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Order #{order.id}
                  </div>
                  <div className="text-xs text-gray-500">
                    {parseFloat(order.amountIn).toFixed(4)} @ {parseFloat(order.targetPrice).toFixed(6)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">
                    Expires {new Date(order.expiresAt * 1000).toLocaleDateString()}
                  </div>
                  <button className="text-xs text-red-400 hover:text-red-300 transition-colors">
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
