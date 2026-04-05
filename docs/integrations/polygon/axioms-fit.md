# Polygon — Axiom Fit Analysis

---

## Why Polygon

Polygon is the largest EVM-compatible sidechain by institutional participation and partner ecosystem. Several institutional-grade DeFi protocols and on-ramp providers require or prefer Polygon-native identity verification. As Axiom participants seek access to these protocols, a Polygon identity bridge removes the friction of separate KYC flows.

Additionally, Polygon ID is the most mature ZK-based identity framework on an EVM chain, with direct alignment to W3C Verifiable Credentials — the emerging institutional standard.

---

## What Polygon Strengthens in Axiom

| Axiom Layer | How Polygon Helps |
|------------|------------------|
| L05 — Trust / Identity | Extends verified identity surface to Polygon ecosystem |
| L01 — Settlement (indirect) | Enables AXUSD settlement on Polygon-native platforms once identity is bridged |
| Participant Access | Broadens institutional access without duplicating KYC burden |

---

## What Polygon Does NOT Change

| Axiom Component | Polygon Impact |
|----------------|---------------|
| Arbitrum as core execution | None — Polygon is additive |
| AXUSD as internal settlement layer | None — AXUSD stays on Arbitrum |
| AXAU reserve operations | None |
| ERC-3643 contracts on Arbitrum | None — these remain primary |
| DEX / Camelot / Euler | None |
| Banking (Increase) | None |
| Governance (AXM) | None |

---

## Fit Score by Integration Surface

| Surface | Score | Rationale |
|---------|-------|-----------|
| EVM compatibility | HIGH | Polygon PoS is EVM — minimal new tooling |
| Identity bridge | HIGH | Polygon ID is purpose-built for this |
| Credential portability | HIGH | ZK proofs are privacy-preserving and portable |
| Compliance scope | MEDIUM | Requires design work for cross-chain revocation |
| Operational complexity | MEDIUM | Issuer node requires hosted infrastructure |
| Gas cost | LOW-MEDIUM | MATIC required for gas — must fund wallet |
| Asset bridging | LOW | Not required for identity-only bridge |

---

## Integration Priority vs Effort

**Priority:** MEDIUM-HIGH — enables institutional partner expansion  
**Effort:** MEDIUM — EVM chain, familiar tooling, but Polygon ID issuer node requires setup  
**Blocker:** Polygon ID SDK must be reviewed; issuer node design must be decided  
**Pre-requirement:** Arbitrum ERC-3643 identity system must be fully stable (it is, as of now)

---

## Risk Factors

1. **Cross-chain state sync complexity:** Revocation on Arbitrum must propagate to Polygon. Design this correctly or risk credential validity gaps.
2. **Issuer node availability:** Polygon ID issuer node is a live infrastructure dependency. Downtime affects credential issuance.
3. **ZK proof system maturity:** iden3 circuits are audited but the toolchain is newer than standard EVM tooling.
4. **Gas wallet management:** Requires MATIC-funded wallet for on-chain operations. Ops burden.

---

## Recommended First Integration Steps (Once SDK Gathered)

1. Review @polygon-id/js-sdk — understand credential issuance flow
2. Design credential schema that maps to Axiom's existing CLAIM_TOPICS
3. Deploy Polygon ID Issuer Node on staging
4. Implement `PolygonCredentialBridgeService` extending `IdentityBridgeService`
5. Test: issue Arbitrum ERC-3643 claim → mirror to Polygon ID credential → verify on Polygon
6. Implement revocation propagation
7. Enable `ENABLE_POLYGON_IDENTITY_BRIDGE` for pilot group
