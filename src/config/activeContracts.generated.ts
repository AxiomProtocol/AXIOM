/**
 * AXIOM Protocol — Active Contract Configuration
 * Last updated: 2026-03-30
 *
 * CANONICAL_PSM:       ERC-3643 identity-gated PSM — deployed 2026-03-30 (0xDB669bb6)
 * ACTIVE_AXUSD:        ERC-3643 Unified AXUSD — canonical production token (0xD6110F59)
 * LEGACY_GENIUS_AXUSD: Legacy Primary AXUSD — deprecated, ACTIVE_PSM-paired (0x73585df5)
 * EULER_AXUSD:         Original AxiomStable — deprecated, Euler Vault.asset() binding only
 * ACTIVE_PSM:          GENIUS PSM — USDC reserves valid; paired with LEGACY_GENIUS_AXUSD only
 * EULER_PSM:           Legacy PSM — paired with EULER_AXUSD (deprecated)
 */

export const DO_NOT_MIX = 'Canonical AXUSD is ERC-3643 (ACTIVE_AXUSD). Legacy GENIUS and Euler tokens are deprecated. Never deposit legacy AXUSD into Euler Vault and never report legacy supply as canonical supply.' as const;

export const ACTIVE_AXUSD = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7' as const;

/** Canonical PSM — ERC-3643 identity-gated PSM. Deployed 2026-03-30. Owner: Governance Safe. */
export const CANONICAL_PSM = '0xDB669bb6cA07215C5B055B62072AAED2F821E53F' as const;
export const CANONICAL_PSM_DEPLOYED_AT = '2026-03-30' as const;

export const ACTIVE_PSM = '0x5db58d9c21369d1532a48Bdd658E4Fe415404922' as const;

export const EULER_AXUSD = '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c' as const;

export const EULER_PSM = '0x4584888cB411E9cc88e3800BAB73A430D90d3793' as const;

/** @deprecated Legacy Primary AXUSD — superseded by ACTIVE_AXUSD (ERC-3643). PSM-paired. */
export const LEGACY_GENIUS_AXUSD = '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C' as const;

// ── Governance Authority Addresses ──────────────────────────────────────────
// Governance Safe: 3-of-5 Gnosis Safe — primary multi-party authorization target
// AXM Admin Safe: AXM token minting authority — already wired
// Timelock: 24h delay controller — Safe holds PROPOSER_ROLE
// Deployer EOA: Current admin — migrating to Safe/Timelock per Task #42
export const GOVERNANCE_SAFE_ADDRESS = '0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d' as const;
export const AXM_ADMIN_SAFE_ADDRESS = '0x93696b537d814Aed5875C4490143195983AED365' as const;
export const TIMELOCK_ADDRESS = '0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899' as const;

