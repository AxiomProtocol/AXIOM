# Polygon — SDKs and Source Files Required

**Status:** No SDK reviewed. Source files not attached.

---

## Required SDKs

### 1. @polygon-id/js-sdk
- **Package:** `@polygon-id/js-sdk`
- **Purpose:** Core Polygon ID SDK for issuing, holding, and verifying credentials
- **Priority:** CRITICAL — required for any Polygon ID integration
- **Review status:** Not reviewed
- **GitHub:** https://github.com/0xPolygonID/js-sdk
- **NPM:** https://www.npmjs.com/package/@polygon-id/js-sdk

**Key capabilities to verify from source:**
- Credential schema definition API
- Issuer identity creation flow
- Claim issuance interface
- ZK proof generation (Groth16 / sparse MTP)
- On-chain state publishing mechanism
- Revocation registry interaction

### 2. ethers.js / viem (already available)
- Axiom already uses `ethers.js` and `viem` for Arbitrum
- Both support Polygon PoS (EVM chain) without modification
- **Action:** Simply configure Polygon RPC URL — no new EVM SDK required

### 3. Matic.js (optional)
- **Package:** `@maticnetwork/maticjs`
- **Purpose:** High-level PoS bridge operations (deposit/withdraw)
- **Priority:** LOW — only needed if asset bridging is required alongside identity
- **Review status:** Not reviewed

### 4. @onchain-id/solidity (already in repo)
- Axiom's ERC-3643 implementation uses ONCHAINID contracts
- These can be deployed to Polygon PoS with the same Hardhat workflow
- **Action:** Add `polygon-mainnet` network to relevant hardhat configs if deploying contracts to Polygon

---

## Hardhat Config Extension Required

If deploying ONCHAINID contracts to Polygon, add network to hardhat config:

```typescript
// In hardhat.erc3643.config.ts (or new hardhat.polygon.config.ts)
polygon: {
  url: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
  accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
  chainId: 137,
}
```

**Do not add until Polygon integration is ready to deploy.**

---

## Source Files Still Needed

| File / Artifact | Source | Status |
|----------------|--------|--------|
| Polygon ID JS SDK source | npm/@polygon-id/js-sdk | Not attached |
| Polygon ID Issuer Node Docker image / source | GitHub:0xPolygonID/issuer-node | Not attached |
| iden3 circuits (ZK) | GitHub:iden3/circuits | Not attached |
| Polygon ID credential schema standard | Polygon ID docs | Not attached |
| ONCHAINID deployment guide for Polygon | docs.onchainid.com | Not attached |
| Polygon PoS smart contract addresses | polygon.technology/developers | Not attached |

---

## Once SDK Is Reviewed, Implement

1. `lib/multichain/adapters/PolygonIdentityAdapter.ts` — wraps @polygon-id/js-sdk for Axiom credential schema
2. `lib/services/PolygonCredentialBridgeService.ts` — mirrors Arbitrum ERC-3643 identity to Polygon ID
3. Hardhat deployment script for ONCHAINID on Polygon (if mirrored credential path chosen)
4. Update `expansion_identity_bridges` table: set `docs_attached=true`, `sdk_reviewed=true` when complete
