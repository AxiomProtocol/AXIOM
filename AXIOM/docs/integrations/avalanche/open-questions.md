# Avalanche — Open Questions

These are the unresolved questions that block implementation decisions.

---

## Architecture Decisions

### Q1: C-Chain deployment only vs Custom Subnet?
- **Why it matters:** This is the foundational architectural decision. All other implementation choices depend on it.
- **Resolved?** No
- **Who resolves:** Axiom technical lead + ops team
- **Key factors:** Institutional isolation requirements, Go expertise availability, timeline, cost
- **Recommendation:** C-Chain for Phase 1, Subnet evaluation for Phase 2

### Q2: What specific capital programs move to Avalanche?
- **Why it matters:** Without a defined product scope, the integration has no clear deliverable.
- **Resolved?** No
- **Options:** Lending fund only? All Reg D programs? Future programs only?
- **Who resolves:** Axiom product lead

### Q3: AllowList sync vs deployed ERC-3643 on Avalanche?
- **Why it matters:** Determines identity model complexity and cross-chain state sync requirements.
- **Resolved?** No
- **Recommendation:** AllowList sync for Phase 1 (lower complexity)

---

## Technical Questions

### Q4: Who runs the Avalanche validator node(s) for a custom subnet?
- **Why it matters:** Custom subnets require validator infrastructure. Axiom must either run its own or work with existing validators.
- **Resolved?** No
- **Options:** Ava Labs Managed (verify availability), third-party validator-as-a-service (Ankr, Moralis), Axiom-run validator
- **Who resolves:** Axiom DevOps / infrastructure lead

### Q5: Does BitGo support AVAX custody?
- **Why it matters:** If capital programs hold AVAX or Avalanche-native assets, BitGo CaaS must support it.
- **Resolved?** No
- **Action:** Verify BitGo AVAX wallet support in BitGo API or with account manager

### Q6: Does Circle USDC on Avalanche interact with Axiom's AXUSD settlement model?
- **Why it matters:** USDC exists on Avalanche C-Chain natively. If capital programs use USDC on Avalanche as a gateway, this requires AXUSD ↔ USDC bridge design.
- **Resolved?** No
- **Recommendation:** Keep Avalanche in AXUSD settlement sphere — no USDC direct exposure unless required

### Q7: What is the AllowList SLA for identity state sync?
- **Why it matters:** Reg D compliance requires that revoked participants cannot transact. SLA for AllowList update must be defined.
- **Resolved?** No
- **Recommendation:** Max 1 hour for AllowList update after Arbitrum revocation; immediate block flag in application layer

### Q8: What is the gas cost model for subnet validators?
- **Why it matters:** Institutional participants must not face volatile gas costs.
- **Resolved?** No
- **Recommendation:** Use FeeManager precompile to set fixed or zero-gas model for permissioned participants

---

## Compliance / Legal Questions

### Q9: Does deploying capital programs on Avalanche change the Reg D 506(c) compliance model?
- **Why it matters:** Capital programs are SEC Reg D 506(c) exempt offerings. Moving execution to another chain may require updated disclosures.
- **Resolved?** No
- **Who resolves:** Axiom legal counsel

### Q10: Are Avalanche subnet validators considered "participants" in Reg D terms?
- **Why it matters:** If validators have any economic participation in the capital program, this has regulatory implications.
- **Resolved?** No

---

## Status Tracking

| Question | Resolved | Date | Resolution |
|---------|----------|------|------------|
| Q1 — C-Chain vs Subnet | No | — | — |
| Q2 — Product scope for Avalanche | No | — | — |
| Q3 — AllowList vs ERC-3643 | No | — | — |
| Q4 — Validator infrastructure | No | — | — |
| Q5 — BitGo AVAX support | No | — | — |
| Q6 — USDC on Avalanche | No | — | — |
| Q7 — AllowList SLA | No | — | — |
| Q8 — Gas cost model | No | — | — |
| Q9 — Reg D on new chain | No | — | — |
| Q10 — Validator participation status | No | — | — |
