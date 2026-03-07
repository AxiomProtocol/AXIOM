import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useWallet } from "../components/WalletConnect/WalletContext";
import { getAXUSDTransactionService, AXUSD_CONTRACTS } from "../lib/services/AXUSDTransactionService";
import { DesignLawLayout } from "../components/design-law";
import { 
  LayoutDashboard, Coins, ArrowLeftRight, Droplets, CircleDot,
  BarChart3, Vault, Gift, Waypoints, History, Bell, HelpCircle,
  Shield, CheckCircle, Globe, Lock, DollarSign, Wallet, TrendingUp,
  Zap, ExternalLink, AlertTriangle, Settings, ChevronDown, ChevronUp,
  Layers, Building, PiggyBank, Award
} from "lucide-react";

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

const AXUSD_CONTRACT_LIST: Record<string, string> = {
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

const TAB_CONFIG: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'mint', label: 'Mint', icon: <Coins className="w-4 h-4" /> },
  { id: 'psm', label: 'PSM', icon: <ArrowLeftRight className="w-4 h-4" /> },
  { id: 'liquidity', label: 'Liquidity', icon: <Droplets className="w-4 h-4" /> },
  { id: 'pools', label: 'Pools', icon: <CircleDot className="w-4 h-4" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'treasury', label: 'Treasury', icon: <Vault className="w-4 h-4" /> },
  { id: 'incentives', label: 'Rewards', icon: <Gift className="w-4 h-4" /> },
  { id: 'bridge', label: 'Bridge', icon: <Waypoints className="w-4 h-4" /> },
  { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
  { id: 'alerts', label: 'Alerts', icon: <Bell className="w-4 h-4" /> },
  { id: 'faq', label: 'FAQ', icon: <HelpCircle className="w-4 h-4" /> },
];

