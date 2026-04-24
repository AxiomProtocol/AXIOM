# Avalanche — Official Domains and Documentation Sources

**Status:** Docs not yet attached — this file defines the collection checklist.

---

## Primary Documentation Surfaces to Collect

### 1. Core Avalanche Documentation
- **Domain:** https://docs.avax.network/
- **Priority:** HIGH
- **Sections needed:**
  - Avalanche architecture (X-Chain, C-Chain, P-Chain)
  - C-Chain EVM documentation
  - Subnet architecture
  - Validator requirements
  - Primary network vs subnets

### 2. Subnet Documentation (CRITICAL if Subnet path chosen)
- **Domain:** https://docs.avax.network/subnets
- **Priority:** CRITICAL if subnet architecture is selected
- **Sections needed:**
  - Subnet creation guide
  - Validator whitelisting
  - Subnet-EVM configuration
  - Custom precompiles
  - Fee token configuration
  - Subnet governance model

### 3. Subnet-EVM
- **Domain:** https://docs.avax.network/subnets/build/subnet-evm
- **GitHub:** https://github.com/ava-labs/subnet-evm
- **Priority:** CRITICAL if subnet architecture is selected
- **Sections needed:**
  - Genesis configuration
  - Precompiles (AllowList, NativeMinter, FeeManager)
  - Validator requirements

### 4. Glacier API (Avalanche Data Indexing)
- **Domain:** https://glacier.avax.network/
- **Docs:** https://glacier-api.avax.network/
- **Priority:** MEDIUM
- **Purpose:** Indexed blockchain data, transaction history, wallet balances

### 5. AvalancheJS SDK
- **Domain:** https://docs.avax.network/tooling/avalanchejs
- **NPM:** `@avalabs/avalanchejs`
- **Priority:** HIGH
- **Purpose:** P-Chain operations, subnet management, validator transactions

### 6. Core Ethereum Client (Alchemy Avax)
- **Domain:** https://docs.alchemy.com/reference/avax-mainnet-api
- **Priority:** LOW — Axiom already uses Alchemy; Avax support is additive

---

## GitHub Repositories to Clone / Review

| Repository | URL | Priority |
|-----------|-----|---------|
| AvalancheGo (node software) | https://github.com/ava-labs/avalanchego | HIGH |
| Subnet-EVM (VM for subnets) | https://github.com/ava-labs/subnet-evm | CRITICAL (if subnet) |
| AvalancheJS | https://github.com/ava-labs/avalanchejs | HIGH |
| Avalanche CLI | https://github.com/ava-labs/avalanche-cli | MEDIUM |

---

## Docs Attachment Status

| Source | Attached | Notes |
|--------|----------|-------|
| Avalanche core docs | No | Collect from docs.avax.network |
| Subnet docs | No | CRITICAL if subnet path chosen |
| Subnet-EVM docs + source | No | Required for custom validator environment |
| Glacier API reference | No | Medium priority |
| AvalancheJS reference | No | Required for P-Chain / subnet ops |
| Validator requirements | No | Must understand before subnet creation |
