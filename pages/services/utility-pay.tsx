import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { useWallet } from '../../components/WalletConnect/WalletContext';

interface Invoice {
  id: number;
  invoiceNumber: string;
  utilityType: string;
  providerName: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  usageAmount: string;
  usageUnit: string;
  amountUsd: string;
  amountAxm: string;
  discountApplied: string;
  status: string;
  dueDate: string;
  paidAt: string | null;
}

const UTILITY_ICONS: { [key: string]: string } = {
  electricity: '⚡',
  water: '💧',
  gas: '🔥',
  internet: '🌐',
  waste: '♻️',
  solar_credits: '☀️',
  ev_charging: '🔌',
  other: '📋'
};

const UTILITY_COLORS: { [key: string]: string } = {
  electricity: 'bg-amber-100 border-amber-300',
  water: 'bg-blue-100 border-blue-300',
  gas: 'bg-orange-100 border-orange-300',
  internet: 'bg-purple-100 border-purple-300',
  waste: 'bg-green-100 border-green-300',
  solar_credits: 'bg-yellow-100 border-yellow-300',
  ev_charging: 'bg-cyan-100 border-cyan-300',
  other: 'bg-gray-100 border-gray-300'
};

export default function UtilityPayments() {
  const { walletState } = useWallet();
  const { address, isConnected } = walletState;
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'settings'>('pending');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (address) {
      fetchInvoices();
    } else {
      setLoading(false);
    }
  }, [address]);

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`/api/services/utility/invoices?address=${address}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'overdue');
  const paidInvoices = invoices.filter(i => i.status === 'paid');

  const stats = {
    pendingCount: pendingInvoices.length,
    pendingTotal: pendingInvoices.reduce((sum, i) => sum + parseFloat(i.amountAxm || '0'), 0),
    paidThisMonth: paidInvoices
      .filter(i => i.paidAt && new Date(i.paidAt).getMonth() === new Date().getMonth())
      .reduce((sum, i) => sum + parseFloat(i.amountAxm || '0'), 0),
    totalSaved: invoices.reduce((sum, i) => sum + parseFloat(i.discountApplied || '0'), 0)
  };

  return (
    <Layout>
      <Head>
        <title>Utility Payments | Axiom Smart City</title>
        <meta name="description" content="Pay your smart city utility bills with AXM tokens" />
      </Head>

      <div className="bg-gradient-to-b from-green-50/50 to-white">
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-2 mb-4">
              <Link href="/" className="text-white/80 hover:text-white text-sm">Home</Link>
              <span className="text-white/50">/</span>
              <span className="text-sm">Utility Payments</span>
            </div>
            
            <h1 className="text-4xl font-bold mb-2">Pay Bills with AXM</h1>
            <p className="text-white/90 text-lg">
              Electricity, water, gas, internet - all payable in AXM with exclusive discounts
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {!isConnected ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
              <div className="text-5xl mb-4">🔌</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Connect Your Wallet</h3>
              <p className="text-gray-500">Connect your wallet to view and pay your utility bills</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-6 mb-8">
                {[
                  { label: 'Pending Bills', value: stats.pendingCount, icon: '📋', color: 'bg-amber-50 border-amber-200' },
                  { label: 'Amount Due', value: `${stats.pendingTotal.toFixed(2)} AXM`, icon: '💰', color: 'bg-red-50 border-red-200' },
                  { label: 'Paid This Month', value: `${stats.paidThisMonth.toFixed(2)} AXM`, icon: '✅', color: 'bg-green-50 border-green-200' },
                  { label: 'Total Saved', value: `$${stats.totalSaved.toFixed(2)}`, icon: '🎁', color: 'bg-blue-50 border-blue-200' }
                ].map((stat, i) => (
                  <div key={i} className={`${stat.color} border rounded-xl p-6`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{stat.icon}</span>
                      <span className="text-gray-600 text-sm">{stat.label}</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-8 flex items-center gap-4">
                <span className="text-3xl">🎁</span>
                <div>
                  <div className="text-green-700 font-bold text-lg">Pay with AXM, Save 5%</div>
                  <div className="text-gray-600">All utility bills paid with AXM tokens receive an automatic 5% discount</div>
                </div>
              </div>

              <div className="flex gap-2 mb-6 border-b border-gray-200 pb-4">
                {[
                  { id: 'pending', label: 'Pending Bills', icon: '📋', count: pendingInvoices.length },
                  { id: 'history', label: 'Payment History', icon: '📜' },
                  { id: 'settings', label: 'Settings', icon: '⚙️' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                      activeTab === tab.id 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="text-center py-16 text-gray-500">
                  Loading invoices...
                </div>
              ) : activeTab === 'pending' ? (
                pendingInvoices.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="text-5xl mb-4">✅</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">All Bills Paid!</h3>
                    <p className="text-gray-500">You have no pending utility bills</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingInvoices.map((invoice) => (
                      <div key={invoice.id} className={`bg-white border rounded-xl p-6 ${
                        invoice.status === 'overdue' ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
                      }`}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${UTILITY_COLORS[invoice.utilityType]}`}>
                              {UTILITY_ICONS[invoice.utilityType]}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900">
                                {invoice.providerName || invoice.utilityType.replace('_', ' ').toUpperCase()}
                              </div>
                              <div className="text-gray-500 text-sm">
                                {invoice.invoiceNumber} | {new Date(invoice.billingPeriodStart).toLocaleDateString()} - {new Date(invoice.billingPeriodEnd).toLocaleDateString()}
                              </div>
                              {invoice.usageAmount && (
                                <div className="text-gray-400 text-xs">
                                  Usage: {invoice.usageAmount} {invoice.usageUnit}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-amber-600 font-bold text-xl">
                                {parseFloat(invoice.amountAxm || '0').toFixed(2)} AXM
                              </div>
                              <div className="text-gray-400 text-sm line-through">
                                ${parseFloat(invoice.amountUsd).toFixed(2)}
                              </div>
                              {parseFloat(invoice.discountApplied || '0') > 0 && (
                                <div className="text-green-600 text-xs">
                                  Save ${parseFloat(invoice.discountApplied).toFixed(2)}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              {invoice.status === 'overdue' && (
                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
                                  OVERDUE
                                </span>
                              )}
                              <div className="text-gray-500 text-xs">
                                Due: {new Date(invoice.dueDate).toLocaleDateString()}
                              </div>
                            </div>

                            <button className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-lg font-bold hover:from-green-600 hover:to-emerald-600 transition-all">
                              Pay Now
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : activeTab === 'history' ? (
                paidInvoices.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="text-5xl mb-4">📜</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Payment History</h3>
                    <p className="text-gray-500">Your paid bills will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paidInvoices.map((invoice) => (
                      <div key={invoice.id} className="bg-white border border-gray-200 rounded-xl p-6 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{UTILITY_ICONS[invoice.utilityType]}</span>
                          <div>
                            <div className="font-bold text-gray-900">
                              {invoice.providerName || invoice.utilityType.replace('_', ' ').toUpperCase()}
                            </div>
                            <div className="text-gray-500 text-sm">{invoice.invoiceNumber}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-600 font-bold">
                            {parseFloat(invoice.amountAxm || '0').toFixed(2)} AXM
                          </div>
                          <div className="text-gray-500 text-xs">
                            Paid: {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : '-'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Settings</h2>
                  
                  <div className="mb-8">
                    <h3 className="text-gray-700 font-medium mb-4">Auto-Pay Settings</h3>
                    <div className="bg-gray-50 rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900">Enable Auto-Pay</div>
                        <div className="text-gray-500 text-sm">Automatically pay bills when due</div>
                      </div>
                      <button className="bg-green-100 border-2 border-green-500 text-green-700 px-4 py-2 rounded-full font-bold">
                        Enabled
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-gray-700 font-medium mb-4">Connected Providers</h3>
                    <div className="space-y-3">
                      {Object.entries(UTILITY_ICONS).slice(0, 5).map(([type, icon]) => (
                        <div key={type} className="bg-gray-50 rounded-lg p-4 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{icon}</span>
                            <span className="font-medium text-gray-900 capitalize">{type.replace('_', ' ')}</span>
                          </div>
                          <button className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition-all">
                            Connect
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </>
          )}

          {/* How Utility Payments Work - Visible to all users */}
          <div className="mt-16 border-t border-gray-200 pt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Pay Your Bills with AXM</h2>
                
                <div className="grid md:grid-cols-3 gap-8 mb-12">
                  {[
                    {
                      step: '1',
                      icon: '🔗',
                      title: 'Connect Providers',
                      description: 'Link your utility accounts (electricity, water, gas, internet) to your Axiom wallet. We securely retrieve your bills automatically.'
                    },
                    {
                      step: '2',
                      icon: '📋',
                      title: 'Review Bills',
                      description: 'See all your pending bills in one place. View usage details, amounts, due dates, and calculate your 5% AXM discount.'
                    },
                    {
                      step: '3',
                      icon: '✅',
                      title: 'Pay & Save',
                      description: 'Pay with AXM tokens and receive an automatic 5% discount. Set up auto-pay for hands-free bill management.'
                    }
                  ].map((item) => (
                    <div key={item.step} className="bg-white border border-gray-200 rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                        {item.step}
                      </div>
                      <span className="text-4xl block mb-3">{item.icon}</span>
                      <h3 className="font-bold text-gray-900 text-lg mb-2">{item.title}</h3>
                      <p className="text-gray-600 text-sm">{item.description}</p>
                    </div>
                  ))}
                </div>

                {/* Supported Utilities */}
                <div className="mb-12">
                  <h3 className="font-bold text-gray-900 text-xl mb-6 text-center">Supported Utility Types</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { type: 'Electricity', icon: '⚡', color: 'bg-amber-100 border-amber-200', desc: 'Power bills from any provider' },
                      { type: 'Water', icon: '💧', color: 'bg-blue-100 border-blue-200', desc: 'Municipal water services' },
                      { type: 'Natural Gas', icon: '🔥', color: 'bg-orange-100 border-orange-200', desc: 'Heating and gas utilities' },
                      { type: 'Internet', icon: '🌐', color: 'bg-purple-100 border-purple-200', desc: 'Broadband and fiber services' },
                      { type: 'Waste Management', icon: '♻️', color: 'bg-green-100 border-green-200', desc: 'Trash and recycling pickup' },
                      { type: 'Solar Credits', icon: '☀️', color: 'bg-yellow-100 border-yellow-200', desc: 'Solar panel payments' },
                      { type: 'EV Charging', icon: '🔌', color: 'bg-cyan-100 border-cyan-200', desc: 'Electric vehicle charging' },
                      { type: 'Home Security', icon: '🔐', color: 'bg-indigo-100 border-indigo-200', desc: 'Security monitoring fees' }
                    ].map((utility, i) => (
                      <div key={i} className={`${utility.color} border rounded-xl p-4 text-center`}>
                        <span className="text-3xl block mb-2">{utility.icon}</span>
                        <div className="font-bold text-gray-900 text-sm">{utility.type}</div>
                        <div className="text-gray-500 text-xs mt-1">{utility.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Benefits */}
                <div className="grid md:grid-cols-2 gap-8 mb-12">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                    <h3 className="font-bold text-green-800 text-lg mb-4 flex items-center gap-2">
                      <span className="text-2xl">💰</span> Save Money
                    </h3>
                    <ul className="space-y-3">
                      {[
                        '5% automatic discount on all utility payments',
                        'No transaction fees for AXM payments',
                        'Avoid late fees with auto-pay reminders',
                        'Consolidate bills for better budget tracking',
                        'Earn staking rewards while holding AXM for bills'
                      ].map((benefit, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-700">
                          <span className="text-green-500 mt-1">✓</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="font-bold text-blue-800 text-lg mb-4 flex items-center gap-2">
                      <span className="text-2xl">🔒</span> Security & Convenience
                    </h3>
                    <ul className="space-y-3">
                      {[
                        'End-to-end encrypted payment processing',
                        'Never share bank account or card details',
                        'One-click payments from your wallet',
                        'All bills viewable in single dashboard',
                        'Mobile-friendly for payments on the go'
                      ].map((benefit, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-700">
                          <span className="text-green-500 mt-1">✓</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Discount Breakdown */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl p-8 mb-12">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold mb-2">How Much Can You Save?</h3>
                    <p className="text-white/80">Pay with AXM and keep more money in your pocket</p>
                  </div>
                  <div className="grid md:grid-cols-4 gap-6">
                    {[
                      { bill: '$100', savings: '$5', monthly: true },
                      { bill: '$200', savings: '$10', monthly: true },
                      { bill: '$500', savings: '$25', monthly: true },
                      { bill: '$1,000', savings: '$50', monthly: true }
                    ].map((example, i) => (
                      <div key={i} className="bg-white/10 rounded-lg p-4 text-center">
                        <div className="text-white/60 text-sm mb-1">Monthly Bill</div>
                        <div className="text-2xl font-bold">{example.bill}</div>
                        <div className="text-green-200 font-bold mt-2">Save {example.savings}/mo</div>
                        <div className="text-white/60 text-xs">= ${parseFloat(example.savings.replace('$', '')) * 12} annually</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* FAQ */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-bold text-gray-900 text-xl mb-6">Frequently Asked Questions</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {[
                      {
                        q: 'How do I connect my utility providers?',
                        a: 'Go to Settings tab and click "Connect" next to each utility type. You\'ll securely link your account so bills appear automatically.'
                      },
                      {
                        q: 'When is the 5% discount applied?',
                        a: 'The discount is applied automatically when you pay with AXM tokens. You\'ll see the discounted amount before confirming payment.'
                      },
                      {
                        q: 'Can I set up automatic payments?',
                        a: 'Yes! Enable Auto-Pay in Settings and we\'ll automatically pay your bills when they\'re due, ensuring you never miss a payment.'
                      },
                      {
                        q: 'What if I don\'t have enough AXM?',
                        a: 'You can swap other tokens for AXM directly in your wallet, or purchase AXM through the DEX before making a payment.'
                      },
                      {
                        q: 'Are payments processed instantly?',
                        a: 'Yes, blockchain payments are processed within seconds. Your utility provider receives confirmation almost immediately.'
                      },
                      {
                        q: 'Is my billing data secure?',
                        a: 'Absolutely. We use bank-level encryption and never store your login credentials. Only bill amounts and due dates are retrieved.'
                      }
                    ].map((faq, i) => (
                      <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                        <h4 className="font-bold text-gray-900 text-sm mb-2">{faq.q}</h4>
                        <p className="text-gray-600 text-sm">{faq.a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
        </div>
      </div>
    </Layout>
  );
}
