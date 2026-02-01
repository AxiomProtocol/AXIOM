import { 
  NETWORK_CONFIG,
  CORE_CONTRACTS,
  DEFI_UTILITY_CONTRACTS
} from '../shared/contracts';

export interface AppConfig {
  rpcUrl: string;
  chainId: number;
  contracts: {
    axmToken: string;
    depinSales: string;
    depinSuite: string;
    treasuryVault: string;
    stakingEmissions: string;
    identityCompliance: string;
    treasuryRevenue: string;
  };
  blockExplorer: string;
}

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const rpcUrl = process.env.ARBITRUM_RPC_URL || NETWORK_CONFIG.rpcUrl;
  
  cachedConfig = {
    rpcUrl,
    chainId: NETWORK_CONFIG.chainId,
    contracts: {
      axmToken: CORE_CONTRACTS.AXM_TOKEN,
      depinSales: DEFI_UTILITY_CONTRACTS.DEPIN_SALES,
      depinSuite: DEFI_UTILITY_CONTRACTS.DEPIN_NODES,
      treasuryVault: '0x2bb2c2a7a1d82097488bf0b9c2a59c1910cd8d5d',
      stakingEmissions: CORE_CONTRACTS.STAKING_EMISSIONS,
      identityCompliance: CORE_CONTRACTS.IDENTITY_COMPLIANCE,
      treasuryRevenue: CORE_CONTRACTS.TREASURY_REVENUE
    },
    blockExplorer: NETWORK_CONFIG.blockExplorer
  };

  return cachedConfig;
}

export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = getConfig();

  if (!config.rpcUrl) {
    errors.push('RPC URL is not configured');
  }

  if (!config.contracts.axmToken) {
    errors.push('AXM Token address is not configured');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
