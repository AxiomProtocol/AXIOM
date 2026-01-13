/**
 * AXIOM Smart City - Shared Contract Configuration
 * 
 * Single source of truth for all deployed smart contracts
 * Used by both frontend and backend services
 * 
 * Source: COMPLETE_DEPLOYMENT_MANIFEST.md
 * Deployment Date: November 22, 2025
 * Network: Arbitrum One (Chain ID: 42161)
 * Deployer: 0xDFf9e47eb007bF02e47477d577De9ffA99791528
 * Status: All 29 contracts deployed & verified
 * 
 * Explorer: https://arbitrum.blockscout.com/
 */

// Network Configuration
export const NETWORK_CONFIG = {
  chainId: 42161,
  chainIdHex: '0xa4b1',
  chainName: 'Arbitrum One',
  rpcUrl: 'https://arb1.arbitrum.io/rpc',
  blockExplorer: 'https://arbitrum.blockscout.com',
  blockExplorerName: 'Blockscout',
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
  // Contract 7: LeaseAndRentEngine (Security Fixed v2 - Dec 16, 2025)
  LEASE_RENT_ENGINE: '0x00591d360416dE7b016bBedbC6AA1AE798eA873B',
  // Legacy (paused): 0x26a20dEa57F951571AD6e518DFb3dC60634D5297
  
  // Contract 8: RealtorModule
  REALTOR_MODULE: '0x579EA6FC512E5f1b4FC77d5f4f03aA976fa40412',
  
  // Contract 9: CapitalPoolsAndFunds
  CAPITAL_POOLS: '0xFcCdC1E353b24936f9A8D08D21aF684c620fa701'
} as const;

