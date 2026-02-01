import { HardwareRequirements, NodeType, IncomeStream } from '../types/depin';

// 4-Tier Hardware System: Mobile → Desktop → Professional → Enterprise
// UPDATED: Reduced Enterprise operating costs via negotiated colocation rates
export const HARDWARE_TIERS: HardwareRequirements[] = [
  {
    tier: 'mobile',
    tierName: 'Mobile Light Node',
    devices: ['Smartphone (Android/iOS)', 'Tablet', 'Chromebook'],
    minSpecs: {
      storage: '32GB+ free space',
      ram: '4GB+ RAM',
      bandwidth: '10 Mbps+ internet',
      uptime: '8+ hours/day (background operation)'
    },
    estimatedSetupCost: '$0 (use existing device)',
    monthlyOperatingCost: '$5-10 (electricity + data)',
    canRunNodeTypes: ['mobile-light']
  },
  {
    tier: 'desktop',
    tierName: 'Desktop Standard Node',
    devices: ['Laptop (Windows/Mac/Linux)', 'Desktop PC', 'Mini PC'],
    minSpecs: {
      storage: '128GB+ SSD free space',
      ram: '8GB+ RAM',
      bandwidth: '25 Mbps+ internet',
      uptime: '18+ hours/day'
    },
    estimatedSetupCost: '$0-500 (existing laptop or budget PC)',
    monthlyOperatingCost: '$15-30 (electricity)',
    canRunNodeTypes: ['mobile-light', 'desktop-standard', 'desktop-advanced'],
    upgradeFrom: 'mobile'
  },
  {
    tier: 'professional',
    tierName: 'Professional Infrastructure Node',
    devices: ['High-end Desktop', 'Workstation', 'NAS Device', 'Small Server'],
    minSpecs: {
      storage: '512GB+ NVMe SSD',
      ram: '16GB+ RAM',
      bandwidth: '100 Mbps+ fiber internet',
      uptime: '23+ hours/day (99% uptime)'
    },
    estimatedSetupCost: '$800-2,000 (dedicated hardware)',
    monthlyOperatingCost: '$40-80 (electricity + static IP)',
    canRunNodeTypes: ['mobile-light', 'desktop-standard', 'desktop-advanced', 'pro-infrastructure'],
    upgradeFrom: 'desktop'
  },
  {
    tier: 'enterprise',
    tierName: 'Enterprise Data Center Node',
    devices: ['Dedicated Server', 'Server Rack', 'Data Center Colocation'],
    minSpecs: {
      storage: '2TB+ Enterprise SSD RAID',
      ram: '64GB+ ECC RAM',
      bandwidth: '1 Gbps+ dedicated line',
      uptime: '99.9%+ uptime (24/7 monitoring)'
    },
    estimatedSetupCost: '$5,000-20,000 (enterprise infrastructure)',
    monthlyOperatingCost: '$150-300 (negotiated colocation/power/cooling)',
    canRunNodeTypes: ['mobile-light', 'desktop-standard', 'desktop-advanced', 'pro-infrastructure', 'enterprise-premium'],
    upgradeFrom: 'professional'
  }
];