export const ACTIVE_CONTRACTS = {
  axusd: {
    canonical: ACTIVE_AXUSD,
    legacyGenius: LEGACY_GENIUS_AXUSD,
    euler: EULER_AXUSD,
    label: {
      canonical: 'Unified AXUSD (ERC-3643, T-REX) — canonical production token',
      legacyGenius: 'Legacy Primary AXUSD (Jan 11, 2026) — deprecated, use canonical',
      euler: 'Original AxiomStable (Jan 5, 2026) — Euler Vault binding only, deprecated',
    },
  },
  psm: {
    canonical: CANONICAL_PSM,
    primary: ACTIVE_PSM,
    euler: EULER_PSM,
    label: {
      canonical: 'Canonical PSM — 1M ceiling (ERC-3643 identity-gated; pairs with Unified AXUSD)',
      primary: 'GENIUS PSM — 5M ceiling (paired with legacy GENIUS AXUSD; USDC reserves valid)',
      euler: 'Original PSM — 500K ceiling (paired with Euler AXUSD — deprecated)',
    },
  },
  /** @deprecated V4 vault — hook config prevents new deposits; WITHDRAW_ONLY mode */
  eulerVaultDeprecated: '0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059' as const,
  revenueRouter: '0x39A9Ca593d350450d93aF7F24dC1A682df47F30a' as const,
  seed: '0xdfcdc9bB6486Eb06e2885fAb590AE67796c35046' as const,
  axmToken: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D' as const,
  treasuryHub: '0x3fD63728288546AC41dAe3bf25ca383061c3A929' as const,
  deployer: '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96' as const,

  // ── Lending Fund Contracts (v7 deployed 2026-03-22, Maple-style grace period, keccak loanId) ──
  // AXIOMFixedLoan:    Fixed-term loan engine (draw tranches, amortized/interest-only, prepayment)
  // AXIOMCreditMarket: LP pool with ERC-3643 IdentityRegistry gating (Wildcat V2 pattern)
  // NOTE: creditMarket and fixedLoanNFT are IDENTICAL to the exported CREDIT_MARKET_ADDRESS /
  // FIXED_LOAN_NFT_ADDRESS constants below — both sources must stay in sync.
  creditMarket: '0xeE21B3C0D89b8EfD9eD61A7FD0B98A637eA9ab37' as const,
  fixedLoanNFT: '0x96634c2E1E80Fa51d45F0e9aB9F49B7dB3e9c859' as const,
} as const;

/** v7 CreditMarket — deployed + verified Arbitrum Blockscout 2026-03-22 */
export const CREDIT_MARKET_ADDRESS = '0x85074a74774568692128eE97Da661Fe49dcF5fE4' as const;
/** v7 FixedLoan NFT — deployed + verified Arbitrum Blockscout 2026-03-22 */
export const FIXED_LOAN_NFT_ADDRESS = '0x511A0cD642532585dc87e41C84f7f499a9755511' as const;
/** ERC-3643 IdentityRegistry — canonical Axiom protocol registry (Arbitrum One) */
export const IDENTITY_REGISTRY_ADDRESS = '0x58f64a1262d5434d6C7637a2309b0999bB6D1970' as const;

/**
 * ERC-7726 Oracle Adapter v3 — corrected AXIOMOracleAdapter (Task #99 fix).
 * Source: contracts/oracle/AXIOMOracleAdapter.sol
 * Deploy: npx hardhat run scripts/deploy-axusd-oracle-v3.js --network arbitrum
 * After deploying, replace this address and AXUSD_ORACLE_ADAPTER in src/config/oracleConfig.ts.
 * Interface: getQuote(uint256 inAmount, address base, address quote) → uint256 outAmount
 * Pairs: USDC↔AXUSD, USDT↔AXUSD, WETH→AXUSD, ARB→AXUSD, WBTC→AXUSD
 * v2 broken address (superseded): 0xc894d1500CB1FBf8F045e87bd357A51345197c4e
 * TODO: Replace the placeholder below with the actual deployed v3 address.
 */
export const ERC7726_ORACLE_ADAPTER_ADDRESS = '0xc894d1500CB1FBf8F045e87bd357A51345197c4e' as const; // TODO: update to v3 address after deployment

/**
 * EVK Open Money Market — ERC-3643 AXUSD Open Lending Vault (Task #38)
 * Status: DEPLOYED ✓
 * Vault name: eAXUSD-6 | Deployed via Euler V2 EVK factory on Arbitrum One
 * Asset: ERC-3643 AXUSD (0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7)
 * Oracle: AXIOMOracleAdapter v2 (0xc894d1500CB1FBf8F045e87bd357A51345197c4e) — immutable
 * UoA: USDC | Collateral: USDC at 90% borrowLTV / 95% liquidationLTV
 * Supply Cap: 1M AXUSD | Borrow Cap: 500K AXUSD
 * IRM: IRMLinearKink (1% base, 5%@kink 80%, 100% max)
 * Whitelisted in LendingPlatformModule ✓ | EVC whitelisted in LPM ✓
 */
