# AXIOM MULTICHAIN DISCOVERY REPORT
**Phase 1 — Repo Discovery and Chain Surface Audit**  
Generated: 2026-05-11  
Status: Living document — update as surfaces are isolated  

---

## 1. Executive Summary

Axiom Protocol's current codebase is structurally Arbitrum One–centric. All
live product functionality — ERC-3643 identity, AXUSD settlement, AXAU reserve
operations, DEX/Euler integration, DePIN, land acquisition, governance — is
deployed on and assumes Arbitrum One (chain ID 42161).

A multichain expansion layer (`lib/multichain/`) was previously scaffolded and
captures a planned-but-not-live expansion model. That layer correctly gates all
non-Arbitrum chains behind feature flags and marks them as `researching`.

This report audits every place where chain-specific assumptions currently
exist in the live codebase.

---

## 2. All Current Chain-Specific Surfaces

### 2.1 Hardcoded Chain IDs

| File | Value | Notes |
|------|-------|-------|
| `shared/contracts.ts` | `chainId: 42161` | `NETWORK_CONFIG` — canonical source |
| `shared/contracts.ts` | `chainIdHex: '0xa4b1'` | Hex form of Arbitrum One chain ID |
| `lib/config.ts` | `chainId: NETWORK_CONFIG.chainId` (42161) | Delegates to `shared/contracts.ts` |
| `lib/property/explorerLinks.ts` | `42161`, `421614` | Arbitrum One + Sepolia |
| `lib/utils/assertArbitrumOne.ts` | `42161n` (BigInt) | Hard-gated SIWE check |
| `lib/web3/wagmiConfig.ts` | `arbitrum.id` (42161) | Wagmi transport/connector config |
| `lib/onramp/config.ts` | `42161` (default) | `ONRAMP_DEFAULT_CHAIN_ID` fallback |
| `lib/onramp/config.ts` | Multiple `chainId: 42161` in asset list defaults | Hardcoded asset list |
| `lib/multichain/chainRegistry.ts` | `42161`, `1`, `137`, `43114` | Registry entries (correctly typed) |
| `src/config/creditMarket.generated.ts` | Arbitrum chain reference | Generated config file |
| `src/config/activeContracts.generated.ts` | Arbitrum chain reference | Generated config file |
| `client/src/config/axiom.config.ts` | Arbitrum chain ID | Client-side config |
| `client/src/config/contracts.ts` | Arbitrum chain ID | Client contract addresses |
| `client/src/contracts/config.ts` | Arbitrum chain ID | Contract definitions |
| `hardhat.config.ts` and all `hardhat.*.config.ts` | Arbitrum references | Deployment configs |

### 2.2 Hardcoded RPC Assumptions

| File | Value | Notes |
|------|-------|-------|
| `shared/contracts.ts` | `rpcUrl: 'https://arb1.arbitrum.io/rpc'` | Public Arbitrum RPC fallback |
| `lib/config.ts` | `getArbitrumRpcUrl()` | Alchemy arb-mainnet or fallback |
| `lib/web3/wagmiConfig.ts` | `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}` | Alchemy key for Arbitrum |
| `lib/web3/wagmiConfig.ts` | `https://arb1.arbitrum.io/rpc` | E2E mock transport |
| `lib/web3/wagmiConfig.ts` | `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}` | Ethereum mainnet (PAXG only) |
| `lib/services/ERC3643Service.ts` | `arb-mainnet.g.alchemy.com` | Inline provider construction |
| `lib/services/ArbitrumContractsService.ts` | `NETWORK_CONFIG.rpcUrl` | Delegates to shared config |
| Multiple `pages/api/` route files | Inline Alchemy Arbitrum URL construction | Pattern: `arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}` |

### 2.3 Wallet / Network Assumptions

| File | Surface | Notes |
|------|---------|-------|
| `lib/web3/wagmiConfig.ts` | `networks = [arbitrum, mainnet]` | Arbitrum as primary, Ethereum for PAXG only |
| `lib/utils/assertArbitrumOne.ts` | Hard chain-ID gate | Throws if wallet not on Arbitrum |
| `pages/api/auth/siwe/verify.ts` | SIWE chain ID verification | Arbitrum-only sign-in |
| `lib/auth/wallet-session.ts` | Session-level chain assumption | Arbitrum |
| `lib/middleware/siweAuth.ts` | Chain validation middleware | Arbitrum |
| `lib/web3/useWallet.ts` | Wallet hook | Arbitrum-centric |

