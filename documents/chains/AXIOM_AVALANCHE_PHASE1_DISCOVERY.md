# AXIOM AVALANCHE PHASE 1 DISCOVERY (FUJI ONLY)
**Status:** Additive discovery for staging/testnet only  
**Canonical chain:** Arbitrum One (unchanged)

## 1) Reusable current patterns
- Reuse existing ERC-3643 deployment pattern from `scripts/deploy-axusd-3643.ts` (identity registry + compliance + modular policy modules + permissioned token).
- Reuse Hardhat multi-config style (separate config files per domain, isolated `paths.cache` / `paths.artifacts`).
- Reuse existing feature-flag model in `lib/chains/capabilities.ts` (`MULTICHAIN_ENABLED` + `CHAIN_AVALANCHE_ENABLED`) and RPC fallback behavior in `lib/chains/providers.ts`.
- Keep Arbitrum canonical contracts/address truth in `shared/contracts.ts` unchanged; Avalanche addresses remain separate.

## 2) Avalanche-specific assumptions to isolate
- Avalanche scope is C-Chain only for this phase; Fuji testnet chain ID is `43113`.
- Avalanche deployment keys and RPC must remain separate from Arbitrum deployer/RPC.
- Avalanche work must not alter canonical identity, reserve accounting, issuance, policy, or solvency truth on Arbitrum.
- Avalanche addresses and deployment manifests must live in Avalanche-specific files/directories only.

## 3) Fuji-safe validation without touching production flows
- Validate Fuji RPC/provider connectivity and chain ID assumptions.
- Validate isolated Hardhat Avalanche config can be invoked explicitly without changing default Hardhat behavior.
- Validate deployment scaffold/manifest generation only (no mainnet assumptions, no default runtime activation).
- Validate optional env + flags: absent env keeps Avalanche disabled and existing behavior unchanged.

## 4) Minimum viable Avalanche Phase 1 contract set (design target)
Recommended minimum for Fuji:
1. IdentityRegistryStorage  
2. TrustedIssuersRegistry  
3. ClaimTopicsRegistry  
4. IdentityRegistry  
5. ModularCompliance  
6. CountryAllowModule (minimum policy module)  
7. TransferLimitModule (basic transfer guard)  
8. Permissioned token (ERC-3643 AXUSD-style derivative test token)

Intentionally excluded in Phase 1:
- Canonical reserve accounting migration
- Canonical AXUSD/AXAU issuance migration
- Arbitrum reserve bridge final implementation
- Avalanche mainnet activation
- Polygon/Sui work