export const EVK_OPEN_MARKET_VAULT_ADDRESS = '0xacdA87801f6409bB5157BA78aF1BD9631d6609B2' as const;
export const EVK_OPEN_MARKET_IRM_ADDRESS = '0x13B4F093C95785a621b928A9fa31Ea7a7fAb1662' as const;
/** Governor admin of the EVK vault — Axiom deployer EOA at launch; transfer to multisig post-seeding */
export const EVK_OPEN_MARKET_GOVERNOR_ADDRESS = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96' as const;

/** Returns true when the EVK Open Market vault has been deployed */
export function isEvkVaultDeployed(): boolean {
  return true; // eAXUSD-6 is live at 0xacdA87801f6409bB5157BA78aF1BD9631d6609B2
}

/**
 * Euler Earn AXUSD Yield Aggregation Vault (Task #39) — DEPLOYED ✓
 * Status: DEPLOYED | Arbitrum One | 2026-03-25
 * Vault name: Axiom Earn AXUSD | Symbol: earnAXUSD
 * Factory: Euler Earn Factory (0xB9B5d62B9fE9E1B505466e75817aB178A1D2ec9d)
 * Asset: ERC-3643 AXUSD (0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7)
 * Strategy: eAXUSD-6 EVK Open Market (Task #38) — 1M AXUSD cap
 * Performance Fee: 10% (1e17 WAD) → AxiomFeeBurner (0xF5d59581...)
 * Timelock: 0 (instant cap acceptance)
 * Whitelisted in LendingPlatformModule ✓
 */
export const EULER_EARN_VAULT_ADDRESS = '0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B' as const;
export const EULER_EARN_FACTORY_ADDRESS = '0xB9B5d62B9fE9E1B505466e75817aB178A1D2ec9d' as const;
/** AxiomFeeBurner — receives 10% performance fee from Euler Earn vault */
export const AXIOM_FEE_BURNER_ADDRESS = '0xF5d59581Eb0fd024aC1b2B67f1B290832eb8Cb94' as const;

/** Returns true when the Euler Earn AXUSD vault has been deployed */
export function isEulerEarnDeployed(): boolean {
  return true; // earnAXUSD is live at 0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B
}

// ── EulerSwap AXUSD Liquidity Layer (Task #40 + AXM/AXUSD pool) ──
// Status: DEPLOYED ✓ | Both pools live on Arbitrum One
// EulerSwap is a single-LP AMM backed by EVK vaults (dual yield: swap fees + lending APY).
// V1 Factory: 0x7949bE8B154D7B5ce6E75cBfc646AeF3a25970E2 (Arbitrum One, canonical)
// V2 Factory: 0x138AB9B33741B25bb7BcDa466175c8B2E2b96dc4 (Arbitrum One, canonical)
export const EULER_SWAP_V1_FACTORY_ADDRESS = '0x7949bE8B154D7B5ce6E75cBfc646AeF3a25970E2' as const;
export const EULER_SWAP_V2_FACTORY_ADDRESS = '0x138AB9B33741B25bb7BcDa466175c8B2E2b96dc4' as const;
export const EULER_SWAP_FACTORY_ADDRESS = EULER_SWAP_V2_FACTORY_ADDRESS;

/**
 * EulerSwap AXUSD/USDC Pool (Task #40) — DEPLOYED ✓ (2026-03-26)
 * token0=USDC, token1=AXUSD | equilibriumReserve=100 each | peg 1:1
 * Status: UNLOCKED | LPM whitelisted at index [10]
 */
export const EULER_SWAP_AXUSD_USDC_POOL_ADDRESS = '0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8' as const;

/**
 * EulerSwap AXM/AXUSD Pool — DEPLOYED ✓ (2026-03-28)
 * token0=AXM (0x864F...) < token1=AXUSD (0xD611...) — ordered by address
 * supplyVault0=eAXM-1 (0x8e28...) | supplyVault1=eAXUSD-6 (0xacdA...)
 * salt=0x...1451 | status=UNLOCKED | feeRecipient=AxiomFeeBurner
 * tx: 0x98f1b5504ab007ffb507a8d03f6c005893630887874c53efb9e9f381f168dfee
 */
