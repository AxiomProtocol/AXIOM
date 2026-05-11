# AXIOM AVALANCHE IMPLEMENTATION PREREQUISITES
**Classification:** Internal Engineering — Pre-Implementation Reference  
**Status:** Staging-Only Requirements — No Production Changes  
**Canonical Chain:** Arbitrum One (unchanged)  
**Authored:** 2026-05-11  
**Document Owner:** Axiom Protocol Engineering  
**Depends on:** `AXIOM_AVALANCHE_DECISION_MEMO.md` (decision must be made first)  

> **Scope:** This document covers C-Chain (Option A, recommended) implementation
> prerequisites only. Subnet/Avalanche L1 prerequisites are noted where
> they differ materially.

---

## 1. SDK and Tooling Requirements

### 1.1 Contract Deployment (No New SDK Required for C-Chain)

Avalanche C-Chain is EVM-compatible. All existing deployment tools work
without modification:

| Tool | Current Version | Avalanche C-Chain Status |
|------|----------------|--------------------------|
| `hardhat` | See `package.json` | Compatible — add C-Chain network in config |
| `ethers` (v6) | See `package.json` | Compatible — standard `JsonRpcProvider` works |
| `@openzeppelin/contracts` | See `package.json` | Compatible — deploy as-is |
| `viem` / `wagmi` | See `package.json` | Compatible — add `avalanche` chain from `viem/chains` |

**Action required:** Zero new npm packages for C-Chain contract deployment.

### 1.2 Wallet / Frontend (Additive Config Only)

`viem` already includes Avalanche C-Chain chain definition:

```ts
import { avalanche } from 'viem/chains';
// chainId: 43114, name: 'Avalanche', nativeCurrency: { symbol: 'AVAX' }
```

Adding this chain to `wagmi` config is additive and must be feature-flagged:

```ts
// Only when CHAIN_AVALANCHE_ENABLED=true and isChainEnabled('avalanche')
const chains = [arbitrum, ...(isChainEnabled('avalanche') ? [avalanche] : [])];
```

**Do not modify `lib/web3/wagmiConfig.ts` until the implementation phase begins.
This prerequisite document only records the pattern.**

### 1.3 Subnet-Specific SDK (Only if Subnet Path is Chosen)

If the Subnet path is later selected, the following additional SDK is required:

| Package | Purpose | Version to Evaluate |
|---------|---------|---------------------|
| `@avalabs/avalanchejs` | P-Chain / Subnet management, allowlist operations | Latest stable |

Before adding: run the `gh-advisory-database` security check for this package.
Do not add to `package.json` until Subnet path is formally chosen and the
implementation phase begins.

---

## 2. RPC Requirements

### 2.1 Fuji Testnet (Staging)

| Endpoint | URL | Notes |
|----------|-----|-------|
| Public C-Chain RPC (Fuji) | `https://api.avax-test.network/ext/bc/C/rpc` | No key required — rate limited |
| WebSocket (Fuji) | `wss://api.avax-test.network/ext/bc/C/ws` | Optional — for event subscriptions |

For staging work, the public Fuji RPC is sufficient. Set `AVALANCHE_RPC_URL` to
the Fuji endpoint in the staging environment.

### 2.2 Mainnet C-Chain

| Provider | URL Pattern | Notes |
|----------|------------|-------|
| Avalanche public RPC | `https://api.avax.network/ext/bc/C/rpc` | Public — rate limited; not for production |
| Alchemy (Avalanche) | `https://avax-mainnet.g.alchemy.com/v2/${KEY}` | Requires separate Alchemy Avalanche plan |
| dRPC | `https://avalanche.drpc.org` | No key for public; paid for high-volume |
| Chainstack | Custom endpoint | Enterprise option |
| Infura | `https://avalanche-mainnet.infura.io/v3/${KEY}` | Requires Infura Avalanche plan |

**Recommendation:** Evaluate Alchemy Avalanche plan availability against the
existing `ALCHEMY_API_KEY` scope. If the current plan does not cover Avalanche,
provision a dedicated Avalanche RPC via dRPC or Chainstack for staging before
committing to an Alchemy upgrade.

