import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { useWallet } from '../components/WalletConnect/WalletContext';
import { ethers } from 'ethers';
import { NETWORK_CONFIG } from '../shared/contracts';

const CREDIT_LINE_VAULT_ADDRESS = '0xc997416666686A22EBAE8Eb7cc9224c10B08a35c';
const AXUSD_ADDRESS = '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c';
const AXM_ADDRESS = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

interface CreditLine {
  id: string;
  collateralType: string;
  collateralSymbol: string;
  maxLTV: number;
  interestRate: number;
  liquidationThreshold: number;
  minCollateral: number;
  available: boolean;
  totalBorrowed: string;
  totalCollateral: string;
}

interface UserPosition {
  id: string;
  positionIndex: number;
  collateralType: string;
  collateralAmount: string;
  borrowedAmount: string;
  healthFactor: number;
  interestAccrued: string;
  active: boolean;
}

export default function CreditLinesPage() {
  const { walletState, connectMetaMask, signMessage } = useWallet();
  const [loading, setLoading] = useState(true);
  const [creditLines, setCreditLines] = useState<CreditLine[]>([]);
  const [userPositions, setUserPositions] = useState<UserPosition[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedLine, setSelectedLine] = useState<CreditLine | null>(null);
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState<'deposit' | 'borrow' | 'repay' | 'withdraw'>('deposit');
  const [txPending, setTxPending] = useState(false);
  const [txMessage, setTxMessage] = useState('');
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const url = walletState?.address 
        ? `/api/phase3/credit-lines?address=${walletState.address}`
        : '/api/phase3/credit-lines';
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setCreditLines(data.creditLines);
        setUserPositions(data.userPositions || []);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching credit lines:', err);
    } finally {
      setLoading(false);
    }
  }, [walletState?.address]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async () => {
    if (!walletState?.address || !selectedLine || !amount) {
      setError('Please connect wallet and enter amount');
      return;
    }

    setTxPending(true);
    setError('');
    setTxMessage('');

    try {
      const response = await fetch('/api/phase3/credit-lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action === 'deposit' ? 'add-collateral' : action,
          collateralType: selectedLine.id,
          amount,
          address: walletState.address
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.kycRequired) {
          setError('KYC verification required. Please complete verification before using credit lines.');
          return;
        }
        throw new Error(data.error || 'Transaction failed');
      }

      if (data.requiresApproval && (window as any).ethereum) {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        
        const tokenContract = new ethers.Contract(data.approvalToken, ERC20_ABI, signer);
        const allowance = await tokenContract.allowance(walletState.address, data.contractAddress);
        const amountWei = ethers.parseEther(amount);

        if (allowance < amountWei) {
          setTxMessage('Approving token spend...');
          const approveTx = await tokenContract.approve(data.contractAddress, amountWei);
          await approveTx.wait();
        }
      }

      setTxMessage(`${action.charAt(0).toUpperCase() + action.slice(1)} transaction prepared. Sign with your wallet to complete.`);
      
      await fetchData();
      setAmount('');
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setTxPending(false);
    }
  };

  const getHealthColor = (factor: number) => {
    if (factor >= 1.5) return 'text-green-400';
    if (factor >= 1.2) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Layout>
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              AXUSD Credit Lines
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Borrow AXUSD against your AXM tokens, SEED positions, LP tokens, or Land NFTs. 
              Competitive rates with flexible collateral options.
            </p>
          </div>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">Total Collateral</p>
                <p className="text-2xl font-bold text-yellow-400">${parseFloat(stats.totalValueLocked).toLocaleString()}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">Total Borrowed</p>
                <p className="text-2xl font-bold text-white">${parseFloat(stats.totalBorrowed).toLocaleString()}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">Utilization</p>
                <p className="text-2xl font-bold text-blue-400">{stats.utilizationRate}%</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">Avg Interest Rate</p>
                <p className="text-2xl font-bold text-green-400">{stats.avgInterestRate}%</p>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Available Collateral Types</h2>
              <div className="space-y-4">
                {creditLines.map((line) => (
                  <div
                    key={line.id}
                    onClick={() => setSelectedLine(line)}
                    className={`bg-gray-900 border rounded-xl p-4 cursor-pointer transition-all ${
                      selectedLine?.id === line.id
                        ? 'border-yellow-500 ring-2 ring-yellow-500/20'
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{line.collateralType}</h3>
                        <p className="text-gray-400 text-sm">{line.collateralSymbol}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${line.available ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {line.available ? 'Available' : 'Coming Soon'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Max LTV</p>
                        <p className="font-medium">{line.maxLTV}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Interest</p>
                        <p className="font-medium text-yellow-400">{line.interestRate}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Liq. Threshold</p>
                        <p className="font-medium text-red-400">{line.liquidationThreshold}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Manage Position</h2>
              
              {!walletState?.address ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                  <p className="text-gray-400 mb-4">Connect your wallet to manage credit lines</p>
                  <button
                    onClick={connectMetaMask}
                    className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition-colors"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  {selectedLine ? (
                    <>
                      <div className="flex gap-2 mb-6">
                        {(['deposit', 'borrow', 'repay', 'withdraw'] as const).map((a) => (
                          <button
                            key={a}
                            onClick={() => setAction(a)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                              action === a
                                ? 'bg-yellow-500 text-black'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                          >
                            {a.charAt(0).toUpperCase() + a.slice(1)}
                          </button>
                        ))}
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm text-gray-400 mb-2">
                          {action === 'deposit' ? 'Collateral Amount' : 
                           action === 'borrow' ? 'Borrow Amount (AXUSD)' :
                           action === 'repay' ? 'Repay Amount (AXUSD)' : 'Withdraw Amount'}
                        </label>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none"
                        />
                      </div>

                      {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                          {error}
                        </div>
                      )}

                      {txMessage && (
                        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                          {txMessage}
                        </div>
                      )}

                      <button
                        onClick={handleAction}
                        disabled={txPending || !amount}
                        className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-700 disabled:text-gray-500 text-black font-semibold rounded-lg transition-colors"
                      >
                        {txPending ? 'Processing...' : `${action.charAt(0).toUpperCase() + action.slice(1)}`}
                      </button>
                    </>
                  ) : (
                    <p className="text-gray-400 text-center py-8">
                      Select a collateral type to manage your position
                    </p>
                  )}
                </div>
              )}

              {userPositions.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Your Positions</h3>
                  <div className="space-y-3">
                    {userPositions.map((pos) => (
                      <div key={pos.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{pos.collateralType}</span>
                          <span className={`font-semibold ${getHealthColor(pos.healthFactor)}`}>
                            Health: {pos.healthFactor.toFixed(2)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400">Collateral</p>
                            <p>{parseFloat(pos.collateralAmount).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Borrowed</p>
                            <p>{parseFloat(pos.borrowedAmount).toLocaleString()} AXUSD</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">How Credit Lines Work</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-yellow-400 text-xl font-bold">1</span>
                </div>
                <h3 className="font-medium mb-2">Deposit Collateral</h3>
                <p className="text-gray-400 text-sm">Lock your AXM, SEED, LP tokens, or Land NFTs as collateral</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-yellow-400 text-xl font-bold">2</span>
                </div>
                <h3 className="font-medium mb-2">Borrow AXUSD</h3>
                <p className="text-gray-400 text-sm">Borrow up to the LTV limit against your collateral</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-yellow-400 text-xl font-bold">3</span>
                </div>
                <h3 className="font-medium mb-2">Monitor Health</h3>
                <p className="text-gray-400 text-sm">Keep your health factor above 1.0 to avoid liquidation</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-yellow-400 text-xl font-bold">4</span>
                </div>
                <h3 className="font-medium mb-2">Repay & Withdraw</h3>
                <p className="text-gray-400 text-sm">Repay your loan to unlock your collateral</p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-gray-500 text-sm">
            <p>Contract: {CREDIT_LINE_VAULT_ADDRESS}</p>
            <a 
              href={`https://arbitrum.blockscout.com/address/${CREDIT_LINE_VAULT_ADDRESS}`}
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