### 2.4 Contract Address Maps

| File | Notes |
|------|-------|
| `shared/contracts.ts` | **Canonical** — 53 live + ~28 deployed-not-wired contracts, all Arbitrum One |
| `shared/contracts-3643.ts` | ERC-3643 / ONCHAINID contracts, all Arbitrum One |
| `lib/axau/spec.ts` | AXAU contract addresses, Arbitrum One |
| `src/config/activeContracts.generated.ts` | Generated at build from shared/contracts.ts |
| `src/config/creditMarket.generated.ts` | Generated credit market addresses |
| `client/src/shared/contracts.ts` | Client-facing contract map — Arbitrum One |
| `client/src/config/contracts.ts` | Client config — Arbitrum One |

### 2.5 Token / Asset Metadata Maps

| File | Surface | Notes |
|------|---------|-------|
| `lib/assets/registry.ts` | Asset metadata | AXUSD, AXAU, AXM — all Arbitrum |
| `lib/assets/internalRegistry.ts` | Internal asset list | Arbitrum-referenced |
| `lib/tokens.ts` | Token metadata | Arbitrum One tokens |
| `lib/commodities/registry.ts` | Commodity token registry | Arbitrum-based |

### 2.6 Bridge Assumptions

| File | Surface | Notes |
|------|---------|-------|
| `pages/api/axusd/bridge.ts` | Fiat→AXUSD bridge via Increase | ACH→Arbitrum (Increase banking rails) |
| `pages/api/axau/bridge-status.ts` | AXAU bridge status | Arbitrum |
| `lib/multichain/CorridorRoutingService.ts` | Planned corridors | Future only — correctly gated |
| `lib/multichain/stellar/` | Stellar payment adapter | Stub only — not live |

### 2.7 Explorer URL Assumptions

| File | Surface | Notes |
|------|---------|-------|
| `lib/property/explorerLinks.ts` | `arbiscan.io` / `sepolia.arbiscan.io` | Arbiscan hard-coded |
| `shared/contracts.ts` | `blockExplorer: 'https://arbitrum.blockscout.com'` | Blockscout for Arbitrum |
| `lib/multichain/chainRegistry.ts` | Per-chain explorer in metadata | Registry entries — read-only, not live |
| Multiple service files | Inline Arbiscan/Blockscout URL construction | Scattered but all Arbitrum |

### 2.8 Signing / Provider Code

| File | Surface | Notes |
|------|---------|-------|
| `lib/services/ERC3643Service.ts` | `ethers.JsonRpcProvider` inline | Arbitrum Alchemy URL |
| `lib/services/ArbitrumContractsService.ts` | Provider from `NETWORK_CONFIG` | Arbitrum |
| `lib/web3/wagmiConfig.ts` | Wagmi provider setup | Arbitrum + Ethereum only |
| `lib/web3/vaultService.ts` | Vault service provider | Arbitrum |
| `lib/capinfra/adapters/evm.ts` | EVM adapter | Arbitrum |
| `lib/utils/walletClientToSigner.ts` | Signer conversion utility | Chain-agnostic adapter |
| Multiple `scripts/` files | `ethers.JsonRpcProvider` with Arbitrum URL | Deployment scripts |

### 2.9 Reserve Logic Tied to One Chain

| File | Surface | Notes |
|------|---------|-------|
| `lib/reserves/fetchReservePositions.ts` | AXAU reserve fetch | Arbitrum One |
| `lib/reserves/getCanonicalReserveSnapshot.ts` | Reserve snapshot | Arbitrum — canonical |
| `lib/reserves/reserveAlertRunner.ts` | Alert runner | Arbitrum |
| `lib/axau/spec.ts` | AXAU reserve spec | Arbitrum (PAXG-backed) |
| `lib/axau/liquidityEngine.ts` | Liquidity engine | Arbitrum |
| `lib/axau/stabilizationReport.ts` | Stabilization report | Arbitrum |
| `lib/services/ReserveAccountingService.ts` | Reserve accounting | Arbitrum |
| `lib/services/AXAUContractService.ts` | AXAU contract interactions | Arbitrum |

### 2.10 Policy / Compliance Logic Tied to One Chain