### 2.3 Subnet-Specific RPC (Only if Subnet Path)

Custom Subnets require dedicated RPC infrastructure:
- Alchemy does not support custom Avalanche Subnets
- Options: self-hosted Subnet-EVM node, Chainstack managed Subnet node,
  or Infra Avalanche Subnet services
- At minimum two redundant RPC nodes for production reliability

---

## 3. Environment Variables

### 3.1 New Variables Required for Avalanche (Staging Only)

These variables must be present in a staging environment to activate Avalanche.
They are **not required** for the current production deployment.

| Variable | Purpose | Staging Value | Production Value |
|----------|---------|---------------|-----------------|
| `MULTICHAIN_ENABLED` | Global multi-chain gate | `true` | `false` (until approved) |
| `CHAIN_AVALANCHE_ENABLED` | Avalanche chain gate | `true` | `false` (until approved) |
| `AVALANCHE_RPC_URL` | Avalanche JSON-RPC endpoint | Fuji testnet URL | C-Chain mainnet URL |

**Current production behavior is unaffected if all three variables are absent
or set to `false`.**

### 3.2 Variables That Must NOT Change

The following existing variables must remain unchanged:

| Variable | Frozen Meaning |
|----------|---------------|
| `ALCHEMY_API_KEY` | Arbitrum + Ethereum Alchemy key — do not repurpose for Avalanche |
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | Client-side Arbitrum Alchemy key — do not change |
| `ARBITRUM_RPC_URL` | Arbitrum RPC override — do not change |
| `DEPLOYER_PRIVATE_KEY` | Arbitrum deployer wallet — do not reuse for Avalanche deployments |
| `ONRAMP_DEFAULT_CHAIN_ID` | Must remain `42161` (Arbitrum) |
| All `INCREASE_*` | Banking rails — Arbitrum-only, do not touch |
| All `CIRCLE_*` | Circle treasury — Arbitrum-only, do not touch |

### 3.3 Additional Variables (Optional, for Future Reference)

| Variable | Purpose | Notes |
|----------|---------|-------|
| `AVALANCHE_DEPLOYER_PRIVATE_KEY` | Separate deployer EOA for Avalanche | Recommended — do not share with Arbitrum deployer |
| `AVALANCHE_ALCHEMY_NETWORK` | Alchemy network ID for Avalanche | Only if Alchemy Avalanche plan is available |

---

## 4. Deployment Assumptions

### 4.1 Contract Deployment

1. **Separate deployer EOA for Avalanche.** The Arbitrum deployer key
   (`DEPLOYER_PRIVATE_KEY`) must not be used for Avalanche deployments. Create a
   new EOA funded with AVAX for C-Chain or Fuji testnet deployments.

2. **New Hardhat network configuration.** Add a `avalanche-fuji` and
   `avalanche-mainnet` network to an existing Hardhat config (or a new
   `hardhat.avalanche.config.ts`). Do not modify existing Hardhat configs.

3. **Separate `deployments/avalanche/` directory.** Deployed contract addresses
   for Avalanche must be tracked separately from Arbitrum addresses. Do not
   add Avalanche addresses to `shared/contracts.ts` — create a new
   `shared/contracts-avalanche.ts` or equivalent.

4. **No modification to `shared/contracts.ts`.** That file is the Arbitrum
   canonical contract registry. Avalanche contracts are additive and must live
   in their own registry file.

5. **Gas estimation.** C-Chain uses the Avalanche fee market. At time of writing,
   C-Chain base fees are denominated in AVAX and are generally lower than
   Ethereum or Arbitrum. Hardhat scripts may need `gasPrice` overrides for
   Fuji testnet due to testnet fee market differences.

### 4.2 Canonical Bridge Assumptions

Any Avalanche capital zone deployment must define how it reports back to the
Arbitrum canonical reserve accounting system. Before mainnet deployment, the
following must be designed and implemented:

1. **Position reporter contract on Avalanche** — records capital deployed to
   Avalanche-side instruments
2. **Off-chain bridge service** — reads Avalanche positions and submits them
   to the Arbitrum canonical reserve snapshot (via `lib/reserves/`)
