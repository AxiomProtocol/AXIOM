import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';
import { ethers } from 'ethers';

const TREASURY_NOTE_TOKEN_ADDRESS = '0x712640Fde009a7FB0c3668e9eFb9AD5Bf67bEAbd';
const AXUSD_ADDRESS = '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

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
  seriesId: number;
  noteId: string;
  principal: string;
  purchaseDate: string;
  maturityDate: string;
  pendingCoupon: string;
  status: string;
}

export default function TreasuryNotesPage() {
  const { walletState, connectMetaMask } = useWallet();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<TreasuryNote[]>([]);
  const [userHoldings, setUserHoldings] = useState<UserHolding[]>([]);
  const [investorStatus, setInvestorStatus] = useState<{ kyc: boolean; accredited: boolean }>({ kyc: false, accredited: false });
  const [stats, setStats] = useState<any>(null);
  const [selectedNote, setSelectedNote] = useState<TreasuryNote | null>(null);
  const [amount, setAmount] = useState('');
  const [txPending, setTxPending] = useState(false);
  const [txMessage, setTxMessage] = useState('');
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const url = walletState?.address 
        ? `/api/phase3/treasury-notes?address=${walletState.address}`
        : '/api/phase3/treasury-notes';
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setNotes(data.notes);
        setUserHoldings(data.userHoldings || []);
        setInvestorStatus(data.investorStatus || { kyc: false, accredited: false });
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching treasury notes:', err);
    } finally {
      setLoading(false);
    }
  }, [walletState?.address]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calculateEstimatedYield = () => {
    if (!selectedNote || !amount) return '0.00';
    const principal = parseFloat(amount);
    const annualYield = principal * (selectedNote.couponRate / 100);
    const totalYield = annualYield * (selectedNote.maturityMonths / 12);
    return totalYield.toFixed(2);
  };

  const handlePurchase = async () => {
    if (!walletState?.address || !selectedNote || !amount) {
      setError('Please connect wallet and enter investment amount');
      return;
    }

    setTxPending(true);
    setError('');
    setTxMessage('');

    try {
      const response = await fetch('/api/phase3/treasury-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'purchase',
          noteId: selectedNote.id,
          amount,
          address: walletState.address
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.kycRequired) {
          setError('KYC verification required. Treasury Notes are SEC Reg D 506(c) securities.');
          return;
        }
        if (data.accreditationRequired) {
          setError('Accredited investor status required. Only accredited investors may purchase Treasury Notes.');
          return;
        }
        throw new Error(data.error || 'Transaction failed');
      }

      if (data.requiresApproval && (window as any).ethereum) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        
        const amountWei = ethers.parseEther(amount);
        
        const tokenContract = new ethers.Contract(AXUSD_ADDRESS, ERC20_ABI, signer);
        const allowance = await tokenContract.allowance(walletState.address, data.contractAddress);

        if (allowance < amountWei) {
          setTxMessage('Approving AXUSD spend...');
          const approveTx = await tokenContract.approve(data.contractAddress, amountWei);
          await approveTx.wait();
        }
      }

      setTxMessage('Treasury note purchase prepared. Sign with your wallet to complete.');
      
      await fetchData();
      setAmount('');
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setTxPending(false);
    }
  };

  const getRatingColor = (rating: string) => {
    if (rating === 'A') return 'text-green-400 bg-green-500/20';
    if (rating === 'A-') return 'text-green-300 bg-green-500/15';
    return 'text-yellow-400 bg-yellow-500/20';
  };

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium mb-4">
              SEC Reg D 506(c) - Accredited Investors Only
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 bg-clip-text text-transparent">
              Axiom Treasury Notes
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Fixed-income securities backed by Axiom Protocol treasury, real estate assets, and revenue streams.
              Quarterly coupon payments with 6-12% APY.
            </p>
          </div>

          {walletState?.address && (
            <div className="mb-8 bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-gray-400">Investor Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  investorStatus.kyc ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  KYC: {investorStatus.kyc ? 'Verified' : 'Not Verified'}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  investorStatus.accredited ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  Accredited: {investorStatus.accredited ? 'Yes' : 'No'}
                </span>
              </div>
              {!investorStatus.kyc && (
                <a href="/compliance" className="text-yellow-400 hover:underline text-sm">
                  Complete Verification
                </a>
              )}
            </div>
          )}

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">Total Outstanding</p>
                <p className="text-2xl font-bold text-yellow-400">${parseFloat(stats.totalOutstanding).toLocaleString()}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">Avg Coupon Rate</p>
                <p className="text-2xl font-bold text-green-400">{stats.avgCouponRate}%</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">Next Distribution</p>
                <p className="text-2xl font-bold text-blue-400">{stats.nextDistribution}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">Series Available</p>
                <p className="text-2xl font-bold text-purple-400">{notes.length}</p>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Available Note Series</h2>
              <div className="space-y-4">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className={`bg-gray-900 border rounded-xl p-5 cursor-pointer transition-all ${
                      selectedNote?.id === note.id
                        ? 'border-yellow-500 ring-2 ring-yellow-500/20'
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{note.name}</h3>
                        <p className="text-sm text-gray-400">{note.series}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRatingColor(note.riskRating)}`}>
                          {note.riskRating}
                        </span>
                        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-bold">
                          {note.couponRate}% APY
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-gray-400">Maturity</p>
                        <p className="font-medium">{note.maturityMonths} months</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Min Investment</p>
                        <p className="font-medium">${note.minInvestment.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Max Investment</p>
                        <p className="font-medium">${note.maxInvestment.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="border-t border-gray-800 pt-3">
                      <p className="text-gray-400 text-xs mb-2">Backed by:</p>
                      <div className="flex flex-wrap gap-2">
                        {note.backingAssets.map((asset, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
                            {asset}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Invest in Notes</h2>
              
              {!walletState?.address ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                  <p className="text-gray-400 mb-4">Connect your wallet to invest in Treasury Notes</p>
                  <button
                    onClick={connectMetaMask}
                    className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition-colors"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : selectedNote ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800">
                    <div>
                      <h3 className="font-semibold">{selectedNote.series}</h3>
                      <p className="text-sm text-gray-400">{selectedNote.maturityMonths}-month maturity</p>
                    </div>
                    <span className="text-2xl font-bold text-yellow-400">{selectedNote.couponRate}% APY</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Investment Amount (AXUSD)</label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={`Min: $${selectedNote.minInvestment.toLocaleString()}`}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none"
                      />
                    </div>

                    <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Investment</span>
                        <span>${amount ? parseFloat(amount).toLocaleString() : '0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Estimated Total Yield</span>
                        <span className="text-green-400">${calculateEstimatedYield()}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-700 pt-2">
                        <span className="text-gray-400">At Maturity</span>
                        <span className="font-bold text-yellow-400">
                          ${amount ? (parseFloat(amount) + parseFloat(calculateEstimatedYield())).toLocaleString() : '0'}
                        </span>
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                        {error}
                      </div>
                    )}

                    {txMessage && (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                        {txMessage}
                      </div>
                    )}

                    <button
                      onClick={handlePurchase}
                      disabled={txPending || !amount || (!investorStatus.kyc || !investorStatus.accredited)}
                      className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-700 disabled:text-gray-500 text-black font-semibold rounded-lg transition-colors"
                    >
                      {txPending ? 'Processing...' : 
                       !investorStatus.kyc ? 'KYC Required' :
                       !investorStatus.accredited ? 'Accredited Status Required' :
                       'Purchase Notes'}
                    </button>

                    <p className="text-xs text-gray-500 text-center">
                      By investing, you confirm you are an accredited investor per SEC Reg D 506(c)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                  <p className="text-gray-400">Select a note series to invest</p>
                </div>
              )}

              {userHoldings.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Your Holdings</h3>
                  <div className="space-y-3">
                    {userHoldings.map((holding) => (
                      <div key={holding.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{holding.noteId.toUpperCase()}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            holding.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {holding.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400">Principal</p>
                            <p>${parseFloat(holding.principal).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Pending Coupon</p>
                            <p className="text-green-400">${parseFloat(holding.pendingCoupon).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Matures</p>
                            <p>{holding.maturityDate}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-yellow-400">Important Disclosures</h2>
            <div className="text-sm text-gray-400 space-y-2">
              <p>Axiom Treasury Notes are securities offered under SEC Regulation D, Rule 506(c). Only accredited investors may participate.</p>
              <p>Past performance does not guarantee future results. Investment in securities involves risk including potential loss of principal.</p>
              <p>Coupon payments are subject to the financial performance of Axiom Protocol and backing assets.</p>
            </div>
          </div>

          <div className="mt-8 text-center text-gray-500 text-sm">
            <p>Contract: {TREASURY_NOTE_TOKEN_ADDRESS}</p>
            <a 
              href={`https://arbitrum.blockscout.com/address/${TREASURY_NOTE_TOKEN_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-400 hover:underline"
            >
              View on Blockscout
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
