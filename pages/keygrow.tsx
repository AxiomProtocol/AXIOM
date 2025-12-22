import { useState, useEffect } from 'react';
import { useWallet } from '../components/WalletConnect/WalletContext';
import toast, { Toaster } from 'react-hot-toast';
import { ethers } from 'ethers';
import Link from 'next/link';
import DisclosureBanner from '../components/DisclosureBanner';

interface Property {
  id: number;
  propertyId: string;
  propertyName: string;
  propertyType: string;
  city: string;
  state: string;
  totalValueUsd: string;
  totalValueAxm: string;
  monthlyRentUsd: string;
  monthlyRentAxm: string;
  minimumTermMonths: number;
  maximumTermMonths: number;
  imageUrl: string;
  description: string;
  bedrooms: number;
  bathrooms: string;
  squareFeet: number;
  yearBuilt: number;
  status: string;
  isVerified: boolean;
  estimatedValueUsd?: number;
}

interface Enrollment {
  id: number;
  enrollmentId: string;
  propertyId: number;
  agreedTermMonths: number;
  currentEquityPercent: string;
  totalPaymentsMade: number;
  totalAxmPaid: string;
  status: string;
  nextPaymentDue: string;
  targetOwnershipDate: string;
  property?: Property;
}

interface EquitySummary {
  totalEquityValueUsd: string;
  totalAxmPaid: string;
  totalPaidUsd: string;
  activeEnrollments: number;
  completedEnrollments: number;
  totalEnrollments: number;
  averageEquityPercent: string;
}

interface PortfolioItem {
  enrollmentId: string;
  propertyId: number;
  propertyName: string;
  propertyImage?: string;
  city: string;
  state: string;
  propertyValue: number;
  currentEquityPercent: number;
  equityValueUsd: number;
  totalPaymentsMade: number;
  totalAxmPaid: number;
  agreedTermMonths: number;
  monthsRemaining: number;
  completionPercent: number;
  nextPaymentDue: string;
  monthlyRentAxm: number;
  status: string;
  enrollmentDate: string;
  targetOwnershipDate: string;
}

type TabType = 'properties' | 'program-overview' | 'path-to-ownership' | 'owner-agent-benefits' | 'dpa-fund' | 'token-portfolio' | 'my-enrollments' | 'equity-tracker';

const AXM_PRICE = 0.00033;

const FEE_DISTRIBUTION = {
  maintenance: 10,
  vacancy: 5,
  tenantBooster: 3,
  treasury: 2,
  dpaFund: 5,
  owner: 75
};

const DPA_ELIGIBILITY = {
  minPayments: 18,
  minEquityPercent: 2.5,
  minStakeAxm: 25000,
  minStakeDays: 180,
  maxGrantPercent: 3,
  maxGrantAxm: 15000
};

const TOKENIZATION_CONFIG = {
  sharesPerProperty: 100000,
  sharePercentage: 0.001,
  equityBuildPercent: 20,
  ownerMaxPreMint: 49,
  tenantReserve: 51,
  secondaryFeePercent: 1.5,
  treasuryShareOfFee: 1.0,
  dpaShareOfFee: 0.5
};

const OWNERSHIP_ACCELERATORS = {
  baseEquityPercent: 20,
  stakingTiers: [
    { name: 'Bronze', minStake: 10000, multiplier: 1.0, color: 'amber' },
    { name: 'Silver', minStake: 25000, multiplier: 1.25, color: 'gray' },
    { name: 'Gold', minStake: 50000, multiplier: 1.5, color: 'yellow' },
    { name: 'Platinum', minStake: 100000, multiplier: 2.0, color: 'purple' }
  ],
  depinNodes: {
    sentry: { name: 'Sentry Node', monthlyRewardAxm: 300, price: 5000 },
    validator: { name: 'Validator Node', monthlyRewardAxm: 400, price: 15000 },
    guardian: { name: 'Guardian Node', monthlyRewardAxm: 500, price: 50000 }
  },
  dexRewards: {
    lpYieldPercent: 12,
    stakingYieldPercent: 8
  },
  tokenAppreciation: {
    currentPrice: 0.00033,
    tgePrice: 0.00033,
    projectedYear1: 0.001,
    projectedYear3: 0.005,
    projectedYear5: 0.02
  },
  dpaGrant: {
    maxPercent: 3,
    maxAxm: 15000
  }
};

const PROPERTY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'SFR', label: 'Single Family' },
  { value: 'CONDOMINIUM', label: 'Condo' },
  { value: 'TOWNHOUSE/ROWHOUSE', label: 'Townhouse' },
  { value: 'MULTI FAMILY DWELLING', label: 'Multi-Family' },
  { value: 'VACANT LAND (NEC)', label: 'Land' },
  { value: 'COMMERCIAL (NEC)', label: 'Commercial' }
];

const SAMPLE_ZIP_CODES = [
  { code: '78244', label: 'San Antonio, TX' },
  { code: '43228', label: 'Columbus, OH' },
  { code: '46227', label: 'Indianapolis, IN' },
  { code: '63136', label: 'St. Louis, MO' },
  { code: '38118', label: 'Memphis, TN' },
  { code: '48227', label: 'Detroit, MI' }
];

