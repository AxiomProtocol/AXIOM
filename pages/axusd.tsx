import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { SiteLayout } from "../components/navigation";

const axusdHeroImage = "/images/axusd/3d_axusd_stablecoin_hero_image.png";
const treasuryVaultImage = "/images/axusd/3d_treasury_vault_visualization.png";
const bridgeImage = "/images/axusd/3d_cross-chain_bridge_visual.png";
const liquidityPoolImage = "/images/axusd/3d_liquidity_pool_visual.png";

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

interface HistoryData {
  snapshots: Array<{
    date: string;
    totalSupply: number;
    reserves: number;
    reserveRatio: number;
    pegPrice: number;
    tvl: number;
    apr: number;
  }>;
  growthMetrics: {
    supplyGrowth: string;
    supplyGrowthPercent: string;
    tvlGrowth: string;
    tvlGrowthPercent: string;
    periodDays: number;
  };
  latestSnapshot: any;
}

interface PoolData {
  pools: Array<{
    id: number;
    name: string;
    poolAddress: string;
    dex: string;
    token0Symbol: string;
    token1Symbol: string;
    tvl: string;
    status: string;
  }>;
  summary: {
    totalPools: number;
    activePools: number;
    totalTvl: string;
  };
}

interface IncentiveData {
  activePrograms: Array<{
    id: number;
    name: string;
    poolAddress: string;
    rewardToken: string;
    rewards: {
      total: string;
      distributed: string;
      remaining: string;
      daily: string;
    };
    bonusMultiplier: string;
    minLockDays: number;
    duration: {
      remainingDays: number;
      progressPercent: string;
    };
  }>;
  bonusTiers: Array<{
    tier: number;
    multiplier: number;
    description: string;
  }>;
}

interface BridgeData {
  routes: Array<{
    id: number;
    name: string;
    source: { chain: string; chainId: number };
    destination: { chain: string; chainId: number };
    provider: string;
    fees: { percent: string; flat: string };
    estimatedTime: number;
  }>;
  supportedChains: Record<string, { name: string; color: string }>;
}

interface AlertType {
  type: string;
  description: string;
  defaultThreshold: number;
  unit: string;
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

type TabType = 'overview' | 'mint' | 'psm' | 'liquidity' | 'analytics' | 'treasury' | 'vaults' | 'earn' | 'history' | 'pools' | 'incentives' | 'bridge' | 'alerts' | 'faq';

const TAB_CONFIG: { id: TabType; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '◈' },
  { id: 'mint', label: 'Mint', icon: '⬡' },
  { id: 'psm', label: 'PSM', icon: '⟷' },
  { id: 'liquidity', label: 'Liquidity', icon: '◎' },
  { id: 'pools', label: 'Pools', icon: '◉' },
  { id: 'analytics', label: 'Analytics', icon: '◧' },
  { id: 'treasury', label: 'Treasury', icon: '◆' },
  { id: 'incentives', label: 'Rewards', icon: '★' },
  { id: 'bridge', label: 'Bridge', icon: '⋈' },
  { id: 'history', label: 'History', icon: '◷' },
  { id: 'alerts', label: 'Alerts', icon: '◐' },
  { id: 'faq', label: 'FAQ', icon: '?' },
];

const FAQ_DATA = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "What is AXUSD?",
        a: "AXUSD is Axiom Protocol's hybrid CDP stablecoin, designed to maintain a 1:1 peg with the US Dollar. It's backed by a combination of crypto collateral (ETH, BTC), USDC reserves, and real-world assets like T-Bills. AXUSD is GENIUS Act compliant, meeting federal regulatory requirements for payment stablecoins."
      },
      {
        q: "How do I get AXUSD?",
        a: "There are two main ways: 1) Mint AXUSD by depositing collateral (WETH or WBTC) at a 150% collateralization ratio, or 2) Swap USDC for AXUSD instantly via the Peg Stability Module (PSM) at a 1:1 rate with a small 0.1% fee."
      },
      {
        q: "Is AXUSD safe to use?",
        a: "AXUSD is backed by 100%+ reserves at all times, with multiple layers of protection including the Backstop Vault, T-Bill reserves, and automated liquidation mechanisms. All contracts are verified on Arbiscan and have undergone security reviews."
      }
    ]
  },
  {
    category: "Minting & Collateral",
    questions: [
      {
        q: "What collateral can I use to mint AXUSD?",
        a: "Currently, AXUSD accepts WETH (Wrapped Ether) and WBTC (Wrapped Bitcoin) as collateral. Both require a minimum 150% collateralization ratio, with liquidation triggered at 130%."
      },
      {
        q: "What happens if my collateral value drops?",
        a: "If your collateral ratio falls below 130%, your position becomes eligible for liquidation. The Liquidator contract will sell your collateral to repay the AXUSD debt, plus a liquidation penalty. We recommend maintaining at least 180-200% collateral ratio for safety."
      },
      {
        q: "How do I repay my AXUSD debt?",
        a: "Simply return the AXUSD you minted (plus any accrued stability fees) to unlock your collateral. You can repay partially or in full at any time."
      }
    ]
  },
  {
    category: "PSM & Liquidity",
    questions: [
      {
        q: "What is the Peg Stability Module (PSM)?",
        a: "The PSM allows instant 1:1 swaps between AXUSD and USDC. When AXUSD trades above $1, users can mint AXUSD with USDC. When AXUSD trades below $1, users can redeem AXUSD for USDC. This mechanism helps maintain the peg."
      },
      {
        q: "What are the PSM fees?",
        a: "The PSM charges a 0.1% fee (10 basis points) for both minting and redeeming. This fee goes to the protocol treasury and SEED holders."
      },
      {
        q: "How can I provide liquidity?",
        a: "You can provide liquidity to the AXUSD/USDC pool on Camelot DEX. Liquidity providers earn trading fees and can participate in our LP incentive programs for bonus AXM rewards."
      }
    ]
  },
  {
    category: "GENIUS Act Compliance",
    questions: [
      {
        q: "What is the GENIUS Act?",
        a: "The GENIUS Act (Public Law 119-27) is federal legislation establishing regulatory requirements for payment stablecoins in the United States. It mandates 100% reserve backing, asset segregation, and regular audits."
      },
      {
        q: "How is AXUSD GENIUS Act compliant?",
        a: "AXUSD implements all required safeguards: 100%+ reserve ratio, segregated custody of reserves, 93-day maximum maturity for T-Bill holdings, anti-rehypothecation controls, and real-time reserve verification on-chain."
      },
      {
        q: "Can AXUSD reserves be rehypothecated?",
        a: "No. The smart contracts include anti-rehypothecation mechanisms that prevent reserves from being used as collateral elsewhere. All reserves are held in segregated custody contracts."
      }
    ]
  },
  {
    category: "Earning & Rewards",
    questions: [
      {
        q: "How do I earn yield with AXUSD?",
        a: "There are multiple ways: 1) Lock AXM in SEED to earn 50% of protocol revenue, 2) Provide liquidity to earn trading fees + AXM rewards, 3) Join SUSU savings circles for group savings benefits."
      },
      {
        q: "What is SEED?",
        a: "SEED is Axiom's yield engine. Lock your AXM tokens in SEED to receive voting power and earn a share of protocol revenue distributed weekly in AXUSD."
      },
      {
        q: "What are LP incentive programs?",
        a: "Early liquidity providers can earn bonus AXM rewards through our incentive programs. Rewards are distributed based on your share of the pool, with multipliers for longer lock periods (up to 2x for 180-day locks)."
      }
    ]
  }
];

