import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';

const PROTOCOL_RATES = [
  { product: 'Self-Custody Wallet', rate: 'N/A', minimum: 'None', type: 'wallet', note: 'Full self-custody' },
  { product: 'SUSU Savings Circle', rate: 'Variable', minimum: 'Varies by circle', type: 'savings', note: 'Community-based returns' },
  { product: 'Yield Vault', rate: 'Variable', minimum: '100 AXM', type: 'vault', note: 'Based on protocol activity' },
  { product: 'Wealth Engine (1yr lock)', rate: 'Variable', minimum: '100 AXM', type: 'staking', note: '1x voting power' },
  { product: 'Wealth Engine (4yr lock)', rate: 'Variable', minimum: '100 AXM', type: 'staking', note: '4x voting power' },
  { product: 'LP Staking', rate: 'Variable', minimum: 'LP tokens', type: 'defi', note: 'Swap fees + rewards' },
  { product: 'Business Vault', rate: 'Variable', minimum: '1,000 AXM', type: 'business', note: 'Multi-sig support' },
];

const COLLATERAL_RATES = [
  { product: 'Collateral Position (AXM)', rate: 'Variable', ltv: '50-70%', type: 'collateral', note: 'Market-based rates' },
  { product: 'Collateral Position (ETH)', rate: 'Variable', ltv: '60-75%', type: 'collateral', note: 'Market-based rates' },
  { product: 'Collateral Position (BTC)', rate: 'Variable', ltv: '60-75%', type: 'collateral', note: 'Market-based rates' },
];

const FEES = [
  { service: 'Self-Custody Transfer', standard: 'Gas only', premium: 'Gas only', business: 'Gas only' },
  { service: 'SUSU Circle Fee', standard: '0.5%', premium: '0.5%', business: '0.5%' },
  { service: 'Vault Deposit', standard: 'Free', premium: 'Free', business: 'Free' },
  { service: 'Vault Withdrawal', standard: 'Free', premium: 'Free', business: 'Free' },
  { service: 'DEX Swap', standard: '0.3%', premium: '0.3%', business: '0.3%' },
  { service: 'Wealth Engine Lock', standard: 'Free', premium: 'Free', business: 'Free' },
  { service: 'Merchant Processing', standard: '1.5%', premium: '1.5%', business: '1.5%' },
];

export default function ProtocolRatesPage() {
  const [currentDate, setCurrentDate] = useState('');
  
  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
  }, []);

  return (
    <Layout>
      <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/bank" className="text-amber-600 hover:text-amber-700 text-sm">Treasury</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 text-sm">Protocol Fees</span>
          </div>
          
          <div className="text-center">
            <div className="inline-block bg-amber-100 border border-amber-300 rounded-full px-6 py-2 mb-6">
              <span className="text-amber-700 font-semibold">💵 PROTOCOL FEES</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Transparent Protocol Fees
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              All protocol rewards are variable and based on market conditions and protocol activity.
              This is not a bank. No guaranteed returns.
            </p>

            {currentDate && (
              <div className="inline-block bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                Last Updated: {currentDate}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Protocol Products</h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Product</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Rewards</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Minimum</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {PROTOCOL_RATES.map((rate, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{rate.product}</div>
                      <div className="text-xs text-gray-500 capitalize">{rate.type}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xl font-bold text-amber-600">{rate.rate}</span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">{rate.minimum}</td>
                    <td className="px-6 py-4 text-right text-gray-500 text-sm">{rate.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            * All rewards are variable and based on protocol activity. Past performance does not guarantee future results. This is not a bank.
          </p>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Collateral Positions</h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Collateral Type</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Rate</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">LTV Ratio</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {COLLATERAL_RATES.map((rate, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{rate.product}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xl font-bold text-amber-600">{rate.rate}</span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">{rate.ltv}</td>
                    <td className="px-6 py-4 text-right text-gray-500 text-sm">{rate.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            * Rates are variable and based on market conditions. Collateral positions carry liquidation risk.
          </p>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Protocol Fees</h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Service</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Standard</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Premium</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Business</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {FEES.map((fee, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{fee.service}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={fee.standard === 'Free' ? 'text-green-600 font-semibold' : 'text-gray-600'}>
                        {fee.standard}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={fee.premium === 'Free' ? 'text-green-600 font-semibold' : 'text-gray-600'}>
                        {fee.premium}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={fee.business === 'Free' ? 'text-green-600 font-semibold' : 'text-gray-600'}>
                        {fee.business}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <div className="text-4xl">ℹ️</div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Rate Disclosure</h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li>• All rates are subject to change without notice and may vary based on market conditions.</li>
                <li>• APY (Annual Percentage Yield) assumes deposits remain in the account for one year.</li>
                <li>• Loan rates depend on creditworthiness, loan amount, term, and collateral.</li>
                <li>• Fees may be waived based on account tier or balance requirements.</li>
                <li>• Contact us for personalized rate quotes based on your specific situation.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
