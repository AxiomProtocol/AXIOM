# Polygon — Open Questions

These are the unresolved questions that block implementation decisions. Each must be answered before building begins.

---

## Architecture Decisions

### Q1: Which bridge design — Polygon ID ZK or ONCHAINID mirror?
- **Why it matters:** Determines the entire integration stack, SDK selection, and operational model.
- **Resolved?** No
- **Who resolves:** Axiom technical lead + compliance team
- **Options:** Polygon ID (ZK, iden3) vs ONCHAINID mirror vs allowlist sync
- **Recommendation:** Review Polygon ID SDK first; choose based on operational complexity vs privacy requirements

### Q2: Self-hosted Issuer Node or managed Issuer service?
- **Why it matters:** Self-hosted = full control + ops burden. Managed = easier but vendor dependency.
- **Resolved?** No
- **Who resolves:** Axiom ops team
- **Current managed options:** Iden3 provides hosted options (verify availability and pricing)

### Q3: Will Polygon be used for asset movement (AXUSD on Polygon) or identity only?
- **Why it matters:** Identity-only is lower complexity. Asset movement requires bridge design + AXUSD on Polygon + additional compliance.
- **Resolved?** No
- **Recommendation:** Identity-only as Phase 1. Asset movement is Phase 2+ only if demand exists.

---

## Technical Questions

### Q4: Does Circle's compliance API support `chain = 'POLYGON'`?
- **Why it matters:** All Axiom-gated operations require compliance screening. If Circle doesn't support Polygon, need alternative.
- **Resolved?** No — must verify in Circle API docs
- **Fallback:** Use Chainalysis or TRM Labs for Polygon address screening if Circle doesn't support it

### Q5: Does BitGo support Polygon wallets?
- **Why it matters:** If Axiom needs to hold MATIC or Polygon-native assets, BitGo custody must support it.
- **Resolved?** No — verify in BitGo API or with BitGo account manager

### Q6: What is the revocation SLA for cross-chain propagation?
- **Why it matters:** Compliance risk if revoked identity on Arbitrum remains valid on Polygon for too long.
- **Resolved?** No — must define as policy, then build accordingly
- **Recommendation:** Max 1 hour propagation delay; immediate block on compliance failure

### Q7: Who funds the MATIC gas wallet and how is it managed?
- **Why it matters:** On-chain Polygon operations require MATIC for gas. Operational gap if not planned.
- **Resolved?** No
- **Action:** Define Polygon gas wallet address, funding process, and monitoring alert thresholds

---

## Compliance / Legal Questions

### Q8: Does the Polygon identity bridge require separate regulatory disclosure?
- **Why it matters:** Expanding the identity layer to a new chain may require disclosure updates.
- **Resolved?** No — legal review needed
- **Who resolves:** Axiom legal counsel

### Q9: Is the `allowlist_sync` bridge model defensible as a KYC instrument?
- **Why it matters:** If Axiom uses allowlist sync for Phase 1, must ensure it meets applicable KYC standards.
- **Resolved?** No

---

## Status Tracking

| Question | Resolved | Date | Resolution |
|---------|----------|------|------------|
| Q1 — Bridge design | No | — | — |
| Q2 — Issuer node model | No | — | — |
| Q3 — Identity only vs asset movement | No | — | — |
| Q4 — Circle Polygon support | No | — | — |
| Q5 — BitGo Polygon support | No | — | — |
| Q6 — Revocation SLA | No | — | — |
| Q7 — Gas wallet management | No | — | — |
| Q8 — Disclosure requirement | No | — | — |
| Q9 — Allowlist KYC defensibility | No | — | — |