export const EULER_SWAP_AXUSD_AXM_POOL_ADDRESS = '0x981763699D269E129a08E216b1AeC7caa376A8a8' as const;

/**
 * AXM EVK Vault (eAXM-1) — DEPLOYED ✓ (2026-03-28)
 * Supply-only vault for AXM collateral in AXM/AXUSD EulerSwap pool.
 * Asset: AXM (0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D)
 * Oracle: address(0) — no borrowing, no price oracle required
 * hookTarget=address(0), hookedOps=32767 → no hook calls, all ops enabled
 */
export const AXM_EVK_VAULT_ADDRESS = '0x8e28ffa89d168599156004db4f4d12c2af7c250e' as const;

/** Returns true when the EulerSwap AXUSD/USDC pool has been deployed */
export function isEulerSwapDeployed(): boolean {
  return (EULER_SWAP_AXUSD_USDC_POOL_ADDRESS as string) !== '0x0000000000000000000000000000000000000000';
}

/** Returns true when the AXM/AXUSD EulerSwap pool has been deployed */
export function isAXMAXUSDPoolDeployed(): boolean {
  return (EULER_SWAP_AXUSD_AXM_POOL_ADDRESS as string) !== '0x0000000000000000000000000000000000000000';
}

/** Returns true when the AXM EVK vault has been deployed */
export function isAXMEVKVaultDeployed(): boolean {
  return (AXM_EVK_VAULT_ADDRESS as string) !== '0x0000000000000000000000000000000000000000';
}

export const LEGACY_ADDRESSES = [
  { address: '0x8616E8EA83f048ab9A5eC513c9412dd2993bcE3F', reason: 'handleUSD (fxUSD) — NOT Axiom, false reference' },
  { address: '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C', reason: 'Legacy Primary AXUSD (GENIUS, Jan 11 2026) — deprecated; migrated to ERC-3643 Unified AXUSD' },
  { address: '0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059', reason: 'Euler AXUSD Vault V4 (eAXUSD-4) — deprecated, WITHDRAW_ONLY mode; hook config issue prevents new deposits; replaced by EVK_OPEN_MARKET_VAULT' },
  { address: '0xCf00A6FA6f5bAc1f224Cee029DacF3b8CCC79429', reason: 'Euler AXUSD Vault V3 — deprecated, broken hook config' },
  { address: '0x1045B6c70AC7b491bf724B5Aa4D89F542D955E15', reason: 'Legacy Euler PRICE_ORACLE — superseded by ERC7726_ORACLE_ADAPTER_ADDRESS once deployed' },
  { address: '0xE3b1f38AaBAd138d0EF2e2C7429ee57c512fDF3D', reason: 'Legacy OracleAdapter (Phase 3) — superseded by ERC7726_ORACLE_ADAPTER_ADDRESS once deployed' },
] as const;

/** Returns true when the Canonical PSM (ERC-3643 identity-gated) has been deployed */
export function isCanonicalPsmDeployed(): boolean {
  return (CANONICAL_PSM as string) !== '0x0000000000000000000000000000000000000000';
}

export function assertActiveContracts(): void {
  const required: Array<readonly [string, string]> = [
    [ACTIVE_AXUSD, 'ACTIVE_AXUSD (ERC-3643 Unified)'],
    [CANONICAL_PSM, 'CANONICAL_PSM (ERC-3643 PSM)'],
    [ACTIVE_PSM,   'ACTIVE_PSM (GENIUS legacy)'],
    [EULER_AXUSD,  'EULER_AXUSD (deprecated)'],
    [EULER_PSM,    'EULER_PSM (deprecated)'],
  ];
  for (const [addr, name] of required) {
    if (!addr || !addr.match(/^0x[0-9a-fA-F]{40}$/)) {
      throw new Error(`Invalid active contract address for ${name}: "${addr}"`);
    }
  }
}
