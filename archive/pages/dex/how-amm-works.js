import { useState } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function HowAMMWorks() {
  const [reserveX, setReserveX] = useState(1000);
  const [reserveY, setReserveY] = useState(1000);
  const [swapAmount, setSwapAmount] = useState(100);

  const k = reserveX * reserveY;
  const newReserveX = reserveX + swapAmount;
  const newReserveY = k / newReserveX;
  const received = reserveY - newReserveY;
  const priceImpact = ((swapAmount / received - 1) * 100).toFixed(2);
  const effectivePrice = (swapAmount / received).toFixed(4);
  const spotPrice = (reserveY / reserveX).toFixed(4);

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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">How Automated Market Makers Work</h1>
          <p className="text-xl text-gray-600">Understanding the mathematics and mechanics behind decentralized trading</p>
        </div>

        <div className="prose prose-lg max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">What is an AMM?</h2>
            <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-6 mb-6">
              <p className="text-gray-700 mb-4">
                An <strong>Automated Market Maker (AMM)</strong> is a decentralized exchange protocol that uses mathematical 
                formulas to price assets. Unlike traditional order book exchanges where buyers and sellers create orders, 
                AMMs allow users to trade against a liquidity pool governed by smart contracts.
              </p>
              <p className="text-gray-700">
                The Axiom Exchange uses the <strong>Constant Product Market Maker</strong> model, pioneered by Uniswap, 
                which ensures continuous liquidity at any price point.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">The Constant Product Formula</h2>
            <div className="bg-gray-900 text-white rounded-2xl p-8 mb-6 text-center">
              <div className="text-4xl font-mono font-bold mb-4">x × y = k</div>
              <div className="text-gray-400">Where x and y are the reserve quantities, and k is a constant</div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="text-3xl mb-3">📦</div>
                <h3 className="font-bold text-gray-900 mb-2">Reserve X</h3>
                <p className="text-gray-600 text-sm">The quantity of Token A in the pool (e.g., AXM tokens)</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="text-3xl mb-3">📦</div>
                <h3 className="font-bold text-gray-900 mb-2">Reserve Y</h3>
                <p className="text-gray-600 text-sm">The quantity of Token B in the pool (e.g., WETH tokens)</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="text-3xl mb-3">🔒</div>
                <h3 className="font-bold text-gray-900 mb-2">Constant K</h3>
                <p className="text-gray-600 text-sm">The invariant that must remain constant after every trade</p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Interactive AMM Simulator</h2>
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-bold text-gray-900 mb-4">Pool Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reserve X (Token A)</label>
                      <input
                        type="number"
                        value={reserveX}
                        onChange={(e) => setReserveX(Number(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reserve Y (Token B)</label>
                      <input
                        type="number"
                        value={reserveY}
                        onChange={(e) => setReserveY(Number(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Swap Amount (Token A → Token B)</label>
                      <input
                        type="number"
                        value={swapAmount}
                        onChange={(e) => setSwapAmount(Number(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-4">Swap Results</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Constant K:</span>
                      <span className="font-mono font-bold">{k.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Spot Price:</span>
                      <span className="font-mono font-bold">{spotPrice} B/A</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tokens Received:</span>
                      <span className="font-mono font-bold text-green-600">{received.toFixed(4)} Token B</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Effective Price:</span>
                      <span className="font-mono font-bold">{effectivePrice} B/A</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price Impact:</span>
                      <span className={`font-mono font-bold ${parseFloat(priceImpact) > 5 ? 'text-red-600' : 'text-amber-600'}`}>
                        {priceImpact}%
                      </span>
                    </div>
                    <hr className="border-gray-200" />
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">New Reserve X:</span>
                      <span className="font-mono">{newReserveX.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">New Reserve Y:</span>
                      <span className="font-mono">{newReserveY.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">How Swaps Work</h2>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex-1">
                  <h4 className="font-bold text-gray-900">User Submits Swap</h4>
                  <p className="text-gray-600">User wants to trade Token A for Token B. They send Token A to the pool.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex-1">
                  <h4 className="font-bold text-gray-900">Calculate Output</h4>
                  <p className="text-gray-600">Smart contract calculates how much Token B to give, ensuring x × y = k is maintained.</p>
                  <code className="block mt-2 bg-gray-100 p-2 rounded text-sm">output = reserveY - (k / (reserveX + input))</code>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex-1">
                  <h4 className="font-bold text-gray-900">Deduct Fee</h4>
                  <p className="text-gray-600">A 0.3% fee is taken from the swap. This fee stays in the pool for liquidity providers.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">4</div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex-1">
                  <h4 className="font-bold text-gray-900">Complete Trade</h4>
                  <p className="text-gray-600">Token B is sent to the user. Pool reserves are updated. The new k includes the fee.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Price Discovery & Arbitrage</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-bold text-blue-900 mb-3">Automatic Price Adjustment</h3>
                <p className="text-blue-800 text-sm mb-3">
                  Prices in an AMM are determined by the ratio of reserves. When someone buys Token B, 
                  its price increases because Reserve Y decreases while Reserve X increases.
                </p>
                <code className="block bg-blue-100 p-2 rounded text-sm text-blue-900">
                  Price of B = Reserve X / Reserve Y
                </code>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <h3 className="font-bold text-purple-900 mb-3">Arbitrage Alignment</h3>
                <p className="text-purple-800 text-sm mb-3">
                  If the AMM price differs from other markets, arbitrageurs profit by trading until 
                  prices align. This keeps the AMM price accurate without any oracle.
                </p>
                <p className="text-purple-700 text-sm">
                  Example: If AXM is $1 on Axiom DEX but $1.05 on Uniswap, traders buy on Axiom and sell on Uniswap.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Understanding Price Impact</h2>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <p className="text-orange-800 mb-4">
                <strong>Price impact</strong> is the difference between the spot price and the effective execution price. 
                Larger trades relative to pool size cause higher price impact.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-orange-200">
                      <th className="text-left py-2 text-orange-900">Trade Size (% of pool)</th>
                      <th className="text-left py-2 text-orange-900">Approximate Price Impact</th>
                      <th className="text-left py-2 text-orange-900">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="text-orange-800">
                    <tr className="border-b border-orange-100">
                      <td className="py-2">0.1%</td>
                      <td className="py-2">~0.1%</td>
                      <td className="py-2 text-green-700">Excellent</td>
                    </tr>
                    <tr className="border-b border-orange-100">
                      <td className="py-2">1%</td>
                      <td className="py-2">~1%</td>
                      <td className="py-2 text-green-700">Good</td>
                    </tr>
                    <tr className="border-b border-orange-100">
                      <td className="py-2">5%</td>
                      <td className="py-2">~5%</td>
                      <td className="py-2 text-amber-700">Moderate</td>
                    </tr>
                    <tr>
                      <td className="py-2">10%+</td>
                      <td className="py-2">10%+</td>
                      <td className="py-2 text-red-700">Consider splitting</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">AMM Advantages vs Order Books</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="font-bold text-green-900 mb-3">AMM Advantages</h3>
                <ul className="space-y-2 text-sm text-green-800">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Always available liquidity at any price</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>No counterparty needed — trade instantly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Simple user experience</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Permissionless pool creation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Passive income for liquidity providers</span>
                  </li>
                </ul>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <h3 className="font-bold text-gray-900 mb-3">Order Book Comparison</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>Requires active market makers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>Better for large trades (less slippage)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>More complex matching engine</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>Limit orders possible</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>More capital efficient</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-4">
          <Link href="/dex/liquidity-guide" className="bg-white border border-gray-200 rounded-xl p-6 hover:border-amber-300 hover:shadow-lg transition-all group">
            <div className="text-2xl mb-2">💧</div>
            <h3 className="font-bold text-gray-900 group-hover:text-amber-600">Liquidity Guide</h3>
            <p className="text-sm text-gray-600">Learn how to provide liquidity and earn fees</p>
          </Link>
          <Link href="/dex/impermanent-loss" className="bg-white border border-gray-200 rounded-xl p-6 hover:border-amber-300 hover:shadow-lg transition-all group">
            <div className="text-2xl mb-2">📉</div>
            <h3 className="font-bold text-gray-900 group-hover:text-amber-600">Impermanent Loss</h3>
            <p className="text-sm text-gray-600">Understand and calculate potential IL</p>
          </Link>
          <Link href="/dex/fees-rewards" className="bg-white border border-gray-200 rounded-xl p-6 hover:border-amber-300 hover:shadow-lg transition-all group">
            <div className="text-2xl mb-2">💰</div>
            <h3 className="font-bold text-gray-900 group-hover:text-amber-600">Fees & Rewards</h3>
            <p className="text-sm text-gray-600">Calculate your earning potential</p>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