const FAQ_DATA = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "What is AXUSD?",
        a: "AXUSD is Axiom Protocol's hybrid CDP stablecoin, designed to maintain a 1:1 peg with the US Dollar. It is backed by a combination of crypto collateral (ETH, BTC), USDC reserves, and real-world assets like T-Bills. AXUSD is designed to align with the GENIUS Act framework for payment stablecoins."
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
        q: "How does AXUSD align with the GENIUS Act?",
        a: "AXUSD is designed to implement key safeguards aligned with the GENIUS Act framework: 100%+ reserve ratio target, segregated custody of reserves, 93-day maximum maturity for T-Bill holdings, anti-rehypothecation controls, and on-chain reserve verification."
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
        a: "There are multiple ways: 1) Lock AXM in SEED to earn 50% of protocol revenue, 2) Provide liquidity to earn trading fees + AXM rewards, 3) Join Wealth Practice circles for group savings benefits."
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
  const { walletState, connectMetaMask, switchToArbitrum } = useWallet();
  const isWalletConnected = walletState?.isConnected && walletState?.address;
  const isCorrectNetwork = walletState?.chainId === 42161;
  const [networkSwitching, setNetworkSwitching] = useState(false);

  const handleSwitchNetwork = async () => {
    if (networkSwitching) return;
    setNetworkSwitching(true);
    try {
      await switchToArbitrum();
      setTxStatus({ type: 'success', message: 'Switched to Arbitrum One!' });
    } catch (error: any) {
      setTxStatus({ type: 'error', message: error.message || 'Failed to switch network' });
    } finally {
      setNetworkSwitching(false);
    }
  };
  
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
  const [txPending, setTxPending] = useState(false);
  const [txStatus, setTxStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const handleAddLiquidity = async () => {
    if (txPending) return;
    
    const axusdVal = parseFloat(lpAxusdAmount) || 0;
    const usdcVal = parseFloat(lpUsdcAmount) || 0;
    
    if (axusdVal <= 0 || usdcVal <= 0) {
      setTxStatus({ type: 'error', message: 'Please enter amounts for both AXUSD and USDC' });
      return;
    }
    
    setTxPending(true);
    setTxStatus({ type: null, message: '' });
    
    try {
      const service = await getAXUSDTransactionService();
      if (!service) {
        setTxStatus({ type: 'error', message: 'Wallet not connected. Please connect your wallet first.' });
        setTxPending(false);
        return;
      }
      
      const result = await service.addLiquidity(lpAxusdAmount, lpUsdcAmount);
      
      if (result.success) {
        setTxStatus({ type: 'success', message: `Liquidity added successfully! Tx: ${result.txHash?.slice(0, 10)}...` });
        setLpAxusdAmount('');
        setLpUsdcAmount('');
      } else {
        setTxStatus({ type: 'error', message: result.error || 'Transaction failed' });
      }
    } catch (error: any) {
      setTxStatus({ type: 'error', message: error.message || 'Transaction failed' });
    } finally {
      setTxPending(false);
    }
  };

  const handleSwap = async () => {
    if (txPending) return;
    
    const amount = parseFloat(psmAmount) || 0;
    if (amount <= 0) {
      setTxStatus({ type: 'error', message: 'Please enter an amount to swap' });
      return;
    }

    if (walletState?.chainId !== 42161) {
      setTxStatus({ type: 'error', message: 'Please switch to Arbitrum One to swap. Use the "Switch to Arbitrum" button above.' });
      return;
    }
    
    setTxPending(true);
    setTxStatus({ type: null, message: '' });
    
    try {
      const service = await getAXUSDTransactionService();
      if (!service) {
        setTxStatus({ type: 'error', message: 'Wallet not connected. Please connect your wallet first.' });
        setTxPending(false);
        return;
      }
      
      const result = psmDirection === 'usdcToAxusd' 
        ? await service.psmMint(psmAmount)
        : await service.psmRedeem(psmAmount);
      
      if (result.success) {
        setTxStatus({ type: 'success', message: `Swap completed! Tx: ${result.txHash?.slice(0, 10)}...` });
        setPsmAmount('');
      } else {
        setTxStatus({ type: 'error', message: result.error || 'Swap failed' });
      }
    } catch (error: any) {
      setTxStatus({ type: 'error', message: error.message || 'Swap failed' });
    } finally {
      setTxPending(false);
    }
  };

  const handleMint = async () => {
    setTxStatus({ type: 'error', message: 'CDP minting is coming soon. Use the PSM swap to acquire AXUSD for now.' });
  };

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

  const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-dl-bg border border-dl-border ${className}`}>
      {children}
    </div>
  );

  const StatCard = ({ label, value, suffix, icon }: { label: string; value: string; suffix: string; icon: React.ReactNode; color?: string }) => {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 flex items-center justify-center border border-dl-border bg-dl-bg-alt text-dl-navy">
            {icon}
          </div>
          <span className="text-dl-gray font-medium">{label}</span>
        </div>
        <div className="font-dl-mono text-2xl text-dl-navy">
          {loading ? <span className="text-dl-gray text-sm font-dl-mono">Loading...</span> : `${formatNumber(value)} ${suffix}`}
        </div>
      </Card>
    );
  };

  return (
    <DesignLawLayout>
      <Head>
        <title>AXUSD Stablecoin | Axiom Protocol</title>
        <meta name="description" content="AXUSD - A hybrid CDP stablecoin designed to align with the GENIUS Act framework. Reserve-backed, segregated custody, cross-chain enabled. The settlement layer of Axiom Protocol." />
      </Head>
      
      <div className="border border-dl-border bg-dl-bg-alt px-4 py-3 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-dl-navy">AXUSD has been unified under ERC-3643 (T-REX)</p>
            <p className="text-xs text-dl-gray mt-1">
              The dual-ecosystem (Primary + Euler) has been replaced by a single compliant token with on-chain identity and modular compliance.
            </p>
          </div>
          <a
            href="/axusd-3643"
            className="bg-dl-navy text-white px-4 py-1.5 text-sm flex-shrink-0"
          >
            View Unified AXUSD
          </a>
        </div>
      </div>

      {isWalletConnected && !isCorrectNetwork && (
        <div className="bg-dl-navy text-white px-4 py-4 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-medium text-lg">Wrong Network Detected</p>
                <p className="text-sm opacity-90">
                  You're on {walletState?.chainId === 1 ? 'Ethereum Mainnet' : `Chain ${walletState?.chainId}`}. 
                  AXUSD operates on Arbitrum One.
                </p>
              </div>
            </div>
            <button
              onClick={handleSwitchNetwork}
              disabled={networkSwitching}
              className="bg-white text-dl-navy px-6 py-3 font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {networkSwitching ? (
                <>Switching...</>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Switch to Arbitrum One
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      <section className="py-16 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-12">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-dl-bg-alt border border-dl-border px-5 py-2 mb-6">
              <Shield className="w-4 h-4 text-dl-navy" />
              <span className="text-dl-navy font-medium text-sm tracking-wide">DESIGNED TO ALIGN WITH GENIUS ACT</span>
            </div>
            
            <h1 className="font-dl-serif text-5xl md:text-6xl mb-4 text-dl-navy">
              AXUSD
            </h1>
            
            <p className="text-xl md:text-2xl text-dl-gray font-light mb-6">
              The Settlement Layer of <span className="text-dl-forest font-medium">Axiom Protocol</span>
            </p>
            
            <p className="text-lg text-dl-gray max-w-xl mb-8 leading-relaxed">
              A <span className="text-dl-forest font-medium">100% backed hybrid stablecoin</span> with segregated custody, 
              cross-chain bridging, and designed to align with the GENIUS Act framework.
            </p>

            <div className="flex flex-wrap justify-center lg:justify-start gap-3 text-sm mb-8">
              {[
                { icon: <CheckCircle className="w-4 h-4" />, text: '100% Reserve Backed' },
                { icon: <Shield className="w-4 h-4" />, text: 'GENIUS Act Aligned' },
                { icon: <Globe className="w-4 h-4" />, text: 'Cross-Chain Enabled' },
                { icon: <Lock className="w-4 h-4" />, text: 'Segregated Custody' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-dl-bg border border-dl-border px-4 py-2">
                  <span className="text-dl-navy">{item.icon}</span>
                  <span className="text-dl-navy font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative">
              <Image
                src={axusdHeroImage}
                alt="AXUSD Stablecoin"
                width={500}
                height={500}
                className="w-auto h-auto"
                priority
              />
              <div className="absolute -bottom-4 -right-4 bg-dl-bg p-4 border border-dl-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-dl-navy flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-dl-gray">Current Price</p>
                    <p className="text-lg font-dl-mono text-dl-navy">${parseFloat(pegStatus?.currentPrice || '1').toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-10 px-2">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 font-medium flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-dl-navy text-white'
                  : 'bg-dl-bg-alt text-dl-gray border border-dl-border'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard label="Total Supply" value={supplyData?.totalSupply || '0'} suffix="AXUSD" icon={<DollarSign className="w-5 h-5" />} />
              <StatCard label="Circulating" value={supplyData?.circulatingSupply || '0'} suffix="AXUSD" icon={<Coins className="w-5 h-5" />} />
              <StatCard label="Reserve Ratio" value={treasuryHealth?.overview?.reserveRatio || '100'} suffix="%" icon={<Shield className="w-5 h-5" />} />
              <StatCard label="PSM Reserve" value={psmData?.usdcReserve || '0'} suffix="USDC" icon={<Wallet className="w-5 h-5" />} />
            </div>

            <Card className="p-8">
              <h3 className="font-dl-serif text-dl-navy mb-8 text-2xl flex items-center gap-3">
                How AXUSD Works
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                  { step: 1, title: 'Deposit Collateral', desc: 'Lock WETH or WBTC at 150% ratio' },
                  { step: 2, title: 'Mint AXUSD', desc: 'Create stablecoin against your collateral' },
                  { step: 3, title: 'Use Anywhere', desc: 'Wealth Practice circles, KeyGrow rent, DeFi' },
                  { step: 4, title: 'Earn Yield', desc: 'Lock SEED for protocol revenue share' },
                ].map((item) => (
                  <div key={item.step} className="text-center">
                    <div className="w-16 h-16 mx-auto bg-dl-bg-alt flex items-center justify-center mb-4 border border-dl-border">
                      <span className="font-dl-mono text-3xl text-dl-navy">{item.step}</span>
                    </div>
                    <h4 className="font-dl-serif text-dl-navy mb-2">{item.title}</h4>
                    <p className="text-dl-gray text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-dl-navy font-dl-serif mb-4 text-xl flex items-center gap-2">
                  <Shield className="w-5 h-5" /> GENIUS Act Compliance
                </h3> 
                <div className="space-y-3">
                  {[
                    { text: '100% Reserve Backing Required', icon: <CheckCircle className="w-4 h-4" /> },
                    { text: 'Segregated Custody Accounts', icon: <Lock className="w-4 h-4" /> },
                    { text: '93-Day Maximum T-Bill Maturity', icon: <Building className="w-4 h-4" /> },
                    { text: 'Anti-Rehypothecation Controls', icon: <Shield className="w-4 h-4" /> },
                    { text: 'Real-Time On-Chain Verification', icon: <Zap className="w-4 h-4" /> },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-dl-bg-alt border border-dl-border">
                      <span className="text-dl-forest">{item.icon}</span>
                      <span className="text-dl-navy">{item.text}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-dl-navy font-dl-serif mb-4 text-xl flex items-center gap-2">
                  Revenue Distribution
                </h3>
                <div className="space-y-4">
                  {[
                    { label: 'SEED Holders', value: '50%' },
                    { label: 'Treasury', value: '30%' },
                    { label: 'Backstop Vault', value: '20%' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-dl-bg-alt border border-dl-border">
                      <span className="text-dl-navy">{item.label}</span>
                      <span className="text-dl-navy font-dl-mono text-lg">{item.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-dl-navy font-dl-serif mb-4 text-xl">Deployed Contracts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(AXUSD_CONTRACT_LIST).map(([name, addr]) => (
                  <a
                    key={name}
                    href={`https://arbiscan.io/address/${addr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-dl-bg-alt border border-dl-border"
                  >
                    <span className="text-dl-navy text-sm">{name}</span>
                    <span className="text-dl-forest text-xs font-dl-mono">{truncateAddress(addr)}</span>
                  </a>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'pools' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="p-6 text-center">
                <div className="font-dl-mono text-3xl text-dl-navy">{poolData?.summary?.totalPools || 0}</div>
                <div className="text-dl-gray">Total Pools</div>
              </Card>
              <Card className="p-6 text-center">
                <div className="font-dl-mono text-3xl text-dl-forest">{poolData?.summary?.activePools || 0}</div>
                <div className="text-dl-gray">Active Pools</div>
              </Card>
              <Card className="p-6 text-center">
                <div className="font-dl-mono text-3xl text-dl-navy">${poolData?.summary?.totalTvl || '0'}</div>
                <div className="text-dl-gray">Total TVL</div>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-dl-navy font-dl-serif mb-6 text-xl">Available Pools</h3>
              <div className="space-y-4">
                {poolData?.pools?.map((pool) => (
                  <div key={pool.id} className="flex items-center justify-between p-4 bg-dl-bg-alt border border-dl-border">
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-2">
                        <div className="w-10 h-10 bg-dl-bg-alt border-2 border-dl-bg flex items-center justify-center text-dl-navy font-dl-mono">$</div>
                        <div className="w-10 h-10 bg-dl-bg-alt border-2 border-dl-bg flex items-center justify-center text-dl-navy font-dl-mono">{pool.token1Symbol?.charAt(0)}</div>
                      </div>
                      <div>
                        <div className="font-medium text-dl-navy">{pool.name}</div>
                        <div className="text-sm text-dl-gray">{pool.dex}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-dl-mono text-dl-navy">${formatNumber(pool.tvl)}</div>
                      <div className={`text-sm flex items-center justify-end gap-1 ${pool.status === 'active' ? 'text-dl-forest' : 'text-dl-gray'}`}>
                        {pool.status === 'active' ? <><CheckCircle className="w-3 h-3" /> Live</> : <><CircleDot className="w-3 h-3" /> Pending</>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'incentives' && (
          <div className="space-y-6">
            <Card className="p-8">
              <h3 className="text-dl-navy font-dl-serif mb-6 text-2xl flex items-center gap-3">
                LP Incentive Programs
              </h3>
              <p className="text-dl-gray mb-8">
                Early liquidity providers receive bonus AXM rewards based on their contribution timing and lock duration.
              </p>

              {incentiveData?.activePrograms?.map((program) => (
                <div key={program.id} className="bg-dl-bg-alt p-6 border border-dl-border mb-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                      <h4 className="text-xl font-dl-serif text-dl-navy">{program.name}</h4>
                      <p className="text-dl-gray">Reward Token: {program.rewardToken}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-dl-mono text-dl-navy">{program.bonusMultiplier}x</div>
                      <div className="text-dl-gray">Multiplier</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-dl-bg p-4 text-center border border-dl-border">
                      <div className="text-lg font-dl-mono text-dl-forest">{formatNumber(program.rewards.total)}</div>
                      <div className="text-dl-gray text-sm">Total Rewards</div>
                    </div>
                    <div className="bg-dl-bg p-4 text-center border border-dl-border">
                      <div className="text-lg font-dl-mono text-dl-navy">{formatNumber(program.rewards.remaining)}</div>
                      <div className="text-dl-gray text-sm">Remaining</div>
                    </div>
                    <div className="bg-dl-bg p-4 text-center border border-dl-border">
                      <div className="text-lg font-dl-mono text-dl-navy">{program.rewards.daily}</div>
                      <div className="text-dl-gray text-sm">Daily Rate</div>
                    </div>
                    <div className="bg-dl-bg p-4 text-center border border-dl-border">
                      <div className="text-lg font-dl-mono text-dl-navy">{program.duration.remainingDays}</div>
                      <div className="text-dl-gray text-sm">Days Left</div>
                    </div>
                  </div>
                </div>
              ))}

              <h4 className="text-dl-navy font-dl-serif mb-4 text-lg">Bonus Tiers</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {incentiveData?.bonusTiers?.map((tier) => (
                  <div key={tier.tier} className={`p-4 text-center ${tier.tier === 1 ? 'bg-dl-bg-alt border-2 border-dl-navy' : 'bg-dl-bg-alt border border-dl-border'}`}>
                    <div className="text-2xl font-dl-mono text-dl-navy">{tier.multiplier}x</div>
                    <div className="text-dl-gray text-sm">{tier.description}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-dl-navy font-dl-serif mb-4 text-xl">Lock Duration Benefits</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { days: '30 days', multiplier: '1.25x' },
                  { days: '90 days', multiplier: '1.5x' },
                  { days: '180 days', multiplier: '2.0x' },
                ].map((lock, i) => (
                  <div key={i} className="p-6 text-center bg-dl-bg-alt border border-dl-border">
                    <div className="text-3xl font-dl-mono text-dl-navy mb-2">{lock.multiplier}</div>
                    <div className="text-dl-gray">{lock.days} lock</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'bridge' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2">
                <div className="bg-dl-bg-alt border border-dl-border p-4">
                  <div className="flex items-center gap-3">                        
                    <AlertTriangle className="w-6 h-6 text-dl-navy" />
                    <p className="text-dl-navy">Bridge transactions are irreversible. Please verify destination addresses carefully before proceeding.</p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <Image
                  src={bridgeImage}
                  alt="Cross-Chain Bridge"
                  width={400}
                  height={200}
                  className="w-full h-40 object-cover"
                  style={{ width: '100%', height: 'auto' }}
                />
              </div>
            </div>

            <Card className="p-6">
              <h3 className="text-dl-navy font-dl-serif mb-6 text-xl flex items-center gap-2">
                Available Bridge Routes
              </h3>
              <div className="space-y-4">
                {bridgeData?.routes?.map((route) => (
                  <div key={route.id} className="flex flex-wrap items-center justify-between p-4 bg-dl-bg-alt border border-dl-border gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-dl-bg-alt flex items-center justify-center text-dl-navy font-dl-mono border border-dl-border">A</div>
                        <span className="text-dl-gray">→</span>
                        <div className="w-10 h-10 bg-dl-bg-alt flex items-center justify-center text-dl-navy font-dl-mono border border-dl-border">{route.destination.chain.charAt(0)}</div>
                      </div>
                      <div>
                        <div className="font-medium text-dl-navy">{route.name}</div>
                        <div className="text-sm text-dl-gray">via {route.provider}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-dl-navy font-dl-mono">{route.fees.percent}% + ${route.fees.flat}</div>
                        <div className="text-dl-gray text-sm">Fee</div>
                      </div>
                      <div className="text-center">
                        <div className="text-dl-navy font-dl-mono">~{route.estimatedTime} min</div>
                        <div className="text-dl-gray text-sm">Est. Time</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-dl-navy font-dl-serif mb-4 text-xl">Supported Networks</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(bridgeData?.supportedChains || {}).map(([id, chain]) => (
                  <div key={id} className="text-center p-4 bg-dl-bg-alt border border-dl-border">
                    <div className="w-12 h-12 mx-auto mb-2 bg-dl-bg-alt flex items-center justify-center border border-dl-border">
                      <span className="text-dl-navy font-dl-mono">{chain.name.charAt(0)}</span>
                    </div>
                    <div className="text-dl-navy text-sm">{chain.name}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="p-6 text-center">
                <div className="font-dl-mono text-2xl text-dl-forest">{historyData?.growthMetrics?.supplyGrowthPercent || '0'}%</div>
                <div className="text-dl-gray">Supply Growth ({historyData?.growthMetrics?.periodDays || 30}d)</div>
              </Card>
              <Card className="p-6 text-center">
                <div className="font-dl-mono text-2xl text-dl-navy">{historyData?.growthMetrics?.tvlGrowthPercent || '0'}%</div>
                <div className="text-dl-gray">TVL Growth ({historyData?.growthMetrics?.periodDays || 30}d)</div>
              </Card>
              <Card className="p-6 text-center">
                <div className="font-dl-mono text-2xl text-dl-navy">${formatNumber(historyData?.latestSnapshot?.totalSupply || '0')}</div>
                <div className="text-dl-gray">Current Supply</div>
              </Card>
              <Card className="p-6 text-center">
                <div className="font-dl-mono text-2xl text-dl-navy">${formatNumber(historyData?.latestSnapshot?.tvl || '0')}</div>
                <div className="text-dl-gray">Current TVL</div>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-dl-navy font-dl-serif mb-6 text-xl">Historical Snapshots</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-dl-bg-alt font-dl-mono text-xs text-dl-gray uppercase border-b border-dl-border">
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
                      <tr key={i} className={`border-b border-dl-border ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
                        <td className="py-3 px-4 text-dl-navy">{snapshot.date}</td>
                        <td className="py-3 px-4 text-right font-dl-mono text-dl-navy">${formatNumber(snapshot.totalSupply)}</td>
                        <td className="py-3 px-4 text-right font-dl-mono text-dl-forest">${formatNumber(snapshot.reserves)}</td>
                        <td className="py-3 px-4 text-right font-dl-mono text-dl-navy">{snapshot.reserveRatio.toFixed(1)}%</td>
                        <td className="py-3 px-4 text-right font-dl-mono text-dl-navy">${snapshot.pegPrice.toFixed(4)}</td>
                        <td className="py-3 px-4 text-right font-dl-mono text-dl-navy">${formatNumber(snapshot.tvl)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <Card className="p-8">
              <h3 className="text-dl-navy font-dl-serif mb-6 text-2xl flex items-center gap-3">
                Alert Configuration
              </h3>
              <p className="text-dl-gray mb-8">
                Set up notifications to stay informed about important AXUSD protocol events and thresholds.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {alertTypes.map((alert) => (
                  <div key={alert.type} className="bg-dl-bg-alt p-5 border border-dl-border">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-dl-bg-alt flex items-center justify-center text-dl-navy border border-dl-border">
                        {alert.type === 'peg_deviation' && <TrendingUp className="w-5 h-5" />}
                        {alert.type === 'reserve_low' && <Shield className="w-5 h-5" />}
                        {alert.type === 'high_utilization' && <BarChart3 className="w-5 h-5" />}
                        {alert.type === 'large_mint' && <Coins className="w-5 h-5" />}
                        {alert.type === 'large_redeem' && <ArrowLeftRight className="w-5 h-5" />}
                        {alert.type === 'liquidity_change' && <Droplets className="w-5 h-5" />}
                      </div>
                      <h4 className="font-dl-serif text-dl-navy capitalize">{alert.type.replace(/_/g, ' ')}</h4>
                    </div>
                    <p className="text-dl-gray text-sm mb-4">{alert.description}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dl-gray">Default: {alert.defaultThreshold} {alert.unit}</span>
                      <button className="text-dl-navy font-medium">Configure</button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-dl-navy font-dl-serif mb-4 text-xl">How Alerts Work</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { step: 1, title: 'Choose Alert Type', desc: 'Select from peg deviation, reserve, utilization, or transaction alerts' },
                  { step: 2, title: 'Set Threshold', desc: 'Define your personal threshold values for each alert type' },
                  { step: 3, title: 'Get Notified', desc: 'Receive email or webhook notifications when thresholds are breached' },
                ].map((item) => (
                  <div key={item.step} className="text-center p-4">
                    <div className="w-12 h-12 mx-auto bg-dl-bg-alt flex items-center justify-center mb-3 text-dl-navy font-dl-mono text-lg border border-dl-border">{item.step}</div>
                    <h4 className="font-dl-serif text-dl-navy mb-2">{item.title}</h4>
                    <p className="text-dl-gray text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'faq' && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="font-dl-serif text-3xl text-dl-navy mb-4">Frequently Asked Questions</h2>
              <p className="text-dl-gray max-w-2xl mx-auto">
                Everything you need to know about AXUSD, from getting started to advanced features
              </p>
            </div>

            {FAQ_DATA.map((category, catIndex) => (
              <Card key={catIndex} className="p-6">
                <h3 className="text-dl-navy font-dl-serif mb-6 text-xl">{category.category}</h3>
                <div className="space-y-4">
                  {category.questions.map((faq, faqIndex) => {
                    const faqId = `${catIndex}-${faqIndex}`;
                    const isExpanded = expandedFaq === faqId;
                    return (
                      <div key={faqIndex} className="border border-dl-border overflow-hidden">
                        <button
                          onClick={() => setExpandedFaq(isExpanded ? null : faqId)}
                          className="w-full flex items-center justify-between p-4 text-left"
                        >
                          <span className="font-medium text-dl-navy">{faq.q}</span>
                          <span className={`text-dl-navy ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4">
                            <p className="text-dl-gray leading-relaxed">{faq.a}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'mint' && (
          <Card className="p-8">
            <h3 className="text-dl-navy font-dl-serif mb-6 text-2xl">Mint AXUSD</h3>
            <div className="max-w-xl mx-auto space-y-6">
              <div>
                <label className="text-dl-navy block mb-2">Collateral Type</label>
                <select 
                  value={collateralType}
                  onChange={(e) => setCollateralType(e.target.value)}
                  className="w-full bg-dl-bg-alt border border-dl-border p-4 text-dl-navy focus:outline-none"
                >
                  <option value="WETH">WETH - Wrapped Ether</option>
                  <option value="WBTC">WBTC - Wrapped Bitcoin</option>
                </select>
              </div>
              <div>
                <label className="text-dl-navy block mb-2">Collateral Amount</label>
                <input
                  type="number"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-dl-bg-alt border border-dl-border p-4 text-dl-navy focus:outline-none"
                />
              </div>
              <div className="bg-dl-bg-alt p-4 border border-dl-border">
                <div className="flex justify-between text-dl-gray mb-2">
                  <span>Collateral Ratio</span>
                  <span className="text-dl-forest font-medium font-dl-mono">150% (min)</span>
                </div>
                <div className="flex justify-between text-dl-gray">
                  <span>AXUSD to Receive</span>
                  <span className="text-dl-navy font-dl-mono">{mintAmount ? (parseFloat(mintAmount) * 2000 / 1.5).toFixed(2) : '0.00'} AXUSD</span>
                </div>
              </div>
              {txStatus.message && activeTab === 'mint' && (
                <div className={`p-4 mb-4 border ${txStatus.type === 'success' ? 'bg-dl-bg-alt border-dl-border text-dl-forest' : 'border-dl-error text-dl-error'}`}>
                  {txStatus.message}
                </div>
              )}
              {isWalletConnected ? (
                <button 
                  className={`w-full py-4 font-medium ${txPending ? 'bg-dl-bg-alt text-dl-gray border border-dl-border cursor-not-allowed' : 'bg-dl-navy text-white'}`}
                  onClick={handleMint}
                  disabled={txPending}
                >
                  {txPending ? 'Processing...' : 'Mint AXUSD'}
                </button>
              ) : (
                <button 
                  className="w-full bg-dl-navy text-white py-4 font-medium"
                  onClick={connectMetaMask}
                >
                  Connect Wallet to Mint
                </button>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'psm' && (
          <Card className="p-8">
            <h3 className="text-dl-navy font-dl-serif mb-6 text-2xl">Peg Stability Module</h3>
            <div className="max-w-xl mx-auto space-y-6">
              {isWalletConnected && walletState?.chainId === 1 && (
                <div className="bg-dl-bg-alt p-5 border border-dl-border mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-dl-bg-alt flex items-center justify-center flex-shrink-0 border border-dl-border">
                      <Waypoints className="w-5 h-5 text-dl-navy" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-dl-navy mb-1">You're on Ethereum Mainnet</h4>
                      <p className="text-dl-gray text-sm mb-3">
                        AXUSD operates on Arbitrum One. Bridge your USDC to Arbitrum first, then return here to swap.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <a
                          href="https://bridge.arbitrum.io/?destinationChain=arbitrum-one&sourceChain=ethereum"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-dl-navy text-white px-4 py-2 font-medium"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Bridge USDC to Arbitrum
                        </a>
                        <button
                          onClick={handleSwitchNetwork}
                          disabled={networkSwitching}
                          className="inline-flex items-center gap-2 bg-dl-bg text-dl-navy px-4 py-2 font-medium border border-dl-border"
                        >
                          <Zap className="w-4 h-4" />
                          {networkSwitching ? 'Switching...' : 'Switch to Arbitrum'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4 justify-center mb-6">
                <button
                  onClick={() => setPsmDirection('usdcToAxusd')}
                  className={`px-6 py-3 font-medium ${psmDirection === 'usdcToAxusd' ? 'bg-dl-navy text-white' : 'bg-dl-bg-alt text-dl-navy border border-dl-border'}`}
                >
                  USDC → AXUSD
                </button>
                <button
                  onClick={() => setPsmDirection('axusdToUsdc')}
                  className={`px-6 py-3 font-medium ${psmDirection === 'axusdToUsdc' ? 'bg-dl-navy text-white' : 'bg-dl-bg-alt text-dl-navy border border-dl-border'}`}
                >
                  AXUSD → USDC
                </button>
              </div>
              <div>
                <label className="text-dl-navy block mb-2">{psmDirection === 'usdcToAxusd' ? 'USDC Amount' : 'AXUSD Amount'}</label>
                <input
                  type="number"
                  value={psmAmount}
                  onChange={(e) => setPsmAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-dl-bg-alt border border-dl-border p-4 text-dl-navy focus:outline-none"
                />
              </div>
              <div className="bg-dl-bg-alt p-4 border border-dl-border">
                <div className="flex justify-between text-dl-gray mb-2">
                  <span>Exchange Rate</span>
                  <span className="text-dl-navy font-dl-mono">1:1</span>
                </div>
                <div className="flex justify-between text-dl-gray mb-2">
                  <span>Fee (0.1%)</span>
                  <span className="text-dl-navy font-dl-mono">{psmAmount ? (parseFloat(psmAmount) * 0.001).toFixed(4) : '0.00'}</span>
                </div>
                <div className="flex justify-between text-dl-gray">
                  <span>You Receive</span>
                  <span className="text-dl-navy font-dl-mono">{psmAmount ? (parseFloat(psmAmount) * 0.999).toFixed(4) : '0.00'} {psmDirection === 'usdcToAxusd' ? 'AXUSD' : 'USDC'}</span>
                </div>
              </div>
              {txStatus.message && activeTab === 'psm' && (
                <div className={`p-4 mb-4 border ${txStatus.type === 'success' ? 'bg-dl-bg-alt border-dl-border text-dl-forest' : 'border-dl-error text-dl-error'}`}>
                  {txStatus.message}
                </div>
              )}
              {isWalletConnected ? (
                <button 
                  className={`w-full py-4 font-medium ${txPending ? 'bg-dl-bg-alt text-dl-gray border border-dl-border cursor-not-allowed' : 'bg-dl-navy text-white'}`}
                  onClick={handleSwap}
                  disabled={txPending}
                >
                  {txPending ? 'Processing...' : `Swap ${psmDirection === 'usdcToAxusd' ? 'USDC → AXUSD' : 'AXUSD → USDC'}`}
                </button>
              ) : (
                <button 
                  className="w-full bg-dl-navy text-white py-4 font-medium"
                  onClick={connectMetaMask}
                >
                  Connect Wallet to Swap
                </button>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'liquidity' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 relative">
                <Image
                  src={liquidityPoolImage}
                  alt="Liquidity Pool"
                  width={600}
                  height={300}
                  className="w-full h-48 object-cover"
                  style={{ width: '100%', height: 'auto' }}
                />
                <div className="absolute inset-0 bg-dl-navy opacity-50" />
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="text-2xl font-dl-serif flex items-center gap-2">
                    <Droplets className="w-6 h-6" /> AXUSD/USDC Pool
                  </h3>
                  <p className="text-white/80">Provide liquidity and earn rewards</p>
                </div>
              </div>
              <Card className="p-6">
                <h4 className="font-dl-serif text-dl-navy mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-dl-forest" /> Pool Stats
                </h4>
                <div className="space-y-4">
                  <div className="p-4 bg-dl-bg-alt border border-dl-border">
                    <div className="font-dl-mono text-2xl text-dl-navy">${formatNumber(lpData?.totalLiquidity || lpAnalytics?.pool?.tvl || '0')}</div>
                    <div className="text-dl-gray text-sm">Total Liquidity</div>
                  </div>
                  <div className="p-4 bg-dl-bg-alt border border-dl-border">
                    <div className="font-dl-mono text-2xl text-dl-forest">{lpAnalytics?.metrics?.apr || '0'}%</div>
                    <div className="text-dl-gray text-sm">Current APR</div>
                  </div>
                  <div className="p-4 bg-dl-bg-alt border border-dl-border">
                    <div className="font-dl-mono text-2xl text-dl-navy">${lpAnalytics?.metrics?.dailyFees || '0'}</div>
                    <div className="text-dl-gray text-sm">Daily Fees</div>
                  </div>
                </div>
              </Card>
            </div>
            
            <Card className="p-8">
              <h3 className="text-dl-navy font-dl-serif mb-6 text-2xl flex items-center gap-2">
                <Layers className="w-6 h-6" /> Add Liquidity
              </h3>
              <div className="max-w-xl mx-auto space-y-4">
                <div>
                  <label className="text-dl-navy block mb-2">AXUSD Amount</label>
                  <input
                    type="number"
                    value={lpAxusdAmount}
                    onChange={(e) => { setLpAxusdAmount(e.target.value); setLpUsdcAmount(e.target.value); }}
                    placeholder="0.00"
                    className="w-full bg-dl-bg-alt border border-dl-border p-4 text-dl-navy focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-dl-navy block mb-2">USDC Amount</label>
                  <input
                    type="number"
                    value={lpUsdcAmount}
                    onChange={(e) => { setLpUsdcAmount(e.target.value); setLpAxusdAmount(e.target.value); }}
                    placeholder="0.00"
                    className="w-full bg-dl-bg-alt border border-dl-border p-4 text-dl-navy focus:outline-none"
                  />
                </div>
                {txStatus.message && activeTab === 'liquidity' && (
                  <div className={`p-4 mb-4 border ${txStatus.type === 'success' ? 'bg-dl-bg-alt border-dl-border text-dl-forest' : 'border-dl-error text-dl-error'}`}>
                    {txStatus.message}
                  </div>
                )}
                {isWalletConnected ? (
                  <button 
                    className={`w-full py-4 font-medium ${txPending ? 'bg-dl-bg-alt text-dl-gray border border-dl-border cursor-not-allowed' : 'bg-dl-navy text-white'}`}
                    onClick={handleAddLiquidity}
                    disabled={txPending}
                  >
                    {txPending ? 'Processing...' : 'Add Liquidity'}
                  </button>
                ) : (
                  <button 
                    className="w-full bg-dl-navy text-white py-4 font-medium"
                    onClick={connectMetaMask}
                  >
                    Connect Wallet to Add Liquidity
                  </button>
                )}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="p-6 text-center">
                <div className="font-dl-mono text-2xl text-dl-navy">${formatNumber(lpAnalytics?.pool?.tvl || '0')}</div>
                <div className="text-dl-gray">Pool TVL</div>
              </Card>
              <Card className="p-6 text-center">
                <div className="font-dl-mono text-2xl text-dl-forest">{lpAnalytics?.metrics?.apr || '0'}%</div>
                <div className="text-dl-gray">APR</div>
              </Card>
              <Card className="p-6 text-center">
                <div className="font-dl-mono text-2xl text-dl-navy">${lpAnalytics?.metrics?.dailyFees || '0'}</div>
                <div className="text-dl-gray">Daily Fees</div>
              </Card>
              <Card className="p-6 text-center">
                <div className="font-dl-mono text-2xl text-dl-navy">${formatNumber(lpAnalytics?.metrics?.annualFees || '0')}</div>
                <div className="text-dl-gray">Annual Fees</div>
              </Card>
            </div>
            <Card className="p-6">
              <h3 className="text-dl-navy font-dl-serif mb-4 text-xl">Pool Reserves</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-6 bg-dl-bg-alt border border-dl-border">
                  <div className="font-dl-mono text-3xl text-dl-navy">{formatNumber(lpAnalytics?.pool?.axusdReserve || '0')}</div>
                  <div className="text-dl-gray">AXUSD Reserve</div>
                </div>
                <div className="text-center p-6 bg-dl-bg-alt border border-dl-border">
                  <div className="font-dl-mono text-3xl text-dl-navy">{formatNumber(lpAnalytics?.pool?.usdcReserve || '0')}</div>
                  <div className="text-dl-gray">USDC Reserve</div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'treasury' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2">
                <Card className="p-6 h-full">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="font-dl-serif text-2xl text-dl-navy mb-1 flex items-center gap-3">
                        <Vault className="w-7 h-7 text-dl-navy" /> Treasury Health
                      </h2>
                      <p className="text-dl-gray">Real-time reserve backing and protocol health metrics</p>
                    </div>
                    <span className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-dl-mono ${treasuryHealth?.overview?.geniusCompliant ? 'bg-dl-bg-alt text-dl-forest border border-dl-border' : 'bg-dl-bg-alt text-dl-error border border-dl-error'}`}>
                      {treasuryHealth?.overview?.geniusCompliant ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      GENIUS Act {treasuryHealth?.overview?.geniusCompliant ? 'Compliant' : 'Non-Compliant'}
                    </span>
                  </div>
                </Card>
              </div>
              <div className="relative">
                <Image
                  src={treasuryVaultImage}
                  alt="Treasury Vault"
                  width={400}
                  height={300}
                  className="w-full h-48 object-cover"
                  style={{ width: '100%', height: 'auto' }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="p-6 text-center">
                <div className="font-dl-mono text-3xl text-dl-forest">{treasuryHealth?.overview?.reserveRatio || '100'}%</div>
                <div className="text-dl-gray">Reserve Ratio</div>
              </Card>
              <Card className="p-6 text-center">
                <div className="font-dl-mono text-2xl text-dl-navy">${formatNumber(treasuryHealth?.reserves?.psmUsdc || '0')}</div>
                <div className="text-dl-gray">PSM USDC</div>
              </Card>
              <Card className="p-6 text-center">
                <div className="font-dl-mono text-2xl text-dl-navy">${formatNumber(treasuryHealth?.reserves?.backstopUsdc || '0')}</div>
                <div className="text-dl-gray">Backstop USDC</div>
              </Card>
              <Card className="p-6 text-center">
                <div className="font-dl-mono text-2xl text-dl-navy">{treasuryHealth?.overview?.healthScore || 0}/100</div>
                <div className="text-dl-gray">Health Score</div>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-dl-navy font-dl-serif mb-4 text-xl">Stress Test Scenarios</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {treasuryHealth?.stressTests && Object.entries(treasuryHealth.stressTests).map(([key, test]) => (
                  <div key={key} className={`p-4 border ${test.canHandle ? 'bg-dl-bg-alt border-dl-border' : 'bg-dl-bg-alt border-dl-error'}`}>
                    <h4 className={`font-dl-serif mb-2 ${test.canHandle ? 'text-dl-forest' : 'text-dl-error'}`}>{test.name}</h4>
                    <p className="text-dl-gray text-sm mb-2">Status: {test.canHandle ? 'Can Handle' : 'At Risk'}</p>
                    <p className="text-dl-navy font-dl-mono">New Ratio: {test.newReserveRatio.toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'vaults' && (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 mx-auto bg-dl-bg-alt flex items-center justify-center text-3xl text-dl-navy border border-dl-border">$</div>
            <h3 className="font-dl-serif text-2xl text-dl-navy mt-6 mb-2">My Vaults</h3>
              <p className="text-dl-gray mb-6">Connect wallet to view and manage AXUSD vaults</p>
            <button 
              onClick={() => setActiveTab('mint')}
              className="bg-dl-navy text-white font-medium px-8 py-4"
            >
              Create Your First Vault
            </button>
          </Card>
        )}

        {activeTab === 'earn' && (
          <div className="space-y-6">
            <Card className="p-8">
              <h3 className="text-dl-navy font-dl-serif mb-6 text-2xl">SEED Yield Distribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-dl-bg-alt p-6 border border-dl-border">
                  <h4 className="font-dl-serif text-dl-navy mb-4 text-lg">How to Earn</h4>
                  <ol className="space-y-3 text-dl-navy">
                    <li className="flex items-start gap-3">
                      <span className="text-dl-forest font-dl-mono">1.</span>
                      Lock AXM tokens in SEED contract
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-dl-forest font-dl-mono">2.</span>
                      Receive voting power proportional to lock duration
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-dl-forest font-dl-mono">3.</span>
                      Claim AXUSD yield every week
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-dl-forest font-dl-mono">4.</span>
                      50% of all protocol revenue goes to SEED holders
                    </li>
                  </ol>
                </div>
                <div className="bg-dl-bg-alt p-6 border border-dl-border">
                  <h4 className="font-dl-serif text-dl-navy mb-4 text-lg">Current Epoch</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-dl-gray">Epoch</span>
                      <span className="text-dl-navy font-dl-mono">1</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dl-gray">Total Revenue</span>
                      <span className="text-dl-forest font-dl-mono">0 AXUSD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dl-gray">Your SEED Balance</span>
                      <span className="text-dl-navy font-dl-mono">0 SEED</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dl-gray">Estimated Yield</span>
                      <span className="text-dl-navy font-dl-mono">0 AXUSD</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-dl-navy font-dl-serif mb-6 text-xl">AXUSD Use Cases</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { icon: 'S', title: 'Wealth Practice Circles', desc: 'Join Wealth Practice circles denominated in AXUSD for stable, predictable savings' },
                  { icon: 'H', title: 'KeyGrow Housing', desc: 'Pay rent in AXUSD and build equity toward home ownership' },
                  { icon: 'L', title: 'DeFi Liquidity', desc: 'Provide liquidity in AXUSD pools on Camelot DEX' },
                ].map((item, i) => (
                  <div key={i} className="text-center p-6 bg-dl-bg-alt border border-dl-border">
                    <div className="w-12 h-12 mx-auto bg-dl-bg-alt flex items-center justify-center text-2xl text-dl-navy border border-dl-border">{item.icon}</div>
                    <h4 className="font-dl-serif text-dl-navy mt-4 mb-2">{item.title}</h4>
                    <p className="text-dl-gray text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </section>
    </DesignLawLayout>
  );
}
