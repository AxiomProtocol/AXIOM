# Stellar — Open Questions

---

## Business Decisions (Block Implementation)

### Q1: Which anchor partner(s) will Axiom use?
- **Why it matters:** The anchor is the fiat bridge. No fiat corridors exist without an anchor partner. This is the single most important decision for Stellar integration.
- **Resolved?** No
- **Candidates to evaluate:** MoneyGram, Circle, Bitso (LATAM), Tempo (EU), others
- **Who resolves:** Axiom business development / operations lead
- **Action required:** Evaluate anchor partners based on corridor coverage, KYC requirements, fees, reliability, and partner onboarding timeline

### Q2: Which corridors (countries/currencies) does Axiom need first?
- **Why it matters:** Anchor selection depends on corridor requirements. Different anchors cover different corridors.
- **Resolved?** No
- **Who resolves:** Axiom product lead based on participant distribution data
- **Likely corridors:** US → Caribbean, US → West Africa, US → Latin America (based on community profile)

### Q3: Will Stellar handle incoming payments OR outbound distributions OR both?
- **Why it matters:** Determines integration complexity and anchor requirements.
- **Resolved?** No
- **Options:** Outbound only (distributions to participants), Inbound only (participant deposits via Stellar), Bidirectional

---

## Technical Questions

### Q4: What is the AXUSD → Stellar USDC bridge mechanism?
- **Why it matters:** Before Axiom can send USDC on Stellar, it must move USDC from Arbitrum to Stellar. This requires a bridge mechanism.
- **Resolved?** No
- **Options:**
  1. Circle CCTP (Cross-Chain Transfer Protocol) — Arbitrum → Stellar USDC
  2. Axiom manually holds USDC on Stellar (operational balance maintained by ops team)
  3. Stellar anchor handles the swap (less control)
- **Recommendation:** Circle CCTP if supported for Arbitrum → Stellar; operational balance as fallback

### Q5: Does Circle CCTP support Arbitrum → Stellar?
- **Why it matters:** Determines whether automated bridging is possible.
- **Resolved?** No
- **Action:** Check CCTP supported chain list at https://developers.circle.com/stablecoins/cctp-getting-started

### Q6: How is the Axiom Stellar keypair managed securely?
- **Why it matters:** Stellar transactions require signing with a keypair. This key must be secured.
- **Resolved?** No
- **Options:** BitGo custody (verify Stellar support), HSM, environment secret with strict rotation policy
- **Recommendation:** Verify BitGo Stellar support first

### Q7: Does BitGo support Stellar (XLM) custody?
- **Why it matters:** Axiom uses BitGo for crypto custody. If BitGo supports Stellar, the keypair management is solved.
- **Resolved?** No
- **Action:** Check BitGo API for Stellar wallet support

### Q8: Travel Rule implementation — which provider?
- **Why it matters:** FinCEN Travel Rule requires counterparty data for transfers ≥ $3,000. Must implement before going live.
- **Resolved?** No
- **Options:** Notabene, Sygna Bridge, Veriscope, manual (not recommended)

---

## Compliance / Legal Questions

### Q9: Is Axiom acting as a Money Service Business (MSB) if it routes fiat payments via Stellar?
- **Why it matters:** Critical regulatory question. If Axiom is transmitting money, it may need MSB registration.
- **Resolved?** No
- **Who resolves:** Axiom legal counsel
- **Note:** If Axiom merely facilitates (and the anchor holds the money transmission license), Axiom may not be the MSB.

### Q10: What KYC does the selected anchor require of Axiom's participants?
- **Why it matters:** Anchor has its own KYC requirements. Must understand if these duplicate or conflict with Axiom's existing KYC.
- **Resolved?** No

---

## Status Tracking

| Question | Resolved | Date | Resolution |
|---------|----------|------|------------|
| Q1 — Anchor partner selection | No | — | — |
| Q2 — Corridor priorities | No | — | — |
| Q3 — Direction (inbound/outbound/both) | No | — | — |
| Q4 — AXUSD → Stellar bridge mechanism | No | — | — |
| Q5 — Circle CCTP Arbitrum→Stellar | No | — | — |
| Q6 — Keypair security model | No | — | — |
| Q7 — BitGo Stellar support | No | — | — |
| Q8 — Travel Rule provider | No | — | — |
| Q9 — MSB classification risk | No | — | — |
| Q10 — Anchor KYC requirements | No | — | — |
