import { useState, useEffect } from 'react';
import { useWallet } from '../../components/WalletConnect/WalletContext';
import Head from 'next/head';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface SellerProfile {
  id: number;
  sellerId: string;
  walletAddress: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseState: string;
  companyType: string;
  website: string;
  totalListings: number;
  totalSales: number;
  rating: number;
  status: string;
  kycVerified: boolean;
  createdAt: string;
}

interface PropertyListing {
  id: number;
  propertyName: string;
  propertyType: string;
  city: string;
  state: string;
  totalValueUsd: string;
  monthlyRentUsd: string;
  status: string;
  createdAt: string;
}

const PROPERTY_TYPES = [
  { value: 'single_family', label: 'Single Family Home' },
  { value: 'multi_family', label: 'Multi-Family (2-4 units)' },
  { value: 'condo', label: 'Condominium' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'land', label: 'Land / Vacant Lot' },
  { value: 'commercial', label: 'Commercial Property' },
  { value: 'manufactured', label: 'Manufactured Home' }
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export default function SellerPortal() {
  const { walletState, signInWithEthereum, siweState } = useWallet();
  const { address, isConnected } = walletState;
  const [activeTab, setActiveTab] = useState<'overview' | 'register' | 'listings' | 'add' | 'analytics'>('overview');
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [sellerForm, setSellerForm] = useState({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    licenseState: '',
    companyType: 'individual',
    website: ''
  });

  const [propertyForm, setPropertyForm] = useState({
    propertyName: '',
    propertyType: 'single_family',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    totalValueUsd: '',
    monthlyRentUsd: '',
    equityPercentPerPayment: '0.75',
    minimumTermMonths: '60',
    maximumTermMonths: '240',
    description: '',
    bedrooms: '',
    bathrooms: '',
    squareFeet: '',
    yearBuilt: '',
    imageUrl: ''
  });

  const [enrichedData, setEnrichedData] = useState<any>(null);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    if (isConnected && address && siweState.isAuthenticated) {
      fetchSellerProfile();
    } else {
      setLoading(false);
    }
  }, [isConnected, address, siweState.isAuthenticated]);

  const fetchSellerProfile = async () => {
    try {
      const response = await fetch(`/api/keygrow/sellers?walletAddress=${address}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.seller) {
          setSellerProfile(data.seller);
          setActiveTab('listings');
          fetchListings();
        }
      }
    } catch (error) {
      console.error('Error fetching seller profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchListings = async () => {
    try {
      const response = await fetch(`/api/keygrow/properties?ownerAddress=${address}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setListings(data.properties || []);
        }
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  };

  const handleSignIn = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }
    try {
      await signInWithEthereum();
      toast.success('Signed in successfully');
    } catch (error) {
      toast.error('Failed to sign in');
    }
  };

  const handleRegisterSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !siweState.isAuthenticated) {
      toast.error('Please sign in with your wallet first');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/keygrow/sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          walletAddress: address,
          ...sellerForm
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Seller profile created! Pending verification.');
        setSellerProfile(data.seller);
        setActiveTab('listings');
      } else {
        toast.error(data.error || 'Failed to create seller profile');
      }
    } catch (error) {
      toast.error('Failed to register as seller');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnrichAddress = async () => {
    if (!propertyForm.addressLine1 || !propertyForm.city || !propertyForm.state) {
      toast.error('Please enter address, city, and state first');
      return;
    }

    setEnriching(true);
    try {
      const response = await fetch('/api/keygrow/property-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressLine1: propertyForm.addressLine1,
          city: propertyForm.city,
          state: propertyForm.state,
          zipCode: propertyForm.zipCode
        })
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        setEnrichedData(data.data);
        setPropertyForm(prev => ({
          ...prev,
          totalValueUsd: data.data.estimatedValueUsd?.toString() || prev.totalValueUsd,
          monthlyRentUsd: data.data.estimatedRentUsd?.toString() || prev.monthlyRentUsd,
          bedrooms: data.data.bedrooms?.toString() || prev.bedrooms,
          bathrooms: data.data.bathrooms?.toString() || prev.bathrooms,
          squareFeet: data.data.squareFeet?.toString() || prev.squareFeet,
          yearBuilt: data.data.yearBuilt?.toString() || prev.yearBuilt
        }));
        toast.success('Property data enriched from market sources');
      } else {
        toast(data.message || 'No additional property data found');
      }
    } catch (error) {
      toast.error('Failed to fetch property data');
    } finally {
      setEnriching(false);
    }
  };

  const handleListProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !siweState.isAuthenticated) {
      toast.error('Please sign in with your wallet first');
      return;
    }

    if (!sellerProfile || sellerProfile.status !== 'verified') {
      toast.error('Your seller account must be verified before listing properties');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/keygrow/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ownerAddress: address,
          ...propertyForm
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Property listed successfully!');
        setPropertyForm({
          propertyName: '',
          propertyType: 'single_family',
          addressLine1: '',
          addressLine2: '',
          city: '',
          state: '',
          zipCode: '',
          totalValueUsd: '',
          monthlyRentUsd: '',
          equityPercentPerPayment: '0.75',
          minimumTermMonths: '60',
          maximumTermMonths: '240',
          description: '',
          bedrooms: '',
          bathrooms: '',
          squareFeet: '',
          yearBuilt: '',
          imageUrl: ''
        });
        setEnrichedData(null);
        fetchListings();
        setActiveTab('listings');
      } else {
        toast.error(data.error || 'Failed to list property');
      }
    } catch (error) {
      toast.error('Failed to list property');
    } finally {
      setSubmitting(false);
    }
  };

  const HowItWorksSection = () => (
    <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">How KeyGrow Seller Portal Works</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="text-center p-4">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">1</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Register as Seller</h3>
          <p className="text-sm text-gray-600">Connect wallet, verify identity, and create your seller profile</p>
        </div>
        <div className="text-center p-4">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">2</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">List Your Property</h3>
          <p className="text-sm text-gray-600">Enter property details and set rent-to-own terms with auto-enriched data</p>
        </div>
        <div className="text-center p-4">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">3</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Property Tokenized</h3>
          <p className="text-sm text-gray-600">Your property becomes 100,000 ERC-1155 fractional shares on blockchain</p>
        </div>
        <div className="text-center p-4">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">4</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Earn Passive Income</h3>
          <p className="text-sm text-gray-600">Receive monthly rent in AXM while tenant builds equity to ownership</p>
        </div>
      </div>
    </div>
  );

  const BenefitsSection = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
        <div className="text-3xl mb-3">💰</div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Guaranteed Monthly Income</h3>
        <p className="text-gray-600 text-sm">Receive consistent rent payments in AXM tokens with blockchain-verified transactions</p>
        <div className="mt-4 text-2xl font-bold text-green-600">$1,200+/mo</div>
        <div className="text-xs text-gray-500">Average rent received</div>
      </div>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="text-3xl mb-3">🏠</div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Tokenized Property Rights</h3>
        <p className="text-gray-600 text-sm">Your property is tokenized into 100,000 ERC-1155 shares for transparent ownership transfer</p>
        <div className="mt-4 text-2xl font-bold text-blue-600">100,000</div>
        <div className="text-xs text-gray-500">Shares per property</div>
      </div>
      <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200">
        <div className="text-3xl mb-3">📈</div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Buyer Option Consideration</h3>
        <p className="text-gray-600 text-sm">$500 option fee from buyers is staked in AXM to earn rewards, growing until it becomes part of their down payment</p>
        <div className="mt-4 text-2xl font-bold text-purple-600">$500</div>
        <div className="text-xs text-gray-500">Staked in AXM for down payment</div>
      </div>
    </div>
  );

  const TokenizationExplainer = () => (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 text-white mb-8">
      <div className="flex flex-col lg:flex-row items-center gap-8">
        <div className="lg:w-1/2">
          <h2 className="text-2xl font-bold mb-4">ERC-1155 Property Tokenization</h2>
          <p className="text-gray-300 mb-4">
            Each property listed on KeyGrow is tokenized into <span className="text-amber-400 font-bold">100,000 fractional shares</span> using 
            the ERC-1155 multi-token standard on Arbitrum blockchain.
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-amber-400">&#10003;</span>
              <span className="text-sm">Each share = 0.001% ownership of the property</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-400">&#10003;</span>
              <span className="text-sm">Tenants earn shares through 20% of monthly rent payments</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-400">&#10003;</span>
              <span className="text-sm">Shares are tradeable on Axiom DEX for liquidity</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-400">&#10003;</span>
              <span className="text-sm">100% ownership = full property transfer to tenant</span>
            </li>
          </ul>
        </div>
        <div className="lg:w-1/2">
          <div className="bg-gray-700/50 rounded-xl p-6">
            <h3 className="text-amber-400 font-semibold mb-4">Example: $200,000 Home</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-600 pb-2">
                <span>Total Shares:</span>
                <span className="font-mono">100,000</span>
              </div>
              <div className="flex justify-between border-b border-gray-600 pb-2">
                <span>Share Price:</span>
                <span className="font-mono">$2.00 each</span>
              </div>
              <div className="flex justify-between border-b border-gray-600 pb-2">
                <span>Monthly Rent:</span>
                <span className="font-mono">$1,500</span>
              </div>
              <div className="flex justify-between border-b border-gray-600 pb-2">
                <span>20% to Equity:</span>
                <span className="font-mono text-green-400">$300/month</span>
              </div>
              <div className="flex justify-between border-b border-gray-600 pb-2">
                <span>Shares Earned:</span>
                <span className="font-mono text-green-400">150/month</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="font-semibold">You Receive:</span>
                <span className="font-mono text-amber-400">$1,200/month</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const ExampleListings = () => (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Be Among the First to List</h2>
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 border border-amber-200 text-center">
        <div className="text-6xl mb-4">🏡</div>
        <h3 className="text-xl font-bold text-gray-900 mb-3">No Properties Listed Yet</h3>
        <p className="text-gray-600 mb-6 max-w-lg mx-auto">
          Be a pioneer! List your property on the first-of-its-kind rent-to-own platform with tokenized ownership. 
          Connect your wallet and register as a seller to get started.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <div className="bg-white rounded-xl px-6 py-4 shadow-sm">
            <div className="text-2xl font-bold text-amber-600">100,000</div>
            <div className="text-xs text-gray-500">Shares per Property</div>
          </div>
          <div className="bg-white rounded-xl px-6 py-4 shadow-sm">
            <div className="text-2xl font-bold text-green-600">20%</div>
            <div className="text-xs text-gray-500">Rent to Equity</div>
          </div>
          <div className="bg-white rounded-xl px-6 py-4 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">$500</div>
            <div className="text-xs text-gray-500">Option Consideration</div>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          The $500 option consideration from tenants is staked in AXM tokens, earning rewards until credited toward their purchase price at closing.
        </p>
      </div>
    </div>
  );

  const WalletStatusBanner = () => {
    if (!isConnected) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🔗</div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">Connect Your Wallet to Get Started</h3>
              <p className="text-gray-600 text-sm">Use the "Connect Wallet" button in the top navigation to connect MetaMask</p>
            </div>
          </div>
        </div>
      );
    }

    if (!siweState.isAuthenticated) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{siweState.isAuthenticating ? '⏳' : '✍️'}</div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">
                {siweState.isAuthenticating ? 'Waiting for Signature...' : 'Sign In to Verify Your Wallet'}
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Wallet connected: <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              </p>
              {siweState.isAuthenticating ? (
                <div className="space-y-2">
                  <p className="text-blue-700 text-sm font-medium animate-pulse">
                    Please check MetaMask for a signature request popup
                  </p>
                  <p className="text-gray-500 text-xs">
                    If you don't see a popup, click the MetaMask extension icon in your browser
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Sign In with Ethereum
                </button>
              )}
              {siweState.authError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{siweState.authError}</p>
                  <button
                    onClick={handleSignIn}
                    className="mt-2 px-4 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Retry Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="text-4xl">&#10003;</div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">Wallet Verified</h3>
            <p className="text-gray-600 text-sm">
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              {sellerProfile ? (
                <span className="ml-2">- Seller Profile Active</span>
              ) : (
                <span className="ml-2">- Ready to register as seller</span>
              )}
            </p>
          </div>
          {!sellerProfile && (
            <button
              onClick={() => setActiveTab('register')}
              className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium"
            >
              Register Now
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Seller Portal | KeyGrow Rent-to-Own</title>
        <meta name="description" content="List your property for rent-to-own on KeyGrow" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Link href="/keygrow" className="inline-flex items-center text-white/80 hover:text-white text-sm mb-6 gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back to KeyGrow
            </Link>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-4xl font-bold">Seller Portal</h1>
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">First of Its Kind</span>
                </div>
                <p className="text-xl text-white/90 max-w-2xl">
                  Tokenize your property into 100,000 ERC-1155 fractional shares and earn passive income while tenants build equity toward ownership
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3">
                  <div className="text-3xl font-bold">100K</div>
                  <div className="text-xs text-white/80">Shares/Property</div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3">
                  <div className="text-3xl font-bold">0.75%+</div>
                  <div className="text-xs text-white/80">Equity/Payment</div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3">
                  <div className="text-3xl font-bold">$500</div>
                  <div className="text-xs text-white/80">Option Consideration</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <WalletStatusBanner />

          {isConnected && siweState.isAuthenticated && sellerProfile && (
            <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === 'overview' ? 'text-amber-600 border-b-2 border-amber-500' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('listings')}
                className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === 'listings' ? 'text-amber-600 border-b-2 border-amber-500' : 'text-gray-500 hover:text-gray-700'}`}
              >
                My Listings
              </button>
              <button
                onClick={() => setActiveTab('add')}
                className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === 'add' ? 'text-amber-600 border-b-2 border-amber-500' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Add Property
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-6 py-3 font-medium whitespace-nowrap ${activeTab === 'analytics' ? 'text-amber-600 border-b-2 border-amber-500' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Analytics
              </button>
            </div>
          )}

          {(activeTab === 'overview' || !sellerProfile) && (
            <>
              <HowItWorksSection />
              <BenefitsSection />
              <TokenizationExplainer />
              <ExampleListings />
            </>
          )}

          {isConnected && siweState.isAuthenticated && !sellerProfile && activeTab === 'register' && (
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Register as a Property Seller</h2>
              <form onSubmit={handleRegisterSeller} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name *</label>
                    <input
                      type="text"
                      required
                      value={sellerForm.contactName}
                      onChange={(e) => setSellerForm({...sellerForm, contactName: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      required
                      value={sellerForm.email}
                      onChange={(e) => setSellerForm({...sellerForm, email: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                    <input
                      type="text"
                      value={sellerForm.businessName}
                      onChange={(e) => setSellerForm({...sellerForm, businessName: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={sellerForm.phone}
                      onChange={(e) => setSellerForm({...sellerForm, phone: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Type</label>
                    <select
                      value={sellerForm.companyType}
                      onChange={(e) => setSellerForm({...sellerForm, companyType: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="individual">Individual Owner</option>
                      <option value="llc">LLC</option>
                      <option value="corporation">Corporation</option>
                      <option value="trust">Trust</option>
                      <option value="partnership">Partnership</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                    <input
                      type="url"
                      value={sellerForm.website}
                      onChange={(e) => setSellerForm({...sellerForm, website: e.target.value})}
                      placeholder="https://"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Real Estate License #</label>
                    <input
                      type="text"
                      value={sellerForm.licenseNumber}
                      onChange={(e) => setSellerForm({...sellerForm, licenseNumber: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">License State</label>
                    <select
                      value={sellerForm.licenseState}
                      onChange={(e) => setSellerForm({...sellerForm, licenseState: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="">Select State</option>
                      {US_STATES.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium"
                >
                  {submitting ? 'Registering...' : 'Register as Seller'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'listings' && sellerProfile && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">My Property Listings</h2>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    sellerProfile.status === 'verified' ? 'bg-green-100 text-green-800' :
                    sellerProfile.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {sellerProfile.status.charAt(0).toUpperCase() + sellerProfile.status.slice(1)}
                  </span>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                  >
                    + Add Property
                  </button>
                </div>
              </div>

              {listings.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                  <div className="text-6xl mb-4">🏠</div>
                  <p className="text-gray-600 mb-4">You haven't listed any properties yet.</p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                  >
                    List Your First Property
                  </button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {listings.map((listing) => (
                    <div key={listing.id} className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">{listing.propertyName}</h3>
                          <p className="text-gray-600">{listing.city}, {listing.state}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {listing.propertyType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          listing.status === 'available' ? 'bg-green-100 text-green-800' :
                          listing.status === 'enrolled' ? 'bg-blue-100 text-blue-800' :
                          listing.status === 'tokenized' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex gap-8 mt-4">
                        <div>
                          <span className="text-sm text-gray-500">Property Value</span>
                          <p className="text-lg font-semibold">${parseFloat(listing.totalValueUsd).toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Monthly Rent</span>
                          <p className="text-lg font-semibold">${parseFloat(listing.monthlyRentUsd).toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Share Price</span>
                          <p className="text-lg font-semibold">${(parseFloat(listing.totalValueUsd) / 100000).toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Total Shares</span>
                          <p className="text-lg font-semibold">100,000</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'add' && sellerProfile && (
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">List a New Property</h2>
              
              {sellerProfile.status !== 'verified' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-yellow-800">
                    Your seller account is pending verification. You can prepare listings but cannot publish until verified.
                  </p>
                </div>
              )}

              <form onSubmit={handleListProperty} className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Property Name *</label>
                      <input
                        type="text"
                        required
                        value={propertyForm.propertyName}
                        onChange={(e) => setPropertyForm({...propertyForm, propertyName: e.target.value})}
                        placeholder="e.g., Modern Ranch Home"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Property Type *</label>
                      <select
                        value={propertyForm.propertyType}
                        onChange={(e) => setPropertyForm({...propertyForm, propertyType: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      >
                        {PROPERTY_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Street Address *</label>
                      <input
                        type="text"
                        required
                        value={propertyForm.addressLine1}
                        onChange={(e) => setPropertyForm({...propertyForm, addressLine1: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                      <input
                        type="text"
                        required
                        value={propertyForm.city}
                        onChange={(e) => setPropertyForm({...propertyForm, city: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                      <select
                        required
                        value={propertyForm.state}
                        onChange={(e) => setPropertyForm({...propertyForm, state: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      >
                        <option value="">Select State</option>
                        {US_STATES.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code *</label>
                      <input
                        type="text"
                        required
                        value={propertyForm.zipCode}
                        onChange={(e) => setPropertyForm({...propertyForm, zipCode: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleEnrichAddress}
                        disabled={enriching}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                      >
                        {enriching ? 'Fetching Data...' : 'Auto-Fill Property Data'}
                      </button>
                    </div>
                  </div>
                  {enrichedData && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-800 text-sm">
                        Property data enriched from ATTOM & RentCast market data
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Property Value (USD) *</label>
                      <input
                        type="number"
                        required
                        min="50000"
                        value={propertyForm.totalValueUsd}
                        onChange={(e) => setPropertyForm({...propertyForm, totalValueUsd: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Rent (USD) *</label>
                      <input
                        type="number"
                        required
                        min="500"
                        value={propertyForm.monthlyRentUsd}
                        onChange={(e) => setPropertyForm({...propertyForm, monthlyRentUsd: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Equity % per Payment</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.5"
                        max="1.5"
                        value={propertyForm.equityPercentPerPayment}
                        onChange={(e) => setPropertyForm({...propertyForm, equityPercentPerPayment: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Features</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
                      <input
                        type="number"
                        min="0"
                        value={propertyForm.bedrooms}
                        onChange={(e) => setPropertyForm({...propertyForm, bedrooms: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bathrooms</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={propertyForm.bathrooms}
                        onChange={(e) => setPropertyForm({...propertyForm, bathrooms: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Square Feet</label>
                      <input
                        type="number"
                        min="0"
                        value={propertyForm.squareFeet}
                        onChange={(e) => setPropertyForm({...propertyForm, squareFeet: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Year Built</label>
                      <input
                        type="number"
                        min="1800"
                        max="2025"
                        value={propertyForm.yearBuilt}
                        onChange={(e) => setPropertyForm({...propertyForm, yearBuilt: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    rows={4}
                    value={propertyForm.description}
                    onChange={(e) => setPropertyForm({...propertyForm, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Describe your property..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || sellerProfile.status !== 'verified'}
                  className="w-full py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium"
                >
                  {submitting ? 'Listing Property...' : 'List Property for Rent-to-Own'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'analytics' && sellerProfile && (
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Seller Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
                  <div className="text-sm text-gray-600 mb-1">Total Listings</div>
                  <div className="text-3xl font-bold text-gray-900">{listings.length}</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <div className="text-sm text-gray-600 mb-1">Active Tenants</div>
                  <div className="text-3xl font-bold text-gray-900">{listings.filter(l => l.status === 'enrolled').length}</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <div className="text-sm text-gray-600 mb-1">Total Value</div>
                  <div className="text-3xl font-bold text-gray-900">
                    ${listings.reduce((sum, l) => sum + parseFloat(l.totalValueUsd || '0'), 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200">
                  <div className="text-sm text-gray-600 mb-1">Monthly Income</div>
                  <div className="text-3xl font-bold text-gray-900">
                    ${listings.filter(l => l.status === 'enrolled').reduce((sum, l) => sum + parseFloat(l.monthlyRentUsd || '0') * 0.8, 0).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="text-center text-gray-500 py-8">
                Detailed analytics coming soon...
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-900 text-white py-12 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Ready to Tokenize Your Property?</h2>
              <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
                Join the first-of-its-kind rent-to-own platform with blockchain-verified tokenization.
                Turn your property into a passive income stream while helping tenants achieve homeownership.
              </p>
              {!isConnected ? (
                <p className="text-amber-400">Connect your wallet to get started</p>
              ) : !siweState.isAuthenticated ? (
                <button
                  onClick={handleSignIn}
                  className="px-8 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium"
                >
                  Sign In with Ethereum
                </button>
              ) : !sellerProfile ? (
                <button
                  onClick={() => setActiveTab('register')}
                  className="px-8 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium"
                >
                  Register as Seller
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('add')}
                  className="px-8 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium"
                >
                  List a Property
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
