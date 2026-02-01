import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { ethers } from 'ethers';
import * as contracts from '../shared/contracts';
import { getProvider } from '../contracts/utils/contractHelpers';

interface NodeType {
  id: string;
  name: string;
  price: number;
  priceUSD: string;
  services: string[];
  monthlyEarnings: {
    min: number;
    max: number;
  };
  roi: string;
  color: string;
}

interface UserNode {
  tokenId: number;
  nodeType: string;
  activatedAt: number;
  totalEarnings: number;
  status: 'active' | 'inactive';
}

const NODE_TYPES: NodeType[] = [
  {
    id: 'basic',
    name: 'Basic Storage Node',
    price: 0.05,
    priceUSD: '$100-150',
    services: ['Decentralized Storage', 'Basic Oracle Relay'],
    monthlyEarnings: { min: 20, max: 50 },
    roi: '6-8 months',
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'advanced',
    name: 'Real Estate & Logistics Node',
    price: 0.15,
    priceUSD: '$250-350',
    services: [
      'Decentralized Storage',
      'Property Data Processing',
      'Trucking/Logistics Relay',
      'RWA Price Oracle'
    ],
    monthlyEarnings: { min: 60, max: 120 },
    roi: '4-6 months',
    color: 'from-purple-500 to-purple-600'
  },
  {
    id: 'premium',
    name: 'Smart City Infrastructure Node',
    price: 0.25,
    priceUSD: '$400-500',
    services: [
      'Decentralized Storage',
      'Water/Energy Metering',
      'Land Parcel Surveying',
      'Wall Street/RWA Feeds',
      'IoT Gateway',
      'Property Management'
    ],
    monthlyEarnings: { min: 100, max: 200 },
    roi: '2-5 months',
    color: 'from-yellow-500 to-yellow-600'
  }
];

// Enhanced income streams with real-world asset integration
const INCOME_STREAMS = [
  {
    name: 'Decentralized Storage Fees',
    description: 'Earn when residents/businesses store files, documents, property deeds',
    icon: '💾',
    contract: 'DePINNodeSuite',
    avgMonthly: '$25-60',
    rwaType: 'Digital Assets'
  },
  {
    name: 'Property Data Processing',
    description: 'Process real estate transactions, title transfers, rental payments',
    icon: '🏘️',
    contract: 'LandAndAssetRegistry',
    avgMonthly: '$30-70',
    rwaType: 'Real Estate'
  },
  {
    name: 'Utility Metering Fees',
    description: 'Process water/energy/bandwidth usage data for 1,000-acre smart city',
    icon: '💧',
    contract: 'UtilityAndMeteringHub',
    avgMonthly: '$20-50',
    rwaType: 'Smart City Utilities'
  },
  {
    name: 'Trucking/Logistics Data',
    description: 'Relay GPS, delivery routes, freight data from Sovran Logistics fleet',
    icon: '🚛',
    contract: 'TransportAndLogisticsHub',
    avgMonthly: '$15-40',
    rwaType: 'Transportation'
  },
  {
    name: 'Wall Street/RWA Oracle',
    description: 'Provide price feeds for tokenized stocks, commodities, real estate',
    icon: '📊',
    contract: 'MarketsAndListingsHub',
    avgMonthly: '$25-55',
    rwaType: 'Financial Assets'
  },
  {
    name: 'IoT Gateway Fees',
    description: 'Process smart sensors: parking meters, traffic lights, building HVAC',
    icon: '📡',
    contract: 'IoTOracleNetwork',
    avgMonthly: '$20-45',
    rwaType: 'IoT Infrastructure'
  },
  {
    name: 'Land Parcel Surveying',
    description: 'Validate GPS coordinates, zoning data, property boundaries',
    icon: '🗺️',
    contract: 'LandAndAssetRegistry',
    avgMonthly: '$10-30',
    rwaType: 'Land Assets'
  },
  {
    name: 'Staking Rewards',
    description: 'Stake AXM tokens to boost node priority and earn yield',
    icon: '💰',
    contract: 'StakingAndEmissionsHub',
    avgMonthly: '$15-35',
    rwaType: 'Token Economics'
  },
  {
    name: 'Referral Bonuses',
    description: 'Earn 5% of sale price when someone buys a node with your code',
    icon: '🎁',
    contract: 'DePINNodeSuite',
    avgMonthly: '$10-25',
    rwaType: 'Network Growth'
  },
  {
    name: 'Node Marketplace Appreciation',
    description: 'Resell nodes on secondary market as demand increases',
    icon: '📈',
    contract: 'DePINNodeSuite',
    avgMonthly: 'Variable',
    rwaType: 'Capital Appreciation'
  }
];

