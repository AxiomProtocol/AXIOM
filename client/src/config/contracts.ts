/**
 * AXIOM Smart City - Contract Addresses on Arbitrum One
 * 
 * Source: COMPLETE_DEPLOYMENT_MANIFEST.md
 * Deployment Date: November 22, 2025
 * Network: Arbitrum One (Chain ID: 42161)
 * Deployer: 0xDFf9e47eb007bF02e47477d577De9ffA99791528
 * Status: All 23 contracts deployed & verified
 * 
 * Explorer: https://arbitrum.blockscout.com/
 */

// Network Configuration
export const NETWORK_CONFIG = {
  chainId: 42161,
  chainName: 'Arbitrum One',
  rpcUrl: 'https://arb1.arbitrum.io/rpc',
  blockExplorer: 'https://arbitrum.blockscout.com',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18
  }
} as const;

// Core Infrastructure Contracts (1-6)
export const CORE_CONTRACTS = {
  // Contract 1: AxiomV2 (AXM Token)
  AXM_TOKEN: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D',
  
  // Contract 2: AxiomIdentityComplianceHub
  IDENTITY_COMPLIANCE: '0xf88bb44511E5752Ee69953166C5d5dC0cfC8B3ED',
  
  // Contract 3: AxiomTreasuryAndRevenueHub
  TREASURY_REVENUE: '0x3fD63728288546AC41dAe3bf25ca383061c3A929',
  
  // Contract 4: AxiomStakingAndEmissionsHub
  STAKING_EMISSIONS: '0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885',
  
  // Contract 5: CitizenCredentialRegistry
  CITIZEN_CREDENTIALS: '0x8EF87e0ab34d5088fcBc4cD2E2943eAD9085C344',
  
  // Contract 6: AxiomLandAndAssetRegistry
  LAND_ASSET_REGISTRY: '0xaB15907b124620E165aB6E464eE45b178d8a6591'
} as const;

// Real Estate & Rental Contracts (7-9)
export const REAL_ESTATE_CONTRACTS = {
  // Contract 7: LeaseAndRentEngine
  LEASE_RENT_ENGINE: '0x26a20dEa57F951571AD6e518DFb3dC60634D5297',
  
  // Contract 8: RealtorModule
  REALTOR_MODULE: '0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412',
  
  // Contract 9: CapitalPoolsAndFunds
  CAPITAL_POOLS: '0xFcCdC1E353b24936f9A8D08D21aF684c620fa701'
} as const;

// DeFi Banking & Utilities Contracts (10-12)
export const DEFI_UTILITY_CONTRACTS = {
  // Contract 10: UtilityAndMeteringHub
  UTILITY_METERING: '0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d',
  
  // Contract 11: TransportAndLogisticsHub
  TRANSPORT_LOGISTICS: '0x959c5dd99B170e2b14B1F9b5a228f323946F514e',
  
  // Contract 12: DePINNodeSuite
  DEPIN_NODES: '0x16dC3884d88b767D99E0701Ba026a1ed39a250F1'
} as const;

// Cross-Chain & Advanced DeFi Contracts (13-16)
export const ADVANCED_DEFI_CONTRACTS = {
  // Contract 13: CrossChainAndLaunchModule
  CROSS_CHAIN_LAUNCH: '0x28623Ee5806ab9609483F4B68cb1AE212A092e4d',
  
  // Contract 14: AxiomExchangeHub (Internal DEX)
  EXCHANGE_HUB_DEX: '0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D',
  
  // Contract 15: CitizenReputationOracle
  REPUTATION_ORACLE: '0x649a0F1bd204b6f23A92f1CDbb2F1838D691B643',
  
  // Contract 16: IoTOracleNetwork
  IOT_ORACLE: '0xe38B3443E17A07953d10F7841D5568a27A73ec1a'
} as const;

// Market Infrastructure Contracts (17-18)
export const MARKET_CONTRACTS = {
  // Contract 17: MarketsAndListingsHub (Wall Street/RWA)
  MARKETS_RWA_HUB: '0x98a59D4fb5Fa974879E9F043C3174Ae82Fb9D830',
  
  // Contract 18: OracleAndMetricsRelay
  ORACLE_METRICS: '0x5c17F4621A47b4E8c357bAA6379b4B223BAA5Ac6'
} as const;

// Community & Engagement Contracts (19-21)
export const COMMUNITY_CONTRACTS = {
  // Contract 19: CommunitySocialHub
  SOCIAL_HUB: '0xC2f82eD5C2585B525E01F19eA5C28811AB43aF49',
  
  // Contract 20: AxiomAcademyHub
  ACADEMY_HUB: '0x30667931BEe54a58B76D387D086A975aB37206F4',
  
  // Contract 21: GamificationHub
  GAMIFICATION: '0x7F455b4614E05820AAD52067Ef223f30b1936f93'
} as const;

// Sustainability Contracts (22)
export const SUSTAINABILITY_CONTRACTS = {
  // Contract 22: SustainabilityHub
  SUSTAINABILITY: '0xAf4dF8a7733BAB64b7Ce83F2494d6446eF9eC046'
} as const;

// All contracts in a single object for easy access
export const ALL_CONTRACTS = {
  ...CORE_CONTRACTS,
  ...REAL_ESTATE_CONTRACTS,
  ...DEFI_UTILITY_CONTRACTS,
  ...ADVANCED_DEFI_CONTRACTS,
  ...MARKET_CONTRACTS,
  ...COMMUNITY_CONTRACTS,
  ...SUSTAINABILITY_CONTRACTS
} as const;

// Deployer Address
export const DEPLOYER_ADDRESS = '0xDFf9e47eb007bF02e47477d577De9ffA99791528';

// Token Configuration
export const AXM_TOKEN_CONFIG = {
  address: CORE_CONTRACTS.AXM_TOKEN,
  symbol: 'AXM',
  name: 'Axiom Protocol Token',
  decimals: 18,
  totalSupply: '15000000000', // 15 billion tokens
  tgeDate: '2026-01-01', // January 1, 2026
  chainId: NETWORK_CONFIG.chainId
} as const;

// Helper function to get explorer URL for an address
export function getExplorerUrl(address: string): string {
  return `${NETWORK_CONFIG.blockExplorer}/address/${address}`;
}

// Helper function to get explorer URL for a transaction
export function getTransactionUrl(txHash: string): string {
  return `${NETWORK_CONFIG.blockExplorer}/tx/${txHash}`;
}

// Helper function to validate if address is a known contract
export function isKnownContract(address: string): boolean {
  const normalizedAddress = address.toLowerCase();
  return Object.values(ALL_CONTRACTS).some(
    contractAddress => contractAddress.toLowerCase() === normalizedAddress
  );
}

// Helper function to get contract name by address
export function getContractName(address: string): string | null {
  const normalizedAddress = address.toLowerCase();
  
  for (const [name, contractAddress] of Object.entries(ALL_CONTRACTS)) {
    if (contractAddress.toLowerCase() === normalizedAddress) {
      return name;
    }
  }
  
  return null;
}

// Export types for TypeScript
export type ContractAddress = typeof ALL_CONTRACTS[keyof typeof ALL_CONTRACTS];
export type ContractName = keyof typeof ALL_CONTRACTS;