| File | Surface | Notes |
|------|---------|-------|
| `lib/compliance.ts` | Compliance framework | Arbitrum (ERC-3643) |
| `lib/services/ERC3643Service.ts` | Identity/compliance service | Arbitrum ONCHAINID |
| `lib/capinfra/identity.ts` | Identity integration | Arbitrum |
| `shared/erc3643Schema.ts` | ERC-3643 DB schema | Arbitrum-tied records |
| `pages/api/erc3643/` (all routes) | ERC-3643 admin + user APIs | Arbitrum |

### 2.11 Payment Rails Tied to One Chain

| File | Surface | Notes |
|------|---------|-------|
| `lib/capinfra/` | Increase ACH banking adapter | Fiat rails → Arbitrum AXUSD |
| `lib/property/onchainPayment.ts` | Property payment | Arbitrum AXUSD |
| `pages/api/axusd/` (all routes) | AXUSD operations | Arbitrum |
| `lib/treasury-automation.ts` | Treasury automation | Arbitrum |
| `lib/services/CircleTreasuryService.ts` | Circle treasury | Arbitrum |

### 2.12 Components Assuming Arbitrum Is the Only Network

| File | Notes |
|------|-------|
| `lib/config.ts` | `getConfig()` returns Arbitrum config only |
| `lib/web3/wagmiConfig.ts` | `networks = [arbitrum, mainnet]` — no expansion networks |
| `lib/utils/assertArbitrumOne.ts` | Hard wallet gate — throws on non-Arbitrum chain |
| `pages/api/auth/siwe/verify.ts` | SIWE hard-gates chain 42161 |
| All hardhat config files | All deployment targets are Arbitrum One |

---

## 3. What Is Currently Arbitrum-Only

The following are **fully Arbitrum One–exclusive** and must remain so unless
explicitly isolated and replaced with multi-chain–aware equivalents:

| Category | Systems |
|----------|---------|
| Smart contracts | All 53 live + ~28 deployed contracts in `shared/contracts.ts` |
| Identity / compliance | ERC-3643 ONCHAINID, `AxiomIdentityComplianceHub` |
| AXUSD settlement | AXUSD ERC-3643 stablecoin, PSM, Euler vault |
| AXAU reserve | AXAU contract, PAXG-backed reserve, reserve accounting service |
| DEX | Camelot + Euler integration |
| DePIN | Node sales, node economy contracts |
| Land acquisition | All land/real estate contracts |
| Governance | TimelockController, governance hub |
| Banking integration | Increase ACH → AXUSD bridge (fiat in, AXUSD on Arbitrum) |
| SIWE authentication | Arbitrum-only wallet sign-in |
| Wagmi wallet config | Arbitrum + Ethereum (mainnet for PAXG only) |

---

## 4. What Can Be Abstracted Safely

The following are candidates for abstraction into chain-agnostic modules
**without breaking existing behavior**:

| Surface | Abstraction Opportunity | Risk Level |
|---------|------------------------|-----------|
| `lib/property/explorerLinks.ts` | Extract to `lib/chains/explorers.ts` — additive, existing functions remain | Low |
| `lib/config.ts` `getArbitrumRpcUrl()` | Create `lib/chains/providers.ts` with chain-keyed RPC factory; existing function stays | Low |
| `shared/contracts.ts` contract maps | Create `lib/chains/contracts.ts` registry structure; existing exports unchanged | Low |
| Alchemy URL construction (scattered) | Centralize in `lib/chains/providers.ts` | Low |
| Chain capability flags | New `lib/chains/capabilities.ts` — additive only | None |
| Chain metadata | New `lib/chains/config.ts` — extends `lib/multichain/chainRegistry.ts` direction | None |
| Feature flags | New `CHAIN_*_ENABLED` flags in `lib/chains/capabilities.ts` — separate from existing `ENABLE_*` flags | None |

---

## 5. What Must Remain Untouched for Now

The following systems **must not be modified** in this phase:

| System | Reason |
|--------|--------|
| `shared/contracts.ts` | Production contract addresses — any change risks live service breakage |
| `lib/utils/assertArbitrumOne.ts` | Wallet security gate — must stay until explicit multi-chain wallet support is built |
| `pages/api/auth/siwe/verify.ts` | SIWE chain gate — must stay until multi-chain auth is architected |
| `lib/web3/wagmiConfig.ts` | Wallet provider config — adding unsupported chains could break wallet UX |
| `lib/reserves/` (all files) | Reserve accounting is canonical — no chain changes until Avalanche reserve module is built |
| `lib/services/ERC3643Service.ts` | Live compliance system — do not modify |
| `lib/capinfra/` | Live banking rails — do not touch |
| `lib/axau/` | Reserve layer — do not modify |
| `pages/api/axusd/` | Live AXUSD operations — do not modify |
| All hardhat configs | Deployment infrastructure — do not touch |

---

## 6. Immediate Risk Areas if Multi-Chain Work Is Done Carelessly

### Risk 1: Reserve Accounting Duplication
**Surface:** `lib/reserves/`, `lib/axau/`, `lib/services/ReserveAccountingService.ts`  
**Risk:** If Avalanche is assigned reserve responsibility without a canonical
source-of-truth design, reserve accounting could split across chains, creating
inconsistency or double-counting.  
**Mitigation:** Avalanche reserve integration must route through a single
canonical accounting service. Arbitrum remains canonical until Avalanche reserve
module is explicitly designated as primary and verified.

### Risk 2: Identity / Compliance Fragmentation
**Surface:** `lib/services/ERC3643Service.ts`, `shared/erc3643Schema.ts`  
**Risk:** If Polygon identity bridge is activated without a clear sync protocol,
identity state on Arbitrum and Polygon could diverge, allowing users to bypass
compliance checks.  
**Mitigation:** Identity must remain canonical on Arbitrum until a verified
sync/attestation mechanism is in place. The `CHAIN_POLYGON_ENABLED` flag must
remain false until this is solved.

### Risk 3: Wallet Chain Confusion
**Surface:** `lib/utils/assertArbitrumOne.ts`, `pages/api/auth/siwe/verify.ts`  
**Risk:** Adding Avalanche, Polygon, or Sui to the wallet config without
updating the SIWE verification logic would allow users to connect on the wrong
chain, breaking authentication.  
**Mitigation:** Any multi-chain wallet support requires coordinated changes to
SIWE, the assertChain utility, and the wagmi config. These must be done
together, not piecemeal.

### Risk 4: AXUSD Settlement Disruption
**Surface:** All AXUSD payment flows, PSM, Euler vault  
**Risk:** Any multi-chain bridge that touches the AXUSD settlement layer could
disrupt payment rails and property transaction flows.  
**Mitigation:** AXUSD must remain Arbitrum-only until the multi-chain settlement
design is finalized, audited, and feature-flagged. No AXUSD bridge should be
activated without explicit ops sign-off.

### Risk 5: Scattered RPC Provider Construction
**Surface:** Multiple files inline-constructing Alchemy URLs  
**Risk:** If RPC URLs are changed for multi-chain work without updating all
scattered instances, some services will silently use stale URLs.  
**Mitigation:** Centralize all RPC URL construction in `lib/chains/providers.ts`
in Phase 4 (additive only — do not remove existing inline construction yet).

---

## 7. Existing Multichain Foundation (Already Built)

The following multichain infrastructure already exists and must be preserved:

| Module | Status |
|--------|--------|
| `lib/multichain/chainRegistry.ts` | Live — canonical chain registry |
| `lib/multichain/featureFlags.ts` | Live — `ENABLE_*` flags for expansion chains |
| `lib/multichain/MultiChainRegistryService.ts` | Live — chain summary service |
| `lib/multichain/CorridorRoutingService.ts` | Live — planned corridor definitions |
| `lib/multichain/SettlementRailService.ts` | Live — rail planning |
| `lib/multichain/InstitutionalBridgeService.ts` | Live — Canton bridge planning |
| `lib/multichain/SovereignChainService.ts` | Live — Cosmos planning |
| `lib/multichain/CrossChainIdentityService.ts` | Live — identity bridge planning |
| `lib/multichain/IntegrationReadinessModel.ts` | Live — per-chain readiness tracking |
| `lib/multichain/adapters/` | Live — typed interfaces for all expansion rails |
| `lib/multichain/stellar/` | Live — Stellar payment adapter stub + readiness service |
| `pages/api/infrastructure/chains` | Live — chain data API |
| `pages/api/infrastructure/expansion-summary` | Live — expansion summary API |

---

*Report authored by Axiom Protocol architecture agent, Phase 1 of multi-chain expansion.*