3. **Attestation / verification** — Arbitrum canonical reserve must be able to
   verify that reported Avalanche positions are accurate

This bridge is the highest-risk integration point. It must be reviewed before
any Avalanche mainnet issuance.

---

## 5. Testing Prerequisites

### 5.1 Unit / Integration Tests

Before enabling Avalanche in any environment:

1. **Provider connection test** — verify `ethers.JsonRpcProvider` connects to
   Fuji testnet RPC and returns expected block numbers.

2. **Chain ID verification test** — confirm C-Chain returns `chainId: 43114`
   from `eth_chainId` call.

3. **`isChainEnabled('avalanche')` test** — unit test `lib/chains/capabilities.ts`
   to confirm the flag gate works correctly:
   - `CHAIN_AVALANCHE_ENABLED` absent → `isChainEnabled('avalanche')` returns `false`
   - `CHAIN_AVALANCHE_ENABLED=true` + `MULTICHAIN_ENABLED=true` → returns `true`
   - `CHAIN_AVALANCHE_ENABLED=true` + `MULTICHAIN_ENABLED` absent → returns `false`

4. **`getChainRpcUrl('avalanche')` test** — verify `lib/chains/providers.ts`
   returns null when `AVALANCHE_RPC_URL` is absent, and the configured URL
   when present.

5. **Existing Arbitrum test suite** — all existing tests must continue to pass
   with no Avalanche env vars set. Run `npm run test` (or equivalent) to confirm
   the current test baseline is green before any Avalanche work begins.

### 5.2 Fuji Testnet Validation

Before mainnet deployment, the following must be validated on Fuji:

1. Deploy target contracts to Fuji
2. Execute a representative set of capital zone operations end-to-end
3. Validate the canonical bridge: Avalanche position → Arbitrum reserve snapshot
4. Validate feature flag activation/deactivation does not break Arbitrum flows
5. Run a simulated KYC-gated transfer using the chosen permissioning model

### 5.3 Staging Environment Validation

Before production enablement:

1. Full staging environment with `CHAIN_AVALANCHE_ENABLED=true` and
   `MULTICHAIN_ENABLED=true`
2. Confirm all existing Arbitrum product flows are unaffected
3. Confirm Avalanche-specific flows work as designed
4. Confirm disabling `CHAIN_AVALANCHE_ENABLED` returns the system to
   Arbitrum-only behavior instantly (no stale state)

---

## 6. Staging-Only Requirements

The following requirements apply **only to the staging environment** and must
not be present in the current production deployment:

### 6.1 Staging `.env` Additions

```env
# ============================================
# AVALANCHE STAGING FLAGS (DO NOT DEPLOY TO PRODUCTION YET)
# ============================================

MULTICHAIN_ENABLED=true
CHAIN_AVALANCHE_ENABLED=true

# Fuji testnet RPC — replace with mainnet URL before production
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc

# Separate Avalanche deployer wallet — funded with Fuji AVAX
# AVALANCHE_DEPLOYER_PRIVATE_KEY=<testnet_key_only>
```

### 6.2 Fuji Testnet AVAX

A Fuji testnet wallet must be funded with test AVAX before contract deployment
can begin. Fuji faucet: `https://faucet.avax.network/`

### 6.3 Hardhat Avalanche Config (Staging Only)

Add to a new `hardhat.avalanche.config.ts` (do not modify existing configs):

```ts
networks: {
  'avalanche-fuji': {
    url: process.env.AVALANCHE_RPC_URL ?? 'https://api.avax-test.network/ext/bc/C/rpc',
    chainId: 43113,
    accounts: process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY
      ? [process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY]
      : [],
  },
  'avalanche-mainnet': {
    url: process.env.AVALANCHE_RPC_URL ?? 'https://api.avax.network/ext/bc/C/rpc',
    chainId: 43114,
    accounts: process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY
      ? [process.env.AVALANCHE_DEPLOYER_PRIVATE_KEY]
      : [],
  },
}
```

Note: Fuji testnet chain ID is `43113`, mainnet is `43114`. Both use the same
EVM RPC API.

---

## 7. Security Prerequisites

