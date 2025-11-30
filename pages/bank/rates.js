import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';

const DEPOSIT_RATES = [
  { product: 'Standard Checking', apy: '0.50%', minimum: '100 AXM', type: 'checking' },
  { product: 'Premium Checking', apy: '2.50%', minimum: '5,000 AXM', type: 'checking' },
  { product: 'High-Yield Savings', apy: '5.00%', minimum: '500 AXM', type: 'savings' },
  { product: 'Money Market', apy: '6.50%', minimum: '10,000 AXM', type: 'savings' },
  { product: '6-Month CD', apy: '6.00%', minimum: '1,000 AXM', type: 'cd' },
  { product: '1-Year CD', apy: '7.50%', minimum: '1,000 AXM', type: 'cd' },
  { product: '2-Year CD', apy: '8.50%', minimum: '2,500 AXM', type: 'cd' },
  { product: '5-Year CD', apy: '10.00%', minimum: '5,000 AXM', type: 'cd' },
  { product: 'Business Savings', apy: '4.50%', minimum: '1,000 AXM', type: 'business' },
];

const LOAN_RATES = [
  { product: 'Home Mortgage (30-year fixed)', apr: '4.50%', range: '4.25% - 5.25%', type: 'mortgage' },
  { product: 'Home Mortgage (15-year fixed)', apr: '3.75%', range: '3.50% - 4.25%', type: 'mortgage' },
  { product: 'Home Equity Line (HELOC)', apr: '6.00%', range: '5.50% - 7.50%', type: 'mortgage' },
  { product: 'Investment Property', apr: '5.50%', range: '5.00% - 6.50%', type: 'mortgage' },
  { product: 'Personal Loan', apr: '8.50%', range: '6.99% - 15.99%', type: 'personal' },
  { product: 'Crypto-Backed Loan', apr: '3.50%', range: '2.99% - 5.99%', type: 'personal' },
  { product: 'Auto Loan (new)', apr: '5.50%', range: '4.99% - 7.99%', type: 'auto' },
  { product: 'Auto Loan (used)', apr: '6.50%', range: '5.99% - 9.99%', type: 'auto' },
  { product: 'Education Loan', apr: '4.00%', range: '3.50% - 6.00%', type: 'education' },
  { product: 'Small Business Loan', apr: '6.50%', range: '5.99% - 12.99%', type: 'business' },
  { product: 'Business Line of Credit', apr: '7.50%', range: '6.99% - 14.99%', type: 'business' },
];

const CREDIT_CARD_RATES = [
  { product: 'Axiom Rewards Card', apr: '15.99%', range: '12.99% - 22.99%', rewards: '3% AXM cashback' },
  { product: 'Axiom Platinum Card', apr: '13.99%', range: '11.99% - 19.99%', rewards: '2% everywhere' },
  { product: 'Axiom Business Card', apr: '14.99%', range: '12.99% - 21.99%', rewards: '4% on business' },
];

const FEES = [
  { service: 'Account Maintenance', standard: 'Free', premium: 'Free', business: '$15/mo (waivable)' },
  { service: 'Wire Transfer (Domestic)', standard: '$10', premium: 'Free', business: '$10' },
  { service: 'Wire Transfer (International)', standard: '$25', premium: '$15', business: '$20' },
  { service: 'ACH Transfer', standard: 'Free', premium: 'Free', business: 'Free' },
  { service: 'Instant Pay (P2P)', standard: 'Free', premium: 'Free', business: '0.5%' },
  { service: 'Overdraft Protection', standard: '$25/incident', premium: '$15/incident', business: '$20/incident' },
  { service: 'Stop Payment', standard: '$30', premium: 'Free', business: '$25' },
  { service: 'Paper Statements', standard: '$5/mo', premium: 'Free', business: '$5/mo' },
  { service: 'Cashier Check', standard: '$10', premium: 'Free', business: '$10' },
];

export default function RatesPage() {
  const [currentDate, setCurrentDate] = useState('');
  
  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
  }, []);

  return (
    <Layout>
      <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/bank" className="text-amber-600 hover:text-amber-700 text-sm">Bank</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 text-sm">Rates & Fees</span>
          </div>
          
          <div className="text-center">
            <div className="inline-block bg-amber-100 border border-amber-300 rounded-full px-6 py-2 mb-6">
              <span className="text-amber-700 font-semibold">💵 RATES & FEES</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Transparent Pricing
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              No hidden fees, no surprises. See exactly what you'll earn and pay across 
              all Axiom banking products. Rates updated daily.
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
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Deposit Account Rates (APY)</h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Product</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">APY</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Minimum Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {DEPOSIT_RATES.map((rate, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{rate.product}</div>
                      <div className="text-xs text-gray-500 capitalize">{rate.type}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-2xl font-bold text-green-600">{rate.apy}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">{rate.minimum}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Loan Rates (APR)</h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Product</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Starting APR</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Rate Range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {LOAN_RATES.map((rate, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{rate.product}</div>
                      <div className="text-xs text-gray-500 capitalize">{rate.type}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-2xl font-bold text-amber-600">{rate.apr}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">{rate.range}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            * APR (Annual Percentage Rate) based on creditworthiness. Rates subject to change without notice.
          </p>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Credit Card Rates</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {CREDIT_CARD_RATES.map((card, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{card.product}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Purchase APR</span>
                    <span className="font-bold text-amber-600">{card.apr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">APR Range</span>
                    <span className="text-gray-900">{card.range}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rewards</span>
                    <span className="font-medium text-green-600">{card.rewards}</span>
                  </div>
                </div>
                <button className="w-full mt-4 py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors">
                  Apply Now
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Account Fees</h2>
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

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8">
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
