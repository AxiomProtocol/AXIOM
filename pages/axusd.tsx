import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { SiteLayout } from "../components/navigation";

interface SupplyData {
  totalSupply: string;
  circulatingSupply: string;
  lockedSupply: string;
  breakdown: {
    backstopReserve: string;
    psmReserve: string;
    treasuryReserve: string;
  };
  maxSupply: string;
}

interface PSMData {
  usdcReserve: string;
  feePercent: string;
}

const AXUSD_CONTRACTS: Record<string, string> = {
  'AXUSD Token': '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C',
  'PSM': '0x5db58d9c21369d1532a48Bdd658E4Fe415404922',
  'Vault Engine': '0x4675C09dDC1B3094cd86F6b59904CC3E06c98028',
  'Oracle Adapter': '0xE3b1f38AaBAd138d0EF2e2C7429ee57c512fDF3D',
  'Rate Limiter': '0xE19E4172786A193997f985edC27f7932a0B65327',
  'Backstop USDC': '0x54438249457694eB5431811f3f19444Af0a01B29',
  'Backstop ETH': '0xF2540BD6fa365Bf8F1b9dd4efa7534Ff6522393f',
  'T-Bill Vault': '0x091c146EC7c348552319E8D17cF7D0C9A4b3BCd4',
  'GENIUS Compliance': '0x8E8F769dA133cd3825549EE3E814fC936C8dE7be',
  'Segregated Custody': '0x1Ba851cfB9B3e34D88BC0cbf5a0042F9eb1Af66b',
  'Liquidator': '0xF6518B363aB4D461D59E1c9A54De3B7f66Da5384',
  'Market Operations': '0x42E31Ac3A6aF2B2925a0B979A05156833b6660E4',
  'LP Pool (Camelot)': '0x266F6Cf7eA36d3f676eb292B274EAb25172790a2'
};

const CAMELOT_ROUTER = '0xc873fEcbd354f5A56E00E710B90EF4201db2448d';
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

interface PegStatus {
  currentPrice: string;
  lowerBound: string;
  upperBound: string;
  pegDefenseNeeded: boolean;
}

interface LPData {
  axusdReserve: string;
  usdcReserve: string;
  totalLiquidity: string;
}

interface LPAnalytics {
  pool: {
    tvl: string;
    axusdReserve: string;
    usdcReserve: string;
  };
  metrics: {
    apr: string;
    dailyFees: string;
    annualFees: string;
    feeRate: string;
  };
  growthScenarios: Array<{
    weeklyContribution: number;
    projections: Array<{
      weeks: number;
      totalTvl: string;
      tradingCapacity: string;
    }>;
  }>;
}

interface TreasuryHealth {
  overview: {
    totalSupply: string;
    totalReserves: string;
    reserveRatio: string;
    healthStatus: string;
    healthScore: number;
    geniusCompliant: boolean;
  };
  reserves: {
    psmUsdc: string;
    backstopUsdc: string;
    tbillValue: string;
  };
  capacity: {
    debtCeiling: string;
    debtOutstanding: string;
    debtUtilization: string;
    availableCapacity: string;
  };
  stressTests: {
    scenario1: { name: string; canHandle: boolean; newReserveRatio: number };
    scenario2: { name: string; canHandle: boolean; newReserveRatio: number };
    scenario3: { name: string; canHandle: boolean; newReserveRatio: number };
  };
}

