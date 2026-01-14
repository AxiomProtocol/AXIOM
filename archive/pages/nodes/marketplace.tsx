import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { useWallet } from '../../components/WalletConnect/WalletContext';

interface NodeListing {
  id: number;
  nodeId: number;
  ownerAddress: string;
  monthlyRentAxm: string;
  minLeaseDays: number;
  maxLeaseDays: number;
  status: string;
  description: string;
  performanceScore: string;
  totalLeases: number;
  totalEarnings: string;
  listedAt: string;
  nodeTier?: number;
  nodeType?: number;
}

interface ActiveLease {
  id: number;
  nodeId: number;
  ownerAddress: string;
  monthlyRentAxm: string;
  startDate: string;
  endDate: string;
  status: string;
  nextPaymentDue: string;
}

const TIER_NAMES = ['Mobile Light', 'Desktop Standard', 'Desktop Advanced', 'Pro Infrastructure', 'Enterprise Premium'];
const TIER_ICONS = ['📱', '💻', '🖥️', '🏢', '🏛️'];
const NODE_TYPES = ['Lite', 'Standard', 'Validator', 'Storage', 'Compute', 'IoT', 'Network'];

interface UserNode {
  nodeId: number;
  tier: number;
  nodeType: number;
  isActive: boolean;
  isListed: boolean;
}

