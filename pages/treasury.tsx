import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { SiteLayout } from '../components/navigation';

const treasuryImage = "/images/treasury_transparency_illustration.png";

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
    deposit: { bg: 'rgba(34, 197, 94, 0.1)', text: '#16A34A' },
    withdrawal: { bg: 'rgba(239, 68, 68, 0.1)', text: '#DC2626' },
    commitment: { bg: 'rgba(59, 130, 246, 0.1)', text: '#2563EB' },
    release: { bg: 'rgba(147, 51, 234, 0.1)', text: '#9333EA' },
    disbursement: { bg: 'rgba(249, 115, 22, 0.1)', text: '#EA580C' },
    fee: { bg: 'rgba(107, 114, 128, 0.1)', text: '#4B5563' },
    adjustment: { bg: 'rgba(234, 179, 8, 0.1)', text: '#CA8A04' },
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

      <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
        <div style={{
          position: "relative",
          padding: "80px 0 60px 0",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 80% 60%, rgba(123, 104, 238, 0.05) 0%, transparent 50%)
            `,
            pointerEvents: "none"
          }} />

          <div className="max-w-6xl mx-auto px-4" style={{ position: "relative" }}>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div style={{ 
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(123, 104, 238, 0.08) 100%)",
                  padding: "8px 16px",
                  borderRadius: "100px",
                  marginBottom: "20px",
                  border: "1px solid rgba(59, 130, 246, 0.2)"
                }}>
                  <span style={{ 
                    width: "8px", 
                    height: "8px", 
                    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
                    borderRadius: "50%"
                  }} />
                  <span style={{ 
                    fontSize: "13px", 
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "#2563EB"
                  }}>Transparency</span>
                </div>
                
                <h1 style={{ 
                  fontSize: "clamp(32px, 5vw, 48px)", 
                  lineHeight: 1.1, 
                  margin: "0 0 16px 0",
                  fontWeight: 700,
                  color: "#0A0F1C"
                }}>Community Treasury</h1>
                
                <p style={{ 
                  fontSize: "18px", 
                  lineHeight: 1.6,
                  color: "rgba(10, 15, 28, 0.65)", 
                  maxWidth: "500px",
                  margin: 0
                }}>
                  Full transparency into community resources. All allocations are governed by member proposals and voting.
                </p>
              </div>
              
              <div className="hidden lg:block">
                <img 
                  src={treasuryImage} 
                  alt="Treasury transparency illustration"
                  style={{
                    width: "100%",
                    maxWidth: "500px",
                    borderRadius: "24px",
                    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.1)"
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {[
                { label: "Total Balance", value: formatAmount(stats.totalBalance), color: "#0A0F1C" },
                { label: "Total Deposits", value: formatAmount(stats.totalDeposits), color: "#16A34A" },
                { label: "Disbursements", value: formatAmount(stats.totalDisbursements), color: "#EA580C" },
                { label: "Active Proposals", value: stats.activeProposals, color: "#9333EA" },
                { label: "Executed", value: stats.executedProposals, color: "#2563EB" }
              ].map((stat, i) => (
                <div key={i} style={{
                  background: "rgba(255, 255, 255, 0.9)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(0, 0, 0, 0.06)",
                  borderRadius: "16px",
                  padding: "24px",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)"
                }}>
                  <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Treasuries</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setSelectedTreasury(null)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "16px",
                    borderRadius: "16px",
                    transition: "all 0.2s",
                    background: selectedTreasury === null ? "rgba(59, 130, 246, 0.08)" : "white",
                    border: selectedTreasury === null ? "1px solid rgba(59, 130, 246, 0.3)" : "1px solid rgba(0, 0, 0, 0.06)"
                  }}
                >
                  <p className="font-semibold text-gray-900">All Treasuries</p>
                  <p className="text-sm text-gray-500">View all transactions</p>
                </button>
                
                {treasuries.map(treasury => (
                  <button
                    key={treasury.id}
                    onClick={() => setSelectedTreasury(treasury.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "16px",
                      borderRadius: "16px",
                      transition: "all 0.2s",
                      background: selectedTreasury === treasury.id ? "rgba(59, 130, 246, 0.08)" : "white",
                      border: selectedTreasury === treasury.id ? "1px solid rgba(59, 130, 246, 0.3)" : "1px solid rgba(0, 0, 0, 0.06)"
                    }}
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
                  <div style={{
                    background: "rgba(255, 255, 255, 0.9)",
                    border: "1px solid rgba(0, 0, 0, 0.06)",
                    borderRadius: "16px",
                    padding: "24px",
                    textAlign: "center"
                  }}>
                    <p className="text-gray-500">No treasuries created yet.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Transaction History</h2>
              
              {loading ? (
                <div style={{
                  background: "rgba(255, 255, 255, 0.9)",
                  border: "1px solid rgba(0, 0, 0, 0.06)",
                  borderRadius: "16px",
                  padding: "64px",
                  textAlign: "center"
                }}>
                  <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading transactions...</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div style={{
                  background: "rgba(255, 255, 255, 0.9)",
                  border: "1px solid rgba(0, 0, 0, 0.06)",
                  borderRadius: "16px",
                  padding: "64px",
                  textAlign: "center"
                }}>
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-gray-600">No transactions recorded yet.</p>
                </div>
              ) : (
                <div style={{
                  background: "rgba(255, 255, 255, 0.9)",
                  border: "1px solid rgba(0, 0, 0, 0.06)",
                  borderRadius: "16px",
                  overflow: "hidden"
                }}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ background: "rgba(249, 250, 251, 0.8)" }}>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Memo</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tx</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredTransactions.slice(0, 20).map(tx => {
                          const typeStyle = transactionTypeColors[tx.transactionType] || transactionTypeColors.adjustment;
                          return (
                            <tr key={tx.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {new Date(tx.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3">
                                <span style={{
                                  display: "inline-block",
                                  padding: "4px 10px",
                                  borderRadius: "8px",
                                  fontSize: "12px",
                                  fontWeight: 500,
                                  textTransform: "capitalize",
                                  background: typeStyle.bg,
                                  color: typeStyle.text
                                }}>
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
                                    className="text-blue-600 hover:underline font-mono"
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
                    <div className="px-4 py-3 bg-gray-50 text-center text-sm text-gray-500">
                      Showing 20 of {filteredTransactions.length} transactions
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