export default function AXUSDStablecoinPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'mint' | 'psm' | 'liquidity' | 'analytics' | 'treasury' | 'vaults' | 'earn'>('overview');
  const [mintAmount, setMintAmount] = useState('');
  const [collateralType, setCollateralType] = useState('WETH');
  const [psmAmount, setPsmAmount] = useState('');
  const [psmDirection, setPsmDirection] = useState<'usdcToAxusd' | 'axusdToUsdc'>('usdcToAxusd');
  
  const [supplyData, setSupplyData] = useState<SupplyData | null>(null);
  const [psmData, setPsmData] = useState<PSMData | null>(null);
  const [pegStatus, setPegStatus] = useState<PegStatus | null>(null);
  const [lpData, setLpData] = useState<LPData | null>(null);
  const [lpAnalytics, setLpAnalytics] = useState<LPAnalytics | null>(null);
  const [treasuryHealth, setTreasuryHealth] = useState<TreasuryHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lpAxusdAmount, setLpAxusdAmount] = useState('');
  const [lpUsdcAmount, setLpUsdcAmount] = useState('');
  const [selectedScenario, setSelectedScenario] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const [supplyRes, psmRes, pegRes, lpRes, analyticsRes, treasuryRes] = await Promise.all([
          fetch('/api/axusd/supply'),
          fetch('/api/axusd/psm'),
          fetch('/api/axusd/peg-status'),
          fetch('/api/axusd/liquidity'),
          fetch('/api/axusd/lp-analytics'),
          fetch('/api/axusd/treasury-health')
        ]);
        
        const supplyJson = await supplyRes.json();
        const psmJson = await psmRes.json();
        const pegJson = await pegRes.json();
        const lpJson = await lpRes.json();
        const analyticsJson = await analyticsRes.json();
        const treasuryJson = await treasuryRes.json();
        
        if (supplyJson.success) setSupplyData(supplyJson.data);
        if (psmJson.success) setPsmData(psmJson.data);
        if (pegJson.success) setPegStatus(pegJson.data);
        if (lpJson.success) setLpData(lpJson.data);
        if (analyticsJson.success) setLpAnalytics(analyticsJson.data);
        if (treasuryJson.success) setTreasuryHealth(treasuryJson.data);
      } catch (error) {
        console.error('Failed to fetch AXUSD data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (value: string | number) => {
    const num = parseFloat(String(value));
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <SiteLayout>
      <Head>
        <title>AXUSD Stablecoin | Axiom</title>
        <meta name="description" content="AXUSD - The hybrid CDP stablecoin settlement layer of Axiom Protocol. Mint AXUSD, swap via PSM, and earn yield through SEED." />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        <section className="relative py-16 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-blue-500/5"></div>
          <div className="absolute top-0 left-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          
          <div className="relative z-10 max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-block bg-green-500/20 border border-green-400 rounded-full px-6 py-2 mb-6 backdrop-blur-sm">
                <span className="text-green-400 font-semibold">$ AXIOM STABLECOIN</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-300 to-teal-500">
                  AXUSD
                </span>
                <br />
                <span className="text-white text-3xl md:text-4xl">
                  The Settlement Layer of Axiom
                </span>
              </h1>
              
              <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
                A <span className="text-green-400 font-semibold">hybrid CDP stablecoin</span> backed by crypto collateral, 
                USDC reserves, and real-world assets. Mint AXUSD, swap via PSM, and earn yield through SEED.
              </p>

              <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  <span>11 Verified Contracts</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  <span>150% Collateralization</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  <span>Multi-AI Security Audit</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {(['overview', 'mint', 'psm', 'liquidity', 'analytics', 'treasury', 'vaults', 'earn'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === tab
                      ? 'bg-green-500 text-black'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {tab === 'overview' && 'Overview'}
                  {tab === 'mint' && 'Mint'}
                  {tab === 'psm' && 'PSM'}
                  {tab === 'liquidity' && 'Liquidity'}
                  {tab === 'analytics' && 'LP Analytics'}
                  {tab === 'treasury' && 'Treasury'}
                  {tab === 'vaults' && 'Vaults'}
                  {tab === 'earn' && 'Earn'}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-green-500/30 rounded-xl p-6">
                    <h3 className="text-green-400 flex items-center gap-2 font-bold mb-4">
                      <span className="text-2xl">$</span> Total Supply
                    </h3>
                    <div className="text-3xl font-bold text-white">
                      {loading ? (
                        <span className="animate-pulse">Loading...</span>
                      ) : (
                        `${formatNumber(supplyData?.totalSupply || '0')} AXUSD`
                      )}
                    </div>
                    <p className="text-gray-400 mt-2">Max: 1B AXUSD</p>
                  </div>

                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-emerald-500/30 rounded-xl p-6">
                    <h3 className="text-emerald-400 flex items-center gap-2 font-bold mb-4">
                      <span className="text-2xl">$</span> Circulating Supply
                    </h3>
                    <div className="text-3xl font-bold text-white">
                      {loading ? (
                        <span className="animate-pulse">Loading...</span>
                      ) : (
                        `${formatNumber(supplyData?.circulatingSupply || '0')} AXUSD`
                      )}
                    </div>
                    <p className="text-gray-400 mt-2">In user wallets</p>
                  </div>

                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-blue-500/30 rounded-xl p-6">
                    <h3 className="text-blue-400 flex items-center gap-2 font-bold mb-4">
                      <span className="text-2xl">%</span> Collateral Ratio
                    </h3>
                    <div className="text-3xl font-bold text-white">150%</div>
                    <p className="text-gray-400 mt-2">Minimum requirement</p>
                  </div>

                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-purple-500/30 rounded-xl p-6">
                    <h3 className="text-purple-400 flex items-center gap-2 font-bold mb-4">
                      <span className="text-2xl">$</span> PSM Reserve
                    </h3>
                    <div className="text-3xl font-bold text-white">
                      {loading ? (
                        <span className="animate-pulse">Loading...</span>
                      ) : (
                        `${formatNumber(psmData?.usdcReserve || '0')} USDC`
                      )}
                    </div>
                    <p className="text-gray-400 mt-2">1:1 swap available</p>
                  </div>
                </div>
                
                {supplyData && parseFloat(supplyData.lockedSupply) > 0 && (
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl p-6">
                    <h3 className="text-gray-300 font-bold mb-4">Supply Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                        <div className="text-lg font-semibold text-yellow-400">{formatNumber(supplyData.breakdown.backstopReserve)} AXUSD</div>
                        <div className="text-gray-400 text-sm">Backstop Reserve</div>
                      </div>
                      <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                        <div className="text-lg font-semibold text-blue-400">{formatNumber(supplyData.breakdown.psmReserve)} AXUSD</div>
                        <div className="text-gray-400 text-sm">PSM Reserve</div>
                      </div>
                      <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                        <div className="text-lg font-semibold text-green-400">{formatNumber(supplyData.breakdown.treasuryReserve)} AXUSD</div>
                        <div className="text-gray-400 text-sm">Treasury Reserve</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-xl p-6">
                  <h3 className="text-yellow-400 font-bold mb-6 text-xl">How AXUSD Works</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                        <span className="text-3xl text-white">1</span>
                      </div>
                      <h4 className="font-bold text-white mb-2">Deposit Collateral</h4>
                      <p className="text-gray-400 text-sm">Lock WETH or WBTC at 150% ratio</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                        <span className="text-3xl text-white">2</span>
                      </div>
                      <h4 className="font-bold text-white mb-2">Mint AXUSD</h4>
                      <p className="text-gray-400 text-sm">Create stablecoin against your collateral</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                        <span className="text-3xl text-white">3</span>
                      </div>
                      <h4 className="font-bold text-white mb-2">Use Anywhere</h4>
                      <p className="text-gray-400 text-sm">SUSU circles, KeyGrow rent, DeFi</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
                        <span className="text-3xl text-white">4</span>
                      </div>
                      <h4 className="font-bold text-white mb-2">Earn Yield</h4>
                      <p className="text-gray-400 text-sm">Lock SEED for protocol revenue share</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-green-500/30 rounded-xl p-6">
                    <h3 className="text-green-400 font-bold mb-4 text-xl">Accepted Collateral</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                            <span className="text-xl text-white">E</span>
                          </div>
                          <div>
                            <div className="font-bold text-white">WETH</div>
                            <div className="text-sm text-gray-400">Wrapped Ether</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-bold">150% Min</div>
                          <div className="text-sm text-gray-400">130% Liq</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                            <span className="text-xl text-white">B</span>
                          </div>
                          <div>
                            <div className="font-bold text-white">WBTC</div>
                            <div className="text-sm text-gray-400">Wrapped Bitcoin</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-bold">150% Min</div>
                          <div className="text-sm text-gray-400">130% Liq</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-blue-500/30 rounded-xl p-6">
                    <h3 className="text-blue-400 font-bold mb-4 text-xl">Revenue Distribution</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-300">SEED Holders</span>
                        <span className="text-green-400 font-bold">50%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-300">Treasury</span>
                        <span className="text-yellow-400 font-bold">30%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-300">Backstop Vault</span>
                        <span className="text-blue-400 font-bold">20%</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-2">
                        All protocol fees from minting, PSM swaps, and liquidations are distributed weekly.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 rounded-xl p-6">
                  <h3 className="text-white font-bold mb-4 text-xl">Deployed Contracts</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(AXUSD_CONTRACTS).map(([name, address]) => (
                      <a
                        key={name}
                        href={`https://arbiscan.io/address/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-600/50 transition-colors"
                      >
                        <span className="text-gray-300 text-sm">{name}</span>
                        <span className="text-green-400 text-xs font-mono">{truncateAddress(address)}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'mint' && (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-green-500/30 rounded-xl p-6 max-w-2xl mx-auto">
                <h3 className="text-green-400 text-center font-bold mb-6 text-xl">Mint AXUSD</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-gray-400 mb-2">Collateral Type</label>
                    <div className="flex gap-4">
                      {['WETH', 'WBTC'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setCollateralType(type)}
                          className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                            collateralType === type
                              ? 'bg-green-500 text-black'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-2">Collateral Amount</label>
                    <input
                      type="number"
                      value={mintAmount}
                      onChange={(e) => setMintAmount(e.target.value)}
                      placeholder="0.0"
                      className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white text-lg focus:border-green-500 focus:outline-none"
                    />
                    <div className="flex justify-between mt-2 text-sm text-gray-400">
                      <span>Balance: 0 {collateralType}</span>
                      <span>~$0.00</span>
                    </div>
                  </div>

                  <div className="bg-gray-700/50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">You will receive</span>
                      <span className="text-white font-bold">0 AXUSD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Collateral Ratio</span>
                      <span className="text-green-400">150%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Liquidation Price</span>
                      <span className="text-yellow-400">$0.00</span>
                    </div>
                  </div>

                  <button className="w-full py-4 bg-green-500 hover:bg-green-600 text-black font-bold text-lg rounded-xl transition-colors">
                    Connect Wallet to Mint
                  </button>

                  <p className="text-center text-sm text-gray-400">
                    Minting requires connecting your wallet and approving collateral.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'psm' && (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-blue-500/30 rounded-xl p-6 max-w-2xl mx-auto">
                <h3 className="text-blue-400 text-center font-bold mb-6 text-xl">Peg Stability Module</h3>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <button
                      onClick={() => setPsmDirection('usdcToAxusd')}
                      className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                        psmDirection === 'usdcToAxusd'
                          ? 'bg-blue-500 text-black'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      USDC to AXUSD
                    </button>
                    <button
                      onClick={() => setPsmDirection('axusdToUsdc')}
                      className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                        psmDirection === 'axusdToUsdc'
                          ? 'bg-blue-500 text-black'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      AXUSD to USDC
                    </button>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-2">
                      {psmDirection === 'usdcToAxusd' ? 'USDC Amount' : 'AXUSD Amount'}
                    </label>
                    <input
                      type="number"
                      value={psmAmount}
                      onChange={(e) => setPsmAmount(e.target.value)}
                      placeholder="0.0"
                      className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white text-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="bg-gray-700/50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">You will receive</span>
                      <span className="text-white font-bold">
                        {psmAmount ? (parseFloat(psmAmount) * 0.999).toFixed(2) : '0'} {psmDirection === 'usdcToAxusd' ? 'AXUSD' : 'USDC'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Swap Fee</span>
                      <span className="text-yellow-400">0.1%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Exchange Rate</span>
                      <span className="text-green-400">1:1</span>
                    </div>
                  </div>

                  <button className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-black font-bold text-lg rounded-xl transition-colors">
                    Connect Wallet to Swap
                  </button>

                  <p className="text-center text-sm text-gray-400">
                    PSM allows 1:1 swaps between USDC and AXUSD with a 0.1% fee.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'liquidity' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-teal-500/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-teal-400 font-bold text-xl">AXUSD/USDC Liquidity Pool</h3>
                    <span className="bg-teal-500/20 text-teal-400 px-3 py-1 rounded-full text-sm">
                      Camelot DEX
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                      <p className="text-gray-400 text-sm mb-1">AXUSD Reserve</p>
                      <p className="text-2xl font-bold text-white">
                        {loading ? '...' : formatNumber(lpData?.axusdReserve || '0')}
                      </p>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                      <p className="text-gray-400 text-sm mb-1">USDC Reserve</p>
                      <p className="text-2xl font-bold text-white">
                        {loading ? '...' : formatNumber(lpData?.usdcReserve || '0')}
                      </p>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                      <p className="text-gray-400 text-sm mb-1">Total Value</p>
                      <p className="text-2xl font-bold text-teal-400">
                        ${loading ? '...' : formatNumber(parseFloat(lpData?.usdcReserve || '0') * 2)}
                      </p>
                    </div>
                  </div>

                  {pegStatus && (
                    <div className="bg-gray-700/30 rounded-xl p-4 mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm">Current Peg Price</p>
                          <p className="text-3xl font-bold text-white">
                            ${parseFloat(pegStatus.currentPrice).toFixed(4)}
                          </p>
                        </div>
                        <div className={`px-4 py-2 rounded-full ${
                          pegStatus.pegDefenseNeeded 
                            ? 'bg-yellow-500/20 text-yellow-400' 
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {pegStatus.pegDefenseNeeded ? 'Peg Defense Active' : 'Peg Stable'}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-400">
                        Target range: ${pegStatus.lowerBound} - ${pegStatus.upperBound}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-teal-500/30 rounded-xl p-6">
                  <h3 className="text-teal-400 font-bold mb-6 text-xl">Add Liquidity</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-400 mb-2">AXUSD Amount</label>
                      <input
                        type="number"
                        value={lpAxusdAmount}
                        onChange={(e) => {
                          setLpAxusdAmount(e.target.value);
                          setLpUsdcAmount(e.target.value);
                        }}
                        placeholder="0.0"
                        className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white text-lg focus:border-teal-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-2">USDC Amount</label>
                      <input
                        type="number"
                        value={lpUsdcAmount}
                        onChange={(e) => {
                          setLpUsdcAmount(e.target.value);
                          setLpAxusdAmount(e.target.value);
                        }}
                        placeholder="0.0"
                        className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white text-lg focus:border-teal-500 focus:outline-none"
                      />
                    </div>

                    <div className="bg-gray-700/50 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Pool Share</span>
                        <span className="text-white font-bold">
                          {lpAxusdAmount && lpData 
                            ? ((parseFloat(lpAxusdAmount) / (parseFloat(lpData.axusdReserve) + parseFloat(lpAxusdAmount))) * 100).toFixed(2)
                            : '0'}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Exchange Rate</span>
                        <span className="text-green-400">1 AXUSD = 1 USDC</span>
                      </div>
                    </div>

                    <button className="w-full py-4 bg-teal-500 hover:bg-teal-600 text-black font-bold text-lg rounded-xl transition-colors">
                      Connect Wallet to Add Liquidity
                    </button>

                    <p className="text-center text-sm text-gray-400">
                      Provide liquidity to earn trading fees. LP tokens are automatically staked.
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 rounded-xl p-6">
                  <h3 className="text-white font-bold mb-4">External Links</h3>
                  <div className="flex flex-wrap gap-4">
                    <a
                      href={`https://app.camelot.exchange/liquidity/?token1=0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C&token2=0xaf88d065e77c8cC2239327C5EDb3A432268e5831`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                    >
                      <span>Add on Camelot</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    <a
                      href="https://arbitrum.blockscout.com/address/0x266F6Cf7eA36d3f676eb292B274EAb25172790a2"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                    >
                      <span>View Pool on Blockscout</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-cyan-400 font-bold text-xl">LP Analytics Dashboard</h3>
                    <span className="bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-sm">
                      Live Data
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                      <p className="text-gray-400 text-sm mb-1">Total Value Locked</p>
                      <p className="text-2xl font-bold text-white">
                        ${loading ? '...' : lpAnalytics?.pool?.tvl || '0'}
                      </p>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                      <p className="text-gray-400 text-sm mb-1">Estimated APR</p>
                      <p className="text-2xl font-bold text-green-400">
                        {loading ? '...' : lpAnalytics?.metrics?.apr || '0'}%
                      </p>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                      <p className="text-gray-400 text-sm mb-1">Daily Fees</p>
                      <p className="text-2xl font-bold text-yellow-400">
                        ${loading ? '...' : lpAnalytics?.metrics?.dailyFees || '0'}
                      </p>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                      <p className="text-gray-400 text-sm mb-1">Fee Rate</p>
                      <p className="text-2xl font-bold text-white">
                        {loading ? '...' : lpAnalytics?.metrics?.feeRate || '0.3%'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/30 rounded-xl p-6">
                  <h3 className="text-cyan-400 font-bold mb-6 text-xl">Growth Projections</h3>
                  <p className="text-gray-400 mb-4">See how weekly liquidity contributions compound over time:</p>
                  
                  {lpAnalytics?.growthScenarios && (
                    <>
                      <div className="flex flex-wrap gap-2 mb-6">
                        {lpAnalytics.growthScenarios.map((scenario, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedScenario(idx)}
                            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                              selectedScenario === idx
                                ? 'bg-cyan-500 text-black'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            ${scenario.weeklyContribution}/week
                          </button>
                        ))}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-700">
                              <th className="text-left py-3 px-4 text-gray-400">Timeframe</th>
                              <th className="text-right py-3 px-4 text-gray-400">Projected TVL</th>
                              <th className="text-right py-3 px-4 text-gray-400">Trading Capacity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lpAnalytics.growthScenarios[selectedScenario]?.projections.map((proj, idx) => (
                              <tr key={idx} className="border-b border-gray-700/50">
                                <td className="py-3 px-4 text-white">{proj.weeks} weeks</td>
                                <td className="py-3 px-4 text-right text-green-400 font-bold">${formatNumber(proj.totalTvl)}</td>
                                <td className="py-3 px-4 text-right text-cyan-400">{proj.tradingCapacity}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 rounded-xl p-6">
                  <h3 className="text-white font-bold mb-4">Why Provide Liquidity?</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <h4 className="text-green-400 font-bold mb-2">Earn Trading Fees</h4>
                      <p className="text-gray-400 text-sm">Collect 0.3% on every swap in the pool, distributed proportionally to your share.</p>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <h4 className="text-blue-400 font-bold mb-2">Support the Peg</h4>
                      <p className="text-gray-400 text-sm">Deeper liquidity means tighter spreads and a more stable AXUSD peg.</p>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <h4 className="text-purple-400 font-bold mb-2">Build the Economy</h4>
                      <p className="text-gray-400 text-sm">Your liquidity enables SUSU, KeyGrow, and SEED to function smoothly.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'treasury' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-amber-500/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-amber-400 font-bold text-xl">Treasury Health Dashboard</h3>
                    {treasuryHealth && (
                      <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                        treasuryHealth.overview.healthStatus === 'excellent' ? 'bg-green-500/20 text-green-400' :
                        treasuryHealth.overview.healthStatus === 'good' ? 'bg-blue-500/20 text-blue-400' :
                        treasuryHealth.overview.healthStatus === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {treasuryHealth.overview.healthStatus.toUpperCase()} - Score: {treasuryHealth.overview.healthScore}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                      <p className="text-gray-400 text-sm mb-1">Total Supply</p>
                      <p className="text-2xl font-bold text-white">
                        {loading ? '...' : formatNumber(treasuryHealth?.overview?.totalSupply || '0')} AXUSD
                      </p>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                      <p className="text-gray-400 text-sm mb-1">Total Reserves</p>
                      <p className="text-2xl font-bold text-green-400">
                        ${loading ? '...' : formatNumber(treasuryHealth?.overview?.totalReserves || '0')}
                      </p>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                      <p className="text-gray-400 text-sm mb-1">Reserve Ratio</p>
                      <p className="text-2xl font-bold text-amber-400">
                        {loading ? '...' : treasuryHealth?.overview?.reserveRatio || '0'}%
                      </p>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                      <p className="text-gray-400 text-sm mb-1">GENIUS Compliant</p>
                      <p className={`text-2xl font-bold ${treasuryHealth?.overview?.geniusCompliant ? 'text-green-400' : 'text-red-400'}`}>
                        {treasuryHealth?.overview?.geniusCompliant ? 'YES' : 'NO'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-amber-500/30 rounded-xl p-6">
                    <h3 className="text-amber-400 font-bold mb-4">Reserve Breakdown</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">PSM USDC</span>
                        <span className="text-white font-bold">${treasuryHealth?.reserves?.psmUsdc || '0'}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div 
                          className="bg-blue-500 h-3 rounded-full" 
                          style={{ width: `${Math.min(100, (parseFloat(treasuryHealth?.reserves?.psmUsdc || '0') / parseFloat(treasuryHealth?.overview?.totalReserves || '1')) * 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Backstop USDC</span>
                        <span className="text-white font-bold">${treasuryHealth?.reserves?.backstopUsdc || '0'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">T-Bill Value</span>
                        <span className="text-white font-bold">${treasuryHealth?.reserves?.tbillValue || '0'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-amber-500/30 rounded-xl p-6">
                    <h3 className="text-amber-400 font-bold mb-4">Minting Capacity</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Debt Ceiling</span>
                        <span className="text-white font-bold">{formatNumber(treasuryHealth?.capacity?.debtCeiling || '0')} AXUSD</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Outstanding Debt</span>
                        <span className="text-white font-bold">{formatNumber(treasuryHealth?.capacity?.debtOutstanding || '0')} AXUSD</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Utilization</span>
                        <span className={`font-bold ${parseFloat(treasuryHealth?.capacity?.debtUtilization || '0') > 80 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {treasuryHealth?.capacity?.debtUtilization || '0'}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full ${parseFloat(treasuryHealth?.capacity?.debtUtilization || '0') > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(100, parseFloat(treasuryHealth?.capacity?.debtUtilization || '0'))}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Available to Mint</span>
                        <span className="text-green-400 font-bold">{formatNumber(treasuryHealth?.capacity?.availableCapacity || '0')} AXUSD</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-amber-500/30 rounded-xl p-6">
                  <h3 className="text-amber-400 font-bold mb-4">Stress Test Scenarios</h3>
                  <p className="text-gray-400 mb-4">How the protocol handles sudden redemption waves:</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {treasuryHealth?.stressTests && Object.entries(treasuryHealth.stressTests).map(([key, test]) => (
                      <div key={key} className={`rounded-xl p-4 ${test.canHandle ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                        <h4 className={`font-bold mb-2 ${test.canHandle ? 'text-green-400' : 'text-red-400'}`}>
                          {test.name}
                        </h4>
                        <p className="text-gray-400 text-sm mb-2">
                          Status: {test.canHandle ? 'Can Handle' : 'At Risk'}
                        </p>
                        <p className="text-white font-bold">
                          New Reserve Ratio: {test.newReserveRatio.toFixed(1)}%
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'vaults' && (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-purple-500/30 rounded-xl p-6">
                <h3 className="text-purple-400 text-center font-bold mb-6 text-xl">My Vaults</h3>
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center mb-6">
                    <span className="text-4xl text-white">$</span>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">No Vaults Yet</h4>
                  <p className="text-gray-400 mb-6">Connect your wallet to view your AXUSD vaults</p>
                  <button 
                    onClick={() => setActiveTab('mint')}
                    className="bg-purple-500 hover:bg-purple-600 text-black font-bold px-6 py-3 rounded-xl transition-colors"
                  >
                    Create Your First Vault
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'earn' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-xl p-6">
                  <h3 className="text-yellow-400 font-bold mb-6 text-xl">SEED Yield Distribution</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-700/50 rounded-xl p-6">
                      <h4 className="text-lg font-bold text-white mb-4">How to Earn</h4>
                      <ol className="space-y-3 text-gray-300">
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">1.</span>
                          Lock AXM tokens in SEED contract
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">2.</span>
                          Receive voting power proportional to lock duration
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">3.</span>
                          Claim AXUSD yield every week
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">4.</span>
                          50% of all protocol revenue goes to SEED holders
                        </li>
                      </ol>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-6">
                      <h4 className="text-lg font-bold text-white mb-4">Current Epoch</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Epoch</span>
                          <span className="text-white font-bold">1</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Revenue</span>
                          <span className="text-green-400 font-bold">0 AXUSD</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Your SEED Balance</span>
                          <span className="text-white">0 SEED</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Estimated Yield</span>
                          <span className="text-yellow-400 font-bold">0 AXUSD</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-green-500/30 rounded-xl p-6">
                  <h3 className="text-green-400 font-bold mb-6 text-xl">AXUSD Use Cases</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-6 bg-gray-700/50 rounded-xl">
                      <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                        <span className="text-3xl text-white">O</span>
                      </div>
                      <h4 className="font-bold text-white mb-2">SUSU Circles</h4>
                      <p className="text-gray-400 text-sm">Join savings circles denominated in AXUSD for stable, predictable savings</p>
                    </div>
                    <div className="text-center p-6 bg-gray-700/50 rounded-xl">
                      <div className="w-16 h-16 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                        <span className="text-3xl text-white">K</span>
                      </div>
                      <h4 className="font-bold text-white mb-2">KeyGrow Housing</h4>
                      <p className="text-gray-400 text-sm">Pay rent in AXUSD and build equity toward home ownership</p>
                    </div>
                    <div className="text-center p-6 bg-gray-700/50 rounded-xl">
                      <div className="w-16 h-16 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
                        <span className="text-3xl text-white">$</span>
                      </div>
                      <h4 className="font-bold text-white mb-2">DeFi Liquidity</h4>
                      <p className="text-gray-400 text-sm">Provide liquidity in AXUSD pools on Camelot DEX</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
