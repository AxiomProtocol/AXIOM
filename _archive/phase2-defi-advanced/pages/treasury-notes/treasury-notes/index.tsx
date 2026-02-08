import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import WalletButton from '../../components/web3/WalletButton';
import TreasuryNoteModal from '../../components/web3/TreasuryNoteModal';
import { useWallet } from '../../lib/web3/useWallet';

interface TreasuryNote {
  id: string;
  name: string;
  series: string;
  maturityMonths: number;
  couponRate: number;
  minInvestment: number;
  maxInvestment: number;
  totalIssued: string;
  totalOutstanding: string;
  nextCouponDate: string;
  status: string;
  riskRating: string;
  backingAssets: string[];
}

interface UserHolding {
  id: string;
  noteId: string;
  principal: string;
  purchaseDate: string;
  maturityDate: string;
  couponsPaid: string;
  nextCoupon: string;
  status: string;
}

interface Stats {
  totalOutstanding: string;
  totalIssued: string;
  avgCouponRate: string;
  totalInvestors: number;
  nextDistribution: string;
  quarterlyDistributions: string;
}

export default function TreasuryNotesPage() {
  const { address, isConnected } = useWallet();
  const [notes, setNotes] = useState<TreasuryNote[]>([]);
  const [userHoldings, setUserHoldings] = useState<UserHolding[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<TreasuryNote | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [address]);

  const fetchData = async () => {
    try {
      const url = address 
        ? `/api/phase3/treasury-notes?address=${address}`
        : '/api/phase3/treasury-notes';
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setNotes(data.notes);
        setUserHoldings(data.userHoldings);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch treasury notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating: string) => {
    if (rating.startsWith('A')) return 'text-green-400 bg-green-900/50';
    if (rating.startsWith('B')) return 'text-yellow-400 bg-yellow-900/50';
    return 'text-red-400 bg-red-900/50';
  };

  return (
    <>
      <Head>
        <title>Treasury Notes | Axiom Protocol</title>
        <meta name="description" content="Fixed-income instruments backed by protocol revenue" />
      </Head>

      <div className="min-h-screen bg-gray-950">
        <div className="relative bg-gradient-to-b from-purple-900/30 to-gray-950 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="inline-block bg-purple-500/20 text-purple-400 px-4 py-1 rounded-full text-sm mb-4">
              SEC Reg D 506(c) | Accredited Investors
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Axiom Treasury Notes</h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Fixed-income instruments backed by protocol revenue. Institutional-grade yields with transparent backing.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            </div>
          ) : (
            <>
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <div className="text-sm text-gray-400">Total Outstanding</div>
                    <div className="text-2xl font-bold text-white">${(parseFloat(stats.totalOutstanding) / 1000000).toFixed(1)}M</div>
                  </div>
                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <div className="text-sm text-gray-400">Avg. Coupon Rate</div>
                    <div className="text-2xl font-bold text-purple-400">{stats.avgCouponRate}% APY</div>
                  </div>
                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <div className="text-sm text-gray-400">Total Investors</div>
                    <div className="text-2xl font-bold text-white">{stats.totalInvestors}</div>
                  </div>
                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <div className="text-sm text-gray-400">Next Distribution</div>
                    <div className="text-2xl font-bold text-green-400">{new Date(stats.nextDistribution).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </div>
                </div>
              )}

              {isConnected && userHoldings.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-white mb-6">Your Holdings</h2>
                  <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-800">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm text-gray-400">Note</th>
                          <th className="px-6 py-4 text-left text-sm text-gray-400">Principal</th>
                          <th className="px-6 py-4 text-left text-sm text-gray-400">Coupons Received</th>
                          <th className="px-6 py-4 text-left text-sm text-gray-400">Next Coupon</th>
                          <th className="px-6 py-4 text-left text-sm text-gray-400">Maturity</th>
                          <th className="px-6 py-4 text-left text-sm text-gray-400">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userHoldings.map((holding) => {
                          const note = notes.find(n => n.id === holding.noteId);
                          return (
                            <tr key={holding.id} className="border-t border-gray-800">
                              <td className="px-6 py-4 text-white font-semibold">{note?.series || holding.noteId}</td>
                              <td className="px-6 py-4 text-white">${parseFloat(holding.principal).toLocaleString()}</td>
                              <td className="px-6 py-4 text-green-400">${parseFloat(holding.couponsPaid).toLocaleString()}</td>
                              <td className="px-6 py-4 text-yellow-400">${parseFloat(holding.nextCoupon).toLocaleString()}</td>
                              <td className="px-6 py-4 text-gray-400">{holding.maturityDate}</td>
                              <td className="px-6 py-4">
                                <span className="bg-green-900/50 text-green-400 px-2 py-1 rounded text-sm">
                                  {holding.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <h2 className="text-2xl font-bold text-white mb-6">Available Treasury Notes</h2>
              <div className="grid lg:grid-cols-2 gap-6">
                {notes.map((note) => (
                  <div key={note.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden hover:border-purple-500/50 transition">
                    <div className="bg-gradient-to-r from-purple-900/50 to-gray-900 p-6">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-2xl font-bold text-white">{note.series}</h3>
                          <p className="text-gray-400 text-sm">{note.name}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRatingColor(note.riskRating)}`}>
                          {note.riskRating}
                        </span>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-purple-400">{note.couponRate}%</div>
                          <div className="text-sm text-gray-400">APY</div>
                        </div>
                        <div className="text-center border-x border-gray-700">
                          <div className="text-3xl font-bold text-white">{note.maturityMonths}</div>
                          <div className="text-sm text-gray-400">Months</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-400">${(note.minInvestment / 1000)}K</div>
                          <div className="text-sm text-gray-400">Min</div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Capacity Used</span>
                          <span className="text-white">
                            ${(parseFloat(note.totalOutstanding) / 1000000).toFixed(1)}M / ${(parseFloat(note.totalIssued) / 1000000).toFixed(1)}M
                          </span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${(parseFloat(note.totalOutstanding) / parseFloat(note.totalIssued)) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="mb-6">
                        <div className="text-sm text-gray-400 mb-2">Backed by:</div>
                        <div className="flex flex-wrap gap-2">
                          {note.backingAssets.map((asset, i) => (
                            <span key={i} className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs">
                              {asset}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setSelectedNote(note);
                            setIsModalOpen(true);
                          }}
                          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition"
                        >
                          Invest Now
                        </button>
                        <button className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 bg-gray-900 rounded-xl border border-gray-800 p-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Why Treasury Notes?</h2>
                    <ul className="space-y-3 text-gray-300">
                      <li className="flex items-start gap-3">
                        <span className="text-purple-400 mt-1">●</span>
                        <span><strong>Fixed Returns</strong> - Predictable coupon payments quarterly</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-purple-400 mt-1">●</span>
                        <span><strong>Real Asset Backing</strong> - Secured by protocol revenue and real estate</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-purple-400 mt-1">●</span>
                        <span><strong>Transparent</strong> - On-chain verification of all backing assets</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-purple-400 mt-1">●</span>
                        <span><strong>Senior Claims</strong> - Priority in protocol treasury distributions</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Investor Requirements</h2>
                    <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 mb-4">
                      <p className="text-yellow-200 text-sm">
                        <strong>SEC Reg D 506(c) Offering</strong><br/>
                        This investment is only available to verified accredited investors.
                      </p>
                    </div>
                    <ul className="space-y-2 text-gray-300 text-sm">
                      <li>• Individual income &gt; $200K (or $300K joint) for 2 years</li>
                      <li>• Net worth &gt; $1M (excluding primary residence)</li>
                      <li>• Professional certifications (Series 7, 65, 82)</li>
                      <li>• Entity with &gt; $5M in assets</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <TreasuryNoteModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          fetchData();
        }}
        note={selectedNote}
      />
    </>
  );
}
