import React from 'react';

const PricingPage: React.FC = () => {
  return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-blue-800 mb-6">
              💰 Pricing & Plans
            </h1>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Transparent pricing for decentralized wealth management. No hidden fees, no surprises.
            </p>
          </div>

          {/* Free Tier */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white border-2 border-gray-200 rounded-xl p-8 text-center">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">🆓 Basic</h3>
              <div className="text-4xl font-bold text-green-600 mb-2">Free</div>
              <p className="text-gray-600 mb-6">Get started with basic features</p>
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  Wallet Connection
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  Basic Dashboard
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  Community Access
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  Educational Resources
                </li>
              </ul>
              <button className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg transition-colors">
                Current Plan
              </button>
            </div>

            {/* Premium Tier */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white rounded-xl p-8 text-center relative border-4 border-yellow-400">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-black px-4 py-1 rounded-full text-sm font-bold">
                MOST POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-4">⭐ Premium</h3>
              <div className="text-4xl font-bold mb-2">0.5%</div>
              <p className="text-blue-100 mb-6">Annual management fee</p>
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-3">✓</span>
                  Everything in Basic
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-3">✓</span>
                  Advanced Staking
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-3">✓</span>
                  DeFi Banking Features
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-3">✓</span>
                  Real Estate Tokens
                </li>
                <li className="flex items-center">
                  <span className="text-yellow-400 mr-3">✓</span>
                  Priority Support
                </li>
              </ul>
              <button className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-3 rounded-lg transition-colors font-bold">
                Upgrade Now
              </button>
            </div>

            {/* Enterprise Tier */}
            <div className="bg-white border-2 border-purple-500 rounded-xl p-8 text-center">
              <h3 className="text-2xl font-bold text-purple-800 mb-4">🏢 Enterprise</h3>
              <div className="text-4xl font-bold text-purple-600 mb-2">Custom</div>
              <p className="text-gray-600 mb-6">For institutions & large portfolios</p>
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center">
                  <span className="text-purple-500 mr-3">✓</span>
                  Everything in Premium
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-3">✓</span>
                  White-label Solutions
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-3">✓</span>
                  Custom Integrations
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-3">✓</span>
                  Dedicated Support
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-3">✓</span>
                  SLA Guarantees
                </li>
              </ul>
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg transition-colors">
                Contact Sales
              </button>
            </div>
          </div>

          {/* Transaction Fees */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-blue-800 mb-6">💳 Transaction Fees</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Blockchain Operations</h3>
                <ul className="space-y-2">
                  <li className="flex justify-between">
                    <span>Token Staking</span>
                    <span className="font-semibold text-green-600">Free</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Token Withdrawal</span>
                    <span className="font-semibold">Gas fees only</span>
                  </li>
                  <li className="flex justify-between">
                    <span>DeFi Lending</span>
                    <span className="font-semibold text-green-600">Free</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Fiat Operations</h3>
                <ul className="space-y-2">
                  <li className="flex justify-between">
                    <span>Credit Card Deposits</span>
                    <span className="font-semibold">2.9% + $0.30</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Bank Transfers</span>
                    <span className="font-semibold text-green-600">Free</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Wire Transfers</span>
                    <span className="font-semibold">$25</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-blue-800 mb-6">❓ Pricing FAQ</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">How is the management fee calculated?</h3>
                <p className="text-gray-600">The 0.5% annual fee is calculated daily on your total portfolio value and deducted monthly.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Are there any hidden fees?</h3>
                <p className="text-gray-600">No hidden fees. All costs are transparent and disclosed upfront. You only pay blockchain gas fees for transactions.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Can I downgrade my plan?</h3>
                <p className="text-gray-600">Yes, you can change your plan at any time. Changes take effect at the next billing cycle.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default PricingPage;