export default function NodeMarketplace() {
  const { walletState, connectMetaMask } = useWallet();
  const address = walletState?.address;
  const isConnected = walletState?.isConnected || false;
  const [activeTab, setActiveTab] = useState<'browse' | 'my-listings' | 'my-leases'>('browse');
  const [listings, setListings] = useState<NodeListing[]>([]);
  const [myListings, setMyListings] = useState<NodeListing[]>([]);
  const [myLeases, setMyLeases] = useState<ActiveLease[]>([]);
  const [loading, setLoading] = useState(true);
  const [showListModal, setShowListModal] = useState(false);
  const [userNodes, setUserNodes] = useState<UserNode[]>([]);
  const [listingForm, setListingForm] = useState({
    nodeId: '',
    monthlyRentAxm: '',
    minLeaseDays: '30',
    maxLeaseDays: '365',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    fetchData();
  }, [address]);

  useEffect(() => {
    if (showListModal && address) {
      fetchUserNodes();
    }
  }, [showListModal, address]);

  const fetchData = async () => {
    try {
      const [listingsRes, myListingsRes, myLeasesRes] = await Promise.all([
        fetch('/api/nodes/marketplace/listings'),
        address ? fetch(`/api/nodes/marketplace/my-listings?address=${address}`) : Promise.resolve(null),
        address ? fetch(`/api/nodes/marketplace/my-leases?address=${address}`) : Promise.resolve(null)
      ]);

      if (listingsRes.ok) {
        const data = await listingsRes.json();
        setListings(data.listings || []);
      }
      if (myListingsRes?.ok) {
        const data = await myListingsRes.json();
        setMyListings(data.listings || []);
      }
      if (myLeasesRes?.ok) {
        const data = await myLeasesRes.json();
        setMyLeases(data.leases || []);
      }
    } catch (error) {
      console.error('Error fetching marketplace data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserNodes = async () => {
    try {
      const res = await fetch(`/api/depin/user-nodes?address=${address}`);
      if (res.ok) {
        const data = await res.json();
        const listedNodeIds = myListings.map(l => l.nodeId);
        const availableNodes = (data.nodes || []).map((node: any) => ({
          ...node,
          isListed: listedNodeIds.includes(node.nodeId)
        }));
        setUserNodes(availableNodes);
      }
    } catch (error) {
      console.error('Error fetching user nodes:', error);
      setUserNodes([]);
    }
  };

  const handleSubmitListing = async () => {
    if (!listingForm.nodeId || !listingForm.monthlyRentAxm) {
      setSubmitError('Please select a node and set the monthly rent');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/nodes/marketplace/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: parseInt(listingForm.nodeId),
          ownerAddress: address,
          monthlyRentAxm: listingForm.monthlyRentAxm,
          minLeaseDays: parseInt(listingForm.minLeaseDays),
          maxLeaseDays: parseInt(listingForm.maxLeaseDays),
          description: listingForm.description
        })
      });

      if (res.ok) {
        setShowListModal(false);
        setListingForm({
          nodeId: '',
          monthlyRentAxm: '',
          minLeaseDays: '30',
          maxLeaseDays: '365',
          description: ''
        });
        fetchData();
      } else {
        const error = await res.json();
        setSubmitError(error.error || 'Failed to create listing');
      }
    } catch (error) {
      console.error('Error creating listing:', error);
      setSubmitError('Failed to create listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const stats = {
    totalListings: listings.length,
    activeLeases: myLeases.filter(l => l.status === 'active').length,
    avgMonthlyRent: listings.length > 0 
      ? (listings.reduce((sum, l) => sum + parseFloat(l.monthlyRentAxm), 0) / listings.length).toFixed(2)
      : '0',
    totalVolume: listings.reduce((sum, l) => sum + parseFloat(l.totalEarnings || '0'), 0).toFixed(2)
  };

  return (
    <Layout>
      <Head>
        <title>Node Marketplace | Axiom Smart City</title>
        <meta name="description" content="Lease or rent out DePIN nodes on Axiom's peer-to-peer marketplace" />
      </Head>

      <div className="bg-gradient-to-b from-amber-50/50 to-white">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-2 mb-4">
              <Link href="/" className="text-white/80 hover:text-white text-sm">Home</Link>
              <span className="text-white/50">/</span>
              <Link href="/axiom-nodes" className="text-white/80 hover:text-white text-sm">Axiom Nodes</Link>
              <span className="text-white/50">/</span>
              <span className="text-sm">Marketplace</span>
            </div>
            
            <h1 className="text-4xl font-bold mb-2">Node Leasing Marketplace</h1>
            <p className="text-white/90 text-lg">
              Earn passive income by leasing your nodes, or rent computing power from the network
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Available Nodes', value: stats.totalListings, icon: '🖥️', color: 'bg-green-50 border-green-200' },
              { label: 'Your Active Leases', value: stats.activeLeases, icon: '📄', color: 'bg-blue-50 border-blue-200' },
              { label: 'Avg Monthly Rent', value: `${stats.avgMonthlyRent} AXM`, icon: '💰', color: 'bg-amber-50 border-amber-200' },
              { label: 'Total Volume', value: `${stats.totalVolume} AXM`, icon: '📊', color: 'bg-purple-50 border-purple-200' }
            ].map((stat, i) => (
              <div key={i} className={`${stat.color} border rounded-xl p-6`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{stat.icon}</span>
                  <span className="text-gray-600 text-sm">{stat.label}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
            <div className="flex gap-2">
              {[
                { id: 'browse', label: 'Browse Nodes', icon: '🔍' },
                { id: 'my-listings', label: 'My Listings', icon: '📋' },
                { id: 'my-leases', label: 'My Leases', icon: '📄' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    activeTab === tab.id 
                      ? 'bg-amber-500 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {isConnected ? (
              <button
                onClick={() => setShowListModal(true)}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2 rounded-lg font-bold hover:from-amber-600 hover:to-orange-600 transition-all flex items-center gap-2"
              >
                + List Your Node
              </button>
            ) : (
              <button
                onClick={connectMetaMask}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2 rounded-lg font-bold hover:from-amber-600 hover:to-orange-600 transition-all flex items-center gap-2"
              >
                Connect Wallet to List
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-500">
              Loading marketplace data...
            </div>
          ) : activeTab === 'browse' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.length === 0 ? (
                <div className="col-span-full text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-5xl mb-4">🏪</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Nodes Listed Yet</h3>
                  <p className="text-gray-500">Be the first to list your node for lease!</p>
                </div>
              ) : (
                listings.map((listing) => (
                  <div key={listing.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{TIER_ICONS[listing.nodeTier || 0]}</span>
                          <span className="font-bold text-gray-900">
                            {TIER_NAMES[listing.nodeTier || 0]} Node
                          </span>
                        </div>
                        <div className="text-gray-500 text-sm">
                          Node #{listing.nodeId} | {NODE_TYPES[listing.nodeType || 0]}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        listing.status === 'available' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {listing.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-lg mb-4">
                      <div className="text-gray-500 text-xs mb-1">Monthly Rent</div>
                      <div className="text-amber-600 text-2xl font-bold">
                        {parseFloat(listing.monthlyRentAxm).toFixed(2)} AXM
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <div className="text-gray-500">Performance</div>
                        <div className="text-green-600 font-bold">
                          {parseFloat(listing.performanceScore || '0').toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Total Leases</div>
                        <div className="font-bold text-gray-900">{listing.totalLeases}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Min Duration</div>
                        <div className="text-gray-900">{listing.minLeaseDays} days</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Owner</div>
                        <div className="text-blue-600 text-sm">
                          {formatAddress(listing.ownerAddress)}
                        </div>
                      </div>
                    </div>

                    <button
                      disabled={listing.status !== 'available' || listing.ownerAddress.toLowerCase() === address?.toLowerCase()}
                      className={`w-full py-3 rounded-lg font-bold transition-all ${
                        listing.status === 'available' && listing.ownerAddress.toLowerCase() !== address?.toLowerCase()
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {listing.ownerAddress.toLowerCase() === address?.toLowerCase() 
                        ? 'Your Listing'
                        : listing.status === 'available' 
                          ? 'Lease This Node' 
                          : 'Currently Leased'}
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'my-listings' ? (
            <div>
              {!isConnected ? (
                <div className="text-center py-16 text-gray-500">
                  Connect your wallet to view your listings
                </div>
              ) : myListings.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-5xl mb-4">📋</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Listings</h3>
                  <p className="text-gray-500 mb-6">List your nodes to earn passive income</p>
                  <button
                    onClick={() => setShowListModal(true)}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-lg font-bold"
                  >
                    List Your First Node
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myListings.map((listing) => (
                    <div key={listing.id} className="bg-white border border-gray-200 rounded-xl p-6 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{TIER_ICONS[listing.nodeTier || 0]}</span>
                        <div>
                          <div className="font-bold text-gray-900">
                            {TIER_NAMES[listing.nodeTier || 0]} Node #{listing.nodeId}
                          </div>
                          <div className="text-gray-500 text-sm">
                            {parseFloat(listing.monthlyRentAxm).toFixed(2)} AXM/month
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-green-600 font-bold">
                            {parseFloat(listing.totalEarnings || '0').toFixed(2)} AXM earned
                          </div>
                          <div className="text-gray-500 text-sm">
                            {listing.totalLeases} total leases
                          </div>
                        </div>
                        <span className={`px-4 py-2 rounded-lg font-bold ${
                          listing.status === 'available' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {listing.status === 'available' ? 'Available' : 'Leased'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {!isConnected ? (
                <div className="text-center py-16 text-gray-500">
                  Connect your wallet to view your leases
                </div>
              ) : myLeases.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-5xl mb-4">📄</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Leases</h3>
                  <p className="text-gray-500 mb-6">Browse available nodes to start leasing</p>
                  <button
                    onClick={() => setActiveTab('browse')}
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-3 rounded-lg font-bold"
                  >
                    Browse Nodes
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myLeases.map((lease) => (
                    <div key={lease.id} className="bg-white border border-gray-200 rounded-xl p-6 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-gray-900 mb-1">Node #{lease.nodeId}</div>
                        <div className="text-gray-500 text-sm">
                          Owner: {formatAddress(lease.ownerAddress)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-amber-600 font-bold">
                          {parseFloat(lease.monthlyRentAxm).toFixed(2)} AXM/month
                        </div>
                        <div className="text-gray-500 text-sm">
                          Ends: {new Date(lease.endDate).toLocaleDateString()}
                        </div>
                      </div>
                      <span className={`px-4 py-2 rounded-lg font-bold ${
                        lease.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {lease.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* How It Works Section */}
          <div className="mt-16 border-t border-gray-200 pt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">How Node Leasing Works</h2>
            
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {[
                {
                  step: '1',
                  icon: '🖥️',
                  title: 'Own a Node',
                  description: 'Purchase an Axiom DePIN node from the Axiom Nodes page. Nodes come in 5 tiers from Mobile Light to Enterprise Premium, each with different capabilities and earning potential.'
                },
                {
                  step: '2',
                  icon: '📋',
                  title: 'List for Lease',
                  description: 'Set your monthly rent price in AXM tokens, minimum and maximum lease duration, and add a description. Your node remains under your control while generating passive income.'
                },
                {
                  step: '3',
                  icon: '💰',
                  title: 'Earn Rewards',
                  description: 'Receive monthly AXM payments automatically when someone leases your node. Track earnings, manage multiple listings, and adjust pricing anytime.'
                }
              ].map((item) => (
                <div key={item.step} className="bg-white border border-gray-200 rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                    {item.step}
                  </div>
                  <span className="text-4xl block mb-3">{item.icon}</span>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
              ))}
            </div>

            {/* Benefits Section */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
                <h3 className="font-bold text-amber-800 text-lg mb-4 flex items-center gap-2">
                  <span className="text-2xl">📈</span> Benefits for Node Owners
                </h3>
                <ul className="space-y-3">
                  {[
                    'Generate passive income from idle node capacity',
                    'Maintain full ownership and control of your node',
                    'Set your own pricing and lease terms',
                    'Track performance and earnings in real-time',
                    'Build reputation with high uptime scores',
                    'Withdraw earnings directly to your wallet'
                  ].map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="text-green-500 mt-1">✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-bold text-blue-800 text-lg mb-4 flex items-center gap-2">
                  <span className="text-2xl">🚀</span> Benefits for Renters
                </h3>
                <ul className="space-y-3">
                  {[
                    'Access computing power without hardware investment',
                    'Choose from various node tiers based on your needs',
                    'Flexible lease durations from days to months',
                    'Verified node performance and uptime scores',
                    'Pay only for what you use with AXM tokens',
                    'Scale up or down based on project requirements'
                  ].map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="text-green-500 mt-1">✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Node Tiers */}
            <div className="mb-12">
              <h3 className="font-bold text-gray-900 text-xl mb-6 text-center">Node Tiers & Pricing Guide</h3>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { tier: 'Mobile Light', icon: '📱', price: '0.02 ETH', rent: '50-200 AXM/mo', power: 'Basic' },
                  { tier: 'Desktop Standard', icon: '💻', price: '0.05 ETH', rent: '200-500 AXM/mo', power: 'Medium' },
                  { tier: 'Desktop Advanced', icon: '🖥️', price: '0.08 ETH', rent: '500-1000 AXM/mo', power: 'High' },
                  { tier: 'Pro Infrastructure', icon: '🏢', price: '0.15 ETH', rent: '1000-2500 AXM/mo', power: 'Very High' },
                  { tier: 'Enterprise Premium', icon: '🏛️', price: '0.25 ETH', rent: '2500-5000 AXM/mo', power: 'Maximum' }
                ].map((tier, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:border-amber-300 transition-colors">
                    <span className="text-3xl block mb-2">{tier.icon}</span>
                    <div className="font-bold text-gray-900 text-sm mb-1">{tier.tier}</div>
                    <div className="text-amber-600 text-xs font-medium mb-1">{tier.price}</div>
                    <div className="text-gray-500 text-xs">{tier.rent}</div>
                    <div className="mt-2 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">{tier.power}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 text-xl mb-6">Frequently Asked Questions</h3>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    q: 'How do I list my node for lease?',
                    a: 'Connect your wallet, click "List Your Node", select the node you want to lease, set your monthly price and lease terms, then confirm the listing. Your node will appear in the marketplace.'
                  },
                  {
                    q: 'What happens when someone leases my node?',
                    a: 'You receive the agreed AXM payment upfront to your wallet. The lessee gains access to your node\'s computing resources for the lease duration while you maintain ownership.'
                  },
                  {
                    q: 'Can I cancel a lease early?',
                    a: 'Leases are binding contracts. However, if both parties agree, a lease can be terminated early. Check the terms when creating or accepting a lease.'
                  },
                  {
                    q: 'How is node performance measured?',
                    a: 'Nodes are scored based on uptime, response time, and successful task completion. Higher scores attract more renters and can command premium prices.'
                  },
                  {
                    q: 'Are there fees for listing?',
                    a: 'Creating a listing is free. A small 2% platform fee is deducted from successful lease payments to support marketplace operations.'
                  },
                  {
                    q: 'What if my node goes offline during a lease?',
                    a: 'Extended downtime may result in partial refunds to the lessee. Maintaining high uptime protects your reputation and ensures full payments.'
                  }
                ].map((faq, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 text-sm mb-2">{faq.q}</h4>
                    <p className="text-gray-600 text-sm">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showListModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">List Your Node for Lease</h2>
                <button 
                  onClick={() => setShowListModal(false)}
                  className="text-white/80 hover:text-white text-2xl"
                >
                  &times;
                </button>
              </div>
              <p className="text-white/90 text-sm mt-1">Earn passive income by leasing your node</p>
            </div>

            <div className="p-6 space-y-6">
              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {submitError}
                </div>
              )}

              <div>
                <label className="block text-gray-700 font-medium mb-2">Select Node</label>
                {userNodes.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <p className="text-gray-500 text-sm">No nodes found. Purchase a node first from the <a href="/axiom-nodes" className="text-amber-600 hover:underline">Axiom Nodes</a> page.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userNodes.filter(n => !n.isListed).map((node) => (
                      <label 
                        key={node.nodeId}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                          listingForm.nodeId === String(node.nodeId)
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-gray-200 hover:border-amber-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="nodeId"
                          value={node.nodeId}
                          checked={listingForm.nodeId === String(node.nodeId)}
                          onChange={(e) => setListingForm(prev => ({ ...prev, nodeId: e.target.value }))}
                          className="text-amber-500"
                        />
                        <span className="text-xl">{TIER_ICONS[node.tier]}</span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{TIER_NAMES[node.tier]} #{node.nodeId}</div>
                          <div className="text-gray-500 text-xs">{NODE_TYPES[node.nodeType]} Node</div>
                        </div>
                        {node.isActive && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Active</span>
                        )}
                      </label>
                    ))}
                    {userNodes.filter(n => !n.isListed).length === 0 && (
                      <div className="text-gray-500 text-sm text-center py-4">All your nodes are already listed</div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Monthly Rent (AXM)</label>
                <input
                  type="number"
                  value={listingForm.monthlyRentAxm}
                  onChange={(e) => setListingForm(prev => ({ ...prev, monthlyRentAxm: e.target.value }))}
                  placeholder="e.g., 500"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <p className="text-gray-500 text-xs mt-1">Suggested: {listingForm.nodeId ? 
                  ['50-200', '200-500', '500-1000', '1000-2500', '2500-5000'][userNodes.find(n => n.nodeId === parseInt(listingForm.nodeId))?.tier || 0] 
                  : '50-5000'} AXM based on tier</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Min Lease (Days)</label>
                  <input
                    type="number"
                    value={listingForm.minLeaseDays}
                    onChange={(e) => setListingForm(prev => ({ ...prev, minLeaseDays: e.target.value }))}
                    placeholder="30"
                    min="1"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Max Lease (Days)</label>
                  <input
                    type="number"
                    value={listingForm.maxLeaseDays}
                    onChange={(e) => setListingForm(prev => ({ ...prev, maxLeaseDays: e.target.value }))}
                    placeholder="365"
                    min="1"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Description (Optional)</label>
                <textarea
                  value={listingForm.description}
                  onChange={(e) => setListingForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your node's capabilities, uptime history, etc."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-medium text-amber-800 mb-2">Listing Summary</h4>
                <div className="text-sm text-amber-700 space-y-1">
                  <p>Platform fee: 2% of lease payments</p>
                  <p>Your node remains active and under your control</p>
                  <p>You can delist anytime if the node is not leased</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowListModal(false)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitListing}
                  disabled={submitting || !listingForm.nodeId || !listingForm.monthlyRentAxm}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-bold hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'List Node'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
