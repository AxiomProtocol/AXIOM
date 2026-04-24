# Avalanche — SDKs and Source Files Required

**Status:** No SDK reviewed. Source files not attached.

---

## Required SDKs

### 1. @avalabs/avalanchejs
- **Package:** `@avalabs/avalanchejs`
- **Purpose:** P-Chain operations, subnet management, cross-chain atomic transactions
- **Priority:** HIGH — required for any subnet operations
- **Review status:** Not reviewed
- **GitHub:** https://github.com/ava-labs/avalanchejs

**Key capabilities to verify from source:**
- Subnet creation transactions (P-Chain)
- Validator management (add/remove)
- Cross-chain import/export AVAX
- KeyChain management

### 2. @avalabs/core-eth-provider (optional)
- **Package:** `@avalabs/core-eth-provider`
- **Purpose:** ethers.js-compatible provider for Avalanche C-Chain and subnets
- **Priority:** MEDIUM — only if Axiom needs Avalanche-specific ethers provider
- **Note:** Standard ethers.js + Alchemy RPC may be sufficient for C-Chain

### 3. ethers.js / viem (already available)
- Both support Avalanche C-Chain without modification
- **Action:** Configure AVAX C-Chain RPC URL — no new EVM SDK required for C-Chain only

### 4. Subnet-EVM binary (if creating custom subnet)
- **Source:** https://github.com/ava-labs/subnet-evm
- **Language:** Go
- **Priority:** CRITICAL if custom subnet path is chosen
- **Review status:** Not reviewed
- **Purpose:** Custom VM binary that runs on Avalanche validator nodes in the subnet

---

## Hardhat Config Extension Required

For deploying contracts to Avalanche C-Chain:

```typescript
// In hardhat.config.ts or new hardhat.avalanche.config.ts
avalanche: {
  url: `https://avax-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
  accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
  chainId: 43114,
}
```

For deploying to a custom subnet (requires subnet RPC URL):

```typescript
axiomSubnet: {
  url: process.env.AVAX_SUBNET_RPC_URL || '',
  accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
  chainId: 99999, // subnet chain ID to be assigned
}
```

**Do not add until Avalanche integration is ready to deploy.**

---

## Source Files Still Needed

| File / Artifact | Source | Status |
|----------------|--------|--------|
| AvalancheJS source | npm/@avalabs/avalanchejs | Not attached |
| Subnet-EVM source | GitHub:ava-labs/subnet-evm | Not attached |
| Subnet genesis config template | Avalanche docs | Not attached |
| Avalanche precompile specs (AllowList, NativeMinter) | Subnet-EVM docs | Not attached |
| AvalancheGo node setup guide | docs.avax.network | Not attached |
| Glacier API reference | glacier.avax.network | Not attached |
| Validator economics model | docs.avax.network/subnets | Not attached |

---

## Once SDK Is Reviewed, Implement

1. `lib/multichain/adapters/AvalancheCapitalAdapter.ts` — wraps AvalancheJS for Axiom capital zone operations
2. `lib/services/AvalancheSubnetService.ts` — subnet state monitoring, validator list
3. Hardhat deployment scripts for capital program contracts on Avalanche C-Chain or subnet
4. Update `expansion_rail_integrations` table: set `docs_attached=true`, `sdk_reviewed=true` when complete
