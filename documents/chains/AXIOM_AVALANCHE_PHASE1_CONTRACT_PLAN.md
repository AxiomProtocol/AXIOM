# AXIOM AVALANCHE PHASE 1 CONTRACT PLAN (FUJI ONLY)
**Status:** Minimum viable contract surface plan  
**Canonical chain:** Arbitrum One remains canonical

## Recommendation summary
Phase 1 on Fuji should reuse the ERC-3643 pattern with a reduced module set, not clone the full Arbitrum stack.

## 1) ERC-3643 vs simplified token
- **Recommendation:** Reuse ERC-3643 for Phase 1.
- **Why:** Axiom already relies on ERC-3643 identity/compliance semantics on Arbitrum; Fuji should validate compatibility of the same permissioning model on Avalanche C-Chain.
- **Scope control:** Use only minimum required modules (CountryAllow + TransferLimit + identity registry set), not full production policy stack.

## 2) Reserve logic handling for Phase 1
- **Recommendation:** Exclude canonical reserve logic from on-chain Avalanche Phase 1.
- Reserve accounting remains canonical on Arbitrum.
- For Fuji Phase 1, reserve integration is documented/stubbed only (manifest placeholders + reporting hook placeholders), not authoritative or mirrored state.

## 3) Minimum contract surface
- IdentityRegistryStorage
- TrustedIssuersRegistry
- ClaimTopicsRegistry
- IdentityRegistry
- ModularCompliance
- CountryAllowModule
- TransferLimitModule
- Permissioned Fuji token (ERC-3643-style derivative test token)

## 4) Explicitly excluded from Phase 1
- Full AXAU reserve stack (NAV engine, mint/redeem reserve controller)
- Canonical bridge implementation to Arbitrum reserve snapshots
- Mainnet Avalanche contracts
- Broad multichain runtime refactors
- Any change to existing Arbitrum contract integrations

## 5) What to validate on Fuji first
1. Hardhat + ethers deployment compatibility on C-Chain Fuji
2. Identity-verified mint/transfer gating behavior
3. Feature-flag safety (`MULTICHAIN_ENABLED`, `CHAIN_AVALANCHE_ENABLED`) with disabled-by-default behavior
4. Deployment manifest separation (`deployments/avalanche/*`) from Arbitrum registries
5. Rollback behavior: disable flags and retain Arbitrum-only behavior