export default function AxiomDePINNodePage() {
  const { account, connectWallet, isConnected, switchToArbitrum, networkInfo } = useWallet();
  const [selectedNode, setSelectedNode] = useState<NodeType | null>(null);
  const [userNodes, setUserNodes] = useState<UserNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [axmBalance, setAxmBalance] = useState('0');
  const [currentChainId, setCurrentChainId] = useState<string | null>(null);
  const [showNetworkWarning, setShowNetworkWarning] = useState(false);

  // Check if on Arbitrum One
  const isOnArbitrumOne = currentChainId === contracts.NETWORK_CONFIG.chainIdHex;

  // Check network whenever wallet connects/disconnects
  useEffect(() => {
    if (isConnected) {
      checkCurrentNetwork();
    } else {
      // Reset network state when disconnected
      setCurrentChainId(null);
      setShowNetworkWarning(false);
    }
  }, [isConnected, account]);

  // Subscribe to chain changes on mount
  useEffect(() => {
    // Subscribe to network changes via window.ethereum
    if (window.ethereum) {
      const handleChainChanged = (chainIdHex: string) => {
        console.log('Network changed to:', chainIdHex);
        setCurrentChainId(chainIdHex);
        setShowNetworkWarning(chainIdHex !== contracts.NETWORK_CONFIG.chainIdHex);
        
        // Reload data when network switches to Arbitrum
        if (chainIdHex === contracts.NETWORK_CONFIG.chainIdHex && account) {
          loadUserNodes();
          loadAxmBalance();
        }
      };
      
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [account]);

  // Load user data when on correct network
  useEffect(() => {
    if (account && isOnArbitrumOne) {
      loadUserNodes();
      loadAxmBalance();
    }
  }, [account, isOnArbitrumOne]);

  const checkCurrentNetwork = async () => {
    try {
      const provider = await getProvider();
      if (!provider) return;
      
      const network = await provider.getNetwork();
      const chainIdHex = '0x' + network.chainId.toString(16);
      setCurrentChainId(chainIdHex);
      setShowNetworkWarning(chainIdHex !== contracts.NETWORK_CONFIG.chainIdHex);
    } catch (error) {
      console.error('Error checking network:', error);
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      await switchToArbitrum();
      // Network change event will update state automatically
    } catch (error) {
      console.error('Failed to switch network:', error);
      alert('Failed to switch to Arbitrum One. Please switch manually in your wallet.');
    }
  };

  const loadUserNodes = async () => {
    try {
      const response = await fetch(`/api/depin/nodes/${account}`);
      if (response.ok) {
        const data = await response.json();
        setUserNodes(data.nodes || []);
        setTotalEarnings(data.totalEarnings || 0);
      }
    } catch (error) {
      console.error('Error loading nodes:', error);
    }
  };

  const loadAxmBalance = async () => {
    try {
      const provider = await getProvider();
      if (!provider) return;
      
      const tokenContract = new ethers.Contract(
        contracts.CORE_CONTRACTS.AXM_TOKEN,
        ['function balanceOf(address) view returns (uint256)'],
        provider
      );
      
      const balance = await tokenContract.balanceOf(account);
      setAxmBalance(ethers.utils.formatEther(balance));
    } catch (error) {
      console.error('Error loading AXM balance:', error);
    }
  };

  const purchaseNode = async (nodeType: NodeType) => {
    if (!account) {
      alert('Please connect your wallet first');
      return;
    }

    // CRITICAL: Enforce Arbitrum One network
    if (!isOnArbitrumOne) {
      alert(`⚠️ Wrong Network!\n\nYou must be on Arbitrum One to purchase nodes.\n\nCurrent Network: ${networkInfo.chainName || 'Unknown'}\nRequired Network: Arbitrum One (Chain ID: 42161)\n\nPlease click "Switch to Arbitrum One" button above.`);
      return;
    }

    setLoading(true);
    try {
      const provider = await getProvider();
      if (!provider) throw new Error('Wallet not connected');
      
      // Double-check chain ID before transaction using context-provided provider
      const network = await provider.getNetwork();
      if (network.chainId !== contracts.NETWORK_CONFIG.chainId) {
        throw new Error(`Invalid network. Must be on Arbitrum One (Chain ID: ${contracts.NETWORK_CONFIG.chainId})`);
      }

      const signer = provider.getSigner();
      const nodeLicenseContract = new ethers.Contract(
        contracts.DEFI_UTILITY_CONTRACTS.DEPIN_NODES,
        [
          'function mintNode(address to, string nodeType) external payable returns (uint256)',
          'function getNodePrice(string nodeType) view returns (uint256)'
        ],
        signer
      );

      const price = await nodeLicenseContract.getNodePrice(nodeType.id);
      
      const tx = await nodeLicenseContract.mintNode(
        account,
        nodeType.id,
        { value: price }
      );

      alert('Transaction submitted! Waiting for confirmation...');
      await tx.wait();
      
      alert('🎉 Node purchased successfully! Your DePIN node NFT has been minted on Arbitrum One.');
      await loadUserNodes();
      setSelectedNode(null);
      
    } catch (error: any) {
      console.error('Purchase error:', error);
      alert(`Purchase failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900">
      {/* Network Warning Banner */}
      {account && showNetworkWarning && (
        <div className="bg-red-500/20 border-b-4 border-red-500 py-6 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-4">
                <div className="text-4xl">⚠️</div>
                <div>
                  <div className="text-xl font-bold text-red-400 mb-1">Wrong Network Detected</div>
                  <div className="text-white">
                    You are currently on <span className="font-semibold text-yellow-400">{networkInfo.chainName || 'Unknown Network'}</span>.
                    DePIN nodes can only be purchased on <span className="font-semibold text-green-400">Arbitrum One (Chain ID: 42161)</span>.
                  </div>
                </div>
              </div>
              <button
                onClick={handleSwitchNetwork}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg"
              >
                Switch to Arbitrum One
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/20 to-yellow-400/10" />
        
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 text-transparent bg-clip-text">
              Axiom DePIN Nodes
            </h1>
            <p className="text-2xl text-gray-300 mb-2">
              Own Real-World Infrastructure, Earn Real-World Income
            </p>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-4">
              Process real estate, utilities, logistics, and Wall Street data from America's first on-chain smart city.
            </p>
            <div className="inline-block bg-green-500/20 border border-green-500/50 rounded-xl px-6 py-3">
              <span className="text-green-400 font-bold">✓ Backed by Real Assets: </span>
              <span className="text-white">1,000-acre fintech city + trucking fleet + tokenized properties</span>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-yellow-400">1,247</div>
              <div className="text-gray-400 mt-1">Active Nodes</div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-yellow-400">$1.2M+</div>
              <div className="text-gray-400 mt-1">Total Earnings Paid</div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-yellow-400">1,000</div>
              <div className="text-gray-400 mt-1">Acres Powered</div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-yellow-400">99.97%</div>
              <div className="text-gray-400 mt-1">Network Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* User Dashboard */}
      {account && userNodes.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-yellow-400 mb-6">Your Node Dashboard</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-black/40 rounded-xl p-6">
                <div className="text-gray-400 mb-2">Active Nodes</div>
                <div className="text-4xl font-bold text-white">{userNodes.length}</div>
              </div>
              <div className="bg-black/40 rounded-xl p-6">
                <div className="text-gray-400 mb-2">Total Earnings</div>
                <div className="text-4xl font-bold text-green-400">${totalEarnings.toFixed(2)}</div>
              </div>
              <div className="bg-black/40 rounded-xl p-6">
                <div className="text-gray-400 mb-2">AXM Balance</div>
                <div className="text-4xl font-bold text-yellow-400">{parseFloat(axmBalance).toFixed(2)}</div>
              </div>
            </div>

            <div className="space-y-4">
              {userNodes.map((node, index) => (
                <div key={index} className="bg-black/40 border border-gray-700 rounded-xl p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">
                        Node #{node.tokenId} - {node.nodeType}
                      </h3>
                      <div className="text-gray-400">
                        Activated: {new Date(node.activatedAt * 1000).toLocaleDateString()}
                      </div>
                      <div className="text-green-400 font-semibold mt-2">
                        Lifetime Earnings: ${node.totalEarnings.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                        node.status === 'active' 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                          : 'bg-red-500/20 text-red-400 border border-red-500/50'
                      }`}>
                        {node.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Real-World Asset Integration Section */}
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">10 Real-World Income Streams</h2>
          <p className="text-xl text-gray-400">Every node earns from processing actual smart city assets and operations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {INCOME_STREAMS.map((stream, index) => (
            <div key={index} className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-xl p-6 hover:border-yellow-500/60 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="text-5xl">{stream.icon}</div>
                <div className="text-right">
                  <div className="text-yellow-400 font-semibold text-sm">{stream.rwaType}</div>
                  <div className="text-gray-500 text-xs mt-1">{stream.contract}</div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{stream.name}</h3>
              <p className="text-gray-400 mb-4 text-sm">{stream.description}</p>
              <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                <span className="text-gray-500 text-sm">Avg Monthly</span>
                <span className="text-green-400 font-bold">{stream.avgMonthly}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Node Types Section */}
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">Choose Your Node Type</h2>
          <p className="text-xl text-gray-400">From $100 to $500 - All on Arbitrum One</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {NODE_TYPES.map((nodeType) => (
            <div 
              key={nodeType.id}
              className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-yellow-500/30 rounded-2xl p-8 hover:border-yellow-500 transition-all transform hover:scale-105"
            >
              <div className={`inline-block px-4 py-2 rounded-full bg-gradient-to-r ${nodeType.color} text-white font-semibold mb-4`}>
                {nodeType.priceUSD}
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">{nodeType.name}</h3>
              <div className="text-gray-400 mb-6">{nodeType.price} ETH</div>

              <div className="mb-6">
                <div className="text-sm text-gray-400 mb-2">Services Included:</div>
                <div className="space-y-2">
                  {nodeType.services.map((service, idx) => (
                    <div key={idx} className="flex items-center text-gray-300 text-sm">
                      <span className="text-green-400 mr-2">✓</span>
                      {service}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-700 pt-6 mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Monthly Earnings:</span>
                  <span className="text-green-400 font-semibold">
                    ${nodeType.monthlyEarnings.min}-${nodeType.monthlyEarnings.max}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">ROI Period:</span>
                  <span className="text-yellow-400 font-semibold">{nodeType.roi}</span>
                </div>
              </div>

              <button
                onClick={() => purchaseNode(nodeType)}
                disabled={loading || !account || !isOnArbitrumOne}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : !account ? 'Connect Wallet' : !isOnArbitrumOne ? 'Switch to Arbitrum One' : 'Purchase Node'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Real-World Asset Backing Section */}
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl p-12">
          <h2 className="text-4xl font-bold text-white mb-8 text-center">Real-World Asset Backing</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-yellow-400 mb-4">Physical Infrastructure</h3>
              <div className="space-y-4">
                <div className="bg-black/40 rounded-xl p-4">
                  <div className="text-white font-semibold mb-2">🏘️ 1,000-Acre Smart City</div>
                  <div className="text-gray-400 text-sm">Real land parcels tokenized on-chain with zoning, utilities, property rights</div>
                </div>
                <div className="bg-black/40 rounded-xl p-4">
                  <div className="text-white font-semibold mb-2">🚛 Trucking Fleet (Sovran Logistics)</div>
                  <div className="text-gray-400 text-sm">Active OTR trucks generating GPS/delivery data processed by nodes</div>
                </div>
                <div className="bg-black/40 rounded-xl p-4">
                  <div className="text-white font-semibold mb-2">💧 Water & Energy Systems</div>
                  <div className="text-gray-400 text-sm">Smart meters tracking utility usage across entire smart city</div>
                </div>
                <div className="bg-black/40 rounded-xl p-4">
                  <div className="text-white font-semibold mb-2">🏢 Tokenized Properties</div>
                  <div className="text-gray-400 text-sm">Fractional real estate generating rental income distributed via nodes</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-yellow-400 mb-4">Data & Financial Assets</h3>
              <div className="space-y-4">
                <div className="bg-black/40 rounded-xl p-4">
                  <div className="text-white font-semibold mb-2">📊 Wall Street Integration</div>
                  <div className="text-gray-400 text-sm">RWA price feeds for tokenized stocks, bonds, commodities</div>
                </div>
                <div className="bg-black/40 rounded-xl p-4">
                  <div className="text-white font-semibold mb-2">🏦 Banking Operations</div>
                  <div className="text-gray-400 text-sm">40+ banking products processing loans, deposits, payments</div>
                </div>
                <div className="bg-black/40 rounded-xl p-4">
                  <div className="text-white font-semibold mb-2">📡 IoT Sensor Network</div>
                  <div className="text-gray-400 text-sm">Parking, traffic, HVAC, security systems across smart city</div>
                </div>
                <div className="bg-black/40 rounded-xl p-4">
                  <div className="text-white font-semibold mb-2">🗺️ Land Registry Data</div>
                  <div className="text-gray-400 text-sm">Property titles, deeds, surveys, zoning records</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hardware Requirements */}
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl p-8">
          <h2 className="text-3xl font-bold text-white mb-6">Hardware Requirements</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold text-yellow-400 mb-4">Basic Node</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• CPU: 2+ cores</li>
                <li>• RAM: 4GB minimum</li>
                <li>• Storage: 500GB+ SSD</li>
                <li>• Internet: 10 Mbps up/down</li>
                <li>• OS: Linux/Windows/Mac</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold text-yellow-400 mb-4">Advanced Node</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• CPU: 4+ cores</li>
                <li>• RAM: 8GB minimum</li>
                <li>• Storage: 1TB+ SSD</li>
                <li>• Internet: 25 Mbps up/down</li>
                <li>• OS: Linux/Windows/Mac</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold text-yellow-400 mb-4">Premium Node</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• CPU: 8+ cores</li>
                <li>• RAM: 16GB minimum</li>
                <li>• Storage: 2TB+ NVMe SSD</li>
                <li>• Internet: 50 Mbps up/down</li>
                <li>• OS: Linux preferred</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Model Section */}
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-yellow-500/30 rounded-2xl p-12">
          <h2 className="text-4xl font-bold text-white mb-8 text-center">Dual Revenue Model</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-green-400 mb-4">For Node Owners (You)</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="bg-green-500 text-black font-bold rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">1</div>
                  <div>
                    <div className="text-white font-semibold">Earn From Real Operations</div>
                    <div className="text-gray-400 text-sm">Process actual smart city data: utilities, real estate, logistics</div>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-green-500 text-black font-bold rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">2</div>
                  <div>
                    <div className="text-white font-semibold">Keep 90% of Earnings</div>
                    <div className="text-gray-400 text-sm">You keep most fees, protocol takes only 10%</div>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-green-500 text-black font-bold rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">3</div>
                  <div>
                    <div className="text-white font-semibold">Stake for Boost</div>
                    <div className="text-gray-400 text-sm">Stake AXM to increase node priority and earn yield</div>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-green-500 text-black font-bold rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">4</div>
                  <div>
                    <div className="text-white font-semibold">Resell on Marketplace</div>
                    <div className="text-gray-400 text-sm">Node NFTs appreciate as network grows</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-yellow-400 mb-4">For Axiom Protocol</h3>
              <div className="space-y-4">
                <div className="bg-black/40 rounded-xl p-4">
                  <div className="text-white font-semibold mb-2">💰 Node Sales Revenue</div>
                  <div className="text-gray-400 text-sm">$100-$500 per node license sold (one-time)</div>
                </div>
                <div className="bg-black/40 rounded-xl p-4">
                  <div className="text-white font-semibold mb-2">📊 Protocol Fee (10%)</div>
                  <div className="text-gray-400 text-sm">10% of all node processing fees flow to Treasury</div>
                </div>
                <div className="bg-black/40 rounded-xl p-4">
                  <div className="text-white font-semibold mb-2">🔄 Marketplace Fees (5%)</div>
                  <div className="text-gray-400 text-sm">5% fee on all secondary node sales</div>
                </div>
                <div className="bg-black/40 rounded-xl p-4">
                  <div className="text-white font-semibold mb-2">💎 Staking Ecosystem</div>
                  <div className="text-gray-400 text-sm">Nodes drive AXM staking demand, reducing circulating supply</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connect Wallet CTA */}
      {!account && (
        <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500 rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Earn From Real Assets?</h2>
            <p className="text-xl text-gray-300 mb-8">Connect your wallet to purchase your first DePIN node</p>
            <button
              onClick={connectWallet}
              className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-4 px-12 rounded-xl text-xl transition-all"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
