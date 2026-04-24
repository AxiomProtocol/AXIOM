export const CONTRACTS = {
  AXM_TOKEN: {
    address: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D',
    name: 'Axiom Token (AXM)',
  },
  STAKING_HUB: {
    address: '0x8b99cDeefB3116cA87AF24A9E10D5580dA07B885',
    name: 'Axiom Staking & Emissions Hub',
  },
  TREASURY_HUB: {
    address: '0x3fD63728288546AC41dAe3bf25ca383061c3A929',
    name: 'Axiom Treasury & Revenue Hub',
  },
  DEX_HUB: {
    address: '0xF660d260a0bBC690a8ab0f1e6A41049FC919A34D',
    name: 'Axiom Exchange Hub (DEX)',
  },
  GOVERNANCE_HUB: {
    address: '0x90d19E197A85961e7Ee39Ca95CE0F9eFd3d5FBdE',
    name: 'Axiom Governance Hub',
  },
} as const;

export const ARBITRUM_ONE = {
  chainId: 42161,
  name: 'Arbitrum One',
  rpcUrl: 'https://arb1.arbitrum.io/rpc',
  blockExplorer: 'https://arbiscan.io',
  blockscoutExplorer: 'https://arbitrum.blockscout.com',
} as const;

export const VAULT_IDS = {
  BURN: '0x4255524e0000000000000000000000000000000000000000000000000000000',
  STAKING: '0x5354414b494e4700000000000000000000000000000000000000000000000000',
  LIQUIDITY: '0x4c49515549444954590000000000000000000000000000000000000000000000',
  DIVIDEND: '0x4449564944454e440000000000000000000000000000000000000000000000',
  TREASURY: '0x545245415355525900000000000000000000000000000000000000000000000',
} as const;