export default function AXUSDStablecoinPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [mintAmount, setMintAmount] = useState('');
  const [collateralType, setCollateralType] = useState('WETH');
  const [psmAmount, setPsmAmount] = useState('');
  const [psmDirection, setPsmDirection] = useState<'usdcToAxusd' | 'axusdToUsdc'>('usdcToAxusd');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  
  const [supplyData, setSupplyData] = useState<SupplyData | null>(null);
  const [psmData, setPsmData] = useState<PSMData | null>(null);
  const [pegStatus, setPegStatus] = useState<PegStatus | null>(null);
  const [lpData, setLpData] = useState<LPData | null>(null);
  const [lpAnalytics, setLpAnalytics] = useState<LPAnalytics | null>(null);
  const [treasuryHealth, setTreasuryHealth] = useState<TreasuryHealth | null>(null);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [incentiveData, setIncentiveData] = useState<IncentiveData | null>(null);
  const [bridgeData, setBridgeData] = useState<BridgeData | null>(null);
  const [alertTypes, setAlertTypes] = useState<AlertType[]>([]);
  const [loading, setLoading] = useState(true);
  const [lpAxusdAmount, setLpAxusdAmount] = useState('');
  const [lpUsdcAmount, setLpUsdcAmount] = useState('');
  const [selectedScenario, setSelectedScenario] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const [supplyRes, psmRes, pegRes, lpRes, analyticsRes, treasuryRes, historyRes, poolsRes, incentivesRes, bridgeRes, alertsRes] = await Promise.all([
          fetch('/api/axusd/supply'),
          fetch('/api/axusd/psm'),
          fetch('/api/axusd/peg-status'),
          fetch('/api/axusd/liquidity'),
          fetch('/api/axusd/lp-analytics'),
          fetch('/api/axusd/treasury-health'),
          fetch('/api/axusd/history'),
          fetch('/api/axusd/pools'),
          fetch('/api/axusd/incentives'),
          fetch('/api/axusd/bridge'),
          fetch('/api/axusd/alerts')
        ]);
        
        const [supplyJson, psmJson, pegJson, lpJson, analyticsJson, treasuryJson, historyJson, poolsJson, incentivesJson, bridgeJson, alertsJson] = await Promise.all([
          supplyRes.json(),
          psmRes.json(),
          pegRes.json(),
          lpRes.json(),
          analyticsRes.json(),
          treasuryRes.json(),
          historyRes.json(),
          poolsRes.json(),
          incentivesRes.json(),
          bridgeRes.json(),
          alertsRes.json()
        ]);
        
        if (supplyJson.success) setSupplyData(supplyJson.data);
        if (psmJson.success) setPsmData(psmJson.data);
        if (pegJson.success) setPegStatus(pegJson.data);
        if (lpJson.success) setLpData(lpJson.data);
        if (analyticsJson.success) setLpAnalytics(analyticsJson.data);
        if (treasuryJson.success) setTreasuryHealth(treasuryJson.data);
        if (historyJson.success) setHistoryData(historyJson.data);
        if (poolsJson.success) setPoolData(poolsJson.data);
        if (incentivesJson.success) setIncentiveData(incentivesJson.data);
        if (bridgeJson.success) setBridgeData(bridgeJson.data);
        if (alertsJson.success) setAlertTypes(alertsJson.data.availableAlertTypes || []);
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

  const GlassCard = ({ children, className = "", borderColor = "border-emerald-500/30", glow = false }: { children: React.ReactNode; className?: string; borderColor?: string; glow?: boolean }) => (
    <div className={`relative backdrop-blur-xl bg-gradient-to-br from-gray-900/80 via-gray-800/60 to-gray-900/80 ${borderColor} border rounded-2xl overflow-hidden ${className} ${glow ? 'shadow-lg shadow-emerald-500/20' : ''}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );

  const Web3Icon = ({ icon, size = "md", color = "text-emerald-400" }: { icon: string; size?: "sm" | "md" | "lg"; color?: string }) => {
    const sizeClasses = { sm: "w-8 h-8 text-lg", md: "w-12 h-12 text-2xl", lg: "w-16 h-16 text-3xl" };
    return (
      <div className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br from-gray-700/50 to-gray-800/50 border border-gray-600/30 flex items-center justify-center ${color} backdrop-blur-sm shadow-inner`}>
        {icon}
      </div>
    );
  };

  return (
    <SiteLayout>
      <Head>
        <title>AXUSD Stablecoin | Axiom Protocol</title>
        <meta name="description" content="AXUSD - The GENIUS Act compliant hybrid CDP stablecoin. 100% backed, segregated custody, cross-chain enabled. The settlement layer of Axiom Protocol." />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
        <section className="relative py-12 px-4 overflow-hidden">
          <div className="absolute inset-0">
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url(${axusdHeroImage})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/80 to-gray-950" />
          </div>
          
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 border border-emerald-400/40 rounded-full px-6 py-2.5 mb-6 backdrop-blur-md">
                <span className="text-emerald-400 text-xl">◈</span>
                <span className="text-emerald-300 font-semibold tracking-wide">GENIUS ACT COMPLIANT STABLECOIN</span>
                <span className="text-emerald-400 text-xl">◈</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 drop-shadow-lg">
                  AXUSD
                </span>
              </h1>
              
              <p className="text-2xl md:text-3xl text-gray-300 font-light mb-6">
                The Settlement Layer of <span className="text-emerald-400 font-semibold">Axiom Protocol</span>
              </p>
              
              <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-8 leading-relaxed">
                A <span className="text-emerald-400 font-medium">100% backed hybrid stablecoin</span> with segregated custody, 
                cross-chain bridging, and full GENIUS Act compliance. Mint, swap, bridge, and earn yield in a single unified ecosystem.
              </p>

              <div className="flex flex-wrap justify-center gap-4 text-sm mb-8">
                {[
                  { icon: '✓', text: '100% Reserve Backed' },
                  { icon: '◆', text: 'GENIUS Act Compliant' },
                  { icon: '⟷', text: 'Cross-Chain Enabled' },
                  { icon: '◎', text: 'Segregated Custody' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-full px-4 py-2">
                    <span className="text-emerald-400">{item.icon}</span>
                    <span className="text-gray-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-8 px-2">
              {TAB_CONFIG.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-lg shadow-emerald-500/30'
                      : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/80 hover:text-white backdrop-blur-sm border border-gray-700/50'
                  }`}
                >
                  <span className={activeTab === tab.id ? 'text-black' : 'text-emerald-400'}>{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Supply', value: supplyData?.totalSupply || '0', suffix: 'AXUSD', icon: '$', color: 'emerald' },
                    { label: 'Circulating', value: supplyData?.circulatingSupply || '0', suffix: 'AXUSD', icon: '◎', color: 'teal' },
                    { label: 'Reserve Ratio', value: treasuryHealth?.overview?.reserveRatio || '100', suffix: '%', icon: '◆', color: 'blue' },
                    { label: 'PSM Reserve', value: psmData?.usdcReserve || '0', suffix: 'USDC', icon: '⬡', color: 'purple' },
                  ].map((stat, i) => (
                    <GlassCard key={i} borderColor={`border-${stat.color}-500/30`} glow>
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <Web3Icon icon={stat.icon} color={`text-${stat.color}-400`} />
                          <h3 className={`text-${stat.color}-400 font-bold`}>{stat.label}</h3>
                        </div>
                        <div className="text-3xl font-bold text-white">
                          {loading ? <span className="animate-pulse">Loading...</span> : `${formatNumber(stat.value)} ${stat.suffix}`}
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>

                <GlassCard borderColor="border-amber-500/30">
                  <div className="p-8">
                    <h3 className="text-amber-400 font-bold mb-8 text-2xl flex items-center gap-3">
                      <Web3Icon icon="⬡" color="text-amber-400" />
                      How AXUSD Works
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                      {[
                        { step: 1, title: 'Deposit Collateral', desc: 'Lock WETH or WBTC at 150% ratio', color: 'emerald' },
                        { step: 2, title: 'Mint AXUSD', desc: 'Create stablecoin against your collateral', color: 'blue' },
                        { step: 3, title: 'Use Anywhere', desc: 'SUSU circles, KeyGrow rent, DeFi', color: 'purple' },
                        { step: 4, title: 'Earn Yield', desc: 'Lock SEED for protocol revenue share', color: 'amber' },
                      ].map((item) => (
                        <div key={item.step} className="text-center group">
                          <div className={`w-20 h-20 mx-auto bg-gradient-to-br from-${item.color}-500/30 to-${item.color}-600/10 rounded-2xl flex items-center justify-center mb-4 border border-${item.color}-500/30 group-hover:scale-110 transition-transform shadow-lg shadow-${item.color}-500/20`}>
                            <span className="text-4xl font-bold text-white">{item.step}</span>
                          </div>
                          <h4 className="font-bold text-white mb-2 text-lg">{item.title}</h4>
                          <p className="text-gray-400">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlassCard borderColor="border-emerald-500/30">
                    <div className="p-6">
                      <h3 className="text-emerald-400 font-bold mb-4 text-xl flex items-center gap-2">
                        <span>◆</span> GENIUS Act Compliance
                      </h3>
                      <div className="space-y-3">
                        {[
                          '100% Reserve Backing Required',
                          'Segregated Custody Accounts',
                          '93-Day Maximum T-Bill Maturity',
                          'Anti-Rehypothecation Controls',
                          'Real-Time On-Chain Verification',
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                            <span className="text-emerald-400">✓</span>
                            <span className="text-gray-300">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard borderColor="border-blue-500/30">
                    <div className="p-6">
                      <h3 className="text-blue-400 font-bold mb-4 text-xl flex items-center gap-2">
                        <span>$</span> Revenue Distribution
                      </h3>
                      <div className="space-y-4">
                        {[
                          { label: 'SEED Holders', value: '50%', color: 'emerald' },
                          { label: 'Treasury', value: '30%', color: 'amber' },
                          { label: 'Backstop Vault', value: '20%', color: 'blue' },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl border border-gray-600/30">
                            <span className="text-gray-300">{item.label}</span>
                            <span className={`text-${item.color}-400 font-bold text-lg`}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </GlassCard>
                </div>

                <GlassCard borderColor="border-gray-600/30">
                  <div className="p-6">
                    <h3 className="text-gray-300 font-bold mb-4 text-xl">Deployed Contracts</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(AXUSD_CONTRACTS).map(([name, addr]) => (
                        <a
                          key={name}
                          href={`https://arbiscan.io/address/${addr}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors border border-gray-700/50 group"
                        >
                          <span className="text-gray-300 text-sm">{name}</span>
                          <span className="text-emerald-400 text-xs font-mono group-hover:underline">{truncateAddress(addr)}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === 'pools' && (
              <div className="space-y-6">
                <div 
                  className="relative rounded-2xl overflow-hidden h-48 mb-8"
                  style={{ backgroundImage: `url(${liquidityPoolImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 to-transparent" />
                  <div className="relative z-10 p-8 h-full flex flex-col justify-center">
                    <h2 className="text-3xl font-bold text-white mb-2">AXUSD Trading Pools</h2>
                    <p className="text-gray-300">Provide liquidity and earn trading fees across multiple DEXes</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <GlassCard borderColor="border-emerald-500/30" glow>
                    <div className="p-6 text-center">
                      <div className="text-3xl font-bold text-emerald-400">{poolData?.summary?.totalPools || 0}</div>
                      <div className="text-gray-400">Total Pools</div>
                    </div>
                  </GlassCard>
                  <GlassCard borderColor="border-teal-500/30" glow>
                    <div className="p-6 text-center">
                      <div className="text-3xl font-bold text-teal-400">{poolData?.summary?.activePools || 0}</div>
                      <div className="text-gray-400">Active Pools</div>
                    </div>
                  </GlassCard>
                  <GlassCard borderColor="border-blue-500/30" glow>
                    <div className="p-6 text-center">
                      <div className="text-3xl font-bold text-blue-400">${poolData?.summary?.totalTvl || '0'}</div>
                      <div className="text-gray-400">Total TVL</div>
                    </div>
                  </GlassCard>
                </div>

                <GlassCard borderColor="border-gray-600/30">
                  <div className="p-6">
                    <h3 className="text-white font-bold mb-6 text-xl">Available Pools</h3>
                    <div className="space-y-4">
                      {poolData?.pools?.map((pool) => (
                        <div key={pool.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-emerald-500/30 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="flex -space-x-2">
                              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-gray-800 flex items-center justify-center text-emerald-400 font-bold">$</div>
                              <div className="w-10 h-10 rounded-full bg-blue-500/20 border-2 border-gray-800 flex items-center justify-center text-blue-400 font-bold">{pool.token1Symbol?.charAt(0)}</div>
                            </div>
                            <div>
                              <div className="font-bold text-white">{pool.name}</div>
                              <div className="text-sm text-gray-400">{pool.dex}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-white">${formatNumber(pool.tvl)}</div>
                            <div className={`text-sm ${pool.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {pool.status === 'active' ? '● Live' : '○ Pending'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === 'incentives' && (
              <div className="space-y-6">
                <GlassCard borderColor="border-amber-500/30" glow>
                  <div className="p-8">
                    <h3 className="text-amber-400 font-bold mb-6 text-2xl flex items-center gap-3">
                      <Web3Icon icon="★" color="text-amber-400" />
                      LP Incentive Programs
                    </h3>
                    <p className="text-gray-300 mb-8">
                      Early liquidity providers receive bonus AXM rewards based on their contribution timing and lock duration.
                    </p>

                    {incentiveData?.activePrograms?.map((program) => (
                      <div key={program.id} className="bg-gray-800/50 rounded-xl p-6 border border-amber-500/20 mb-6">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                          <div>
                            <h4 className="text-xl font-bold text-white">{program.name}</h4>
                            <p className="text-gray-400">Reward Token: {program.rewardToken}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-amber-400">{program.bonusMultiplier}x</div>
                            <div className="text-gray-400">Multiplier</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                            <div className="text-lg font-bold text-emerald-400">{formatNumber(program.rewards.total)}</div>
                            <div className="text-gray-400 text-sm">Total Rewards</div>
                          </div>
                          <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                            <div className="text-lg font-bold text-teal-400">{formatNumber(program.rewards.remaining)}</div>
                            <div className="text-gray-400 text-sm">Remaining</div>
                          </div>
                          <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                            <div className="text-lg font-bold text-blue-400">{program.rewards.daily}</div>
                            <div className="text-gray-400 text-sm">Daily Rate</div>
                          </div>
                          <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                            <div className="text-lg font-bold text-purple-400">{program.duration.remainingDays}</div>
                            <div className="text-gray-400 text-sm">Days Left</div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <h4 className="text-white font-bold mb-4 text-lg">Bonus Tiers</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {incentiveData?.bonusTiers?.map((tier) => (
                        <div key={tier.tier} className={`rounded-xl p-4 text-center ${tier.tier === 1 ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-gray-700/30 border border-gray-600/30'}`}>
                          <div className={`text-2xl font-bold ${tier.tier === 1 ? 'text-amber-400' : 'text-gray-300'}`}>{tier.multiplier}x</div>
                          <div className="text-gray-400 text-sm">{tier.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>

                <GlassCard borderColor="border-emerald-500/30">
                  <div className="p-6">
                    <h3 className="text-emerald-400 font-bold mb-4 text-xl">Lock Duration Benefits</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { days: '30 days', multiplier: '1.25x', color: 'emerald' },
                        { days: '90 days', multiplier: '1.5x', color: 'teal' },
                        { days: '180 days', multiplier: '2.0x', color: 'amber' },
                      ].map((lock, i) => (
                        <div key={i} className={`rounded-xl p-6 text-center bg-${lock.color}-500/10 border border-${lock.color}-500/30`}>
                          <div className={`text-3xl font-bold text-${lock.color}-400 mb-2`}>{lock.multiplier}</div>
                          <div className="text-gray-300">{lock.days} lock</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === 'bridge' && (
              <div className="space-y-6">
                <div 
                  className="relative rounded-2xl overflow-hidden h-48 mb-8"
                  style={{ backgroundImage: `url(${bridgeImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 to-transparent" />
                  <div className="relative z-10 p-8 h-full flex flex-col justify-center">
                    <h2 className="text-3xl font-bold text-white mb-2">Cross-Chain Bridge</h2>
                    <p className="text-gray-300">Bridge AXUSD between Arbitrum and other networks</p>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-amber-400 text-xl">⚠</span>
                    <p className="text-amber-300">Bridge transactions are irreversible. Please verify destination addresses carefully before proceeding.</p>
                  </div>
                </div>

                <GlassCard borderColor="border-teal-500/30">
                  <div className="p-6">
                    <h3 className="text-teal-400 font-bold mb-6 text-xl">Available Bridge Routes</h3>
                    <div className="space-y-4">
                      {bridgeData?.routes?.map((route) => (
                        <div key={route.id} className="flex flex-wrap items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-teal-500/30 transition-colors gap-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">A</div>
                              <span className="text-gray-400">→</span>
                              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">{route.destination.chain.charAt(0)}</div>
                            </div>
                            <div>
                              <div className="font-bold text-white">{route.name}</div>
                              <div className="text-sm text-gray-400">via {route.provider}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <div className="text-white font-bold">{route.fees.percent}% + ${route.fees.flat}</div>
                              <div className="text-gray-400 text-sm">Fee</div>
                            </div>
                            <div className="text-center">
                              <div className="text-white font-bold">~{route.estimatedTime} min</div>
                              <div className="text-gray-400 text-sm">Est. Time</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>

                <GlassCard borderColor="border-gray-600/30">
                  <div className="p-6">
                    <h3 className="text-gray-300 font-bold mb-4 text-xl">Supported Networks</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {Object.entries(bridgeData?.supportedChains || {}).map(([id, chain]) => (
                        <div key={id} className="text-center p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                          <div className="w-12 h-12 mx-auto rounded-full mb-2" style={{ backgroundColor: chain.color + '30' }}>
                            <div className="w-full h-full flex items-center justify-center text-white font-bold">{chain.name.charAt(0)}</div>
                          </div>
                          <div className="text-gray-300 text-sm">{chain.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <GlassCard borderColor="border-emerald-500/30" glow>
                    <div className="p-6 text-center">
                      <div className="text-2xl font-bold text-emerald-400">{historyData?.growthMetrics?.supplyGrowthPercent || '0'}%</div>
                      <div className="text-gray-400">Supply Growth ({historyData?.growthMetrics?.periodDays || 30}d)</div>
                    </div>
                  </GlassCard>
                  <GlassCard borderColor="border-teal-500/30" glow>
                    <div className="p-6 text-center">
                      <div className="text-2xl font-bold text-teal-400">{historyData?.growthMetrics?.tvlGrowthPercent || '0'}%</div>
                      <div className="text-gray-400">TVL Growth ({historyData?.growthMetrics?.periodDays || 30}d)</div>
                    </div>
                  </GlassCard>
                  <GlassCard borderColor="border-blue-500/30" glow>
                    <div className="p-6 text-center">
                      <div className="text-2xl font-bold text-blue-400">${formatNumber(historyData?.latestSnapshot?.totalSupply || '0')}</div>
                      <div className="text-gray-400">Current Supply</div>
                    </div>
                  </GlassCard>
                  <GlassCard borderColor="border-purple-500/30" glow>
                    <div className="p-6 text-center">
                      <div className="text-2xl font-bold text-purple-400">${formatNumber(historyData?.latestSnapshot?.tvl || '0')}</div>
                      <div className="text-gray-400">Current TVL</div>
                    </div>
                  </GlassCard>
                </div>

                <GlassCard borderColor="border-gray-600/30">
                  <div className="p-6">
                    <h3 className="text-white font-bold mb-6 text-xl">Historical Snapshots</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-gray-400 text-sm border-b border-gray-700">
                            <th className="text-left py-3 px-4">Date</th>
                            <th className="text-right py-3 px-4">Supply</th>
                            <th className="text-right py-3 px-4">Reserves</th>
                            <th className="text-right py-3 px-4">Ratio</th>
                            <th className="text-right py-3 px-4">Peg</th>
                            <th className="text-right py-3 px-4">TVL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyData?.snapshots?.map((snapshot, i) => (
                            <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/30">
                              <td className="py-3 px-4 text-gray-300">{snapshot.date}</td>
                              <td className="py-3 px-4 text-right text-white">${formatNumber(snapshot.totalSupply)}</td>
                              <td className="py-3 px-4 text-right text-emerald-400">${formatNumber(snapshot.reserves)}</td>
                              <td className="py-3 px-4 text-right text-teal-400">{snapshot.reserveRatio.toFixed(1)}%</td>
                              <td className="py-3 px-4 text-right text-blue-400">${snapshot.pegPrice.toFixed(4)}</td>
                              <td className="py-3 px-4 text-right text-purple-400">${formatNumber(snapshot.tvl)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === 'alerts' && (
              <div className="space-y-6">
                <GlassCard borderColor="border-red-500/30">
                  <div className="p-8">
                    <h3 className="text-red-400 font-bold mb-6 text-2xl flex items-center gap-3">
                      <Web3Icon icon="◐" color="text-red-400" />
                      Alert Configuration
                    </h3>
                    <p className="text-gray-300 mb-8">
                      Set up notifications to stay informed about important AXUSD protocol events and thresholds.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {alertTypes.map((alert) => (
                        <div key={alert.type} className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50 hover:border-red-500/30 transition-colors">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400">
                              {alert.type === 'peg_deviation' && '◎'}
                              {alert.type === 'reserve_low' && '◆'}
                              {alert.type === 'high_utilization' && '%'}
                              {alert.type === 'large_mint' && '+'}
                              {alert.type === 'large_redeem' && '-'}
                              {alert.type === 'liquidity_change' && '~'}
                            </div>
                            <h4 className="font-bold text-white capitalize">{alert.type.replace(/_/g, ' ')}</h4>
                          </div>
                          <p className="text-gray-400 text-sm mb-4">{alert.description}</p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Default: {alert.defaultThreshold} {alert.unit}</span>
                            <button className="text-emerald-400 hover:text-emerald-300 font-medium">Configure</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>

                <GlassCard borderColor="border-gray-600/30">
                  <div className="p-6">
                    <h3 className="text-gray-300 font-bold mb-4 text-xl">How Alerts Work</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { step: 1, title: 'Choose Alert Type', desc: 'Select from peg deviation, reserve, utilization, or transaction alerts' },
                        { step: 2, title: 'Set Threshold', desc: 'Define your personal threshold values for each alert type' },
                        { step: 3, title: 'Get Notified', desc: 'Receive email or webhook notifications when thresholds are breached' },
                      ].map((item) => (
                        <div key={item.step} className="text-center p-4">
                          <div className="w-12 h-12 mx-auto bg-gray-700/50 rounded-full flex items-center justify-center mb-3 text-emerald-400 font-bold text-lg">{item.step}</div>
                          <h4 className="font-bold text-white mb-2">{item.title}</h4>
                          <p className="text-gray-400 text-sm">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === 'faq' && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-4">Frequently Asked Questions</h2>
                  <p className="text-gray-400 max-w-2xl mx-auto">
                    Everything you need to know about AXUSD, from getting started to advanced features
                  </p>
                </div>

                {FAQ_DATA.map((category, catIndex) => (
                  <GlassCard key={catIndex} borderColor="border-gray-600/30">
                    <div className="p-6">
                      <h3 className="text-emerald-400 font-bold mb-6 text-xl">{category.category}</h3>
                      <div className="space-y-4">
                        {category.questions.map((faq, faqIndex) => {
                          const faqId = `${catIndex}-${faqIndex}`;
                          const isExpanded = expandedFaq === faqId;
                          return (
                            <div key={faqIndex} className="border border-gray-700/50 rounded-xl overflow-hidden">
                              <button
                                onClick={() => setExpandedFaq(isExpanded ? null : faqId)}
                                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/30 transition-colors"
                              >
                                <span className="font-medium text-white">{faq.q}</span>
                                <span className={`text-emerald-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                              </button>
                              {isExpanded && (
                                <div className="px-4 pb-4">
                                  <p className="text-gray-400 leading-relaxed">{faq.a}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}

            {activeTab === 'mint' && (
              <GlassCard borderColor="border-emerald-500/30">
                <div className="p-8">
                  <h3 className="text-emerald-400 font-bold mb-6 text-2xl">Mint AXUSD</h3>
                  <div className="max-w-xl mx-auto space-y-6">
                    <div>
                      <label className="text-gray-300 block mb-2">Collateral Type</label>
                      <select 
                        value={collateralType}
                        onChange={(e) => setCollateralType(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-xl p-4 text-white"
                      >
                        <option value="WETH">WETH - Wrapped Ether</option>
                        <option value="WBTC">WBTC - Wrapped Bitcoin</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-300 block mb-2">Collateral Amount</label>
                      <input
                        type="number"
                        value={mintAmount}
                        onChange={(e) => setMintAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-gray-800 border border-gray-600 rounded-xl p-4 text-white"
                      />
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                      <div className="flex justify-between text-gray-400 mb-2">
                        <span>Collateral Ratio</span>
                        <span className="text-emerald-400">150% (min)</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>AXUSD to Receive</span>
                        <span className="text-white font-bold">{mintAmount ? (parseFloat(mintAmount) * 2000 / 1.5).toFixed(2) : '0.00'} AXUSD</span>
                      </div>
                    </div>
                    <button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-bold py-4 rounded-xl hover:opacity-90 transition-opacity">
                      Connect Wallet to Mint
                    </button>
                  </div>
                </div>
              </GlassCard>
            )}

            {activeTab === 'psm' && (
              <GlassCard borderColor="border-blue-500/30">
                <div className="p-8">
                  <h3 className="text-blue-400 font-bold mb-6 text-2xl">Peg Stability Module</h3>
                  <div className="max-w-xl mx-auto space-y-6">
                    <div className="flex gap-4 justify-center mb-6">
                      <button
                        onClick={() => setPsmDirection('usdcToAxusd')}
                        className={`px-6 py-3 rounded-xl font-medium transition-all ${psmDirection === 'usdcToAxusd' ? 'bg-blue-500 text-black' : 'bg-gray-800 text-gray-300'}`}
                      >
                        USDC → AXUSD
                      </button>
                      <button
                        onClick={() => setPsmDirection('axusdToUsdc')}
                        className={`px-6 py-3 rounded-xl font-medium transition-all ${psmDirection === 'axusdToUsdc' ? 'bg-blue-500 text-black' : 'bg-gray-800 text-gray-300'}`}
                      >
                        AXUSD → USDC
                      </button>
                    </div>
                    <div>
                      <label className="text-gray-300 block mb-2">{psmDirection === 'usdcToAxusd' ? 'USDC Amount' : 'AXUSD Amount'}</label>
                      <input
                        type="number"
                        value={psmAmount}
                        onChange={(e) => setPsmAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-gray-800 border border-gray-600 rounded-xl p-4 text-white"
                      />
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                      <div className="flex justify-between text-gray-400 mb-2">
                        <span>Exchange Rate</span>
                        <span className="text-white">1:1</span>
                      </div>
                      <div className="flex justify-between text-gray-400 mb-2">
                        <span>Fee (0.1%)</span>
                        <span className="text-amber-400">{psmAmount ? (parseFloat(psmAmount) * 0.001).toFixed(4) : '0.00'}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>You Receive</span>
                        <span className="text-white font-bold">{psmAmount ? (parseFloat(psmAmount) * 0.999).toFixed(4) : '0.00'} {psmDirection === 'usdcToAxusd' ? 'AXUSD' : 'USDC'}</span>
                      </div>
                    </div>
                    <button className="w-full bg-gradient-to-r from-blue-500 to-teal-500 text-black font-bold py-4 rounded-xl hover:opacity-90 transition-opacity">
                      Connect Wallet to Swap
                    </button>
                  </div>
                </div>
              </GlassCard>
            )}

            {activeTab === 'liquidity' && (
              <GlassCard borderColor="border-purple-500/30">
                <div 
                  className="relative rounded-t-2xl overflow-hidden h-32"
                  style={{ backgroundImage: `url(${liquidityPoolImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900" />
                </div>
                <div className="p-8">
                  <h3 className="text-purple-400 font-bold mb-6 text-2xl">Add Liquidity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="text-center p-4 bg-gray-800/50 rounded-xl">
                      <div className="text-2xl font-bold text-purple-400">${formatNumber(lpData?.totalLiquidity || '0')}</div>
                      <div className="text-gray-400">Total Liquidity</div>
                    </div>
                    <div className="text-center p-4 bg-gray-800/50 rounded-xl">
                      <div className="text-2xl font-bold text-emerald-400">{lpAnalytics?.metrics?.apr || '0'}%</div>
                      <div className="text-gray-400">Current APR</div>
                    </div>
                    <div className="text-center p-4 bg-gray-800/50 rounded-xl">
                      <div className="text-2xl font-bold text-amber-400">${lpAnalytics?.metrics?.dailyFees || '0'}</div>
                      <div className="text-gray-400">Daily Fees</div>
                    </div>
                  </div>
                  <div className="max-w-xl mx-auto space-y-4">
                    <div>
                      <label className="text-gray-300 block mb-2">AXUSD Amount</label>
                      <input
                        type="number"
                        value={lpAxusdAmount}
                        onChange={(e) => { setLpAxusdAmount(e.target.value); setLpUsdcAmount(e.target.value); }}
                        placeholder="0.00"
                        className="w-full bg-gray-800 border border-gray-600 rounded-xl p-4 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 block mb-2">USDC Amount</label>
                      <input
                        type="number"
                        value={lpUsdcAmount}
                        onChange={(e) => { setLpUsdcAmount(e.target.value); setLpAxusdAmount(e.target.value); }}
                        placeholder="0.00"
                        className="w-full bg-gray-800 border border-gray-600 rounded-xl p-4 text-white"
                      />
                    </div>
                    <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 rounded-xl hover:opacity-90 transition-opacity">
                      Connect Wallet to Add Liquidity
                    </button>
                  </div>
                </div>
              </GlassCard>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <GlassCard borderColor="border-emerald-500/30">
                    <div className="p-6 text-center">
                      <div className="text-2xl font-bold text-emerald-400">${formatNumber(lpAnalytics?.pool?.tvl || '0')}</div>
                      <div className="text-gray-400">Pool TVL</div>
                    </div>
                  </GlassCard>
                  <GlassCard borderColor="border-teal-500/30">
                    <div className="p-6 text-center">
                      <div className="text-2xl font-bold text-teal-400">{lpAnalytics?.metrics?.apr || '0'}%</div>
                      <div className="text-gray-400">APR</div>
                    </div>
                  </GlassCard>
                  <GlassCard borderColor="border-blue-500/30">
                    <div className="p-6 text-center">
                      <div className="text-2xl font-bold text-blue-400">${lpAnalytics?.metrics?.dailyFees || '0'}</div>
                      <div className="text-gray-400">Daily Fees</div>
                    </div>
                  </GlassCard>
                  <GlassCard borderColor="border-purple-500/30">
                    <div className="p-6 text-center">
                      <div className="text-2xl font-bold text-purple-400">${formatNumber(lpAnalytics?.metrics?.annualFees || '0')}</div>
                      <div className="text-gray-400">Annual Fees</div>
                    </div>
                  </GlassCard>
                </div>
                <GlassCard borderColor="border-gray-600/30">
                  <div className="p-6">
                    <h3 className="text-white font-bold mb-4 text-xl">Pool Reserves</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="text-center p-6 bg-gray-800/50 rounded-xl">
                        <div className="text-3xl font-bold text-emerald-400">{formatNumber(lpAnalytics?.pool?.axusdReserve || '0')}</div>
                        <div className="text-gray-400">AXUSD Reserve</div>
                      </div>
                      <div className="text-center p-6 bg-gray-800/50 rounded-xl">
                        <div className="text-3xl font-bold text-blue-400">{formatNumber(lpAnalytics?.pool?.usdcReserve || '0')}</div>
                        <div className="text-gray-400">USDC Reserve</div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === 'treasury' && (
              <div className="space-y-6">
                <div 
                  className="relative rounded-2xl overflow-hidden h-48 mb-8"
                  style={{ backgroundImage: `url(${treasuryVaultImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 to-transparent" />
                  <div className="relative z-10 p-8 h-full flex flex-col justify-center">
                    <h2 className="text-3xl font-bold text-white mb-2">Treasury Health</h2>
                    <p className="text-gray-300">Real-time reserve backing and protocol health metrics</p>
                    <div className="mt-4">
                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${treasuryHealth?.overview?.geniusCompliant ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        <span>{treasuryHealth?.overview?.geniusCompliant ? '✓' : '✗'}</span>
                        GENIUS Act {treasuryHealth?.overview?.geniusCompliant ? 'Compliant' : 'Non-Compliant'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <GlassCard borderColor="border-emerald-500/30" glow>
                    <div className="p-6 text-center">
                      <div className="text-3xl font-bold text-emerald-400">{treasuryHealth?.overview?.reserveRatio || '100'}%</div>
                      <div className="text-gray-400">Reserve Ratio</div>
                    </div>
                  </GlassCard>
                  <GlassCard borderColor="border-teal-500/30">
                    <div className="p-6 text-center">
                      <div className="text-2xl font-bold text-teal-400">${formatNumber(treasuryHealth?.reserves?.psmUsdc || '0')}</div>
                      <div className="text-gray-400">PSM USDC</div>
                    </div>
                  </GlassCard>
                  <GlassCard borderColor="border-blue-500/30">
                    <div className="p-6 text-center">
                      <div className="text-2xl font-bold text-blue-400">${formatNumber(treasuryHealth?.reserves?.backstopUsdc || '0')}</div>
                      <div className="text-gray-400">Backstop USDC</div>
                    </div>
                  </GlassCard>
                  <GlassCard borderColor="border-amber-500/30">
                    <div className="p-6 text-center">
                      <div className="text-2xl font-bold text-amber-400">{treasuryHealth?.overview?.healthScore || 0}/100</div>
                      <div className="text-gray-400">Health Score</div>
                    </div>
                  </GlassCard>
                </div>

                <GlassCard borderColor="border-amber-500/30">
                  <div className="p-6">
                    <h3 className="text-amber-400 font-bold mb-4 text-xl">Stress Test Scenarios</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {treasuryHealth?.stressTests && Object.entries(treasuryHealth.stressTests).map(([key, test]) => (
                        <div key={key} className={`rounded-xl p-4 ${test.canHandle ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                          <h4 className={`font-bold mb-2 ${test.canHandle ? 'text-emerald-400' : 'text-red-400'}`}>{test.name}</h4>
                          <p className="text-gray-400 text-sm mb-2">Status: {test.canHandle ? 'Can Handle' : 'At Risk'}</p>
                          <p className="text-white font-bold">New Ratio: {test.newReserveRatio.toFixed(1)}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}

            {activeTab === 'vaults' && (
              <GlassCard borderColor="border-purple-500/30">
                <div className="p-8 text-center">
                  <Web3Icon icon="$" size="lg" color="text-purple-400" />
                  <h3 className="text-2xl font-bold text-white mt-6 mb-2">My Vaults</h3>
                  <p className="text-gray-400 mb-6">Connect your wallet to view and manage your AXUSD vaults</p>
                  <button 
                    onClick={() => setActiveTab('mint')}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Create Your First Vault
                  </button>
                </div>
              </GlassCard>
            )}

            {activeTab === 'earn' && (
              <div className="space-y-6">
                <GlassCard borderColor="border-amber-500/30">
                  <div className="p-8">
                    <h3 className="text-amber-400 font-bold mb-6 text-2xl">SEED Yield Distribution</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-800/50 rounded-xl p-6">
                        <h4 className="font-bold text-white mb-4 text-lg">How to Earn</h4>
                        <ol className="space-y-3 text-gray-300">
                          <li className="flex items-start gap-3">
                            <span className="text-emerald-400 font-bold">1.</span>
                            Lock AXM tokens in SEED contract
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="text-emerald-400 font-bold">2.</span>
                            Receive voting power proportional to lock duration
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="text-emerald-400 font-bold">3.</span>
                            Claim AXUSD yield every week
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="text-emerald-400 font-bold">4.</span>
                            50% of all protocol revenue goes to SEED holders
                          </li>
                        </ol>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-6">
                        <h4 className="font-bold text-white mb-4 text-lg">Current Epoch</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Epoch</span>
                            <span className="text-white font-bold">1</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total Revenue</span>
                            <span className="text-emerald-400 font-bold">0 AXUSD</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Your SEED Balance</span>
                            <span className="text-white">0 SEED</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Estimated Yield</span>
                            <span className="text-amber-400 font-bold">0 AXUSD</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard borderColor="border-emerald-500/30">
                  <div className="p-6">
                    <h3 className="text-emerald-400 font-bold mb-6 text-xl">AXUSD Use Cases</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { icon: 'O', title: 'SUSU Circles', desc: 'Join savings circles denominated in AXUSD for stable, predictable savings', color: 'blue' },
                        { icon: 'K', title: 'KeyGrow Housing', desc: 'Pay rent in AXUSD and build equity toward home ownership', color: 'purple' },
                        { icon: '$', title: 'DeFi Liquidity', desc: 'Provide liquidity in AXUSD pools on Camelot DEX', color: 'amber' },
                      ].map((item, i) => (
                        <div key={i} className="text-center p-6 bg-gray-800/50 rounded-xl">
                          <Web3Icon icon={item.icon} size="lg" color={`text-${item.color}-400`} />
                          <h4 className="font-bold text-white mt-4 mb-2">{item.title}</h4>
                          <p className="text-gray-400 text-sm">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
