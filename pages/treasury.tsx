import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { SiteLayout } from '../components/navigation';

interface Treasury {
  id: number;
  name: string;
  purpose: string;
  totalBalanceAxusd: string;
}

interface Transaction {
  id: number;
  treasuryId: number;
  treasuryName: string;
  transactionType: string;
  amountAxusd: string;
  memo: string;
  txHash?: string;
  createdAt: string;
}

interface TreasuryStats {
  totalBalance: string;
  totalDeposits: string;
  totalDisbursements: string;
  activeProposals: number;
  executedProposals: number;
}

export default function TreasuryPage() {
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TreasuryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTreasury, setSelectedTreasury] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [treasuriesRes, transactionsRes, statsRes] = await Promise.all([
          fetch('/api/treasury'),
          fetch('/api/treasury/transactions'),
          fetch('/api/treasury/stats')
        ]);

        const treasuriesJson = await treasuriesRes.json();
        const transactionsJson = await transactionsRes.json();
        const statsJson = await statsRes.json();

        if (treasuriesJson.success) setTreasuries(treasuriesJson.data || []);
        if (transactionsJson.success) setTransactions(transactionsJson.data || []);
        if (statsJson.success) setStats(statsJson.data);
      } catch (error) {
        console.error('Failed to fetch treasury data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const formatAmount = (value: string | number) => {
    const num = parseFloat(String(value || '0'));
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(2)}`;
  };

  const truncateHash = (hash: string) => {
    if (!hash) return '';
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  const transactionTypeColors: Record<string, { bg: string; text: string }> = {
    deposit: { bg: 'bg-green-100', text: 'text-green-700' },
    withdrawal: { bg: 'bg-red-100', text: 'text-red-700' },
    commitment: { bg: 'bg-blue-100', text: 'text-blue-700' },
    release: { bg: 'bg-purple-100', text: 'text-purple-700' },
    disbursement: { bg: 'bg-orange-100', text: 'text-orange-700' },
    fee: { bg: 'bg-gray-100', text: 'text-gray-700' },
    adjustment: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  };

  const filteredTransactions = selectedTreasury
    ? transactions.filter(t => t.treasuryId === selectedTreasury)
    : transactions;

  return (
    <SiteLayout>
      <Head>
        <title>Treasury | Axiom Protocol</title>
        <meta name="description" content="Axiom Protocol treasury transparency. View community treasury balances, transactions, and governance spending." />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white py-16">
          <div className="max-w-6xl mx-auto px-4">
            <span className="inline-block bg-blue-600/50 text-blue-100 px-3 py-1 rounded-full text-sm font-medium mb-4">
              Transparency
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Community Treasury</h1>
            <p className="text-xl text-blue-100 max-w-2xl">
              Full transparency into community resources. All allocations are governed by member proposals and voting.
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900">{formatAmount(stats.totalBalance)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">Total Deposits</p>
                <p className="text-2xl font-bold text-green-600">{formatAmount(stats.totalDeposits)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">Disbursements</p>
                <p className="text-2xl font-bold text-orange-600">{formatAmount(stats.totalDisbursements)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">Active Proposals</p>
                <p className="text-2xl font-bold text-purple-600">{stats.activeProposals}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <p className="text-sm text-gray-500 mb-1">Executed</p>
                <p className="text-2xl font-bold text-blue-600">{stats.executedProposals}</p>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Treasuries</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setSelectedTreasury(null)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    selectedTreasury === null 
                      ? 'bg-blue-50 border-blue-300' 
                      : 'bg-white border-gray-200 hover:border-blue-200'
                  }`}
                >
                  <p className="font-semibold text-gray-900">All Treasuries</p>
                  <p className="text-sm text-gray-500">View all transactions</p>
                </button>
                
                {treasuries.map(treasury => (
                  <button
                    key={treasury.id}
                    onClick={() => setSelectedTreasury(treasury.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${
                      selectedTreasury === treasury.id 
                        ? 'bg-blue-50 border-blue-300' 
                        : 'bg-white border-gray-200 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{treasury.name}</p>
                        <p className="text-sm text-gray-500 line-clamp-1">{treasury.purpose}</p>
                      </div>
                      <p className="font-bold text-blue-600">{formatAmount(treasury.totalBalanceAxusd)}</p>
                    </div>
                  </button>
                ))}

                {treasuries.length === 0 && !loading && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                    <p className="text-gray-500">No treasuries created yet.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Transaction History</h2>
              
              {loading ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading transactions...</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-gray-600">No transactions recorded yet.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Memo</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tx</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredTransactions.slice(0, 20).map(tx => {
                          const typeStyle = transactionTypeColors[tx.transactionType] || transactionTypeColors.adjustment;
                          return (
                            <tr key={tx.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {new Date(tx.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${typeStyle.bg} ${typeStyle.text}`}>
                                  {tx.transactionType}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-semibold text-gray-900">
                                {formatAmount(tx.amountAxusd)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                                {tx.memo || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {tx.txHash ? (
                                  <a 
                                    href={`https://arbiscan.io/tx/${tx.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    {truncateHash(tx.txHash)}
                                  </a>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {filteredTransactions.length > 20 && (
                    <div className="p-4 bg-gray-50 text-center">
                      <p className="text-sm text-gray-500">
                        Showing 20 of {filteredTransactions.length} transactions
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 bg-white rounded-xl border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Treasury Governance</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How Funds Are Allocated</h3>
                <p className="text-gray-600 text-sm mb-4">
                  All treasury allocations are governed by member proposals and voting. No funds are disbursed without community approval through the governance process.
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Proposals must specify amount, recipient, and purpose</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Voting period allows member review and discussion</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Approved proposals are executed with full audit trail</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Transparency Commitment</h3>
                <p className="text-gray-600 text-sm">
                  Every treasury transaction is logged and visible to all members. On-chain transactions include verifiable transaction hashes for independent verification on the blockchain.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
