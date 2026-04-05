# Cosmos — Official Domains and Documentation Sources

**Status:** Docs not yet attached. Architecture decision not made. Long-term initiative.

---

## Primary Documentation Surfaces to Collect

### 1. Cosmos Documentation Hub
- **Domain:** https://docs.cosmos.network/
- **Priority:** HIGH
- **Sections needed:**
  - Cosmos SDK architecture
  - Module system
  - ABCI interface
  - IBC integration guide
  - Governance module

### 2. Cosmos Tutorials
- **Domain:** https://tutorials.cosmos.network/
- **Priority:** HIGH — step-by-step guides for chain building
- **Key tutorials:**
  - Building your first chain with Ignite CLI
  - Understanding IBC
  - CosmWasm integration

### 3. Ignite CLI (Chain Scaffolding)
- **Domain:** https://docs.ignite.com/
- **GitHub:** https://github.com/ignite/cli
- **Priority:** HIGH — fastest path to scaffold an Axiom appchain
- **Purpose:** `ignite scaffold chain axiom` generates a Cosmos SDK chain project

### 4. IBC Documentation
- **Domain:** https://ibc.cosmos.network/
- **GitHub:** https://github.com/cosmos/ibc-go
- **Priority:** HIGH — critical for interchain connectivity
- **Sections needed:**
  - IBC transfer (ICS-20)
  - Channel lifecycle
  - Relayer setup (Hermes)

### 5. CosmWasm Documentation
- **Domain:** https://docs.cosmwasm.com/
- **Priority:** MEDIUM — if using Rust smart contracts instead of Go modules
- **Sections needed:**
  - CosmWasm architecture
  - Smart contract development (Rust)
  - Deployment to CosmWasm-enabled chain

### 6. Ethermint / evmOS Documentation
- **Domain:** https://docs.evmos.org/ (evmOS reference)
- **Priority:** HIGH if EVM compatibility path is chosen
- **Purpose:** Run Solidity contracts (ERC-3643, AXUSD) on a Cosmos chain
- **Key insight:** Would allow reuse of all existing Axiom Solidity contracts

### 7. CosmJS Documentation
- **Domain:** https://cosmos.github.io/cosmjs/
- **Priority:** HIGH — TypeScript SDK for Axiom backend
- **NPM packages:** `@cosmjs/stargate`, `@cosmjs/proto-signing`

### 8. Hermes IBC Relayer
- **Domain:** https://hermes.informal.systems/
- **Priority:** MEDIUM — required for IBC channel management
- **Purpose:** Route IBC packets between Axiom chain and other chains

---

## Docs Attachment Status

| Source | Attached | Notes |
|--------|----------|-------|
| Cosmos SDK docs | No | Collect overview sections |
| Ignite CLI docs | No | Chain scaffolding |
| IBC-go docs | No | Interchain protocol |
| CosmWasm docs | No | If Rust contracts path |
| Ethermint/evmOS docs | No | If EVM compatibility path |
| CosmJS reference | No | TypeScript client |
| Hermes relayer docs | No | IBC infrastructure |
| Cosmos tutorials | No | Step-by-step guides |