// REBUILT NODE TYPES - Financial Model 2.0
// Revenue Share by Tier: Mobile 5%, Desktop 8%, Professional 12%, Enterprise 20%
// Enterprise nodes get 4x multiplier on base streams + exclusive premium services
export const NODE_TYPES: NodeType[] = [
  {
    id: 'mobile-light',
    name: 'Mobile Light Node',
    price: 0.02,
    priceUSD: '$40-60',
    requiredHardwareTier: 'mobile',
    hardwareRecommendation: 'Smartphone, Tablet, or Chromebook',
    services: [
      'Basic Data Validation',
      'Lightweight Storage (5GB)',
      'Simple Oracle Relay'
    ],
    monthlyEarnings: { min: 15, max: 35 },
    roi: '1-2 months',
    color: 'from-green-500 to-green-600'
  },
  {
    id: 'desktop-standard',
    name: 'Desktop Standard Node',
    price: 0.05,
    priceUSD: '$100-150',
    requiredHardwareTier: 'desktop',
    hardwareRecommendation: 'Laptop or Desktop PC',
    services: [
      'Decentralized Storage (50GB)',
      'Property Data Processing',
      'Basic Oracle Relay',
      'IoT Gateway (Limited)'
    ],
    monthlyEarnings: { min: 50, max: 100 },
    roi: '2-3 months',
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'desktop-advanced',
    name: 'Desktop Advanced Node',
    price: 0.08,
    priceUSD: '$160-220',
    requiredHardwareTier: 'desktop',
    hardwareRecommendation: 'High-end Laptop or Gaming PC',
    services: [
      'Decentralized Storage (100GB)',
      'Property Data Processing',
      'Trucking/Logistics Relay',
      'RWA Price Oracle',
      'Full IoT Gateway'
    ],
    monthlyEarnings: { min: 85, max: 160 },
    roi: '2-3 months',
    color: 'from-purple-500 to-purple-600'
  },
  {
    id: 'pro-infrastructure',
    name: 'Professional Infrastructure Node',
    price: 0.15,
    priceUSD: '$300-450',
    requiredHardwareTier: 'professional',
    hardwareRecommendation: 'Dedicated Workstation or Small Server',
    services: [
      'Decentralized Storage (500GB)',
      'Water/Energy Metering Hub',
      'Land Parcel Surveying',
      'Wall Street/RWA Feeds',
      'Full IoT Gateway',
      'Property Management System'
    ],
    monthlyEarnings: { min: 200, max: 380 },
    roi: '2-3 months',
    color: 'from-yellow-500 to-orange-600'
  },
  {
    id: 'enterprise-premium',
    name: 'Enterprise Premium Node',
    price: 0.25,
    priceUSD: '$500-750',
    requiredHardwareTier: 'enterprise',
    hardwareRecommendation: 'Dedicated Server or Data Center Infrastructure',
    services: [
      'Decentralized Storage (2TB+) - Priority Tier',
      'Multi-City Utility Metering Hub',
      'Advanced Land Registry Oracle',
      'Wall Street/RWA Market Maker Premium',
      'Enterprise IoT Hub (10,000+ devices)',
      'Full Banking Product Suite API',
      'Cross-Chain Oracle Network Validator',
      'AI/ML Analytics Engine',
      '🔒 EXCLUSIVE: Institutional Banking API',
      '🔒 EXCLUSIVE: Cross-Chain Settlement Premium',
      '🔒 EXCLUSIVE: Regulated Oracle Retainers',
      '🔒 EXCLUSIVE: Node Clustering Bonuses (4x capacity)'
    ],
    monthlyEarnings: { min: 1050, max: 1950 },
    roi: '6-12 months',
    color: 'from-red-500 to-pink-600'
  }
];

