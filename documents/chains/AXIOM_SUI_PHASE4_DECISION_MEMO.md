# AXIOM SUI PHASE 4 — DECISION MEMO

**Document type:** Architecture Decision Record  
**Phase:** Phase 4 — Foundation & Distribution-Layer Architecture  
**Chain:** Sui (non-EVM, Move VM)  
**Date:** 2026-05-15  
**Status:** PHASE 4 COMPLETE — Phase 5 gate open pending distribution architecture decision  
**Classification:** Internal — architecture record  

---

## 1. Decision

**Phase 4 of the Axiom Sui integration is now complete.**

The foundation and distribution-layer architecture phase established the full technical
scaffold for Sui integration without installing any unreviewed SDK dependencies,
without deploying any contracts, without enabling any feature flags, and without
touching any live production systems.

---

## 2. What Was Decided (Phase 4 Scope)

| Decision | Outcome |
|---|---|
| Sui strategic role | Distribution / community / diaspora layer only |
| Chain type | Non-EVM (Move VM) — do not use EVM tooling |
| Phase 4 scope | Scaffold only — no SDK, no contracts, no flags |
| Feature flag approach | `CHAIN_SUI_ENABLED` (new system) + `SUI_DISTRIBUTION_LAYER` (legacy system) |
| Explorer URL | suiscan.xyz (replacing deprecated suiexplorer.com) |
| shared/contracts-sui.ts | Created — all Axiom object IDs null |
| chainRegistry.ts | Sui entry added with `status: 'planned'` |
| IntegrationReadinessModel.ts | Six Sui artifacts added |
| featureFlags.ts | `SUI_DISTRIBUTION_LAYER` added |
| @mysten/sui SDK | NOT installed — deferred to Phase 5 |
| CHAIN_SUI_ENABLED | false — not set in any environment |

---

## 3. What Was Explicitly Deferred

The following are out of scope for Phase 4 and require explicit authorization
to proceed:

1. **Distribution architecture decision** (airdrop / claim / bridge)
   — Required before any Phase 5 implementation

2. **@mysten/sui SDK installation**
   — Requires Phase 5 authorization and architecture decision

3. **Move package development**
   — Requires Move language capability and architecture decision

4. **CHAIN_SUI_ENABLED=true in any environment**
   — Requires completed Phase 5 implementation and ops review

5. **Frontend wallet connection changes for Sui**
   — Sui wallets are not EVM-compatible; this is a separate UX consideration

6. **Bridge integration** (if Option C chosen)
   — Requires bridge partner selection and agreement

---

## 4. Chain Boundary Confirmation

This memo confirms:
- Sui Phase 4 is architecture-only. No live transactions occurred.
- No mainnet SUI tokens were acquired or spent.
- No Sui wallet addresses are in use.
- No Arbitrum contracts were modified.
- Polygon Phase 5 (production authorized 2026-05-15) is unaffected.
- All existing Axiom live systems are unchanged.

---

## 5. Arbitrum Canonical Status Preserved

Arbitrum One remains the single canonical execution layer for:
- All AXUSD settlement
- All AXAU reserve operations
- All ERC-3643 identity
- All AXM governance token issuance
- All live DEX (Camelot / Euler) operations

Sui is additive. It does not replace, mirror, or shadow any Arbitrum contract.

---

## 6. Phase 5 Prerequisites (Gate Conditions)

Phase 5 (Architecture Decision + SDK Review) may not begin until:

- [ ] **G01** — Distribution architecture decision made and recorded in
  `AXIOM_SUI_PHASE4_DISTRIBUTION_DESIGN.md`
- [ ] **G02** — @mysten/sui SDK npm page reviewed and install authorized
- [ ] **G03** — Move language development capability confirmed (internal or contracted)
- [ ] **G04** — Sui Testnet wallet provisioned for integration testing

---

## 7. Registry of Phase 4 Artifacts

| Artifact | Location | Status |
|---|---|---|
| lib/chains/config.ts (Sui entry) | Pre-existing | Fixed explorer URL |
| lib/chains/capabilities.ts (Sui) | Pre-existing | No changes required |
| lib/chains/explorers.ts (Sui) | Pre-existing | Fixed explorer URL |
| lib/chains/providers.ts (Sui) | Pre-existing | No changes required |
| lib/chains/contracts.ts (Sui) | Pre-existing | No changes required |
| shared/contracts-sui.ts | shared/contracts-sui.ts | CREATED |
| chainRegistry.ts Sui entry | lib/multichain/chainRegistry.ts | ADDED |
| IntegrationReadinessModel Sui | lib/multichain/IntegrationReadinessModel.ts | ADDED |
| featureFlags.ts SUI flag | lib/multichain/featureFlags.ts | ADDED |
| Discovery report | documents/chains/AXIOM_SUI_PHASE4_DISCOVERY.md | CREATED |
| Blueprint | documents/chains/AXIOM_SUI_PHASE4_BLUEPRINT.md | CREATED |
| Decision memo | documents/chains/AXIOM_SUI_PHASE4_DECISION_MEMO.md | CREATED |
| Flags/env guide | documents/chains/AXIOM_SUI_PHASE4_FLAGS_ENV.md | CREATED |
| Distribution design | documents/chains/AXIOM_SUI_PHASE4_DISTRIBUTION_DESIGN.md | CREATED |

---

## 8. Sign-Off

**Phase:** 4 — Foundation & Distribution-Layer Architecture  
**Chain:** Sui  
**Completed:** 2026-05-15  
**Next action:** Resolve distribution architecture decision to unlock Phase 5  
