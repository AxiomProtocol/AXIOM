import { useState, useMemo } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';

export default function ImpermanentLoss() {
  const [initialPriceA, setInitialPriceA] = useState(1);
  const [initialPriceB, setInitialPriceB] = useState(1000);
  const [newPriceA, setNewPriceA] = useState(1);
  const [newPriceB, setNewPriceB] = useState(2000);
  const [depositValueUSD, setDepositValueUSD] = useState(2000);

  const calculations = useMemo(() => {
    const initialRatio = initialPriceB / initialPriceA;
    const newRatio = newPriceB / newPriceA;
    const priceChange = newRatio / initialRatio;

    const ilPercent = 2 * Math.sqrt(priceChange) / (1 + priceChange) - 1;
    const ilPercentAbs = Math.abs(ilPercent * 100);

    const holdValue = depositValueUSD * (1 + (priceChange - 1) / 2);
    const lpValue = depositValueUSD * (1 + ilPercent) * Math.sqrt(priceChange);
    const ilUSD = holdValue - lpValue;

    return {
      priceChange: ((priceChange - 1) * 100).toFixed(2),
      ilPercent: ilPercentAbs.toFixed(4),
      holdValue: holdValue.toFixed(2),
      lpValue: lpValue.toFixed(2),
      ilUSD: Math.abs(ilUSD).toFixed(2),
      breakEvenAPR: (ilPercentAbs * 12).toFixed(2)
    };
  }, [initialPriceA, initialPriceB, newPriceA, newPriceB, depositValueUSD]);

  const ilExamples = [
    { change: '1.25x', il: '0.6%', note: 'Minimal' },
    { change: '1.50x', il: '2.0%', note: 'Low' },
    { change: '1.75x', il: '3.8%', note: 'Moderate' },
    { change: '2x', il: '5.7%', note: 'Notable' },
    { change: '3x', il: '13.4%', note: 'High' },
    { change: '4x', il: '20.0%', note: 'Very High' },
    { change: '5x', il: '25.5%', note: 'Severe' },
  ];

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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Understanding Impermanent Loss</h1>
          <p className="text-xl text-gray-600">The most important concept for liquidity providers to understand</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-8 mb-12">
          <div className="flex items-start gap-4">
            <div className="text-4xl">⚠️</div>
            <div>
              <h2 className="text-xl font-bold text-orange-900 mb-2">What is Impermanent Loss?</h2>
              <p className="text-orange-800">
                Impermanent loss (IL) is the difference between holding tokens in your wallet versus providing them as liquidity. 
                When token prices change relative to each other, you end up with a different ratio of tokens than you deposited — 
                and this ratio is worth less than if you had simply held the original tokens.
              </p>
            </div>
          </div>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Impermanent Loss Calculator</h2>
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-bold text-gray-900 mb-4">Input Parameters</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Initial Price A ($)</label>
                      <input
                        type="number"
                        value={initialPriceA}
                        onChange={(e) => setInitialPriceA(Number(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Initial Price B ($)</label>
                      <input
                        type="number"
                        value={initialPriceB}
                        onChange={(e) => setInitialPriceB(Number(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Price A ($)</label>
                      <input
                        type="number"
                        value={newPriceA}
                        onChange={(e) => setNewPriceA(Number(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Price B ($)</label>
                      <input
                        type="number"
                        value={newPriceB}
                        onChange={(e) => setNewPriceB(Number(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Initial Deposit Value ($)</label>
                    <input
                      type="number"
                      value={depositValueUSD}
                      onChange={(e) => setDepositValueUSD(Number(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-4">Results</h3>
                <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price Ratio Change:</span>
                    <span className="font-bold text-gray-900">{calculations.priceChange}%</span>
                  </div>
                  <hr className="border-gray-200" />
                  <div className="flex justify-between">
                    <span className="text-gray-600">If HODL'd:</span>
                    <span className="font-bold text-green-600">${calculations.holdValue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">As LP (before fees):</span>
                    <span className="font-bold text-gray-900">${calculations.lpValue}</span>
                  </div>
                  <hr className="border-gray-200" />
                  <div className="flex justify-between text-lg">
                    <span className="font-bold text-gray-900">Impermanent Loss:</span>
                    <span className="font-bold text-red-600">{calculations.ilPercent}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">IL in USD:</span>
                    <span className="font-bold text-red-600">-${calculations.ilUSD}</span>
                  </div>
                  <hr className="border-gray-200" />
                  <div className="flex justify-between">
                    <span className="text-gray-600">Break-even APR needed:</span>
                    <span className="font-bold text-amber-600">~{calculations.breakEvenAPR}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">IL Reference Table</h2>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-6 font-medium text-gray-600">Price Change</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-600">Impermanent Loss</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-600">Severity</th>
                  <th className="text-left py-4 px-6 font-medium text-gray-600">Break-even APR (1 year)</th>
                </tr>
              </thead>
              <tbody>
                {ilExamples.map((ex, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-4 px-6 font-medium text-gray-900">{ex.change}</td>
                    <td className="py-4 px-6 text-red-600 font-medium">{ex.il}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ex.note === 'Minimal' ? 'bg-green-100 text-green-800' :
                        ex.note === 'Low' ? 'bg-green-100 text-green-800' :
                        ex.note === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                        ex.note === 'Notable' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {ex.note}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-600">~{(parseFloat(ex.il) * 12).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            * These values assume one token stays constant while the other changes. Actual IL depends on relative price changes between both tokens.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Why "Impermanent"?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="font-bold text-blue-900 mb-3">It's Reversible</h3>
              <p className="text-blue-800 text-sm mb-3">
                If token prices return to their original ratio, the impermanent loss disappears completely. 
                The loss only becomes "permanent" when you withdraw at a different price ratio than when you deposited.
              </p>
              <div className="bg-blue-100 rounded-lg p-3 text-sm text-blue-900">
                <strong>Example:</strong> If ETH goes from $1000 to $2000 and back to $1000, you have zero IL.
              </div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
              <h3 className="font-bold text-purple-900 mb-3">Fees Can Offset It</h3>
              <p className="text-purple-800 text-sm mb-3">
                While you're providing liquidity, you're earning trading fees. In many cases, the fees earned 
                exceed the impermanent loss, resulting in net profit.
              </p>
              <div className="bg-purple-100 rounded-lg p-3 text-sm text-purple-900">
                <strong>Key insight:</strong> High-volume pools with moderate volatility often outperform holding.
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Visual Explanation</h2>
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-4xl mb-2">📥</div>
                  <h4 className="font-bold text-gray-900 mb-2">You Deposit</h4>
                  <p className="text-sm text-gray-600">50% Token A + 50% Token B (equal value)</p>
                  <div className="mt-2 flex justify-center gap-2">
                    <div className="w-16 h-8 bg-amber-400 rounded"></div>
                    <div className="w-16 h-8 bg-blue-400 rounded"></div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-2">📈</div>
                  <h4 className="font-bold text-gray-900 mb-2">Price Changes</h4>
                  <p className="text-sm text-gray-600">Token B doubles in price</p>
                  <div className="mt-2 flex justify-center gap-2">
                    <div className="w-16 h-8 bg-amber-400 rounded"></div>
                    <div className="w-16 h-16 bg-blue-400 rounded"></div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-2">📤</div>
                  <h4 className="font-bold text-gray-900 mb-2">You Withdraw</h4>
                  <p className="text-sm text-gray-600">More A, less B than you started with</p>
                  <div className="mt-2 flex justify-center gap-2">
                    <div className="w-20 h-8 bg-amber-400 rounded"></div>
                    <div className="w-12 h-8 bg-blue-400 rounded"></div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-700 text-center">
                  The AMM rebalances to maintain equal value. Since Token B is worth more, you have less of it. 
                  If you had just held, you'd have the original amount of the now-more-valuable Token B.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Strategies to Minimize IL</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-3">1. Stablecoin Pairs</h3>
              <p className="text-gray-600 text-sm mb-3">
                Pairs like USDC/USDT have minimal IL because both tokens maintain roughly the same value.
              </p>
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <span>✓</span> IL Risk: Very Low
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-3">2. Correlated Assets</h3>
              <p className="text-gray-600 text-sm mb-3">
                Pairs that tend to move together (like wBTC/ETH) experience less IL than uncorrelated pairs.
              </p>
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <span>~</span> IL Risk: Low-Medium
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-3">3. High Volume Pools</h3>
              <p className="text-gray-600 text-sm mb-3">
                More trading volume means more fees to offset any IL you experience.
              </p>
              <div className="flex items-center gap-2 text-blue-600 text-sm">
                <span>💡</span> Check volume/TVL ratio
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-3">4. Long-term Perspective</h3>
              <p className="text-gray-600 text-sm mb-3">
                If you believe prices will eventually return to the original ratio, IL is temporary.
              </p>
              <div className="flex items-center gap-2 text-purple-600 text-sm">
                <span>⏳</span> Time can heal IL
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">IL vs Fees: When Does LP Pay Off?</h2>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
            <p className="text-gray-700 mb-4">
              Providing liquidity is profitable when your share of trading fees exceeds your impermanent loss. 
              The key factors are:
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">↑ Volume</div>
                <p className="text-sm text-gray-600">Higher trading volume = more fees earned</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-600 mb-2">↓ Volatility</div>
                <p className="text-sm text-gray-600">Less price divergence = lower IL</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">⏱️ Time</div>
                <p className="text-sm text-gray-600">Longer holding = more fee accumulation</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-12 grid md:grid-cols-3 gap-4">
          <Link href="/dex/how-amm-works" className="bg-white border border-gray-200 rounded-xl p-6 hover:border-amber-300 hover:shadow-lg transition-all group">
            <div className="text-2xl mb-2">🔄</div>
            <h3 className="font-bold text-gray-900 group-hover:text-amber-600">How AMMs Work</h3>
            <p className="text-sm text-gray-600">Understand the underlying mechanics</p>
          </Link>
          <Link href="/dex/liquidity-guide" className="bg-white border border-gray-200 rounded-xl p-6 hover:border-amber-300 hover:shadow-lg transition-all group">
            <div className="text-2xl mb-2">💧</div>
            <h3 className="font-bold text-gray-900 group-hover:text-amber-600">Liquidity Guide</h3>
            <p className="text-sm text-gray-600">Complete LP walkthrough</p>
          </Link>
          <Link href="/dex/fees-rewards" className="bg-white border border-gray-200 rounded-xl p-6 hover:border-amber-300 hover:shadow-lg transition-all group">
            <div className="text-2xl mb-2">💰</div>
            <h3 className="font-bold text-gray-900 group-hover:text-amber-600">Fees & Rewards</h3>
            <p className="text-sm text-gray-600">Maximize your earnings</p>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
