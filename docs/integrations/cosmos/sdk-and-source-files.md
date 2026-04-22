# Cosmos — SDKs and Source Files Required

**Status:** No SDK reviewed. Architecture decision not made. Long-term initiative.

---

## Primary SDKs

### 1. Cosmos SDK (Go — for building the chain)
- **Language:** Go
- **Repository:** https://github.com/cosmos/cosmos-sdk
- **Purpose:** Framework for building Cosmos appchains
- **Priority:** CRITICAL if Path A (Axiom-native appchain) is chosen
- **Review status:** Not reviewed
- **Note:** This is Go development — significant departure from current Node.js/TypeScript stack

**What it provides:**
- Module system (bank, staking, governance, slashing, distribution)
- State machine framework
- ABCI (Application BlockChain Interface)
- Genesis configuration
- CLI tooling

### 2. CometBFT (Go — consensus engine)
- **Repository:** https://github.com/cometbft/cometbft
- **Purpose:** Byzantine Fault Tolerant consensus for Cosmos chains
- **Priority:** CRITICAL if Path A — included with Cosmos SDK usage
- **Review status:** Not reviewed

### 3. IBC-Go (Go — interchain protocol)
- **Repository:** https://github.com/cosmos/ibc-go
- **Purpose:** IBC implementation for Cosmos SDK chains
- **Priority:** HIGH if Path A — enables connection to IBC ecosystem
- **Review status:** Not reviewed

### 4. CosmWasm (Rust + Go — smart contracts)
- **Repository:** https://github.com/CosmWasm/cosmwasm
- **Purpose:** Rust-based smart contracts on Cosmos chains
- **Priority:** MEDIUM — alternative to native Cosmos SDK modules for business logic
- **Review status:** Not reviewed
- **Note:** Requires Rust development capability

### 5. Ethermint / evmOS (Go — EVM on Cosmos)
- **Repository:** https://github.com/evmos/evmos (evmOS fork reference)
- **Purpose:** EVM compatibility layer for Cosmos chains — enables Solidity contracts on Cosmos
- **Priority:** HIGH if Axiom wants to reuse existing Solidity contracts on Cosmos chain
- **Review status:** Not reviewed
- **Benefit:** Would allow existing Axiom ERC-3643 contracts to run on Cosmos-native chain

---

## TypeScript Client SDKs (for Axiom backend integration)

### @cosmjs/stargate
- **Package:** `@cosmjs/stargate`
- **Purpose:** TypeScript client for interacting with Cosmos chains from Node.js
- **Priority:** HIGH — enables Axiom Next.js backend to query/transact on Cosmos chain
- **Review status:** Not reviewed
- **NPM:** https://www.npmjs.com/package/@cosmjs/stargate

### @cosmjs/proto-signing
- **Package:** `@cosmjs/proto-signing`
- **Purpose:** Transaction signing for Cosmos chains
- **Priority:** HIGH — companion to stargate

---

## Source Files Still Needed

| File / Artifact | Source | Status |
|----------------|--------|--------|
| Cosmos SDK source | github.com/cosmos/cosmos-sdk | Not attached |
| CometBFT source | github.com/cometbft/cometbft | Not attached |
| IBC-Go source | github.com/cosmos/ibc-go | Not attached |
| CosmWasm docs | docs.cosmwasm.com | Not attached |
| Ethermint docs | docs.evmos.org | Not attached |
| CosmJS docs | cosmos.github.io/cosmjs | Not attached |
| IBC relayer (Hermes) docs | hermes.informal.systems | Not attached |
| Ignite CLI docs (chain scaffolding) | docs.ignite.com | Not attached |

---

## Once Architecture Is Decided, Implement

### If Path A (Appchain):
1. Use Ignite CLI to scaffold Axiom appchain: `ignite scaffold chain axiom`
2. Define custom modules: `x/axm` (token), `x/identity` (KYC bridge), `x/capital` (program management)
3. Configure genesis: validator set, initial distribution, governance parameters
4. Deploy testnet first, then mainnet migration path from Arbitrum

### If Path B (IBC Hub Integration):
1. Deploy Axiom IBC gateway contract (CosmWasm or native module) on chosen IBC-enabled chain
2. Configure IBC channel between Arbitrum bridge and Cosmos hub
3. Use @cosmjs/stargate in Axiom backend for IBC queries

### Regardless of path:
1. `lib/multichain/adapters/CosmosAdapter.ts` — TypeScript client wrapper using @cosmjs/stargate
2. `pages/api/cosmos/status.ts` — Chain status endpoint
3. Update `expansion_sovereign_readiness` table with architecture decision when made
