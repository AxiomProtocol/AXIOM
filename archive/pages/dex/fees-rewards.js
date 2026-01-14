import { useState } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';

export default function FeesRewards() {
  const [depositUSD, setDepositUSD] = useState(10000);
  const [poolTVL, setPoolTVL] = useState(1000000);
  const [dailyVolume, setDailyVolume] = useState(500000);
  const [holdingDays, setHoldingDays] = useState(365);

  const poolShare = depositUSD / (poolTVL + depositUSD);
  const dailyFees = dailyVolume * 0.003;
  const yourDailyFees = dailyFees * poolShare;
  const totalFees = yourDailyFees * holdingDays;
  const apr = ((yourDailyFees * 365) / depositUSD) * 100;
  const finalValue = depositUSD + totalFees;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/dex" className="text-amber-600 hover:text-amber-700 flex items-center gap-2 mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Exchange
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Fees & Rewards</h1>
          <p className="text-xl text-gray-600">Understanding how you earn as a liquidity provider on Axiom Exchange</p>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 text-white mb-12">
          <h2 className="text-2xl font-bold mb-6">Fee Distribution Overview</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">0.3%</div>
              <div className="text-green-100">Per Swap</div>
            </div>
            <div className="bg-white/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">100%</div>
              <div className="text-green-100">To LPs</div>
            </div>
            <div className="bg-white/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">Auto</div>
              <div className="text-green-100">Compounding</div>
            </div>
            <div className="bg-white/20 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">Instant</div>
              <div className="text-green-100">Accrual</div>
            </div>
          </div>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How Fees Work</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-xl">1</div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">User Executes Swap</h3>
                    <p className="text-gray-600 text-sm">When someone swaps Token A for Token B, they pay a 0.3% fee on the input amount.</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-xl">2</div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Fee Stays in Pool</h3>
                    <p className="text-gray-600 text-sm">The fee is added to the pool reserves, increasing the total value of the pool.</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-xl">3</div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">LP Tokens Gain Value</h3>
                    <p className="text-gray-600 text-sm">Your LP tokens now represent a larger share of pool assets. Fees compound automatically!</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl">✓</div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Claim When You Withdraw</h3>
                    <p className="text-gray-600 text-sm">When you remove liquidity, you receive your original tokens + all accumulated fees.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
              <h3 className="font-bold text-gray-900 mb-4">Fee Calculation Example</h3>
              <div className="space-y-4 text-sm">
                <div className="bg-white/50 rounded-lg p-4">
                  <div className="text-gray-600 mb-1">User swaps:</div>
                  <div className="font-mono font-bold text-gray-900">1,000 AXM → WETH</div>
                </div>
                <div className="bg-white/50 rounded-lg p-4">
                  <div className="text-gray-600 mb-1">0.3% Fee:</div>
                  <div className="font-mono font-bold text-gray-900">3 AXM → Pool</div>
                </div>
                <div className="bg-white/50 rounded-lg p-4">
                  <div className="text-gray-600 mb-1">User receives:</div>
                  <div className="font-mono font-bold text-gray-900">WETH equivalent of 997 AXM</div>
                </div>
                <hr className="border-amber-200" />
                <div className="bg-green-100 rounded-lg p-4">
                  <div className="text-gray-600 mb-1">If you own 10% of the pool:</div>
                  <div className="font-mono font-bold text-green-700">You earn 0.3 AXM from this swap!</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Earnings Calculator</h2>
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-bold text-gray-900 mb-4">Input Parameters</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Deposit ($)</label>
                    <input
                      type="number"
                      value={depositUSD}
                      onChange={(e) => setDepositUSD(Number(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pool TVL ($)</label>
                    <input
                      type="number"
                      value={poolTVL}
                      onChange={(e) => setPoolTVL(Number(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Daily Trading Volume ($)</label>
                    <input
                      type="number"
                      value={dailyVolume}
                      onChange={(e) => setDailyVolume(Number(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Holding Period (Days)</label>
                    <input
                      type="number"
                      value={holdingDays}
                      onChange={(e) => setHoldingDays(Number(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-4">Projected Earnings</h3>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Your Pool Share:</span>
                    <span className="font-bold text-gray-900">{(poolShare * 100).toFixed(4)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Daily Pool Fees:</span>
                    <span className="font-medium text-gray-700">${dailyFees.toLocaleString()}</span>
                  </div>
                  <hr className="border-green-200" />
                  <div className="flex justify-between">
                    <span className="text-gray-600">Your Daily Earnings:</span>
                    <span className="font-bold text-green-600">${yourDailyFees.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Over {holdingDays} Days:</span>
                    <span className="font-bold text-green-600">${totalFees.toFixed(2)}</span>
                  </div>
                  <hr className="border-green-200" />
                  <div className="flex justify-between text-lg">
                    <span className="font-bold text-gray-900">APR:</span>
                    <span className="font-bold text-amber-600">{apr.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="font-bold text-gray-900">Final Value:</span>
                    <span className="font-bold text-green-600">${finalValue.toFixed(2)}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  * Projections assume constant volume and no impermanent loss. Actual results will vary.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">What Affects Your Earnings?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-bold text-gray-900 mb-2">Trading Volume</h3>
              <p className="text-gray-600 text-sm mb-3">
                Higher volume means more swaps and more fees collected. Look for pools with consistent trading activity.
              </p>
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                <strong>Pro tip:</strong> Volume-to-TVL ratio is a good indicator. Higher is better!
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="text-3xl mb-3">💰</div>
              <h3 className="font-bold text-gray-900 mb-2">Your Pool Share</h3>
              <p className="text-gray-600 text-sm mb-3">
                The larger your share of the pool, the more fees you earn. But larger pools also attract more volume.
              </p>
              <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-800">
                <strong>Balance:</strong> Smaller pools = bigger share, less volume. Find the sweet spot.
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="text-3xl mb-3">⏳</div>
              <h3 className="font-bold text-gray-900 mb-2">Time in Pool</h3>
              <p className="text-gray-600 text-sm mb-3">
                Fees compound continuously. The longer you provide liquidity, the more fees accumulate.
              </p>
              <div className="bg-green-50 rounded-lg p-3 text-sm text-green-800">
                <strong>Compounding:</strong> Fees auto-reinvest, growing your position over time.
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Fee Comparison</h2>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-6 font-medium text-gray-600">Platform</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-600">Swap Fee</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-600">LP Share</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-600">Protocol Fee</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100 bg-amber-50">
                  <td className="py-4 px-6 font-bold text-amber-700">Axiom Exchange</td>
                  <td className="py-4 px-6 text-gray-900">0.30%</td>
                  <td className="py-4 px-6 font-bold text-green-600">100%</td>
                  <td className="py-4 px-6 text-gray-900">0%</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="py-4 px-6 text-gray-900">Uniswap V2</td>
                  <td className="py-4 px-6 text-gray-900">0.30%</td>
                  <td className="py-4 px-6 text-gray-600">100%</td>
                  <td className="py-4 px-6 text-gray-600">0%</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="py-4 px-6 text-gray-900">Uniswap V3</td>
                  <td className="py-4 px-6 text-gray-900">0.05-1%</td>
                  <td className="py-4 px-6 text-gray-600">~90%</td>
                  <td className="py-4 px-6 text-gray-600">~10%</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="py-4 px-6 text-gray-900">SushiSwap</td>
                  <td className="py-4 px-6 text-gray-900">0.30%</td>
                  <td className="py-4 px-6 text-gray-600">83%</td>
                  <td className="py-4 px-6 text-gray-600">17%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Maximizing Your Returns</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h3 className="font-bold text-green-900 mb-4">Best Practices</h3>
              <ul className="space-y-3 text-sm text-green-800">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Choose pools with high volume relative to TVL</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Consider pairs where you want exposure to both tokens</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Monitor APR and adjust positions if better opportunities arise</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Think long-term to maximize fee accumulation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Factor in gas costs when depositing and withdrawing</span>
                </li>
              </ul>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="font-bold text-red-900 mb-4">Common Mistakes</h3>
              <ul className="space-y-3 text-sm text-red-800">
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">✗</span>
                  <span>Chasing high APR without checking volume sustainability</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">✗</span>
                  <span>Ignoring impermanent loss in volatile pairs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">✗</span>
                  <span>Frequently entering/exiting pools (gas costs add up)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">✗</span>
                  <span>Providing liquidity for tokens you don't understand</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">✗</span>
                  <span>Not monitoring your positions regularly</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <div className="mt-12 grid md:grid-cols-3 gap-4">
          <Link href="/dex/how-amm-works" className="bg-white border border-gray-200 rounded-xl p-6 hover:border-amber-300 hover:shadow-lg transition-all group">
            <div className="text-2xl mb-2">🔄</div>
            <h3 className="font-bold text-gray-900 group-hover:text-amber-600">How AMMs Work</h3>
            <p className="text-sm text-gray-600">Understand the mechanics</p>
          </Link>
          <Link href="/dex/liquidity-guide" className="bg-white border border-gray-200 rounded-xl p-6 hover:border-amber-300 hover:shadow-lg transition-all group">
            <div className="text-2xl mb-2">💧</div>
            <h3 className="font-bold text-gray-900 group-hover:text-amber-600">Liquidity Guide</h3>
            <p className="text-sm text-gray-600">Complete LP walkthrough</p>
          </Link>
          <Link href="/dex/impermanent-loss" className="bg-white border border-gray-200 rounded-xl p-6 hover:border-amber-300 hover:shadow-lg transition-all group">
            <div className="text-2xl mb-2">📉</div>
            <h3 className="font-bold text-gray-900 group-hover:text-amber-600">Impermanent Loss</h3>
            <p className="text-sm text-gray-600">Understand and minimize IL</p>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
