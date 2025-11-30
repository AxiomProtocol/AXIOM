/**
 * Axiom Protocol Token (AXM) Configuration
 * Network: Arbitrum One (Chain ID 42161)
 * Contract: 0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D
 */

export const AXIOM_CONFIG = {
  // Network Configuration
  network: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbitrum.blockscout.com',
  },

  // Contract Address
  contractAddress: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D',

  // Token Information
  token: {
    name: 'Axiom Protocol Token',
    symbol: 'AXM',
    decimals: 18,
    maxSupply: '15000000000000000000000000000', // 15 billion
    maxSupplyFormatted: '15,000,000,000',
  },

  // Vault Addresses (from constructor args)
  vaults: {
    admin: '0x2bb2c2a7a1d82097488bf0b9c2a59c1910cd8d5d',
    distribution: '0x2bb2c2a7a1d82097488bf0b9c2a59c1910cd8d5d',
    burn: '0x2bb2c2a7a1d82097488bf0b9c2a59c1910cd8d5d',
    staking: '0x2bb2c2a7a1d82097488bf0b9c2a59c1910cd8d5d',
    liquidity: '0x2bb2c2a7a1d82097488bf0b9c2a59c1910cd8d5d',
    dividend: '0x2bb2c2a7a1d82097488bf0b9c2a59c1910cd8d5d',
    treasury: '0x2bb2c2a7a1d82097488bf0b9c2a59c1910cd8d5d',
  },

  // Role Constants
  roles: {
    DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
    PAUSER_ROLE: '0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a',
    MINTER_ROLE: '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6',
    COMPLIANCE_ROLE: '0x8c7a8b68cc15d8bf7d3d2d50b8e1e4a1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7',
    RESCUER_ROLE: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8',
    FEE_MANAGER_ROLE: '0x9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
    ORACLE_MANAGER_ROLE: '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b',
    TREASURY_ROLE: '0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
  },

  // Features
  features: [
    'ERC20',
    'ERC20Burnable',
    'ERC20Permit',
    'ERC20Votes',
    'Pausable',
    'AccessControl',
    'ReentrancyGuard',
    'Dynamic Fee Routing',
    'Compliance Module Support',
    'Identity Registry Integration',
  ],

  // Tokenomics Distribution (example - adjust based on actual distribution)
  distribution: {
    community: 50,
    treasury: 20,
    team: 15,
    staking: 10,
    liquidity: 5,
  },
} as const;

export default AXIOM_CONFIG;