// REBUILT INCOME STREAMS - Tier-Based Revenue Model
// Base fees shown below, multiplied by tier revenue share:
// Mobile: 5% | Desktop: 8% | Professional: 12% | Enterprise: 20%
export const INCOME_STREAMS: IncomeStream[] = [
  // Universal Streams (All Tiers)
  {
    name: 'Decentralized Storage Fees',
    description: 'Earn when residents/businesses store files, documents, property deeds',
    icon: '💾',
    contract: 'DePINNodeSuite',
    avgMonthly: '$10-60 (Mobile) | $80-240 (Enterprise 4x)',
    rwaType: 'Digital Assets',
    requiredTier: ['mobile', 'desktop', 'professional', 'enterprise']
  },
  {
    name: 'Staking Rewards',
    description: 'Stake AXM tokens to boost node priority and earn yield',
    icon: '💰',
    contract: 'StakingAndEmissionsHub',
    avgMonthly: '$10-50 (Mobile) | $40-200 (Enterprise 4x)',
    rwaType: 'Token Economics',
    requiredTier: ['mobile', 'desktop', 'professional', 'enterprise']
  },
  {
    name: 'Referral Bonuses',
    description: 'Earn 5% of sale price when someone buys a node with your code',
    icon: '🎁',
    contract: 'DePINNodeSuite',
    avgMonthly: '$5-40 (Mobile) | $20-160 (Enterprise 4x)',
    rwaType: 'Network Growth',
    requiredTier: ['mobile', 'desktop', 'professional', 'enterprise']
  },

  // Desktop+ Streams
  {
    name: 'Property Data Processing',
    description: 'Process real estate transactions, title transfers, rental payments',
    icon: '🏘️',
    contract: 'LandAndAssetRegistry',
    avgMonthly: '$20-70 (Desktop) | $80-280 (Enterprise 4x)',
    rwaType: 'Real Estate',
    requiredTier: ['desktop', 'professional', 'enterprise']
  },
  {
    name: 'Trucking/Logistics Data',
    description: 'Relay GPS, delivery routes, freight data from Sovran Logistics fleet',
    icon: '🚛',
    contract: 'TransportAndLogisticsHub',
    avgMonthly: '$15-50 (Desktop) | $60-200 (Enterprise 4x)',
    rwaType: 'Transportation',
    requiredTier: ['desktop', 'professional', 'enterprise']
  },
  {
    name: 'IoT Gateway Fees',
    description: 'Process smart sensors: parking meters, traffic lights, building HVAC',
    icon: '📡',
    contract: 'IoTOracleNetwork',
    avgMonthly: '$20-60 (Desktop) | $80-240 (Enterprise 4x)',
    rwaType: 'IoT Infrastructure',
    requiredTier: ['desktop', 'professional', 'enterprise']
  },

  // Professional+ Streams
  {
    name: 'Utility Metering Fees',
    description: 'Process water/energy/bandwidth usage data for 1,000-acre smart city',
    icon: '💧',
    contract: 'UtilityAndMeteringHub',
    avgMonthly: '$25-80 (Pro) | $100-320 (Enterprise 4x)',
    rwaType: 'Smart City Utilities',
    requiredTier: ['professional', 'enterprise']
  },
  {
    name: 'Wall Street/RWA Oracle',
    description: 'Provide price feeds for tokenized stocks, commodities, real estate',
    icon: '📊',
    contract: 'MarketsAndListingsHub',
    avgMonthly: '$30-100 (Pro) | $120-400 (Enterprise 4x)',
    rwaType: 'Financial Assets',
    requiredTier: ['professional', 'enterprise']
  },
  {
    name: 'Land Parcel Surveying',
    description: 'Validate GPS coordinates, zoning data, property boundaries',
    icon: '🗺️',
    contract: 'LandAndAssetRegistry',
    avgMonthly: '$15-45 (Pro) | $60-180 (Enterprise 4x)',
    rwaType: 'Land Assets',
    requiredTier: ['professional', 'enterprise']
  },

  // Enterprise-Only Streams (NEW - Premium Services)
  {
    name: 'AI/ML Analytics Processing',
    description: 'Run machine learning models on smart city data for predictive insights',
    icon: '🤖',
    contract: 'AIAnalyticsHub',
    avgMonthly: '$150-400 (Enterprise only)',
    rwaType: 'Advanced Services',
    requiredTier: ['enterprise']
  },
  {
    name: '🔒 Institutional Banking API',
    description: 'Premium API access for banks/institutions using Axiom banking suite (40+ products)',
    icon: '🏦',
    contract: 'BankingProductHub',
    avgMonthly: '$200-450 (Enterprise exclusive)',
    rwaType: 'Financial Infrastructure',
    requiredTier: ['enterprise']
  },
  {
    name: '🔒 Cross-Chain Settlement Premium',
    description: 'High-priority cross-chain transaction settlement for regulated entities',
    icon: '⛓️',
    contract: 'CrossChainBridgeHub',
    avgMonthly: '$150-350 (Enterprise exclusive)',
    rwaType: 'Cross-Chain Infrastructure',
    requiredTier: ['enterprise']
  },
  {
    name: '🔒 Regulated Oracle Retainers',
    description: 'Monthly retainer fees from enterprises requiring 99.99% uptime price feeds',
    icon: '🔐',
    contract: 'EnterpriseOracleNetwork',
    avgMonthly: '$100-280 (Enterprise exclusive)',
    rwaType: 'Regulated Services',
    requiredTier: ['enterprise']
  },
  {
    name: '🔒 Node Clustering Bonuses',
    description: 'Run 4x logical nodes per hardware footprint with priority task routing',
    icon: '🎯',
    contract: 'DePINNodeSuite',
    avgMonthly: '$100-230 (Enterprise exclusive)',
    rwaType: 'Network Optimization',
    requiredTier: ['enterprise']
  }
];

// Revenue Model Reconciliation (for transparency)
export const TIER_REVENUE_BREAKDOWN = {
  mobile: {
    tierMultiplier: 1.0,
    baseStreams: ['storage', 'staking', 'referrals'],
    exclusiveStreams: [],
    estimatedTotal: { min: 15, max: 35 }
  },
  desktop: {
    tierMultiplier: 1.6,
    baseStreams: ['storage', 'staking', 'referrals', 'property', 'trucking', 'iot'],
    exclusiveStreams: [],
    estimatedTotal: { min: 50, max: 160 }
  },
  professional: {
    tierMultiplier: 2.4,
    baseStreams: ['storage', 'staking', 'referrals', 'property', 'trucking', 'iot', 'utility', 'wall-street', 'land'],
    exclusiveStreams: [],
    estimatedTotal: { min: 200, max: 380 }
  },
  enterprise: {
    tierMultiplier: 4.0,
    baseStreams: ['all-standard-streams-at-4x'],
    exclusiveStreams: ['ai-ml', 'institutional-banking', 'cross-chain-settlement', 'regulated-oracle', 'node-clustering'],
    estimatedTotal: { min: 1050, max: 1950 },
    netProfit: {
      min: 900,  // $1050 - $150 costs
      max: 1800  // $1950 - $150 costs
    },
    roiMonths: {
      best: 2.8,   // $5000 / $1800 = 2.8 months
      worst: 22.2  // $20000 / $900 = 22.2 months
      // Average: ~12 months (advertised 6-12)
    }
  }
};