// DeFi Banking & Utilities Contracts (10-13)
export const DEFI_UTILITY_CONTRACTS = {
  // Contract 10: UtilityAndMeteringHub
  UTILITY_METERING: '0xac55BE7E1A6613c5DA66f7AC9520FfD24eF3212d',
  
  // Contract 11: TransportAndLogisticsHub
  TRANSPORT_LOGISTICS: '0x959c5dd99B170e2b14B1F9b5a228f323946F514e',
  
  // Contract 12: DePINNodeSuite (Security Fixed v2 - Dec 16, 2025)
  DEPIN_NODES: '0x223dF824B320beD4A8Fd0648b242621e4d01aAEF',
  // Legacy (paused): 0x16dC3884d88b767D99E0701Ba026a1ed39a250F1
  
  // Contract 13: DePINNodeSales V2 (ETH + AXM Payments + DEX Integration)
  // Deployed: November 26, 2025 | Verified on Blockscout
  // Features: ETH (full price), AXM (15% discount), DEX pricing ready (disabled by default)
  // Manipulation protection: price bounds, liquidity checks, admin verification required
  DEPIN_SALES: '0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd'
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

// Governance Contract (Future Deployment)
// When GovernanceHub is deployed, update this address and set USE_ONCHAIN_VOTING = true in lib/governance/config.ts
export const GOVERNANCE_CONTRACTS = {
  // Contract: AxiomGovernanceHub (Not yet deployed)
  // See contracts/GovernanceHub.sol.spec.md for specification
  GOVERNANCE_HUB: null as string | null
} as const;

// Sustainability Contracts (22)
export const SUSTAINABILITY_CONTRACTS = {
  // Contract 22: SustainabilityHub
  SUSTAINABILITY: '0xAf4dF8a7733BAB64b7Ce83F2494d6446eF9eC046'
} as const;

// AIP-001 V2 Contracts - Sovereign Banking System (26-29)
// Deployed: December 27, 2025 | All Verified on Blockscout
export const V2_SOVEREIGN_BANKING_CONTRACTS = {
  // Contract 26: AxiomScoreSBT (Credit Scoring)
  // ERC-5192 Soulbound Token for on-chain credit scoring (300-850 range)
  AXIOM_SCORE_SBT: '0x8Ae0f77e2cB2dED0496Dbe2F827be38F5756B008',
  
  // Contract 27: SusuInsuranceFund (Default Protection)
  // 5% of node rewards diverted to cover broken SUSU circles
  SUSU_INSURANCE_FUND: '0x7B69ce0d83f45C2dBa3e5B73076beA8b1Be1271F',
  
  // Contract 28: SEED (Vote-Escrowed AXM)
  // Curve-style locking (1-4 years) for governance and real yield
  // Lock AXM → Earn SEED → Access produce cycles, land cohorts, governance
  SEED: '0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046',
  VE_AXM: '0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046', // Legacy alias
  
  // Contract 29: AxiomFeeBurner (Real Yield)
  // 0.5% fee switch with buyback/burn mechanism
  AXIOM_FEE_BURNER: '0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94'
} as const;

// Community Savings Contracts (24-25)
export const COMMUNITY_SAVINGS_CONTRACTS = {
  // Contract 24: AxiomSusuHub (Rotating Savings Groups - Pooled Custody)
  // Deployed: December 11, 2025 | Verified on Blockscout
  // Features: ROSCA/SUSU pools, configurable cycles, treasury fee routing
  SUSU_HUB: '0x6C69D730327930B49A7997B7b5fb0865F30c95A5',
  
  // Contract 25: SusuPersonalVault (Self-Custody SUSU)
  // Deployed: December 25, 2025 | Verified on Blockscout
  // Features: Personal commitment vaults, segregated funds, early exit with penalty
  // Custody: Smart Contract (user-controlled, not pooled)
  SUSU_PERSONAL_VAULT: '0x7F474D9D5aF702D587A126c49aDa43318c1420E5'
} as const;

// AXUSD Stablecoin System Contracts (30-35)
// Deployed: January 5, 2026 | Arbitrum One
// Features: CDP-style minting, PSM for USDC swaps, T-bill backing ready
export const AXUSD_STABLECOIN_CONTRACTS = {
  // Contract 30: AxiomStable (AXUSD Token)
  // ERC20 stablecoin with 1B max supply, role-based minting/burning
  AXUSD: '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c',
  
  // Contract 31: OracleAdapter (Price Feeds)
  // Multi-source oracle for collateral price feeds
  ORACLE_ADAPTER: '0x6dEC19DD5472F5a82e37972008De3eBB46b754B0',
  
  // Contract 32: RateLimiter (Minting Controls)
  // Daily limit: 100K AXUSD, Per-address limit: 10K AXUSD
  RATE_LIMITER: '0xeCaBaA0dBbbA47E22C1f5A0F0495D1Ce9F40CF20',
  
  // Contract 33: VaultEngine (CDP System)
  // Collateralized debt positions for AXUSD minting
  VAULT_ENGINE: '0x72aaBb0d84077859276513106Ea225E4edE80db0',
  
  // Contract 34: BackstopVault (Emergency Reserve)
  // Protocol reserve with 24h timelock for emergency withdrawals
  BACKSTOP_VAULT: '0x9D59e65aF3F5251578DC5F7576793de28A95c00a',
  
  // Contract 35: PSM (Peg Stability Module)
  // 1:1 USDC swaps with 0.1% fee, 500K debt ceiling
  PSM: '0x4584888cB411E9cc88e3800BAB73A430D90d3793'
} as const;

// AXUSD GENIUS Act Compliant Contracts (41-52)
// Deployed: January 11, 2026 | Arbitrum One
// Features: Full GENIUS Act compliance (Public Law 119-27), 100% reserve backing, peg stability
// Deployer: 0x8d7892CF226B43d48B6e3ce988A1274e6D114C96
export const AXUSD_GENIUS_CONTRACTS = {
  // AXUSD Token (GENIUS Compliant)
  AXUSD: '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C',
  
  // Core Infrastructure
  ORACLE_ADAPTER: '0xE3b1f38AaBAd138d0EF2e2C7429ee57c512fDF3D',
  RATE_LIMITER: '0xE19E4172786A193997f985edC27f7932a0B65327',
  VAULT_ENGINE: '0x4675C09dDC1B3094cd86F6b59904CC3E06c98028',
  PSM: '0x5db58d9c21369d1532a48Bdd658E4Fe415404922',
  
  // GENIUS Act Compliance
  BACKSTOP_VAULT_USDC: '0x54438249457694eB5431811f3f19444Af0a01B29',
  BACKSTOP_VAULT_ETH: '0xF2540BD6fa365Bf8F1b9dd4efa7534Ff6522393f',
  TBILL_VAULT: '0x091c146EC7c348552319E8D17cF7D0C9A4b3BCd4',
  GENIUS_COMPLIANCE: '0x8E8F769dA133cd3825549EE3E814fC936C8dE7be',
  SEGREGATED_CUSTODY: '0x1Ba851cfB9B3e34D88BC0cbf5a0042F9eb1Af66b',
  LIQUIDATOR: '0xF6518B363aB4D461D59E1c9A54De3B7f66Da5384',
  
  // Peg Stability & DEX
  MARKET_OPERATIONS: '0x42E31Ac3A6aF2B2925a0B979A05156833b6660E4',
  LP_POOL_CAMELOT: '0x266F6Cf7eA36d3f676eb292B274EAb25172790a2'
} as const;

// External DEX Integration
export const CAMELOT_DEX = {
  ROUTER: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d',
  FACTORY: '0x6EcCab422D763aC031210895C81787E87B43A652'
} as const;

// Real Estate Lending Fund Contracts (41-46)
// Status: Pending deployment | Arbitrum One
// Features: Fix & Flip bridge loans, ERC4626 vault, ERC721 loan receipts
export const REALESTATE_LENDING_CONTRACTS = {
  // Contract 41: RiskConfig
  // Per-product risk parameters (LTV, rates, terms)
  RISK_CONFIG: process.env.RISK_CONFIG_ADDRESS || '',
  
  // Contract 42: LoanReceiptNFT
  // ERC721 tokens representing active loans
  LOAN_RECEIPT_NFT: process.env.LOAN_RECEIPT_ADDRESS || '',
  
  // Contract 43: FixFlipPoolVault
  // ERC4626 vault for investor deposits
  FIXFLIP_VAULT: process.env.FIXFLIP_VAULT_ADDRESS || '',
  
  // Contract 44: RepaymentRouter
  // Routes payments to vault, insurance, and treasury
  REPAYMENT_ROUTER: process.env.REPAYMENT_ROUTER_ADDRESS || '',
  
  // Contract 45: FixFlipManager
  // Loan origination and lifecycle management
  FIXFLIP_MANAGER: process.env.FIXFLIP_MANAGER_ADDRESS || '',
  
  // Contract 46: ProductRegistry
  // Registry of lending products
  PRODUCT_REGISTRY: process.env.PRODUCT_REGISTRY_ADDRESS || ''
} as const;

// Stablecoins on Arbitrum
export const STABLECOINS = {
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
} as const;

// AXUSD Ecosystem Integration Contracts (36-40)
// Deployed: January 5, 2026 | Arbitrum One
// Features: SUSU adapter, KeyGrow payments, SEED yield, liquidity bootstrapping
export const AXUSD_INTEGRATION_CONTRACTS = {
  // Contract 36: SEEDYieldDistributor
  // Distributes AXUSD yield to SEED lockers weekly
  SEED_YIELD_DISTRIBUTOR: '0x5867e1a8c77530648edF61975CBB57a8913d159F',
  
  // Contract 37: AXUSDRevenueRouter
  // Routes protocol revenue to SEED holders, treasury, and backstop
  REVENUE_ROUTER: '0x39A9Ca593d350450d93aF7F24dC1A682df47F30a',
  
  // Contract 38: SusuAXUSDAdapter
  // AXUSD-denominated SUSU circles with PSM auto-conversion
  SUSU_AXUSD_ADAPTER: '0x4c17360651c2c46F1739E92f512D8ce6318106b4',
  
  // Contract 39: KeyGrowPaymentModule
  // Rent-to-own housing payments in AXUSD with escrow and buy-down credits
  KEYGROW_PAYMENT: '0x0FA690B590F37c369Ff7cFbF155d2E4A474d955c',
  
  // Contract 40: LiquidityBootstrapper
  // Protocol-owned liquidity seeding for DEX pools
  LIQUIDITY_BOOTSTRAPPER: '0xd690F8A987542772FDd65a9813c0Ae55Cfb1AD19'
} as const;

// All contracts in a single object for easy access
export const ALL_CONTRACTS = {
  ...CORE_CONTRACTS,
  ...REAL_ESTATE_CONTRACTS,
  ...DEFI_UTILITY_CONTRACTS,
  ...ADVANCED_DEFI_CONTRACTS,
  ...MARKET_CONTRACTS,
  ...COMMUNITY_CONTRACTS,
  ...SUSTAINABILITY_CONTRACTS,
  ...V2_SOVEREIGN_BANKING_CONTRACTS,
  ...COMMUNITY_SAVINGS_CONTRACTS,
  ...AXUSD_STABLECOIN_CONTRACTS,
  ...AXUSD_INTEGRATION_CONTRACTS,
  ...AXUSD_GENIUS_CONTRACTS,
  ...REALESTATE_LENDING_CONTRACTS
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
  totalSupplyWei: '15000000000000000000000000000', // 15B * 10^18
  tgeDate: '2026-01-01', // January 1, 2026
  chainId: NETWORK_CONFIG.chainId
} as const;

// Staking Configuration
export const STAKING_CONFIG = {
  address: CORE_CONTRACTS.STAKING_EMISSIONS,
  stakingToken: CORE_CONTRACTS.AXM_TOKEN,
  rewardToken: CORE_CONTRACTS.AXM_TOKEN,
  name: 'Axiom Staking & Emissions Hub'
} as const;

// DEX Configuration
export const DEX_CONFIG = {
  address: ADVANCED_DEFI_CONTRACTS.EXCHANGE_HUB_DEX,
  name: 'Axiom Exchange Hub',
  baseToken: CORE_CONTRACTS.AXM_TOKEN
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

// Helper function to validate chain ID
export function isValidChainId(chainId: number | string): boolean {
  const numericChainId = typeof chainId === 'string' ? parseInt(chainId, 16) : chainId;
  return numericChainId === NETWORK_CONFIG.chainId;
}

// Export types for TypeScript
export type ContractAddress = typeof ALL_CONTRACTS[keyof typeof ALL_CONTRACTS];
export type ContractName = keyof typeof ALL_CONTRACTS;
export type NetworkConfig = typeof NETWORK_CONFIG;