export default function KeyGrowPage() {
  const { walletState, connectMetaMask, signInWithEthereum, siweState } = useWallet();
  const [activeTab, setActiveTab] = useState<TabType>('properties');
  const [properties, setProperties] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [equitySummary, setEquitySummary] = useState<EquitySummary | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState<number | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<any | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('');
  const [zipCode, setZipCode] = useState('78244');
  const [searchZipCode, setSearchZipCode] = useState('');
  const [totalProperties, setTotalProperties] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [apiConfigured, setApiConfigured] = useState(true);
  const [usingSampleData, setUsingSampleData] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [enrollForm, setEnrollForm] = useState({
    tenantName: '',
    tenantEmail: '',
    agreedTermMonths: 60
  });
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Record<string, Set<string>>>({});
  const [deposits, setDeposits] = useState<any[]>([]);
  const [depositSummary, setDepositSummary] = useState<any>(null);

  const toggleCardExpansion = (cardId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const toggleSection = (cardId: string, section: string) => {
    setExpandedSections(prev => {
      const cardSections = prev[cardId] || new Set();
      const newCardSections = new Set(cardSections);
      if (newCardSections.has(section)) {
        newCardSections.delete(section);
      } else {
        newCardSections.add(section);
      }
      return { ...prev, [cardId]: newCardSections };
    });
  };

  const isSectionExpanded = (cardId: string, section: string) => {
    return expandedSections[cardId]?.has(section) || false;
  };

  const getWalkScoreColor = (score: number | null) => {
    if (!score) return 'bg-gray-100 text-gray-400';
    if (score >= 90) return 'bg-green-500 text-white';
    if (score >= 70) return 'bg-green-400 text-white';
    if (score >= 50) return 'bg-yellow-400 text-gray-900';
    if (score >= 25) return 'bg-orange-400 text-white';
    return 'bg-red-400 text-white';
  };

  const getPriceToRentLabel = (ratio: number | null) => {
    if (!ratio) return { label: 'N/A', color: 'text-gray-500' };
    if (ratio < 15) return { label: 'Excellent', color: 'text-green-600' };
    if (ratio < 20) return { label: 'Good', color: 'text-green-500' };
    if (ratio < 25) return { label: 'Fair', color: 'text-yellow-600' };
    return { label: 'High', color: 'text-red-500' };
  };

  useEffect(() => {
    fetchProperties('78244');
  }, []);

  useEffect(() => {
    if (walletState.address && siweState?.isAuthenticated) {
      fetchEnrollments();
      fetchEquity();
      fetchDeposits();
    }
  }, [walletState.address, siweState?.isAuthenticated]);

  const fetchDeposits = async () => {
    if (!walletState.address) return;
    try {
      const res = await fetch(`/api/keygrow/deposits?tenantAddress=${walletState.address}`);
      const data = await res.json();
      if (data.success) {
        setDeposits(data.deposits || []);
        setDepositSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Error fetching deposits:', err);
    }
  };

  const fetchProperties = async (zip: string, type?: string, page: number = 1) => {
    if (!zip || zip.length < 5) return;
    
    try {
      setLoading(true);
      setApiErrorMessage(null);
      console.log('[KeyGrow] Fetching properties for zip:', zip);
      const params = new URLSearchParams({
        postalCode: zip,
        page: page.toString(),
        pageSize: '20',
        minValue: '50000',
        maxValue: '375000'
      });
      if (type) params.append('propertyType', type);
      
      console.log('[KeyGrow] Starting fetch...');
      const res = await fetch(`/api/keygrow/attom-properties?${params}`);
      console.log('[KeyGrow] Fetch complete, status:', res.status);
      const text = await res.text();
      console.log('[KeyGrow] Response length:', text.length);
      const data = JSON.parse(text);
      console.log('[KeyGrow] API Response:', { success: data.success, count: data.properties?.length, total: data.total });
      
      if (data.success) {
        setProperties(data.properties || []);
        setTotalProperties(data.total || 0);
        setCurrentPage(page);
        setZipCode(zip);
        setApiConfigured(true);
        setUsingSampleData(data.usingSampleData || false);
        if (data.usingSampleData && data.apiError) {
          setApiErrorMessage(data.apiError);
        }
        console.log('[KeyGrow] Properties set:', data.properties?.length);
      } else if (data.error === 'ATTOM API not configured') {
        setApiConfigured(false);
        setProperties([]);
        setTotalProperties(0);
        setUsingSampleData(false);
      }
    } catch (err) {
      console.error('[KeyGrow] Error fetching properties:', err);
      toast.error('Failed to fetch properties');
      setUsingSampleData(false);
    } finally {
      setLoading(false);
      console.log('[KeyGrow] Loading set to false');
    }
  };

  const handleSearch = () => {
    const zip = searchZipCode.trim() || zipCode;
    if (zip.length >= 5) {
      fetchProperties(zip, propertyTypeFilter || undefined, 1);
    } else {
      toast.error('Please enter a valid 5-digit zip code');
    }
  };

  const fetchEnrollments = async () => {
    if (!walletState.address) return;
    try {
      const res = await fetch(`/api/keygrow/enrollments?tenantAddress=${walletState.address}`);
      const data = await res.json();
      if (data.success) {
        setEnrollments(data.enrollments || []);
      }
    } catch (err) {
      console.error('Error fetching enrollments:', err);
    }
  };

  const fetchEquity = async () => {
    if (!walletState.address) return;
    try {
      const res = await fetch(`/api/keygrow/equity?walletAddress=${walletState.address}`);
      const data = await res.json();
      if (data.success) {
        setEquitySummary(data.summary);
        setPortfolio(data.portfolio || []);
      }
    } catch (err) {
      console.error('Error fetching equity:', err);
    }
  };

  const handleEnroll = async () => {
    if (!selectedProperty) return;
    if (!walletState.address || !siweState?.isAuthenticated) {
      toast.error('Please connect your wallet and sign in first');
      return;
    }

    setEnrolling(selectedProperty.id);
    try {
      const res = await fetch('/api/keygrow/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: selectedProperty.id,
          tenantAddress: walletState.address,
          tenantName: enrollForm.tenantName,
          tenantEmail: enrollForm.tenantEmail,
          agreedTermMonths: enrollForm.agreedTermMonths
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Successfully enrolled in KeyGrow program!');
        setShowEnrollModal(false);
        setSelectedProperty(null);
        fetchProperties(zipCode, propertyTypeFilter || undefined, currentPage);
        fetchEnrollments();
        fetchEquity();
        setActiveTab('my-enrollments');
      } else {
        toast.error(data.error || 'Enrollment failed');
      }
    } catch (err) {
      toast.error('Enrollment failed. Please try again.');
    } finally {
      setEnrolling(null);
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const formatAXM = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num) + ' AXM';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <Toaster position="top-right" />
      
      <header className="bg-white border-b border-amber-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-amber-600 hover:text-amber-700 flex items-center gap-2">
              <span className="text-2xl">←</span>
              <span className="font-medium">Back to Axiom</span>
            </Link>
            <div className="h-8 w-px bg-amber-200" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                🏠 KeyGrow
                <span className="text-sm font-normal bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                  Rent-to-Own
                </span>
              </h1>
              <p className="text-sm text-gray-600">Build equity with every payment</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {walletState.isConnected ? (
              <div className="flex items-center gap-3">
                {!siweState?.isAuthenticated && (
                  <button
                    onClick={() => signInWithEthereum()}
                    className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition"
                  >
                    Sign In
                  </button>
                )}
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                  <span className="text-xs text-gray-500">Connected</span>
                  <p className="font-mono text-sm text-gray-900">
                    {walletState.address?.slice(0, 6)}...{walletState.address?.slice(-4)}
                  </p>
                </div>
                {siweState?.isAuthenticated && (
                  <span className="text-green-600 text-sm flex items-center gap-1">
                    ✓ Verified
                  </span>
                )}
              </div>
            ) : (
              <button
                onClick={() => connectMetaMask()}
                className="bg-amber-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-600 transition flex items-center gap-2"
              >
                <span>🦊</span> Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <DisclosureBanner 
          featureId="keygrow" 
          walletAddress={walletState.address || undefined}
        />
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 mb-8 text-white shadow-xl">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Own Your Home Through Rent</h2>
              <p className="text-lg opacity-90 mb-6">
                Every monthly payment builds your equity stake. Start with 0% ownership 
                and work your way to 100% ownership through consistent payments.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="bg-white/20 backdrop-blur rounded-lg px-4 py-3">
                  <p className="text-2xl font-bold">{properties.length}</p>
                  <p className="text-sm opacity-80">Properties Available</p>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-lg px-4 py-3">
                  <p className="text-2xl font-bold">{TOKENIZATION_CONFIG.equityBuildPercent}%</p>
                  <p className="text-sm opacity-80">Rent to Equity</p>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-lg px-4 py-3">
                  <p className="text-2xl font-bold">Pay in AXM</p>
                  <p className="text-sm opacity-80">Crypto-Native</p>
                </div>
              </div>
              <div className="mt-6">
                <Link
                  href="/keygrow/sell"
                  className="inline-flex items-center gap-2 bg-white text-amber-600 px-6 py-3 rounded-lg font-medium hover:bg-amber-50 transition"
                >
                  <span>🏢</span> List Your Property
                </Link>
              </div>
            </div>
            <div className="text-center hidden md:block">
              <div className="text-8xl">🏡</div>
              <p className="mt-4 text-xl font-medium">Your Path to Homeownership</p>
            </div>
          </div>
        </div>

        <div className="flex gap-1 mb-6 border-b border-amber-200 overflow-x-auto pb-1">
          {[
            { key: 'program-overview', label: 'Program', icon: '🏛️' },
            { key: 'properties', label: 'Properties', icon: '🏘️' },
            { key: 'path-to-ownership', label: 'Path to Ownership', icon: '🛤️' },
            { key: 'owner-agent-benefits', label: 'For Owners & Agents', icon: '🤝' },
            { key: 'dpa-fund', label: 'DPA Fund', icon: '💰' },
            { key: 'token-portfolio', label: 'My Tokens', icon: '🪙' },
            { key: 'my-enrollments', label: 'Enrollments', icon: '📋' },
            { key: 'equity-tracker', label: 'Equity', icon: '📊' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 -mb-[2px] ${
                activeTab === tab.key
                  ? 'border-amber-500 text-amber-600 bg-amber-50'
                  : 'border-transparent text-gray-600 hover:text-amber-500 hover:bg-amber-50/50'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* PROGRAM OVERVIEW TAB */}
        {activeTab === 'program-overview' && (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-8 text-white">
              <div className="max-w-4xl">
                <h2 className="text-3xl font-bold mb-4">KeyGrow: Tokenized Rent-to-Own</h2>
                <p className="text-xl text-amber-100 mb-6">
                  The first blockchain-powered rent-to-own program where every payment builds real, tokenized equity 
                  that you can trade, stake, or hold until full ownership.
                </p>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold">100K</p>
                    <p className="text-sm text-amber-100">Tokens Per Property</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold">{TOKENIZATION_CONFIG.equityBuildPercent}%</p>
                    <p className="text-sm text-amber-100">Rent Builds Equity</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold">{FEE_DISTRIBUTION.dpaFund}%</p>
                    <p className="text-sm text-amber-100">To DPA Fund</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold">4</p>
                    <p className="text-sm text-amber-100">Stakeholders Benefit</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Option Consideration - Staking Feature */}
            <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-xl border-2 border-emerald-400 p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                FIRST OF ITS KIND
              </div>
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg flex-shrink-0">
                  💎
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">$500 Option Consideration</h3>
                  <p className="text-lg text-emerald-700 font-medium mb-4">
                    Your option fee works for YOU - not the seller!
                  </p>
                  <div className="bg-white rounded-xl p-6 border border-emerald-200 mb-6">
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="text-2xl">💵</span>
                        </div>
                        <h4 className="font-bold text-gray-900 mb-1">You Pay $500</h4>
                        <p className="text-sm text-gray-600">One-time option consideration when enrolling in KeyGrow</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="text-2xl">🔒</span>
                        </div>
                        <h4 className="font-bold text-gray-900 mb-1">KeyGrow Stakes It</h4>
                        <p className="text-sm text-gray-600">We convert to AXM and stake for 8% APR rewards</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="text-2xl">🏠</span>
                        </div>
                        <h4 className="font-bold text-gray-900 mb-1">Grows for Your Down Payment</h4>
                        <p className="text-sm text-gray-600">All rewards accumulate toward your future home purchase</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-emerald-100 to-green-100 rounded-xl p-4 border border-emerald-200">
                    <h4 className="font-bold text-gray-900 mb-3">Deposit Growth Projection</h4>
                    <div className="grid grid-cols-5 gap-4 text-center text-sm">
                      <div>
                        <p className="text-gray-500">Year 1</p>
                        <p className="font-bold text-emerald-600">$540</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Year 2</p>
                        <p className="font-bold text-emerald-600">$583</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Year 3</p>
                        <p className="font-bold text-emerald-600">$630</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Year 5</p>
                        <p className="font-bold text-emerald-600">$735</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Year 10</p>
                        <p className="font-bold text-emerald-700">$1,079</p>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-700 mt-3 text-center">*Based on 8% APR compounding. Actual returns may vary with AXM token price appreciation.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* How Tokenization Works */}
            <div className="bg-white rounded-xl border border-amber-100 p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">How Property Tokenization Works</h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">1</div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1">Property Gets Tokenized</h4>
                        <p className="text-gray-600 text-sm">Each property is represented by {TOKENIZATION_CONFIG.sharesPerProperty.toLocaleString()} ERC-1155 tokens. Each token = {TOKENIZATION_CONFIG.sharePercentage}% ownership.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">2</div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1">Rent Payments Mint Tokens</h4>
                        <p className="text-gray-600 text-sm">{TOKENIZATION_CONFIG.equityBuildPercent}% of your rent is converted to equity tokens, automatically minted to your wallet each month.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">3</div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1">Trade or Accumulate</h4>
                        <p className="text-gray-600 text-sm">Your equity tokens are real assets. Hold them to reach 100% ownership, or trade on our secondary marketplace.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">4</div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1">Full Ownership Transfer</h4>
                        <p className="text-gray-600 text-sm">When you reach 100%, tokens are burned and you receive the property deed as an NFT. You own the home!</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
                  <h4 className="font-bold text-gray-900 mb-4">Token Economics Example</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-amber-200">
                      <span className="text-gray-600">Property Value</span>
                      <span className="font-bold">$200,000</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-amber-200">
                      <span className="text-gray-600">Total Tokens</span>
                      <span className="font-bold">100,000 shares</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-amber-200">
                      <span className="text-gray-600">Value Per Token</span>
                      <span className="font-bold">$2.00</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-amber-200">
                      <span className="text-gray-600">Monthly Rent</span>
                      <span className="font-bold">$1,500</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-amber-200">
                      <span className="text-gray-600">Equity Per Month (20%)</span>
                      <span className="font-bold text-green-600">$300 = 150 tokens</span>
                    </div>
                    <div className="flex justify-between py-2 bg-amber-100 rounded px-2 -mx-2">
                      <span className="text-gray-800 font-medium">Tokens Earned Year 1</span>
                      <span className="font-bold text-amber-600">1,800 tokens (1.8%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fee Distribution */}
            <div className="bg-white rounded-xl border border-amber-100 p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Fee Distribution: Everyone Benefits</h3>
              <p className="text-gray-600 mb-6">Every rent payment is automatically split to benefit all stakeholders in the ecosystem:</p>
              <div className="grid md:grid-cols-6 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                  <div className="text-3xl font-bold text-blue-600">{FEE_DISTRIBUTION.owner}%</div>
                  <p className="text-sm text-gray-600 font-medium mt-1">Property Owner</p>
                  <p className="text-xs text-gray-500 mt-1">Guaranteed income</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                  <div className="text-3xl font-bold text-green-600">{FEE_DISTRIBUTION.maintenance}%</div>
                  <p className="text-sm text-gray-600 font-medium mt-1">Maintenance</p>
                  <p className="text-xs text-gray-500 mt-1">Property upkeep</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-100">
                  <div className="text-3xl font-bold text-purple-600">{FEE_DISTRIBUTION.dpaFund}%</div>
                  <p className="text-sm text-gray-600 font-medium mt-1">DPA Fund</p>
                  <p className="text-xs text-gray-500 mt-1">Down payment grants</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 text-center border border-orange-100">
                  <div className="text-3xl font-bold text-orange-600">{FEE_DISTRIBUTION.vacancy}%</div>
                  <p className="text-sm text-gray-600 font-medium mt-1">Vacancy Reserve</p>
                  <p className="text-xs text-gray-500 mt-1">Risk protection</p>
                </div>
                <div className="bg-pink-50 rounded-xl p-4 text-center border border-pink-100">
                  <div className="text-3xl font-bold text-pink-600">{FEE_DISTRIBUTION.tenantBooster}%</div>
                  <p className="text-sm text-gray-600 font-medium mt-1">Tenant Rewards</p>
                  <p className="text-xs text-gray-500 mt-1">Loyalty bonuses</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
                  <div className="text-3xl font-bold text-amber-600">{FEE_DISTRIBUTION.treasury}%</div>
                  <p className="text-sm text-gray-600 font-medium mt-1">Protocol Treasury</p>
                  <p className="text-xs text-gray-500 mt-1">Ecosystem growth</p>
                </div>
              </div>
            </div>

            {/* Stakeholder Benefits Summary */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl border border-amber-100 p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center text-2xl text-white mb-4">🏠</div>
                <h4 className="font-bold text-lg text-gray-900 mb-2">For Tenants</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2"><span className="text-green-500">✓</span> Earn tokenized equity</li>
                  <li className="flex items-start gap-2"><span className="text-green-500">✓</span> DPA grant eligibility</li>
                  <li className="flex items-start gap-2"><span className="text-green-500">✓</span> Trade equity tokens</li>
                  <li className="flex items-start gap-2"><span className="text-green-500">✓</span> Staking rewards boost</li>
                </ul>
              </div>
              <div className="bg-white rounded-xl border border-amber-100 p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center text-2xl text-white mb-4">🏢</div>
                <h4 className="font-bold text-lg text-gray-900 mb-2">For Property Owners</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2"><span className="text-green-500">✓</span> Guaranteed rental income</li>
                  <li className="flex items-start gap-2"><span className="text-green-500">✓</span> Sell fractional shares</li>
                  <li className="flex items-start gap-2"><span className="text-green-500">✓</span> Tokenized appreciation</li>
                  <li className="flex items-start gap-2"><span className="text-green-500">✓</span> Default protection</li>
                </ul>
              </div>
              <div className="bg-white rounded-xl border border-amber-100 p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center text-2xl text-white mb-4">🤝</div>
                <h4 className="font-bold text-lg text-gray-900 mb-2">For Agents</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2"><span className="text-green-500">✓</span> Commission in AXM</li>
                  <li className="flex items-start gap-2"><span className="text-green-500">✓</span> Referral bonuses</li>
                  <li className="flex items-start gap-2"><span className="text-green-500">✓</span> Vesting NFT rewards</li>
                  <li className="flex items-start gap-2"><span className="text-green-500">✓</span> Recurring income</li>
                </ul>
              </div>
              <div className="bg-white rounded-xl border border-amber-100 p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-2xl text-white mb-4">⚡</div>
                <h4 className="font-bold text-lg text-gray-900 mb-2">For Axiom Protocol</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2"><span className="text-green-500">✓</span> Transaction fees</li>
                  <li className="flex items-start gap-2"><span className="text-green-500">✓</span> AXM utility growth</li>
                  <li className="flex items-start gap-2"><span className="text-green-500">✓</span> Ecosystem TVL</li>
                  <li className="flex items-start gap-2"><span className="text-green-500">✓</span> Market expansion</li>
                </ul>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-8 text-center text-white">
              <h3 className="text-2xl font-bold mb-4">Ready to Start Building Equity?</h3>
              <p className="text-amber-100 mb-6 max-w-2xl mx-auto">Browse affordable properties in your area and start your journey to homeownership with tokenized rent-to-own.</p>
              <button
                onClick={() => setActiveTab('properties')}
                className="bg-white text-amber-600 px-8 py-3 rounded-lg font-bold hover:bg-amber-50 transition"
              >
                Browse Properties
              </button>
            </div>
          </div>
        )}

        {/* PATH TO OWNERSHIP TAB */}
        {activeTab === 'path-to-ownership' && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl border border-amber-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Path to Homeownership</h2>
              
              {/* Timeline */}
              <div className="relative">
                <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-orange-400 to-green-500"></div>
                <div className="space-y-8">
                  {[
                    { month: '1-6', title: 'Enrollment & Setup', desc: 'Complete KYC, sign lease agreement, connect wallet, and make first payment. Your equity token balance begins growing at 20% of each rent payment.', tokens: '900', equity: '0.9%', color: 'amber' },
                    { month: '6-12', title: 'Build Momentum', desc: 'Consistent payments build your token balance. Start staking AXM to boost rewards and work toward DPA qualification.', tokens: '1,800', equity: '1.8%', color: 'amber' },
                    { month: '12-18', title: 'DPA Eligibility', desc: `After 18 on-time payments with ${DPA_ELIGIBILITY.minEquityPercent}% equity and ${DPA_ELIGIBILITY.minStakeAxm.toLocaleString()} AXM staked, you qualify for Down Payment Assistance grants up to ${DPA_ELIGIBILITY.maxGrantPercent}% of home value.`, tokens: '2,500', equity: `${DPA_ELIGIBILITY.minEquityPercent}%`, color: 'orange' },
                    { month: '18-60', title: 'DPA + Accelerate', desc: 'Apply for DPA grants to boost your equity stake. Combined with rent payments, you can reach 10-15% ownership. Trade tokens or continue accumulating.', tokens: '9,000', equity: '9.0%', color: 'orange' },
                    { month: '60-120', title: 'Major Ownership', desc: 'With DPA grants, staking bonuses, and 5+ years of payments, you approach 20-25% equity. Purchase remaining shares or continue building.', tokens: '25,000', equity: '25%', color: 'green' },
                    { month: '120+', title: 'Full Ownership', desc: 'Continue accumulating via rent + DPA + marketplace purchases until you reach 100%. Tokens are burned and property deed NFT is minted to your wallet.', tokens: '100,000', equity: '100%', color: 'green' }
                  ].map((step, idx) => (
                    <div key={idx} className="flex gap-6 relative">
                      <div className={`w-16 h-16 rounded-full bg-${step.color}-100 border-4 border-${step.color}-400 flex items-center justify-center text-sm font-bold text-${step.color}-700 z-10 flex-shrink-0`}>
                        {step.month}
                      </div>
                      <div className="flex-1 bg-gradient-to-r from-gray-50 to-white rounded-xl p-6 border border-gray-100">
                        <h4 className="font-bold text-lg text-gray-900 mb-2">{step.title}</h4>
                        <p className="text-gray-600 text-sm mb-4">{step.desc}</p>
                        <div className="flex gap-4">
                          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">{step.tokens} tokens</span>
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">{step.equity} equity</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* OWNERSHIP ACCELERATOR - Platform Benefits Calculator */}
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-xl border border-green-200 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-2xl">🚀</div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Ownership Accelerator</h3>
                  <p className="text-green-700">Combine Axiom platform features to own your home faster</p>
                </div>
              </div>

              {/* Example Property Scenario */}
              <div className="bg-white rounded-xl p-6 border border-green-200 mb-6">
                <h4 className="font-bold text-lg text-gray-900 mb-4">Example: $200,000 Home with $1,500/mo Rent</h4>
                
                {/* Base vs Accelerated Comparison */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h5 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">1</span>
                      Base Path (Rent Only)
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>Monthly Equity (20% of rent)</span><span className="font-medium">$300</span></div>
                      <div className="flex justify-between"><span>Tokens/Month</span><span className="font-medium">~150 tokens</span></div>
                      <div className="flex justify-between"><span>Annual Equity</span><span className="font-medium">$3,600 (1.8%)</span></div>
                      <div className="flex justify-between text-gray-500 pt-2 border-t"><span>Time to 100% Ownership</span><span className="font-bold text-red-500">~56 yrs</span></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">$200K ÷ $3,600/yr = 55.6 years</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg p-4 border-2 border-green-400">
                    <h5 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
                      Accelerated Path (All Features)
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>Monthly Equity Combined</span><span className="font-bold text-green-700">$900+</span></div>
                      <div className="flex justify-between"><span>Tokens/Month (with 2x)</span><span className="font-bold text-green-700">~450+ tokens</span></div>
                      <div className="flex justify-between"><span>Annual Equity</span><span className="font-bold text-green-700">$10,800+ (5.4%)</span></div>
                      <div className="flex justify-between text-green-800 pt-2 border-t border-green-300"><span>Time to 100% Ownership</span><span className="font-bold text-green-600">~19 yrs</span></div>
                    </div>
                    <p className="text-xs text-green-600 mt-2">$200K ÷ $10,800/yr = 18.5 years (3x faster!)</p>
                  </div>
                </div>
              </div>

              {/* Platform Feature Breakdown */}
              <h4 className="font-bold text-lg text-gray-900 mb-4">How Each Platform Feature Accelerates Ownership</h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {/* AXM Staking */}
                <div className="bg-white rounded-xl p-5 border border-amber-200 hover:shadow-lg transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-xl">🪙</div>
                    <h5 className="font-bold text-gray-900">AXM Staking</h5>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Stake AXM to earn equity multipliers on every rent payment</p>
                  <div className="space-y-1 text-xs">
                    {OWNERSHIP_ACCELERATORS.stakingTiers.map((tier, idx) => (
                      <div key={idx} className="flex justify-between py-1 px-2 bg-gray-50 rounded">
                        <span>{tier.name} ({tier.minStake.toLocaleString()}+ AXM)</span>
                        <span className="font-bold text-amber-600">{tier.multiplier}x equity</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-2 bg-amber-50 rounded text-xs text-amber-800">
                    <strong>Impact:</strong> Platinum staking doubles your equity tokens from rent!
                  </div>
                </div>

                {/* DePIN Nodes */}
                <div className="bg-white rounded-xl p-5 border border-blue-200 hover:shadow-lg transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-xl">🖥️</div>
                    <h5 className="font-bold text-gray-900">DePIN Nodes</h5>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Run infrastructure nodes to earn AXM rewards you can convert to equity</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between py-1 px-2 bg-gray-50 rounded">
                      <span>Sentry Node</span>
                      <span className="font-bold text-blue-600">+{OWNERSHIP_ACCELERATORS.depinNodes.sentry.monthlyRewardAxm} AXM/mo</span>
                    </div>
                    <div className="flex justify-between py-1 px-2 bg-gray-50 rounded">
                      <span>Validator Node</span>
                      <span className="font-bold text-blue-600">+{OWNERSHIP_ACCELERATORS.depinNodes.validator.monthlyRewardAxm} AXM/mo</span>
                    </div>
                    <div className="flex justify-between py-1 px-2 bg-gray-50 rounded">
                      <span>Guardian Node</span>
                      <span className="font-bold text-blue-600">+{OWNERSHIP_ACCELERATORS.depinNodes.guardian.monthlyRewardAxm} AXM/mo</span>
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-800">
                    <strong>Impact:</strong> Convert AXM rewards to property tokens - value grows with token appreciation
                  </div>
                </div>

                {/* DEX & LP */}
                <div className="bg-white rounded-xl p-5 border border-purple-200 hover:shadow-lg transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-xl">💱</div>
                    <h5 className="font-bold text-gray-900">DEX Rewards</h5>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Provide liquidity or stake on Axiom DEX to earn additional AXM</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between py-1 px-2 bg-gray-50 rounded">
                      <span>LP Yield (Annual)</span>
                      <span className="font-bold text-purple-600">{OWNERSHIP_ACCELERATORS.dexRewards.lpYieldPercent}% APY</span>
                    </div>
                    <div className="flex justify-between py-1 px-2 bg-gray-50 rounded">
                      <span>Staking Yield (Annual)</span>
                      <span className="font-bold text-purple-600">{OWNERSHIP_ACCELERATORS.dexRewards.stakingYieldPercent}% APY</span>
                    </div>
                    <div className="flex justify-between py-1 px-2 bg-purple-50 rounded">
                      <span>$10K LP position</span>
                      <span className="font-bold text-purple-600">+$100/mo</span>
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-purple-50 rounded text-xs text-purple-800">
                    <strong>Impact:</strong> Convert LP rewards directly to property tokens
                  </div>
                </div>

                {/* Token Appreciation */}
                <div className="bg-white rounded-xl p-5 border border-green-200 hover:shadow-lg transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-xl">📈</div>
                    <h5 className="font-bold text-gray-900">Token Appreciation</h5>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">As AXM appreciates, your existing tokens become worth more equity</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between py-1 px-2 bg-gray-50 rounded">
                      <span>TGE Price</span>
                      <span className="font-medium">${OWNERSHIP_ACCELERATORS.tokenAppreciation.tgePrice}</span>
                    </div>
                    <div className="flex justify-between py-1 px-2 bg-gray-50 rounded">
                      <span>Year 1 Projection</span>
                      <span className="font-bold text-green-600">${OWNERSHIP_ACCELERATORS.tokenAppreciation.projectedYear1} (3x)</span>
                    </div>
                    <div className="flex justify-between py-1 px-2 bg-gray-50 rounded">
                      <span>Year 3 Projection</span>
                      <span className="font-bold text-green-600">${OWNERSHIP_ACCELERATORS.tokenAppreciation.projectedYear3} (15x)</span>
                    </div>
                    <div className="flex justify-between py-1 px-2 bg-green-100 rounded">
                      <span>Year 5 Projection</span>
                      <span className="font-bold text-green-600">${OWNERSHIP_ACCELERATORS.tokenAppreciation.projectedYear5} (60x)</span>
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-green-50 rounded text-xs text-green-800">
                    <strong>Impact:</strong> Early tokens become 60x more valuable!
                  </div>
                </div>

                {/* DPA Grants */}
                <div className="bg-white rounded-xl p-5 border border-indigo-200 hover:shadow-lg transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-xl">🎁</div>
                    <h5 className="font-bold text-gray-900">DPA Grants</h5>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Qualify for Down Payment Assistance grants that boost your equity</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between py-1 px-2 bg-gray-50 rounded">
                      <span>Max Grant</span>
                      <span className="font-bold text-indigo-600">{OWNERSHIP_ACCELERATORS.dpaGrant.maxPercent}% of home</span>
                    </div>
                    <div className="flex justify-between py-1 px-2 bg-gray-50 rounded">
                      <span>On $200K home</span>
                      <span className="font-bold text-indigo-600">$6,000 equity</span>
                    </div>
                    <div className="flex justify-between py-1 px-2 bg-indigo-50 rounded">
                      <span>Eligibility</span>
                      <span className="font-medium">18 payments + stake</span>
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-indigo-50 rounded text-xs text-indigo-800">
                    <strong>Impact:</strong> Instant 3% equity boost at no cost!
                  </div>
                </div>

                {/* Extra Contributions */}
                <div className="bg-white rounded-xl p-5 border border-orange-200 hover:shadow-lg transition">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-xl">💰</div>
                    <h5 className="font-bold text-gray-900">Equity Booster</h5>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Add extra monthly contributions beyond rent to build equity faster</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between py-1 px-2 bg-gray-50 rounded">
                      <span>+$200/month extra</span>
                      <span className="font-bold text-orange-600">+$2,400/yr equity</span>
                    </div>
                    <div className="flex justify-between py-1 px-2 bg-gray-50 rounded">
                      <span>+$500/month extra</span>
                      <span className="font-bold text-orange-600">+$6,000/yr equity</span>
                    </div>
                    <div className="flex justify-between py-1 px-2 bg-orange-50 rounded">
                      <span>Cuts ownership time by</span>
                      <span className="font-bold text-orange-600">30-50%</span>
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-orange-50 rounded text-xs text-orange-800">
                    <strong>Impact:</strong> Direct path to faster ownership
                  </div>
                </div>
              </div>

              {/* Combined Strategy Example */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white">
                <h4 className="font-bold text-xl mb-4">Accelerated Ownership: $200K Home Example</h4>
                <p className="text-green-100 text-sm mb-4 text-center">$1,500/mo rent on $200,000 property with platform features</p>
                <div className="grid md:grid-cols-4 gap-4 text-center mb-4">
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-2xl font-bold">$600</p>
                    <p className="text-xs text-green-100">Rent Equity (2x)</p>
                    <p className="text-[10px] text-green-200">$300 base × Platinum</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-2xl font-bold">+$100</p>
                    <p className="text-xs text-green-100">DEX LP Rewards</p>
                    <p className="text-[10px] text-green-200">$10K position @ 12%</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-2xl font-bold">+$200</p>
                    <p className="text-xs text-green-100">Equity Booster</p>
                    <p className="text-[10px] text-green-200">Extra contribution</p>
                  </div>
                  <div className="bg-white/20 rounded-lg p-3 border-2 border-white/50">
                    <p className="text-2xl font-bold">$900</p>
                    <p className="text-xs text-green-100">Total Monthly</p>
                    <p className="text-[10px] text-green-200">= $10,800/year</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
                  <span className="px-4 py-2 bg-white/20 rounded-full">$200,000 ÷ $10,800/yr</span>
                  <span className="text-2xl">→</span>
                  <span className="px-4 py-2 bg-white text-green-700 rounded-full font-bold">~18.5 years to ownership</span>
                </div>
                <p className="text-center text-green-100 text-xs mt-4">
                  Breakdown: $300/mo rent equity × 2x Platinum staking = $600 + $100 DEX rewards + $200 extra = $900/mo total
                </p>
              </div>
            </div>

            {/* DPA Milestones */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Down Payment Assistance (DPA) Eligibility</h3>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg p-4 text-center border border-purple-100">
                  <div className="text-3xl font-bold text-purple-600">{DPA_ELIGIBILITY.minPayments}</div>
                  <p className="text-sm text-gray-600">On-Time Payments</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center border border-purple-100">
                  <div className="text-3xl font-bold text-purple-600">{DPA_ELIGIBILITY.minEquityPercent}%</div>
                  <p className="text-sm text-gray-600">Minimum Equity</p>
                  <p className="text-xs text-gray-400 mt-1">~{Math.round(DPA_ELIGIBILITY.minEquityPercent * 1000)} tokens</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center border border-purple-100">
                  <div className="text-3xl font-bold text-purple-600">{DPA_ELIGIBILITY.minStakeAxm.toLocaleString()}</div>
                  <p className="text-sm text-gray-600">AXM Staked</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center border border-purple-100">
                  <div className="text-3xl font-bold text-purple-600">{DPA_ELIGIBILITY.minStakeDays}</div>
                  <p className="text-sm text-gray-600">Days Staking</p>
                </div>
              </div>
              <div className="mt-6 p-4 bg-white rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">Maximum DPA Grant</p>
                    <p className="text-sm text-gray-600">Up to {DPA_ELIGIBILITY.maxGrantPercent}% of purchase price or {DPA_ELIGIBILITY.maxGrantAxm.toLocaleString()} AXM</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">${(DPA_ELIGIBILITY.maxGrantAxm * AXM_PRICE).toLocaleString()}</p>
                    <p className="text-sm text-gray-500">at current AXM price</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>How it works:</strong> 20% of each rent payment mints equity tokens. After 18 months, you'll have approximately {DPA_ELIGIBILITY.minEquityPercent}% equity ({Math.round(DPA_ELIGIBILITY.minEquityPercent * 1000).toLocaleString()} tokens). 
                  Combined with DPA grants (up to {DPA_ELIGIBILITY.maxGrantPercent}%), you can accelerate to 5-6% ownership and continue growing from there.
                </p>
              </div>
            </div>

            {/* First of Its Kind Banner */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-xl p-8 text-white text-center">
              <h3 className="text-3xl font-bold mb-4">The First Platform of Its Kind</h3>
              <p className="text-xl text-amber-100 mb-6 max-w-3xl mx-auto">
                KeyGrow is the world's first rent-to-own platform that integrates DePIN infrastructure, DeFi rewards, 
                token appreciation, and down payment assistance into a single path to homeownership.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <span className="px-4 py-2 bg-white/20 rounded-full text-sm">ERC-1155 Property Tokens</span>
                <span className="px-4 py-2 bg-white/20 rounded-full text-sm">DePIN Node Rewards</span>
                <span className="px-4 py-2 bg-white/20 rounded-full text-sm">DEX Liquidity Mining</span>
                <span className="px-4 py-2 bg-white/20 rounded-full text-sm">Staking Multipliers</span>
                <span className="px-4 py-2 bg-white/20 rounded-full text-sm">DPA Grants</span>
              </div>
            </div>
          </div>
        )}

        {/* OWNER & AGENT BENEFITS TAB */}
        {activeTab === 'owner-agent-benefits' && (
          <div className="space-y-8">
            {/* Property Owners Section */}
            <div className="bg-white rounded-xl border border-amber-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">For Property Owners</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-xl">💵</div>
                    <div>
                      <h4 className="font-bold text-gray-900">Guaranteed Rental Income</h4>
                      <p className="text-sm text-gray-600">Receive {FEE_DISTRIBUTION.owner}% of every rent payment directly. Smart contract ensures automatic, trustless distribution.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-xl">🪙</div>
                    <div>
                      <h4 className="font-bold text-gray-900">Tokenize & Sell Shares</h4>
                      <p className="text-sm text-gray-600">Pre-mint up to {TOKENIZATION_CONFIG.ownerMaxPreMint}% of property tokens and sell on the marketplace for immediate liquidity.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-xl">📈</div>
                    <div>
                      <h4 className="font-bold text-gray-900">Tokenized Appreciation</h4>
                      <p className="text-sm text-gray-600">Property value appreciation is reflected in token prices. Benefit from market growth even while renting.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-xl">🛡️</div>
                    <div>
                      <h4 className="font-bold text-gray-900">Default Protection</h4>
                      <p className="text-sm text-gray-600">{FEE_DISTRIBUTION.vacancy}% vacancy reserve and maintenance escrow protect against tenant defaults.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="font-bold text-gray-900 mb-4">Owner Revenue Example</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-blue-200">
                      <span>Property Value</span>
                      <span className="font-bold">$250,000</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-blue-200">
                      <span>Monthly Rent</span>
                      <span className="font-bold">$1,800</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-blue-200">
                      <span>Owner Share ({FEE_DISTRIBUTION.owner}%)</span>
                      <span className="font-bold text-green-600">${(1800 * FEE_DISTRIBUTION.owner / 100).toLocaleString()}/mo</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-blue-200">
                      <span>Annual Owner Income</span>
                      <span className="font-bold text-green-600">${(1800 * FEE_DISTRIBUTION.owner / 100 * 12).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 bg-blue-100 rounded px-2 -mx-2">
                      <span>Pre-mint Token Sale (49%)</span>
                      <span className="font-bold text-blue-600">$122,500 liquidity</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Real Estate Agents Section */}
            <div className="bg-white rounded-xl border border-amber-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">For Real Estate Agents</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center text-xl">💰</div>
                    <div>
                      <h4 className="font-bold text-gray-900">Commission in AXM</h4>
                      <p className="text-sm text-gray-600">Earn 2-3% commission paid in AXM tokens with 12-month vesting. Hold for appreciation or stake for rewards.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-xl">🔗</div>
                    <div>
                      <h4 className="font-bold text-gray-900">Referral Bonuses</h4>
                      <p className="text-sm text-gray-600">Earn 100 AXM for every successful tenant referral. Build a network and earn passive income.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-xl">🎖️</div>
                    <div>
                      <h4 className="font-bold text-gray-900">Vesting NFT Rewards</h4>
                      <p className="text-sm text-gray-600">Receive exclusive agent NFTs that unlock additional benefits and showcase your track record.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-xl">🔄</div>
                    <div>
                      <h4 className="font-bold text-gray-900">Recurring Revenue</h4>
                      <p className="text-sm text-gray-600">Small percentage of ongoing rent payments for properties you helped list. Long-term income stream.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-6 border border-pink-200">
                  <h4 className="font-bold text-gray-900 mb-4">Agent Earnings Example</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-pink-200">
                      <span>Property Value</span>
                      <span className="font-bold">$200,000</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-pink-200">
                      <span>Commission (3%)</span>
                      <span className="font-bold text-green-600">$6,000 in AXM</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-pink-200">
                      <span>AXM Tokens Earned</span>
                      <span className="font-bold">{Math.round(6000 / AXM_PRICE).toLocaleString()} AXM</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-pink-200">
                      <span>Referral Bonus (10 tenants)</span>
                      <span className="font-bold">1,000 AXM</span>
                    </div>
                    <div className="flex justify-between py-2 bg-pink-100 rounded px-2 -mx-2">
                      <span>If AXM 10x</span>
                      <span className="font-bold text-purple-600">$60,000+ value</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* List Property CTA */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-8 text-center text-white">
              <h3 className="text-2xl font-bold mb-4">Ready to List Your Property?</h3>
              <p className="text-purple-100 mb-6 max-w-2xl mx-auto">Join the KeyGrow network and start earning guaranteed income with tokenized real estate.</p>
              <button className="bg-white text-purple-600 px-8 py-3 rounded-lg font-bold hover:bg-purple-50 transition">
                List Your Property
              </button>
            </div>
          </div>
        )}

        {/* DPA FUND TAB */}
        {activeTab === 'dpa-fund' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-8 text-white">
              <h2 className="text-3xl font-bold mb-4">Down Payment Assistance Fund</h2>
              <p className="text-xl text-purple-100 mb-6">
                {FEE_DISTRIBUTION.dpaFund}% of all platform fees flow into the DPA Fund, creating a community pool that helps qualified tenants 
                accelerate their path to homeownership.
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold">${FEE_DISTRIBUTION.dpaFund}%</p>
                  <p className="text-sm text-purple-100">Of All Fees to DPA</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold">{DPA_ELIGIBILITY.maxGrantPercent}%</p>
                  <p className="text-sm text-purple-100">Max Grant (of price)</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold">{DPA_ELIGIBILITY.maxGrantAxm.toLocaleString()}</p>
                  <p className="text-sm text-purple-100">Max AXM per Grant</p>
                </div>
              </div>
            </div>

            {/* How DPA Works */}
            <div className="bg-white rounded-xl border border-amber-100 p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">How the DPA Fund Works</h3>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">💸</div>
                  <h4 className="font-bold text-gray-900 mb-2">Fees Flow In</h4>
                  <p className="text-sm text-gray-600">{FEE_DISTRIBUTION.dpaFund}% of every rent payment, listing fee, and transaction fee automatically routes to the DPA Fund via smart contract.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">📊</div>
                  <h4 className="font-bold text-gray-900 mb-2">Fund Grows</h4>
                  <p className="text-sm text-gray-600">The fund is invested via CapitalPoolsAndFunds strategies, earning yield that further grows the available grant pool.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🏠</div>
                  <h4 className="font-bold text-gray-900 mb-2">Grants Distributed</h4>
                  <p className="text-sm text-gray-600">Qualified tenants can apply for grants to accelerate their equity stake and reach ownership faster.</p>
                </div>
              </div>
            </div>

            {/* Eligibility Checklist */}
            <div className="bg-white rounded-xl border border-purple-200 p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">DPA Grant Eligibility Checklist</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <p className="font-medium text-gray-900">Minimum {DPA_ELIGIBILITY.minPayments} On-Time Payments</p>
                      <p className="text-sm text-gray-500">Consistent payment history required</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <p className="font-medium text-gray-900">Minimum {DPA_ELIGIBILITY.minEquityPercent}% Equity Stake</p>
                      <p className="text-sm text-gray-500">Must own at least {DPA_ELIGIBILITY.minEquityPercent * 1000} property tokens</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <p className="font-medium text-gray-900">Stake {DPA_ELIGIBILITY.minStakeAxm.toLocaleString()} AXM</p>
                      <p className="text-sm text-gray-500">Must stake AXM in protocol</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                    <div>
                      <p className="font-medium text-gray-900">Minimum {DPA_ELIGIBILITY.minStakeDays} Days Staking</p>
                      <p className="text-sm text-gray-500">Continuous staking period</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">Once Eligible</p>
                    <p className="text-sm text-gray-600">Apply for up to {DPA_ELIGIBILITY.maxGrantPercent}% of purchase price (max {DPA_ELIGIBILITY.maxGrantAxm.toLocaleString()} AXM)</p>
                  </div>
                  <button className="bg-green-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-600 transition">
                    Check Eligibility
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TOKEN PORTFOLIO TAB */}
        {activeTab === 'token-portfolio' && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl border border-amber-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Property Token Portfolio</h2>
              
              {!walletState.isConnected ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔐</div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Connect Your Wallet</h4>
                  <p className="text-gray-600 mb-6">Connect your wallet to view your tokenized property equity.</p>
                  <button
                    onClick={connectMetaMask}
                    className="bg-amber-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-amber-600 transition"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : (
                <div>
                  {/* Portfolio Summary */}
                  <div className="grid md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                      <p className="text-sm text-gray-500 mb-1">Total Properties</p>
                      <p className="text-2xl font-bold text-gray-900">0</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                      <p className="text-sm text-gray-500 mb-1">Total Tokens Owned</p>
                      <p className="text-2xl font-bold text-green-600">0</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                      <p className="text-sm text-gray-500 mb-1">Portfolio Value</p>
                      <p className="text-2xl font-bold text-blue-600">$0</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                      <p className="text-sm text-gray-500 mb-1">DPA Eligible</p>
                      <p className="text-2xl font-bold text-purple-600">No</p>
                    </div>
                  </div>

                  {/* Empty State */}
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <div className="text-6xl mb-4">🪙</div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">No Property Tokens Yet</h4>
                    <p className="text-gray-600 mb-6">Enroll in a KeyGrow property to start earning tokenized equity.</p>
                    <button
                      onClick={() => setActiveTab('properties')}
                      className="bg-amber-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-amber-600 transition"
                    >
                      Browse Properties
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Token Marketplace Preview */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-8 text-white">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold">Property Token Marketplace</h3>
                  <p className="text-gray-400">Trade fractional property shares</p>
                </div>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-medium">Coming Soon</span>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Buy Shares</p>
                  <p className="text-lg font-medium">Acquire property tokens from other holders</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Sell Shares</p>
                  <p className="text-lg font-medium">Liquidate equity for immediate cash</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Trade Fees</p>
                  <p className="text-lg font-medium">{TOKENIZATION_CONFIG.secondaryFeePercent}% (split: Treasury/DPA)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'properties' && (
          <div>
            <div className="bg-white rounded-xl border border-amber-100 p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Search Properties by Zip Code</h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={searchZipCode}
                    onChange={(e) => setSearchZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder="Enter zip code (e.g., 78244)"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <select 
                  value={propertyTypeFilter}
                  onChange={(e) => setPropertyTypeFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  {PROPERTY_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-amber-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-amber-600 transition disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-sm text-gray-500">Quick search:</span>
                {SAMPLE_ZIP_CODES.map(zip => (
                  <button
                    key={zip.code}
                    onClick={() => {
                      setSearchZipCode(zip.code);
                      fetchProperties(zip.code, propertyTypeFilter || undefined, 1);
                    }}
                    className={`text-sm px-3 py-1 rounded-full transition ${
                      zipCode === zip.code 
                        ? 'bg-amber-500 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-amber-100'
                    }`}
                  >
                    {zip.label}
                  </button>
                ))}
              </div>
            </div>

            {!apiConfigured && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
                <h4 className="font-bold text-yellow-800 mb-2">Property Data API Not Configured</h4>
                <p className="text-yellow-700 text-sm">
                  ATTOM API key is required to fetch real property listings. 
                  Please configure the ATTOM_API_KEY environment variable.
                </p>
              </div>
            )}

            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Properties in {zipCode}
                {totalProperties > 0 && (
                  <span className="text-gray-500 font-normal text-base ml-2">
                    ({properties.length} of {totalProperties.toLocaleString()})
                  </span>
                )}
              </h3>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin h-12 w-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-gray-600">Searching ATTOM database...</p>
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-amber-100">
                <div className="text-6xl mb-4">🏠</div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">No Properties Found</h4>
                <p className="text-gray-600 mb-6">
                  {apiConfigured 
                    ? 'Try searching a different zip code or property type'
                    : 'Configure the ATTOM API to see real property listings'}
                </p>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {properties.map((property, idx) => (
                    <div
                      key={property.attomId || idx}
                      className="bg-white rounded-xl border border-amber-100 overflow-hidden shadow-sm hover:shadow-lg transition group"
                    >
                      <div className="aspect-video bg-gradient-to-br from-amber-100 to-orange-100 relative overflow-hidden">
                        {property.photos && property.photos.length > 0 ? (
                          <img 
                            src={property.photos[0]} 
                            alt={property.addressLine1 || property.propertyName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`flex items-center justify-center h-full text-6xl absolute inset-0 ${property.photos?.length > 0 ? 'hidden' : ''}`}>
                          🏠
                        </div>
                        <div className="absolute top-3 left-3 flex gap-2">
                          <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                            {property.propertyTypeDisplay || 'Single Family'}
                          </span>
                          {property.avmConfidence && property.avmConfidence >= 80 && (
                            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                              High Confidence
                            </span>
                          )}
                        </div>
                        {property.pricePerSqFt && (
                          <span className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                            ${property.pricePerSqFt}/sqft
                          </span>
                        )}
                        <span className="absolute bottom-3 left-3 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded">
                          Representative photo
                        </span>
                      </div>
                      <div className="p-5">
                        <h4 className="font-bold text-lg text-gray-900 mb-1 truncate" title={property.addressLine1}>
                          {property.addressLine1 || property.propertyName}
                        </h4>
                        <p className="text-gray-600 text-sm mb-3">
                          {property.city}, {property.state} {property.zipCode}
                        </p>
                        
                        <div className="flex items-center gap-3 text-sm text-gray-600 mb-4 flex-wrap">
                          {property.bedrooms && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                              </svg>
                              {property.bedrooms} bed
                            </span>
                          )}
                          {property.bathrooms && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"/>
                              </svg>
                              {property.bathrooms} bath
                            </span>
                          )}
                          {property.squareFeet && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
                              </svg>
                              {property.squareFeet.toLocaleString()} sqft
                            </span>
                          )}
                          {property.stories && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                              </svg>
                              {property.stories} story
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-100">
                            <p className="text-xs text-gray-500 mb-1">Est. Value</p>
                            <p className="font-bold text-gray-900 text-lg">
                              {property.estimatedValueUsd 
                                ? formatCurrency(property.estimatedValueUsd)
                                : 'N/A'}
                            </p>
                            {property.estimatedValueLow && property.estimatedValueHigh && (
                              <p className="text-xs text-gray-500 mt-1">
                                {formatCurrency(property.estimatedValueLow)} - {formatCurrency(property.estimatedValueHigh)}
                              </p>
                            )}
                          </div>
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs text-gray-500">Monthly Rent</p>
                              {property.rentSource === 'rentcast' ? (
                                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">RentCast</span>
                              ) : (
                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Est.</span>
                              )}
                            </div>
                            <p className="font-bold text-green-700 text-lg">
                              {property.monthlyRentUsd 
                                ? formatCurrency(property.monthlyRentUsd)
                                : 'N/A'}
                            </p>
                            {property.rentRangeLow && property.rentRangeHigh ? (
                              <p className="text-xs text-gray-500 mt-1">
                                {formatCurrency(property.rentRangeLow)} - {formatCurrency(property.rentRangeHigh)}
                              </p>
                            ) : property.monthlyRentAxm && (
                              <p className="text-xs text-gray-500 mt-1">
                                {formatAXM(property.monthlyRentAxm)} AXM
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                          {property.yearBuilt && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                              </svg>
                              Built {property.yearBuilt}
                            </span>
                          )}
                          {property.lotSizeSqFt && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                              </svg>
                              {(property.lotSizeSqFt / 43560).toFixed(2)} acres
                            </span>
                          )}
                          {property.lastSaleDate && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              Sold {new Date(property.lastSaleDate).getFullYear()}
                            </span>
                          )}
                        </div>

                        {/* Tokenized Equity Indicator */}
                        <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 rounded-lg border border-amber-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🪙</span>
                              <span className="text-sm font-medium text-gray-700">Tokenized Equity</span>
                            </div>
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">ERC-1155</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-gray-500">{TOKENIZATION_CONFIG.equityBuildPercent}% of Rent</p>
                              <p className="font-bold text-amber-600">
                                {property.monthlyRentUsd ? `$${Math.round(property.monthlyRentUsd * TOKENIZATION_CONFIG.equityBuildPercent / 100)}/mo` : 'N/A'}
                              </p>
                              <p className="text-xs text-gray-500">
                                ~{property.monthlyRentUsd && property.estimatedValueUsd 
                                  ? Math.round((property.monthlyRentUsd * TOKENIZATION_CONFIG.equityBuildPercent / 100) / (property.estimatedValueUsd / TOKENIZATION_CONFIG.sharesPerProperty))
                                  : 0} tokens/mo
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Total Tokens</p>
                              <p className="font-bold text-gray-900">{TOKENIZATION_CONFIG.sharesPerProperty.toLocaleString()}</p>
                              <p className="text-xs text-gray-500">
                                ${property.estimatedValueUsd ? ((property.estimatedValueUsd / TOKENIZATION_CONFIG.sharesPerProperty).toFixed(2)) : '0'}/token
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Walk Score & Location Badges */}
                        {(property.walkScore || property.transitScore || property.bikeScore) && (
                          <div className="flex gap-2 mb-4 flex-wrap">
                            {property.walkScore && (
                              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getWalkScoreColor(property.walkScore)}`}>
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                                </svg>
                                Walk {property.walkScore}
                              </div>
                            )}
                            {property.transitScore && (
                              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getWalkScoreColor(property.transitScore)}`}>
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                                </svg>
                                Transit {property.transitScore}
                              </div>
                            )}
                            {property.bikeScore && (
                              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getWalkScoreColor(property.bikeScore)}`}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                </svg>
                                Bike {property.bikeScore}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Expandable Financial Metrics Section */}
                        {property.metrics && (
                          <div className="mb-4">
                            <button
                              onClick={() => toggleSection(property.attomId || `prop-${idx}`, 'financial')}
                              className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 hover:from-blue-100 hover:to-indigo-100 transition"
                            >
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                </svg>
                                <span className="text-sm font-medium text-blue-800">Financial Analysis</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium ${getPriceToRentLabel(property.metrics.priceToRentRatio).color}`}>
                                  P/R: {property.metrics.priceToRentRatio}x ({getPriceToRentLabel(property.metrics.priceToRentRatio).label})
                                </span>
                                <svg className={`w-4 h-4 text-blue-600 transition-transform ${isSectionExpanded(property.attomId || `prop-${idx}`, 'financial') ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                                </svg>
                              </div>
                            </button>
                            
                            {isSectionExpanded(property.attomId || `prop-${idx}`, 'financial') && (
                              <div className="mt-2 p-4 bg-white border border-blue-100 rounded-lg space-y-4">
                                {/* Token Equity Projections */}
                                <div>
                                  <h5 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide flex items-center gap-2">
                                    Token Equity Projections
                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-normal">ERC-1155</span>
                                  </h5>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="text-center p-2 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-100">
                                      <p className="text-lg font-bold text-green-600">{(Math.round((property.metrics.projectedEquity?.year1 || 0) / (property.estimatedValueUsd || 1) * TOKENIZATION_CONFIG.sharesPerProperty)).toLocaleString()}</p>
                                      <p className="text-[10px] text-gray-600 font-medium">tokens</p>
                                      <p className="text-[10px] text-gray-500">${(property.metrics.projectedEquity?.year1 || 0).toLocaleString()}</p>
                                      <p className="text-[9px] text-gray-400 mt-1">Year 1</p>
                                    </div>
                                    <div className="text-center p-2 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-100">
                                      <p className="text-lg font-bold text-green-600">{(Math.round((property.metrics.projectedEquity?.year3 || 0) / (property.estimatedValueUsd || 1) * TOKENIZATION_CONFIG.sharesPerProperty)).toLocaleString()}</p>
                                      <p className="text-[10px] text-gray-600 font-medium">tokens</p>
                                      <p className="text-[10px] text-gray-500">${(property.metrics.projectedEquity?.year3 || 0).toLocaleString()}</p>
                                      <p className="text-[9px] text-gray-400 mt-1">Year 3</p>
                                    </div>
                                    <div className="text-center p-2 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-100">
                                      <p className="text-lg font-bold text-green-600">{(Math.round((property.metrics.projectedEquity?.year5 || 0) / (property.estimatedValueUsd || 1) * TOKENIZATION_CONFIG.sharesPerProperty)).toLocaleString()}</p>
                                      <p className="text-[10px] text-gray-600 font-medium">tokens</p>
                                      <p className="text-[10px] text-gray-500">${(property.metrics.projectedEquity?.year5 || 0).toLocaleString()}</p>
                                      <p className="text-[9px] text-gray-400 mt-1">Year 5</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Monthly Ownership Costs */}
                                <div>
                                  <h5 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Est. Monthly Ownership Costs</h5>
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-600">Rent Payment</span>
                                      <span className="font-medium">${(property.metrics.monthlyOwnership?.rent || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-600">Est. Property Taxes</span>
                                      <span className="font-medium">${(property.metrics.monthlyOwnership?.taxes || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-600">Est. Insurance</span>
                                      <span className="font-medium">${(property.metrics.monthlyOwnership?.insurance || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1">
                                      <span className="text-gray-900">Total Monthly</span>
                                      <span className="text-amber-600">${(property.metrics.monthlyOwnership?.total || 0).toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Investment Metrics */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="p-2 bg-purple-50 rounded-lg text-center">
                                    <p className="text-xs text-gray-500">Cap Rate</p>
                                    <p className="text-lg font-bold text-purple-600">{property.metrics.investorMetrics?.capRate || 0}%</p>
                                  </div>
                                  <div className="p-2 bg-indigo-50 rounded-lg text-center">
                                    <p className="text-xs text-gray-500">Affordability</p>
                                    <p className="text-lg font-bold text-indigo-600">{property.metrics.affordabilityIndex || 0}%</p>
                                    <p className="text-[9px] text-gray-400">of median income</p>
                                  </div>
                                </div>

                                {/* Time to Ownership */}
                                {property.metrics.breakEvenMonths && (
                                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-xs text-gray-500">Est. Time to Full Ownership</p>
                                        <p className="text-sm font-medium text-gray-700">At {TOKENIZATION_CONFIG.equityBuildPercent}% rent to equity</p>
                                      </div>
                                      <div className="text-right">
                                        <p className={`text-xl font-bold ${property.metrics.breakEvenMonths > 360 ? 'text-orange-600' : 'text-amber-600'}`}>
                                          {Math.floor(property.metrics.breakEvenMonths / 12)} yrs
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {property.metrics.breakEvenMonths > 360 
                                            ? 'Use accelerators to reduce' 
                                            : `${property.metrics.breakEvenMonths % 12} months`}
                                        </p>
                                      </div>
                                    </div>
                                    {property.metrics.breakEvenMonths > 360 && (
                                      <div className="mt-2 pt-2 border-t border-amber-200 text-xs text-amber-700">
                                        With accelerators (3x): ~{Math.floor(property.metrics.breakEvenMonths / 12 / 3)} yrs possible
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Expandable Property Details Section */}
                        <div className="mb-4">
                          <button
                            onClick={() => toggleSection(property.attomId || `prop-${idx}`, 'details')}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
                          >
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                              </svg>
                              <span className="text-sm font-medium text-gray-700">Property Details</span>
                            </div>
                            <svg className={`w-4 h-4 text-gray-600 transition-transform ${isSectionExpanded(property.attomId || `prop-${idx}`, 'details') ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                            </svg>
                          </button>
                          
                          {isSectionExpanded(property.attomId || `prop-${idx}`, 'details') && (
                            <div className="mt-2 p-4 bg-white border border-gray-200 rounded-lg">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                {property.assessedValue && (
                                  <div>
                                    <p className="text-gray-500 text-xs">Tax Assessed Value</p>
                                    <p className="font-medium">{formatCurrency(property.assessedValue)}</p>
                                  </div>
                                )}
                                {property.lastSalePrice && (
                                  <div>
                                    <p className="text-gray-500 text-xs">Last Sale Price</p>
                                    <p className="font-medium">{formatCurrency(property.lastSalePrice)}</p>
                                  </div>
                                )}
                                {property.avmConfidence && (
                                  <div>
                                    <p className="text-gray-500 text-xs">Value Confidence</p>
                                    <p className="font-medium">{property.avmConfidence}%</p>
                                  </div>
                                )}
                                {property.ownerOccupied !== undefined && (
                                  <div>
                                    <p className="text-gray-500 text-xs">Owner Status</p>
                                    <p className="font-medium">{property.ownerOccupied ? 'Owner Occupied' : 'Non-Owner Occupied'}</p>
                                  </div>
                                )}
                                {property.heatingType && (
                                  <div>
                                    <p className="text-gray-500 text-xs">Heating</p>
                                    <p className="font-medium">{property.heatingType}</p>
                                  </div>
                                )}
                                {property.totalRooms && (
                                  <div>
                                    <p className="text-gray-500 text-xs">Total Rooms</p>
                                    <p className="font-medium">{property.totalRooms}</p>
                                  </div>
                                )}
                              </div>
                              
                              {/* Data Source Attribution */}
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <p className="text-[10px] text-gray-400">
                                  Data from ATTOM{property.rentSource === 'rentcast' ? ' & RentCast' : ''}{property.walkScore ? ' & Walk Score' : ''}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setSelectedProperty(property);
                            setShowEnrollModal(true);
                          }}
                          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition shadow-sm hover:shadow-md"
                        >
                          Apply to Enroll
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {totalProperties > 20 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <button
                      onClick={() => fetchProperties(zipCode, propertyTypeFilter || undefined, currentPage - 1)}
                      disabled={currentPage <= 1 || loading}
                      className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-gray-600">
                      Page {currentPage} of {Math.ceil(totalProperties / 20)}
                    </span>
                    <button
                      onClick={() => fetchProperties(zipCode, propertyTypeFilter || undefined, currentPage + 1)}
                      disabled={currentPage >= Math.ceil(totalProperties / 20) || loading}
                      className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'my-enrollments' && (
          <div>
            {!walletState.isConnected ? (
              <div className="text-center py-16 bg-white rounded-xl border border-amber-100">
                <div className="text-6xl mb-4">🔐</div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Connect Your Wallet</h4>
                <p className="text-gray-600 mb-6">Connect and sign in to view your enrollments</p>
                <button
                  onClick={() => connectMetaMask()}
                  className="bg-amber-500 text-white px-6 py-3 rounded-lg hover:bg-amber-600 transition"
                >
                  Connect Wallet
                </button>
              </div>
            ) : (
              <>
                {/* Option Consideration Tracker */}
                <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-xl border-2 border-emerald-300 p-6 mb-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center text-2xl shadow-md">
                        💎
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Your Option Consideration</h3>
                        <p className="text-emerald-700 text-sm">Staking and earning rewards for your down payment</p>
                      </div>
                    </div>
                    <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      8% APR
                    </span>
                  </div>

                  {deposits.length > 0 && depositSummary ? (
                    <div className="grid md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-white rounded-lg p-4 border border-emerald-200">
                        <p className="text-xs text-gray-500 mb-1">Total Option Fee</p>
                        <p className="text-xl font-bold text-gray-900">${depositSummary.totalDepositsUsd?.toLocaleString() || '0'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-emerald-200">
                        <p className="text-xs text-gray-500 mb-1">Staking Rewards Earned</p>
                        <p className="text-xl font-bold text-emerald-600">
                          {depositSummary.totalStakingRewards?.toFixed(2) || '0'} AXM
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-emerald-200">
                        <p className="text-xs text-gray-500 mb-1">Current AXM Balance</p>
                        <p className="text-xl font-bold text-gray-900">
                          {depositSummary.totalValueAxm?.toLocaleString(undefined, {maximumFractionDigits: 2}) || '0'} AXM
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-emerald-200">
                        <p className="text-xs text-gray-500 mb-1">Active Stakes</p>
                        <p className="text-xl font-bold text-gray-900">{depositSummary.activeStaking || 0}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg p-6 border border-emerald-200 text-center">
                      <p className="text-gray-600 mb-3">No option consideration yet. Your $500 option fee will be staked here!</p>
                      <p className="text-sm text-emerald-700">Option fees are automatically staked when you enroll in a property.</p>
                    </div>
                  )}

                  {deposits.length > 0 && (
                    <div className="space-y-2">
                      {deposits.map((deposit: any, idx: number) => (
                        <div key={idx} className="bg-white rounded-lg p-4 border border-emerald-200 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full ${deposit.status === 'staking' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                            <div>
                              <p className="font-medium text-gray-900">Deposit #{deposit.depositId?.slice(-8) || idx + 1}</p>
                              <p className="text-xs text-gray-500">
                                {deposit.depositDate ? new Date(deposit.depositDate).toLocaleDateString() : 'Pending'}
                                {deposit.daysStaked && ` (${deposit.daysStaked} days staking)`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">${parseFloat(deposit.depositAmountUsd || 0).toLocaleString()}</p>
                            <p className="text-sm text-emerald-600">+{(deposit.calculatedRewards || 0).toFixed(4)} AXM earned</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 bg-emerald-100 rounded-lg p-4 border border-emerald-300">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">💡</span>
                      <div>
                        <p className="font-medium text-emerald-900">How it works</p>
                        <p className="text-sm text-emerald-700">
                          KeyGrow converts your $500 option consideration to AXM tokens and stakes them at 8% APR. 
                          All earnings accumulate toward your future down payment when you're ready to purchase.
                          This fee is credited toward your purchase price at closing.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {walletState.isConnected && enrollments.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-amber-100">
                <div className="text-6xl mb-4">📋</div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">No Enrollments Yet</h4>
                <p className="text-gray-600 mb-6">Browse available properties and start building equity!</p>
                <button
                  onClick={() => setActiveTab('properties')}
                  className="bg-amber-500 text-white px-6 py-3 rounded-lg hover:bg-amber-600 transition"
                >
                  Browse Properties
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="bg-white rounded-xl border border-amber-100 p-6 shadow-sm"
                  >
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="w-full md:w-48 h-32 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex items-center justify-center text-4xl">
                        🏠
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="font-bold text-lg text-gray-900">
                              {enrollment.property?.propertyName || 'Property #' + enrollment.propertyId}
                            </h4>
                            <p className="text-gray-600 text-sm">
                              {enrollment.property?.city}, {enrollment.property?.state}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            enrollment.status === 'active' 
                              ? 'bg-green-100 text-green-700'
                              : enrollment.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : enrollment.status === 'completed'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-500">Equity Owned</p>
                            <p className="font-bold text-amber-600 text-lg">
                              {parseFloat(enrollment.currentEquityPercent || '0').toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Payments Made</p>
                            <p className="font-bold text-gray-900">{enrollment.totalPaymentsMade}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Total AXM Paid</p>
                            <p className="font-bold text-gray-900">{formatAXM(enrollment.totalAxmPaid)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Next Payment</p>
                            <p className="font-bold text-gray-900">
                              {enrollment.nextPaymentDue 
                                ? new Date(enrollment.nextPaymentDue).toLocaleDateString()
                                : 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Progress to Full Ownership</span>
                            <span className="font-medium text-gray-900">
                              {parseFloat(enrollment.currentEquityPercent || '0').toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                              style={{ width: `${Math.min(100, parseFloat(enrollment.currentEquityPercent || '0'))}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-600 transition">
                            Make Payment
                          </button>
                          <button className="border border-amber-300 text-amber-600 px-4 py-2 rounded-lg text-sm hover:bg-amber-50 transition">
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'equity-tracker' && (
          <div>
            {!walletState.isConnected ? (
              <div className="text-center py-16 bg-white rounded-xl border border-amber-100">
                <div className="text-6xl mb-4">📊</div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Connect Your Wallet</h4>
                <p className="text-gray-600 mb-6">Track your equity portfolio</p>
                <button
                  onClick={() => connectMetaMask()}
                  className="bg-amber-500 text-white px-6 py-3 rounded-lg hover:bg-amber-600 transition"
                >
                  Connect Wallet
                </button>
              </div>
            ) : (
              <>
                {equitySummary && (
                  <div className="grid md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl border border-amber-100 p-6">
                      <p className="text-sm text-gray-500 mb-1">Total Equity Value</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(equitySummary.totalEquityValueUsd)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-amber-100 p-6">
                      <p className="text-sm text-gray-500 mb-1">Total AXM Paid</p>
                      <p className="text-2xl font-bold text-amber-600">{formatAXM(equitySummary.totalAxmPaid)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-amber-100 p-6">
                      <p className="text-sm text-gray-500 mb-1">Active Enrollments</p>
                      <p className="text-2xl font-bold text-gray-900">{equitySummary.activeEnrollments}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-amber-100 p-6">
                      <p className="text-sm text-gray-500 mb-1">Avg Equity %</p>
                      <p className="text-2xl font-bold text-green-600">{equitySummary.averageEquityPercent}%</p>
                    </div>
                  </div>
                )}

                {portfolio.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-xl border border-amber-100">
                    <div className="text-6xl mb-4">📈</div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">No Portfolio Yet</h4>
                    <p className="text-gray-600 mb-6">Enroll in a property to start tracking your equity</p>
                    <button
                      onClick={() => setActiveTab('properties')}
                      className="bg-amber-500 text-white px-6 py-3 rounded-lg hover:bg-amber-600 transition"
                    >
                      Browse Properties
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-amber-100 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-amber-50">
                        <tr>
                          <th className="text-left px-6 py-4 text-sm font-medium text-gray-600">Property</th>
                          <th className="text-left px-6 py-4 text-sm font-medium text-gray-600">Equity %</th>
                          <th className="text-left px-6 py-4 text-sm font-medium text-gray-600">Equity Value</th>
                          <th className="text-left px-6 py-4 text-sm font-medium text-gray-600">Progress</th>
                          <th className="text-left px-6 py-4 text-sm font-medium text-gray-600">Next Payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolio.map((item) => (
                          <tr key={item.enrollmentId} className="border-t border-amber-100">
                            <td className="px-6 py-4">
                              <p className="font-medium text-gray-900">{item.propertyName}</p>
                              <p className="text-sm text-gray-500">{item.city}, {item.state}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-bold text-amber-600">{item.currentEquityPercent.toFixed(2)}%</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-medium">{formatCurrency(item.equityValueUsd)}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-500"
                                  style={{ width: `${item.completionPercent}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{item.completionPercent.toFixed(0)}%</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {item.nextPaymentDue 
                                ? new Date(item.nextPaymentDue).toLocaleDateString()
                                : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>

      {showEnrollModal && selectedProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Enroll in KeyGrow</h3>
                  <p className="text-gray-600">{selectedProperty.propertyName}</p>
                </div>
                <button
                  onClick={() => {
                    setShowEnrollModal(false);
                    setSelectedProperty(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-amber-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Property Value</p>
                    <p className="font-bold">{formatCurrency(selectedProperty.totalValueUsd || selectedProperty.estimatedValueUsd)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Monthly Rent</p>
                    <p className="font-bold">{formatCurrency(selectedProperty.monthlyRentUsd)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{TOKENIZATION_CONFIG.equityBuildPercent}% of Rent to Equity</p>
                    <p className="font-bold text-amber-600">${selectedProperty.monthlyRentUsd ? Math.round(selectedProperty.monthlyRentUsd * TOKENIZATION_CONFIG.equityBuildPercent / 100) : 0}/mo</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Tokens Per Payment</p>
                    <p className="font-bold text-green-600">
                      ~{selectedProperty.monthlyRentUsd && (selectedProperty.totalValueUsd || selectedProperty.estimatedValueUsd)
                        ? Math.round((selectedProperty.monthlyRentUsd * TOKENIZATION_CONFIG.equityBuildPercent / 100) / ((selectedProperty.totalValueUsd || selectedProperty.estimatedValueUsd) / TOKENIZATION_CONFIG.sharesPerProperty))
                        : 0} tokens
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  value={enrollForm.tenantName}
                  onChange={(e) => setEnrollForm({ ...enrollForm, tenantName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={enrollForm.tenantEmail}
                  onChange={(e) => setEnrollForm({ ...enrollForm, tenantEmail: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Term Length (Months)
                </label>
                <select
                  value={enrollForm.agreedTermMonths}
                  onChange={(e) => setEnrollForm({ ...enrollForm, agreedTermMonths: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value={36}>36 months (3 years)</option>
                  <option value={60}>60 months (5 years)</option>
                  <option value={84}>84 months (7 years)</option>
                  <option value={120}>120 months (10 years)</option>
                  <option value={180}>180 months (15 years)</option>
                  <option value={240}>240 months (20 years)</option>
                </select>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <p className="font-medium text-gray-900 mb-2">Enrollment Summary</p>
                <div className="space-y-1 text-gray-600">
                  <p>Monthly Payment: {formatAXM(selectedProperty.monthlyRentAxm)}</p>
                  <p>Term: {enrollForm.agreedTermMonths} months</p>
                  <p>Equity per payment: {TOKENIZATION_CONFIG.equityBuildPercent}% of rent</p>
                  <p>
                    Est. tokens earned: {(() => {
                      const propertyValue = selectedProperty.totalValueUsd || selectedProperty.estimatedValueUsd || 0;
                      const monthlyRent = selectedProperty.monthlyRentUsd || 0;
                      const equityPerMonth = (monthlyRent * TOKENIZATION_CONFIG.equityBuildPercent / 100);
                      const tokenValueEach = propertyValue / TOKENIZATION_CONFIG.sharesPerProperty;
                      const tokensPerMonth = tokenValueEach > 0 ? Math.round(equityPerMonth / tokenValueEach) : 0;
                      const totalTokens = tokensPerMonth * enrollForm.agreedTermMonths;
                      const equityPercent = (totalTokens / TOKENIZATION_CONFIG.sharesPerProperty * 100).toFixed(1);
                      return `${totalTokens.toLocaleString()} tokens (${Math.min(100, parseFloat(equityPercent)).toFixed(1)}% ownership)`;
                    })()}
                  </p>
                </div>
              </div>

              {!walletState.isConnected ? (
                <button
                  onClick={() => connectMetaMask()}
                  className="w-full bg-amber-500 text-white py-4 rounded-lg font-medium hover:bg-amber-600 transition"
                >
                  Connect Wallet to Enroll
                </button>
              ) : !siweState?.isAuthenticated ? (
                <button
                  onClick={() => signInWithEthereum()}
                  className="w-full bg-amber-500 text-white py-4 rounded-lg font-medium hover:bg-amber-600 transition"
                >
                  Sign In to Enroll
                </button>
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling === selectedProperty.id}
                  className="w-full bg-amber-500 text-white py-4 rounded-lg font-medium hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {enrolling === selectedProperty.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                      Processing...
                    </span>
                  ) : (
                    'Confirm Enrollment'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-2xl">🏠</span>
            <span className="text-xl font-bold">KeyGrow</span>
            <span className="text-amber-400">by Axiom</span>
          </div>
          <p className="text-gray-400">
            Building wealth through homeownership, one payment at a time.
          </p>
          <div className="flex justify-center gap-6 mt-6 text-sm">
            <Link href="/" className="text-gray-400 hover:text-white">Home</Link>
            <Link href="/keygrow/sell" className="text-gray-400 hover:text-white">List Property</Link>
            <Link href="/governance" className="text-gray-400 hover:text-white">Governance</Link>
            <Link href="/axiom-nodes" className="text-gray-400 hover:text-white">DePIN Nodes</Link>
            <Link href="/dex" className="text-gray-400 hover:text-white">DEX</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
