/**
 * AXIOM Protocol — Shared Contract Configuration
 * Single source of truth for all deployed automated control layers.
 * Used by both frontend and backend services.
 *
 * Network: Arbitrum One (Chain ID: 42161)
 * Deployer: 0x8d7892CF226B43d48B6e3ce988A1274e6D114C96
 * Explorer: https://arbiscan.io/
 *
 * ═══════════════════════════════════════════════════════════════════
 * CONTRACT INTEGRATION STATUS SUMMARY (as of 2026-03-26)
 * ═══════════════════════════════════════════════════════════════════
 *
 * SECTION A — ACTIVELY INTEGRATED (53 contracts)
 *   Live API routes and/or service files call these on-chain.
 *   Includes: Core, AXUSD (GENIUS), Euler V2, On-Chain Lending,
 *             Community, DePIN, Land Acquisition, Governance.
 *
 * SECTION B — DEPLOYED, NOT YET WIRED (~28 contracts)
 *   Deployed and verified on Arbitrum One but no app code
 *   currently imports or calls them. Planned for future product phases.
 *   Includes: Lease Engine, Transport/Utility, Internal DEX,
 *             Markets/RWA, Social/Academy/Gamification, Sustainability,
 *             SUSU Personal Vault, SUSU AXUSD Adapter, KeyGrow Payment,
 *             Liquidity Bootstrapper, Cross-Chain, IoT Oracle,
 *             and several GENIUS compliance peripherals.
 *
 * SECTION C — DEPRECATED / LEGACY (tracked for audit trail only)
 *   Superseded by newer deployments. Not callable for new operations.
 *   Includes: Euler Vault V3/V4, legacy oracles, original AXUSD system.
 *
 * ═══════════════════════════════════════════════════════════════════
 * See: .local/smart-contract-audit.md for the full integration audit.
 * ═══════════════════════════════════════════════════════════════════
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

// ═══ SECTION A: ACTIVELY INTEGRATED ═════════════════════════════════════
// All groups below are imported and called on-chain in API routes or services.

// Core Infrastructure Contracts (1-6) — SECTION A
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

// ═══ SECTION B: DEPLOYED — NOT YET WIRED ════════════════════════════════
// Lease, Realtor, CapitalPools — deployed on Arbitrum One but no app routes call them yet.
// Real Estate & Rental Contracts (7-9) — SECTION B
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
// SECTION A: DEPIN_NODES, DEPIN_SALES (depinEventListener.ts)
// SECTION B: UTILITY_METERING, TRANSPORT_LOGISTICS (no app routes yet)
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
// SECTION A: REPUTATION_ORACLE (fieldIntelligenceAdapter.ts)
// SECTION B: CROSS_CHAIN_LAUNCH, EXCHANGE_HUB_DEX (only in DEX_CONFIG, no on-chain calls), IOT_ORACLE
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

// Market Infrastructure Contracts (17-18) — SECTION B (no app routes call these yet)
export const MARKET_CONTRACTS = {
  // Contract 17: MarketsAndListingsHub (Wall Street/RWA)
  MARKETS_RWA_HUB: '0x98a59D4fb5Fa974879E9F043C3174Ae82Fb9D830',
  
  // Contract 18: OracleAndMetricsRelay
  ORACLE_METRICS: '0x5c17F4621A47b4E8c357bAA6379b4B223BAA5Ac6'
} as const;

// Community & Engagement Contracts (19-21) — SECTION B (no app routes call these yet)
export const COMMUNITY_CONTRACTS = {
  // Contract 19: CommunitySocialHub
  SOCIAL_HUB: '0xC2f82eD5C2585B525E01F19eA5C28811AB43aF49',
  
  // Contract 20: AxiomAcademyHub
  ACADEMY_HUB: '0x30667931BEe54a58B76D387D086A975aB37206F4',
  
  // Contract 21: GamificationHub
  GAMIFICATION: '0x7F455b4614E05820AAD52067Ef223f30b1936f93'
} as const;

// Sustainability Contracts (22) — SECTION B (no app routes call this yet)
export const SUSTAINABILITY_CONTRACTS = {
  // Contract 22: SustainabilityHub
  SUSTAINABILITY: '0xAf4dF8a7733BAB64b7Ce83F2494d6446eF9eC046'
} as const;

// ═══ SECTION A continues: V2 Sovereign Banking ═══════════════════════════
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
// SECTION A: SUSU_HUB (SusuService.ts, wealth-practice APIs)
// SECTION B: SUSU_PERSONAL_VAULT (no app routes call this yet)
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

// AXUSD Stablecoin System Contracts (30-35) — Original ecosystem
// SECTION A: AXUSD (Euler vault binding ref), BACKSTOP_VAULT (treasury-health ref)
// SECTION C (DEPRECATED): ORACLE_ADAPTER, RATE_LIMITER, VAULT_ENGINE, PSM — original ecosystem only,
//   superseded by AXUSD_GENIUS_CONTRACTS. Do not use for new integrations.
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

// ═══ SECTION A: AXUSD GENIUS Act Aligned Contracts (41-52) ══════════════
// All fields below are actively used in peg-status, treasury-health, supply, lp-analytics, erc3643, solvency.
// SECTION B (not yet called by app): ORACLE_ADAPTER, RATE_LIMITER, VAULT_ENGINE, SEGREGATED_CUSTODY, LIQUIDATOR
// AXUSD GENIUS Act Aligned Contracts (41-52)
// Deployed: January 11, 2026 | Arbitrum One
// Features: Designed to align with GENIUS Act framework (Public Law 119-27), 100% reserve backing, peg stability
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

// EulerSwap AXUSD Liquidity Layer (Task #40)
// EulerSwap integrates directly with EVK vaults — idle LP capital earns lending yield.
// Factory addresses confirmed from euler-interfaces/addresses/42161 (EulerChains.json).
// Pool deployment deferred: requires price curve parameters (priceX, priceY, concentration,
// equilibriumReserves) + initial liquidity + Euler account setup. Use Euler UI for pool creation.
// ERC-3643 prerequisite: all pool addresses must be registered in the LendingPlatformModule.
export const EULER_SWAP = {
  // EulerSwap V2 factory — canonical Arbitrum One (euler-interfaces/addresses/42161)
  FACTORY: '0x138AB9B33741B25bb7BcDa466175c8B2E2b96dc4', // V2 — use for new pools
  // EulerSwap V1 factory — legacy (still active)
  FACTORY_V1: '0x7949bE8B154D7B5ce6E75cBfc646AeF3a25970E2',
  // AXUSD/USDC pool — primary peg stability venue; backed by EVK AXUSD vault
  AXUSD_USDC_POOL: '0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8',
  // AXUSD/AXM pool — protocol token liquidity; backed by EVK AXUSD + EVK AXM vaults
  // DEPLOYED+SEEDED ✓ 2026-03-28 | Arbitrum One | tx 0x98f1b5504ab007ffb507a8d03f6c005893630887874c53efb9e9f381f168dfee
  // token0=AXM (0x864F...) < token1=AXUSD (0xD611...) | status=UNLOCKED | salt=0x...1451
  // reserves: 10,000 AXM / 9,000 AXUSD | fee=0.3% | concentration=0.5 | priceX/Y=1:1 (placeholder)
  // LPM whitelisted ✓ (tx 0x4dcbed26...) | eAXM-1 hookConfig fixed ✓ | reconfigure ✓ (tx 0xfcce2cff...)
  AXUSD_AXM_POOL: '0x981763699D269E129a08E216b1AeC7caa376A8a8',
  // AXM EVK Vault — supply-only vault for AXM collateral in the AXM/AXUSD EulerSwap pool
  // DEPLOYED+ACTIVE ✓ 2026-03-28 | symbol: eAXM-1 | oracle=address(0) (no borrowing)
  // hookConfig: hookTarget=address(0), hookedOps=0 (fixed from 32767) | 10,000 AXM seeded
  AXM_EVK_VAULT: '0x8e28ffa89d168599156004db4f4d12c2af7c250e',
  // Swap fee: 30 bps (0.30%). Configure at pool creation.
  SWAP_FEE_BPS: 30,
} as const;

// Real Estate Lending Fund Contracts (41-52)
// SECTION A: RISK_CONFIG, FIXFLIP_VAULT, FIXFLIP_MANAGER, DSCR_RISK_CONFIG, DSCR_POOL_VAULT, DSCR_LOAN_MANAGER
// SECTION B (not yet called by app): LOAN_RECEIPT_NFT, REPAYMENT_ROUTER, PRODUCT_REGISTRY,
//   DSCR_LOAN_RECEIPT_NFT, DSCR_REPAYMENT_ROUTER
// Status: DEPLOYED & VERIFIED | Arbitrum One | January 25, 2026
// Features: Fix & Flip bridge loans, DSCR rental loans, ERC4626 vaults, ERC721 loan receipts
// V3 Upgrade: Governance integration with GovernanceHub for on-chain risk parameter control
export const REALESTATE_LENDING_CONTRACTS = {
  // Fix & Flip Bridge Loan Contracts
  RISK_CONFIG: '0xD9a53c691B688351283Fecc33D8D9AF964A9a078',  // V3 with GovernanceHub
  LOAN_RECEIPT_NFT: '0x6C4181A15EAC950A2504aC63ebE7F5A0999265e9',
  FIXFLIP_VAULT: '0xF4AcD4B7EaBfDA7E1b96D3abA1C6340557aa93E5',  // V2 with approveSpender
  REPAYMENT_ROUTER: '0x68fe7924c56c7B9D13F21B3a22Fe2B5bc59Ab9D5',
  FIXFLIP_MANAGER: '0xD6ebaBEAEf4B263fa10cc0E630Ab2B9A2e478958',  // V3 with GovernanceHub
  PRODUCT_REGISTRY: '0x31AD75DB98F142069ff30D6C7C206Ca4b5a10e5d',  // V3 with GovernanceHub
  
  // DSCR Rental Loan Contracts
  DSCR_RISK_CONFIG: '0xd9d5a2A1aDF917BECd9454De632DfC69895a2B26',  // V3 with GovernanceHub
  DSCR_LOAN_RECEIPT_NFT: '0x66DB145A7ac0de369da88098E8F85467cFaD7674',
  DSCR_POOL_VAULT: '0x5a09cb67518e6E28d8307D75174430939C044A7d',  // V2 with approveSpender
  DSCR_REPAYMENT_ROUTER: '0xa03e35afeE61c965522D88e778B356A2F2eF9Eab',
  DSCR_LOAN_MANAGER: '0x105117F1AD1B65a5d0C7F0E9A870683A06738E16'  // V3 with GovernanceHub
} as const;

// Stablecoins on Arbitrum
export const STABLECOINS = {
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
} as const;

// AXUSD Ecosystem Integration Contracts (36-40)
// SECTION A: SEED_YIELD_DISTRIBUTOR, REVENUE_ROUTER (solvency/auto-ingest, ACTIVE_CONTRACTS)
// SECTION B: SUSU_AXUSD_ADAPTER, KEYGROW_PAYMENT, LIQUIDITY_BOOTSTRAPPER (no app routes yet)
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

// ═══ SECTION A: Land Acquisition Contracts (53-56) ══════════════════════
// All 4 addresses are called in landAcquisitionService.ts and builderFarmerCreditService.ts.
// Phase 2 Land Acquisition Contracts (53-55)
// Deployed: January 15, 2026 | Arbitrum One
// Features: SEC Reg CF compliant land crowdfunding, community pooling, ERC1155 land options
export const LAND_ACQUISITION_CONTRACTS = {
  // Contract 53: LandOptionRegistry (ERC1155)
  // Tokenized land acquisition options with SEC Reg CF compliance
  LAND_OPTION_REGISTRY: '0xCE0Df38260E626BA45628C4576254276B8C62A0D',
  
  // Contract 54: LandAcquisitionPool
  // Community pooling for land purchases with SUSU-style contributions
  LAND_ACQUISITION_POOL: '0x14162c6EE2BbcBC22Fd911c6f252807D186f5545',
  
  // Contract 55: RegCFCrowdfunding
  // SEC Reg CF compliant crowdfunding campaigns for land investments
  REG_CF_CROWDFUNDING: '0x02f967Ba52132E63272bbf8b01EF676605eA99d2',
  
  // Contract 56: BuilderFarmerCredit
  // Credit facility for builders and farmers with tiered underwriting
  // Builder: 70% LTV, 12% APR, 24mo max | Farmer: 65% LTV, 10% APR, 36mo max
  BUILDER_FARMER_CREDIT: '0x814A9795bAbEE0DEd433d127dacD03031fB193b4'
} as const;

// ═══ SECTION A: Governance + Real Estate Lending ════════════════════════
// Governance Infrastructure Contracts
// Status: DEPLOYED & VERIFIED | Arbitrum One | January 25, 2026
// Features: On-chain timelock governance, role-based access, emergency controls
export const GOVERNANCE_CONTRACTS = {
  // GovernanceHub: Timelock-based governance for lending infrastructure
  // Roles: RISK_COMMITTEE_ROLE, SETTLEMENT_AUTHORITY_ROLE, GUARDIAN_ROLE
  // Features: 24h minimum delay, emergency pause, action queue
  // Integration: RiskConfig, DSCRRiskConfig, FixFlipManager, DSCRLoanManager, ProductRegistry
  GOVERNANCE_HUB: '0x52Dc85fd653a75323b5307f4D2629ab9A070530E'
} as const;

// ═══ SECTION A: Euler V2 Lending Markets ════════════════════════════════
// Actively used: EVK_OPEN_MARKET_VAULT, EVK_OPEN_MARKET_IRM, EVC, EULER_EARN_VAULT, EULER_EARN_FACTORY, AXIOM_FEE_BURNER
// SECTION C (DEPRECATED): AXUSD_VAULT_V4_DEPRECATED, AXUSD_VAULT_V3_DEPRECATED, PRICE_ORACLE_DEPRECATED, VAULT_GOVERNOR
// External Euler protocol infra (not Axiom-deployed): EVK_FACTORY, IRM_FACTORY, PROTOCOL_CONFIG, IMPLEMENTATION, COLLATERAL_* vaults
// Euler V2 AXUSD Lending Markets
// Status: DEPLOYED & LIVE | Arbitrum One | January 30, 2026
// Features: Vault-to-vault collateral, external LP yield, supply/borrow enabled
// V4 Upgrade: Fixed hook configuration issue, deposits/withdrawals fully operational
export const EULER_LENDING_CONTRACTS = {
  // DEPRECATED: AXUSD Lending Vault V4 (eAXUSD-4)
  // Status: WITHDRAW_ONLY — hook configuration issue in this vault prevents new deposits.
  // Replaced by EVK_OPEN_MARKET_VAULT (ERC-3643 compliant, no hooks, Task #38).
  AXUSD_VAULT_V4_DEPRECATED: '0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059',

  // DEPRECATED: V3 Vault (broken hook configuration - withdraw-only mode)
  AXUSD_VAULT_V3_DEPRECATED: '0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429',

  // ── EVK Open Money Market (Task #38) — ERC-3643 AXUSD Open Lending Vault ──
  // Status: DEPLOYED ✓ — eAXUSD-6, Euler V2 EVK on Arbitrum One
  // Asset: ERC-3643 AXUSD (0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7)
  // Oracle: AXIOMOracleAdapter v2 (0xc894d1500...) — IMMUTABLE (baked into MetaProxy trailing data)
  // UoA: USDC | Collateral: USDC at 90% borrowLTV / 95% liquidationLTV
  // Supply Cap: 1M AXUSD | Borrow Cap: 500K AXUSD
  // IRM: IRMLinearKink — baseRate 1%, kink 80%, slope1 5%, slope2 100%
  // Whitelisted in LendingPlatformModule ✓ | EVC whitelisted in LPM ✓
  EVK_OPEN_MARKET_VAULT: '0xacdA87801f6409bB5157BA78aF1BD9631d6609B2',
  EVK_OPEN_MARKET_IRM: '0x13B4F093C95785a621b928A9fa31Ea7a7fAb1662',
  EVK_OPEN_MARKET_GOVERNOR: '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96',

  // Vault Governor (legacy eAXUSD-4 governor — kept for reference)
  VAULT_GOVERNOR: '0xE742Ee9b946043eCC75bFc71B47216C1f8248316',

  // DEPRECATED: Legacy decimal-corrected price oracle (pre-ERC-7726).
  // Superseded by AXUSD_ERC7726_ORACLE_ADAPTER once deployed.
  // Reference: src/config/oracleConfig.ts → LEGACY_ORACLE.PRICE_ORACLE
  PRICE_ORACLE_DEPRECATED: '0x1045B6c70AC7b491bf724B5Aa4D89F542D955E15',

  // Euler Infrastructure (Arbitrum One) — canonical mainnet addresses
  // EVK_FACTORY and EVC verified via LPM audit — used in deploy-axusd-evk-vault.js
  EVK_FACTORY: '0x78Df1CF5bf06a7f27f2ACc580B934238C1b80D50',
  EVC: '0x6302ef0F34100CDDFb5489fbcB6eE1AA95CD1066',
  IRM_FACTORY: '0xE1C43c63EC62E0B8dcE0e98Da08E9fa48cAC4D40',
  PROTOCOL_CONFIG: '0x06c1Ab0A1672E8FC7F7D10BD7B869B4116D18a2c',
  IMPLEMENTATION: '0x832ff4011a3164ea76cea06a313ee0b6cd72ba96',

  // Accepted Collateral Vaults (existing Euler vaults on Arbitrum One)
  COLLATERAL_USDC_VAULT: '0x0a1eCC5Fe8C9be3C809844fcBe615B46A869b899',
  COLLATERAL_USDT_VAULT: '0x37512F45B4ba8808910632323b73783Ca938CD51',
  COLLATERAL_WETH_VAULT: '0x78E3E051D32157AACD550fBB78458762d8f7edFF',
  COLLATERAL_ARB_VAULT: '0x7eD866D2D66c3149FaFE854C30C68a8BA7ceE8B9',

  // ── Euler Earn AXUSD Vault (Task #39) — Yield Aggregation Vault ──
  // Status: DEPLOYED ✓ | Arbitrum One | 2026-03-25
  // Vault name: Axiom Earn AXUSD | Symbol: earnAXUSD
  // Asset: ERC-3643 AXUSD (0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7)
  // Strategy: eAXUSD-6 EVK Open Market (Task #38) — 1M AXUSD supply cap
  // Performance Fee: 10% (1e17 WAD) → AXIOM_FEE_BURNER
  // Timelock: 0 (instant cap acceptance at launch; increase to 1 week post-seeding)
  // Whitelisted in LendingPlatformModule ✓
  EULER_EARN_VAULT: '0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B',
  // Euler Earn Factory — Arbitrum One canonical (from euler-interfaces/addresses/42161)
  EULER_EARN_FACTORY: '0xB9B5d62B9fE9E1B505466e75817aB178A1D2ec9d',
  // AxiomFeeBurner — destination for Euler Earn performance fee stream (10%)
  AXIOM_FEE_BURNER: '0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94'
} as const;

// ═══ SECTION A: ERC-7726 Oracle + Section C: Legacy Oracles ════════════
// SECTION A: AXUSD_ERC7726_ORACLE_ADAPTER (oracle/axusd-price.ts, vault oracle baked in)
// SECTION C (DEPRECATED): LEGACY_ORACLE_ADAPTER, LEGACY_ORACLE_ADAPTER_REGISTRY, LEGACY_PRICE_ORACLE
// ERC-7726 Oracle Infrastructure
// Status: DEPLOYED ✓ | Arbitrum One | Task #37
// Deploy: npx hardhat run scripts/deploy-axusd-oracle.js --network arbitrumOne
// After deploying, update AXUSD_ERC7726_ORACLE_ADAPTER below and in src/config/oracleConfig.ts.
// Interface: getQuote(uint256 inAmount, address base, address quote) → uint256 outAmount
// Supports pairs: USDC↔AXUSD, USDT↔AXUSD, WETH→AXUSD, ARB→AXUSD, WBTC→AXUSD
export const ERC7726_ORACLE_CONTRACTS = {
  // AXIOMOracleAdapter v2 — DEPLOYED ✓ ERC-7726 compliant price oracle for AXUSD
  // Source: contracts/oracle/AXIOMOracleAdapter.sol
  // primaryAxusd = ERC-3643 AXUSD (0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7)
  // Verified: getQuote(1e18, ERC3643_AXUSD, USDC) = 1,000,000 (peg = $1.00) ✓
  AXUSD_ERC7726_ORACLE_ADAPTER: '0xc894d1500CB1FBf8F045e87bd357A51345197c4e',

  // DEPRECATED legacy oracles (active until AXUSD_ERC7726_ORACLE_ADAPTER is live):
  // Phase 3 OracleAdapter (AXUSD_GENIUS_CONTRACTS.ORACLE_ADAPTER)
  LEGACY_ORACLE_ADAPTER: '0xE3b1f38AaBAd138d0EF2e2C7429ee57c512fDF3D',
  // OracleAdapterRegistry used by EulerVaultService
  LEGACY_ORACLE_ADAPTER_REGISTRY: '0x91c8B55D234de4b48C1F1F1c5e9c4b6C8CB96f84',
  // Euler vault PRICE_ORACLE (deprecated, see EULER_LENDING_CONTRACTS.PRICE_ORACLE_DEPRECATED)
  LEGACY_PRICE_ORACLE: '0x1045B6c70AC7b491bf724B5Aa4D89F542D955E15',
} as const;

// ═══ SECTION A: Node Economy Contracts ══════════════════════════════════
// All 4 addresses called in depinEventListener.ts and PolicyGuardService.ts.
// Node Economy Contracts (Step 2 - Node Operator Program)
// Status: DEPLOYED & VERIFIED | Arbitrum One | February 2026
// Features: Node registration, rewards distribution, slashing engine
// Reference: docs/node-operator/on-chain-spec.md
export const NODE_ECONOMY_CONTRACTS = {
  NODE_REGISTRY: '0x31bc6268155219B627FC3B2d8434d010F33DCb03',
  NODE_REWARDS: '0x0c1c96F38566d056877cEf4791c701C4F5AEf362',
  SLASHING_ENGINE: '0x1ae162B80cEfb82f9ccF25b5E7A45E5e133E6F87',
  CAPITAL_READINESS_GATE: '0xc3f798066e1401aa30Da8703A4c0588A1076ff39'
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
  ...REALESTATE_LENDING_CONTRACTS,
  ...LAND_ACQUISITION_CONTRACTS,
  ...GOVERNANCE_CONTRACTS,
  ...EULER_LENDING_CONTRACTS,
  ...ERC7726_ORACLE_CONTRACTS,
  ...NODE_ECONOMY_CONTRACTS
} as const;

// Deployer Address
export const DEPLOYER_ADDRESS = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';

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
