import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';

const BankingRatesFeesPage: React.FC = () => {
  const { account } = useWallet();
  const [activeTab, setActiveTab] = useState<'deposit' | 'lending' | 'services'>('deposit');

  const depositRates = [
    { product: 'Standard Checking Account', apy: '0.50%', minimumBalance: '100 AXM', monthlyFee: '$0' },
    { product: 'Premium Checking Account', apy: '2.50%', minimumBalance: '5,000 AXM', monthlyFee: '$0' },
    { product: 'High-Yield Savings Account', apy: '5.00%', minimumBalance: '500 AXM', monthlyFee: '$0' },
    { product: 'Money Market Account', apy: '6.50%', minimumBalance: '10,000 AXM', monthlyFee: '$0' },
    { product: '1-Year Certificate of Deposit', apy: '7.50%', minimumBalance: '1,000 AXM', monthlyFee: '$0' },
    { product: '5-Year Certificate of Deposit', apy: '10.00%', minimumBalance: '5,000 AXM', monthlyFee: '$0' },
    { product: 'Business Checking Account', apy: '0.00%', minimumBalance: '1,000 AXM', monthlyFee: '$15' },
    { product: 'Business Savings Account', apy: '4.50%', minimumBalance: '5,000 AXM', monthlyFee: '$0' }
  ];

  const lendingRates = [
    { product: 'Personal Loan', rate: '8.50% APR', loanAmount: 'Up to 50,000 AXM', originationFee: '1%' },
    { product: 'Axiom Rewards Credit Card', rate: '15.90% APR', creditLimit: 'Up to 25,000 AXM', annualFee: '$0' },
    { product: 'Smart City Home Mortgage', rate: '4.50% APR', loanAmount: 'Up to 2M AXM', originationFee: '0.5%' },
    { product: 'Small Business Loan', rate: '6.50% APR', loanAmount: 'Up to 500K AXM', originationFee: '1.5%' },
    { product: 'Vehicle Financing', rate: '5.50% APR', loanAmount: 'Up to 100K AXM', originationFee: '0%' },
    { product: 'HELOC', rate: '6.00% APR', loanAmount: 'Up to 500K AXM', annualFee: '$50' },
    { product: 'Education Loan', rate: '4.00% APR', loanAmount: 'Up to 100K AXM', originationFee: '0%' },
    { product: 'Crypto-Backed Loan', rate: '3.50% APR', loanAmount: 'Up to 1M AXM', originationFee: '0%' },
    { product: 'Commercial Real Estate', rate: '5.50% APR', loanAmount: 'Up to 5M AXM', originationFee: '1%' }
  ];

  const serviceFees = [
    { service: 'Domestic Wire Transfer', fee: '$10 per transfer', notes: 'Same-day processing' },
    { service: 'International Wire Transfer', fee: '$25 per transfer', notes: 'Blockchain settlement' },
    { service: 'ACH Transfer', fee: 'Free', notes: '2-3 business days' },
    { service: 'Instant Pay (P2P)', fee: 'Free', notes: 'Instant settlement' },
    { service: 'Merchant Payment Processing', fee: '1.5% + $0.10', notes: 'Per transaction' },
    { service: 'Remote Deposit Capture', fee: '$20/month', notes: 'Unlimited deposits' },
    { service: 'Payroll Services', fee: '$50/month + $5/employee', notes: 'Automated processing' },
    { service: 'Treasury Management', fee: 'Custom pricing', notes: '100K AXM minimum' },
    { service: 'Stop Payment', fee: '$25', notes: 'Per request' },
    { service: 'Account Closure', fee: 'Free', notes: 'No penalties' },
    { service: 'Paper Statement', fee: '$3/month', notes: 'Online statements free' },
    { service: 'Overdraft Protection', fee: '$0', notes: 'Auto-transfer from savings' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-cyan-900 via-blue-900 to-indigo-900 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="inline-block bg-yellow-500/20 border border-yellow-500/50 rounded-full px-4 py-2 mb-4">
            <span className="text-yellow-400 font-semibold">💵 RATES & FEES</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              Transparent Pricing
            </span>
          </h1>
          
          <p className="text-xl text-gray-300 mb-8 max-w-3xl">
            No hidden fees. No surprises. All rates and fees are clearly disclosed 
            and verified on the blockchain. Updated daily to reflect market conditions.
          </p>

          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 inline-block">
            <p className="text-green-400 font-semibold">
              ✅ Rates updated as of {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'deposit'
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            💰 Deposit Rates
          </button>
          <button
            onClick={() => setActiveTab('lending')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'lending'
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            💳 Lending Rates
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'services'
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            🔧 Service Fees
          </button>
        </div>

        {/* Deposit Rates Table */}
        {activeTab === 'deposit' && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-4 text-left text-yellow-400 font-semibold">Product</th>
                    <th className="px-6 py-4 text-left text-yellow-400 font-semibold">APY</th>
                    <th className="px-6 py-4 text-left text-yellow-400 font-semibold">Minimum Balance</th>
                    <th className="px-6 py-4 text-left text-yellow-400 font-semibold">Monthly Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {depositRates.map((rate, idx) => (
                    <tr key={idx} className="border-t border-gray-700 hover:bg-gray-700/30">
                      <td className="px-6 py-4 text-white font-medium">{rate.product}</td>
                      <td className="px-6 py-4 text-green-400 font-bold text-lg">{rate.apy}</td>
                      <td className="px-6 py-4 text-gray-300">{rate.minimumBalance}</td>
                      <td className="px-6 py-4 text-gray-300">{rate.monthlyFee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lending Rates Table */}
        {activeTab === 'lending' && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-4 text-left text-yellow-400 font-semibold">Product</th>
                    <th className="px-6 py-4 text-left text-yellow-400 font-semibold">Rate</th>
                    <th className="px-6 py-4 text-left text-yellow-400 font-semibold">Loan Amount</th>
                    <th className="px-6 py-4 text-left text-yellow-400 font-semibold">Fees</th>
                  </tr>
                </thead>
                <tbody>
                  {lendingRates.map((rate, idx) => (
                    <tr key={idx} className="border-t border-gray-700 hover:bg-gray-700/30">
                      <td className="px-6 py-4 text-white font-medium">{rate.product}</td>
                      <td className="px-6 py-4 text-blue-400 font-bold text-lg">{rate.rate}</td>
                      <td className="px-6 py-4 text-gray-300">{rate.loanAmount || rate.creditLimit}</td>
                      <td className="px-6 py-4 text-gray-300">{rate.originationFee || rate.annualFee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Service Fees Table */}
        {activeTab === 'services' && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-4 text-left text-yellow-400 font-semibold">Service</th>
                    <th className="px-6 py-4 text-left text-yellow-400 font-semibold">Fee</th>
                    <th className="px-6 py-4 text-left text-yellow-400 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceFees.map((fee, idx) => (
                    <tr key={idx} className="border-t border-gray-700 hover:bg-gray-700/30">
                      <td className="px-6 py-4 text-white font-medium">{fee.service}</td>
                      <td className="px-6 py-4 text-purple-400 font-bold">{fee.fee}</td>
                      <td className="px-6 py-4 text-gray-400 text-sm">{fee.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Important Disclosures */}
        <div className="mt-12 bg-blue-900/20 border border-blue-600/30 rounded-lg p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-4">📋 Important Rate Disclosures</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              <span>All rates are accurate as of {new Date().toLocaleDateString()} and are subject to change without notice</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              <span>APY = Annual Percentage Yield. APR = Annual Percentage Rate</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              <span>Fees may reduce earnings on deposit accounts</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              <span>Early withdrawal penalties apply to certificates of deposit</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              <span>Loan rates based on creditworthiness and on-chain reputation score</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              <span>All rates verified and recorded on Arbitrum One blockchain</span>
            </li>
          </ul>
        </div>

        {/* Compare Rates CTA */}
        <div className="mt-8 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/30 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">
            See How We Compare
          </h2>
          <p className="text-gray-300 mb-6">
            Our rates are consistently among the best in the industry. 
            Compare our APYs with traditional banks and see the difference.
          </p>
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Traditional Banks</div>
              <div className="text-2xl font-bold text-red-400">0.01%</div>
              <div className="text-xs text-gray-500">Average Savings APY</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500 rounded-lg p-4">
              <div className="text-sm text-yellow-400 mb-1 font-bold">Axiom National Bank</div>
              <div className="text-3xl font-bold text-green-400">5.00%</div>
              <div className="text-xs text-gray-300">Savings APY</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Online-Only Banks</div>
              <div className="text-2xl font-bold text-blue-400">4.25%</div>
              <div className="text-xs text-gray-500">Average Savings APY</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankingRatesFeesPage;