### 7.1 Advisory Database Check

Before adding any Avalanche-specific npm packages, run an advisory database
check for the candidate packages. Known packages to check when the time comes:

| Package | Ecosystem | Check When |
|---------|-----------|-----------|
| `@avalabs/avalanchejs` | npm | Before Subnet path adoption only |
| `@avalanche-network-runner/client` | npm | Before local Subnet testing |

For C-Chain, no new packages are required — no advisory check needed.

### 7.2 Deployer Key Management

- The Avalanche deployer key must be generated fresh — never shared with Arbitrum
- For mainnet, the key must follow the same key management process as the
  existing `DEPLOYER_PRIVATE_KEY` (Axiom ops custody)
- For testnet, a throwaway key may be used but must not hold any mainnet AVAX

### 7.3 Contract Audit Scope

Before any Avalanche mainnet deployment, the audit scope must include:
- All Avalanche-specific contracts (capital zone token, allowlist manager,
  reserve reporter)
- The canonical bridge mechanism (off-chain + on-chain components)
- Any modifications to existing Arbitrum contracts that support the bridge

The audit scope does NOT need to include unchanged Arbitrum contracts unless
the bridge modifies their interface.

---

## 8. Subnet-Specific Prerequisites (Only if Subnet Path is Chosen)

> The following section is included for completeness. It does not apply to the
> recommended C-Chain path.

### 8.1 Additional SDK

```bash
npm install @avalabs/avalanchejs
```
Run advisory database check before installing.

### 8.2 Validator Prerequisites

1. Minimum validator count: 5 (recommended for mainnet security)
2. Each validator must meet: minimum hardware spec per Ava Labs Subnet validator guide
3. Validator staking or subsidy model must be decided before genesis
4. At least one validator must be Axiom-operated for network control

### 8.3 Genesis Block Prerequisites

1. Define native gas token (AVAX wrapper or custom token)
2. Define initial address allowlist (TxAllowList admin and initial members)
3. Define contract deployer allowlist (only Axiom deployer EOA initially)
4. Define initial balances (pre-fund Axiom deployer)
5. Review Subnet-EVM genesis format (see Ava Labs documentation)

### 8.4 Dedicated RPC Infrastructure

- Minimum 2 RPC nodes for staging
- Minimum 3 RPC nodes for production
- Load balancer or managed endpoint required
- Monitoring and alerting for RPC node availability

---

## 9. Pre-Activation Checklist

Before setting `CHAIN_AVALANCHE_ENABLED=true` in any environment, verify all
of the following:

**Engineering:**
- [ ] Architecture decision formally recorded in `AXIOM_AVALANCHE_DECISION_MEMO.md`
- [ ] Contract architecture design document complete
- [ ] Canonical bridge design document complete and reviewed
- [ ] Fuji testnet contracts deployed and validated
- [ ] All existing Arbitrum tests passing with no Avalanche env vars
- [ ] Feature flag activation/deactivation tested in isolation
- [ ] Separate Avalanche deployer EOA created and documented

**Infrastructure:**
- [ ] Staging `AVALANCHE_RPC_URL` configured and verified
- [ ] Staging `CHAIN_AVALANCHE_ENABLED=true` and `MULTICHAIN_ENABLED=true` set
- [ ] Mainnet RPC provider contracted or self-hosted (not public fallback)
- [ ] Mainnet deployer key created and secured per ops key management process

**Security / Compliance:**
- [ ] Contract audit scope defined and approved
- [ ] Audit completed (before mainnet only)
- [ ] Canonical bridge review completed
- [ ] No double-counting in reserve accounting confirmed

**Operations:**
- [ ] Runbook for Avalanche deployment created
- [ ] Monitoring for Avalanche RPC availability set up
- [ ] Incident response plan updated to include Avalanche chain

**Final gate:**
- [ ] Ops sign-off on production enablement
- [ ] `CHAIN_AVALANCHE_ENABLED=true` set in production (ops-controlled)

---

*Document authored by Axiom Protocol architecture agent.*  
*This document is pre-implementation — no runtime behavior has been changed.*  
*No existing files were modified to produce this document.*
