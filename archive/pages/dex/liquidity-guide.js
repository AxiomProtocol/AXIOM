import { useState } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';

export default function LiquidityGuide() {
  const [depositA, setDepositA] = useState(1000);
  const [depositB, setDepositB] = useState(1);
  const [poolSize, setPoolSize] = useState(100000);
  const [dailyVolume, setDailyVolume] = useState(50000);

  const depositValue = depositA + (depositB * 1000);
  const poolShare = ((depositValue / (poolSize + depositValue)) * 100).toFixed(4);
  const dailyFees = dailyVolume * 0.003;
  const yourDailyFees = (dailyFees * (depositValue / (poolSize + depositValue))).toFixed(2);
  const yearlyFees = (yourDailyFees * 365).toFixed(2);
  const apr = ((yearlyFees / depositValue) * 100).toFixed(2);

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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Complete Liquidity Provider Guide</h1>
          <p className="text-xl text-gray-600">Everything you need to know about providing liquidity and earning fees on Axiom Exchange</p>
        </div>

        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 text-white mb-12">
          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold">0.3%</div>
              <div className="text-amber-100">Fee Per Trade</div>
            </div>
            <div>
              <div className="text-3xl font-bold">100%</div>
              <div className="text-amber-100">To LPs</div>
            </div>
            <div>
              <div className="text-3xl font-bold">No Lock</div>
              <div className="text-amber-100">Withdraw Anytime</div>
            </div>
            <div>
              <div className="text-3xl font-bold">Auto</div>
              <div className="text-amber-100">Compounding</div>
            </div>
          </div>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">What is Liquidity Provision?</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-gray-700 mb-4">
                Liquidity provision is the process of depositing tokens into a trading pool to enable others to swap between those tokens. 
                In return, liquidity providers (LPs) earn a share of all trading fees proportional to their contribution.
              </p>
              <p className="text-gray-700 mb-4">
                On Axiom Exchange, when you provide liquidity, you receive <strong>LP tokens</strong> that represent your share of the pool. 
                These tokens can be redeemed at any time for your underlying assets plus accumulated fees.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h4 className="font-bold text-green-900 mb-2">Key Benefits</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Earn passive income from trading fees</li>
                  <li>• Fees automatically compound in the pool</li>
                  <li>• No lock-up periods - withdraw anytime</li>
                  <li>• Support the Axiom ecosystem</li>
                </ul>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-6">
              <h4 className="font-bold text-gray-900 mb-4">How It Works</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <span className="text-gray-700">Deposit equal value of two tokens</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <span className="text-gray-700">Receive LP tokens representing your share</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <span className="text-gray-700">Earn 0.3% of every trade in the pool</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                  <span className="text-gray-700">Redeem LP tokens for assets + fees anytime</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">LP Earnings Calculator</h2>
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-bold text-gray-900 mb-4">Your Deposit</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Token A Amount (AXM)</label>
                    <input
                      type="number"
                      value={depositA}
                      onChange={(e) => setDepositA(Number(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Token B Amount (ETH)</label>
                    <input
                      type="number"
                      value={depositB}
                      onChange={(e) => setDepositB(Number(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Pool TVL ($)</label>
                    <input
                      type="number"
                      value={poolSize}
                      onChange={(e) => setPoolSize(Number(e.target.value) || 0)}
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
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-4">Projected Earnings</h3>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Your Deposit Value:</span>
                    <span className="font-bold text-gray-900">${depositValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Your Pool Share:</span>
                    <span className="font-bold text-gray-900">{poolShare}%</span>
                  </div>
                  <hr className="border-amber-200" />
                  <div className="flex justify-between">
                    <span className="text-gray-600">Daily Pool Fees:</span>
                    <span className="font-medium text-gray-700">${dailyFees.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Your Daily Earnings:</span>
                    <span className="font-bold text-green-600">${yourDailyFees}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Projected Yearly:</span>
                    <span className="font-bold text-green-600">${Number(yearlyFees).toLocaleString()}</span>
                  </div>
                  <hr className="border-amber-200" />
                  <div className="flex justify-between text-lg">
                    <span className="font-bold text-gray-900">Estimated APR:</span>
                    <span className="font-bold text-amber-600">{apr}%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  * Projections based on current volume. Actual returns may vary. Does not account for impermanent loss.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Step-by-Step: Adding Liquidity</h2>
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex gap-6">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-amber-600 flex-shrink-0">1</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Connect Your Wallet</h3>
                  <p className="text-gray-600 mb-3">
                    Connect MetaMask or another Web3 wallet to Axiom Exchange. Make sure you're on the Arbitrum One network.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    <strong>Tip:</strong> If you're not on Arbitrum One, the app will prompt you to switch networks automatically.
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex gap-6">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-amber-600 flex-shrink-0">2</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Choose Your Pool</h3>
                  <p className="text-gray-600 mb-3">
                    Select the token pair you want to provide liquidity for. Consider:
                  </p>
                  <ul className="text-gray-600 space-y-1 mb-3">
                    <li>• <strong>Trading Volume:</strong> Higher volume = more fees</li>
                    <li>• <strong>Token Volatility:</strong> More volatility = higher impermanent loss risk</li>
                    <li>• <strong>Your Holdings:</strong> Best to use tokens you already own and believe in</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex gap-6">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-amber-600 flex-shrink-0">3</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Enter Token Amounts</h3>
                  <p className="text-gray-600 mb-3">
                    Enter the amount of each token you want to deposit. The amounts must be equal in value at the current pool price ratio.
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    <strong>Note:</strong> When you enter one amount, the other automatically calculates based on the current pool ratio.
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex gap-6">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-amber-600 flex-shrink-0">4</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Approve Tokens</h3>
                  <p className="text-gray-600 mb-3">
                    Before depositing, you need to approve the smart contract to spend your tokens. This is a one-time approval per token.
                  </p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                    <strong>Security:</strong> Token approvals are standard in DeFi. You're only approving the specific Axiom Exchange contract.
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex gap-6">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-amber-600 flex-shrink-0">5</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm & Deposit</h3>
                  <p className="text-gray-600 mb-3">
                    Review the transaction details and confirm in your wallet. You'll pay a small gas fee on Arbitrum (usually a few cents).
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-green-300 rounded-xl p-6">
              <div className="flex gap-6">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-green-600 flex-shrink-0">✓</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Receive LP Tokens & Start Earning</h3>
                  <p className="text-gray-600 mb-3">
                    Once confirmed, you'll receive LP tokens in your wallet. These represent your share of the pool. 
                    You're now earning fees from every trade!
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                    <strong>Your LP tokens grow in value</strong> as trading fees accumulate in the pool. When you withdraw, 
                    you get back more tokens than you deposited (minus any impermanent loss).
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Removing Liquidity</h2>
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <p className="text-gray-700 mb-4">
              You can withdraw your liquidity at any time with no penalties or lock-up periods. Here's how:
            </p>
            <ol className="space-y-3 text-gray-700">
              <li className="flex gap-3">
                <span className="font-bold text-amber-600">1.</span>
                <span>Go to "My Positions" tab in the Exchange</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-amber-600">2.</span>
                <span>Find the pool you want to withdraw from</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-amber-600">3.</span>
                <span>Click "Remove" and enter the percentage to withdraw (or click "Max")</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-amber-600">4.</span>
                <span>Confirm the transaction in your wallet</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-amber-600">5.</span>
                <span>Receive both tokens back based on current pool ratio + your share of fees</span>
              </li>
            </ol>
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              <strong>Important:</strong> When you withdraw, you receive the tokens at the current pool ratio, which may differ 
              from when you deposited. This is related to impermanent loss.
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Best Practices for LPs</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                <span>✓</span> Do's
              </h3>
              <ul className="space-y-2 text-sm text-green-800">
                <li>• Start with stablecoin pairs to minimize IL</li>
                <li>• Provide liquidity for tokens you want to hold long-term</li>
                <li>• Monitor your positions regularly</li>
                <li>• Consider the volume-to-TVL ratio for best returns</li>
                <li>• Understand impermanent loss before depositing</li>
                <li>• Keep some tokens outside pools for flexibility</li>
              </ul>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                <span>✗</span> Don'ts
              </h3>
              <ul className="space-y-2 text-sm text-red-800">
                <li>• Don't provide liquidity with borrowed funds</li>
                <li>• Don't ignore impermanent loss risks</li>
                <li>• Don't deposit tokens you might need urgently</li>
                <li>• Don't chase high APRs without understanding risks</li>
                <li>• Don't forget to factor in gas costs</li>
                <li>• Don't panic-withdraw during price volatility</li>
              </ul>
            </div>
          </div>
        </section>

        <div className="mt-12 grid md:grid-cols-3 gap-4">
          <Link href="/dex/how-amm-works" className="bg-white border border-gray-200 rounded-xl p-6 hover:border-amber-300 hover:shadow-lg transition-all group">
            <div className="text-2xl mb-2">🔄</div>
            <h3 className="font-bold text-gray-900 group-hover:text-amber-600">How AMMs Work</h3>
            <p className="text-sm text-gray-600">Understand the math behind DEXs</p>
          </Link>
          <Link href="/dex/impermanent-loss" className="bg-white border border-gray-200 rounded-xl p-6 hover:border-amber-300 hover:shadow-lg transition-all group">
            <div className="text-2xl mb-2">📉</div>
            <h3 className="font-bold text-gray-900 group-hover:text-amber-600">Impermanent Loss</h3>
            <p className="text-sm text-gray-600">Calculate and minimize IL</p>
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
