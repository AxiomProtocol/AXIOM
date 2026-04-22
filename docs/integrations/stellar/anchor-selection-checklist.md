# Stellar — Anchor Selection Checklist

**Status:** Not started — anchor partner not yet selected
**Gate:** This decision MUST be made before Phase 3 implementation begins
**Decision owner:** Axiom business/ops team

An anchor partner is required to provide fiat corridors on Stellar.
No fiat on/off ramp exists on Stellar without an anchor.
This is a business decision — not a technical one.

---

## What an Anchor Does

A Stellar anchor is a regulated entity that:
1. Holds fiat on behalf of Stellar users
2. Provides an API (SEP-24 or SEP-31) for interactive deposit/withdrawal
3. Converts between fiat (USD, MXN, EUR, etc.) and Stellar USDC/assets
4. Handles compliance/KYC on the fiat side

Axiom's integration model:
```
Axiom backend
  → AXUSD → USDC (conversion step)
  → USDC deposited to anchor SEP-24/31 flow
  → Anchor pays recipient in fiat
```

---

## Candidate Anchors

### Option 1: Circle (USDC on Stellar)
**Website:** https://www.circle.com/en/usdc-multichain/stellar
**Best for:** USD-denominated payouts, direct USDC redemption
**Corridors:** USD, global institutional
**SEP support:** SEP-24 (interactive), SEP-38 (RFQ)
**Partnership difficulty:** MEDIUM — business API access required
**Compliance requirement:** KYB/KYC from Circle
**Why Axiom should consider first:** Circle already issues USDC on Stellar.
Axiom likely already has a Circle relationship in treasury layer.
Simplest technical integration. No new USDC issuer needed.

Evaluation checklist:
- [ ] Contact Circle Business: https://www.circle.com/en/contact
- [ ] Review Circle's Stellar anchor API documentation
- [ ] Confirm: does existing Axiom Circle account enable Stellar API access?
- [ ] Get testnet credentials for Circle's Stellar anchor

---

### Option 2: MoneyGram (remittance)
**Website:** https://www.moneygram.com
**Best for:** Cash-out via MoneyGram agent network, emerging market remittance
**Corridors:** 200+ countries, USD, local fiat
**SEP support:** SEP-24, SEP-38
**Partnership difficulty:** HIGH — regulated entity, enterprise partnership required
**Why consider:** Largest physical cash-out network globally. Best for Axiom
participants who need to receive cash (not bank transfer).

Evaluation checklist:
- [ ] Review: https://www.stellar.org/blog/stellar-development-foundation-moneygram-partnership
- [ ] Contact MoneyGram business development team
- [ ] Evaluate: Does Axiom's participant base need cash-out specifically?
- [ ] Timeline estimate: 3-6 months for enterprise partnership

---

### Option 3: Bitso
**Website:** https://bitso.com
**Best for:** LATAM corridors — Mexico, Brazil, Argentina
**Corridors:** USD → MXN, USD → BRL
**SEP support:** SEP-24, SEP-31
**Partnership difficulty:** MEDIUM
**Why consider:** Best option if Axiom targets LATAM capital participants.
Faster partnership than MoneyGram.

Evaluation checklist:
- [ ] Review Bitso's anchor documentation
- [ ] Contact Bitso business API team
- [ ] Evaluate: What % of Axiom participants need MXN/BRL corridors?

---

### Option 4: Tempo (European)
**Website:** https://www.tempo.eu.com
**Best for:** EUR corridors, Europe → West Africa remittance
**Corridors:** EUR ↔ Stellar USDC, European payments
**SEP support:** SEP-24, SEP-31
**Partnership difficulty:** MEDIUM
**Regulatory:** Regulated in EU (Electronic Money Institution)

Evaluation checklist:
- [ ] Review Tempo's Stellar anchor API
- [ ] Evaluate: Does Axiom have European participants needing EUR payouts?

---

## Decision Framework

Answer these questions to select the anchor:

1. **Which currencies do Axiom participants need to receive?**
   - USD only → Circle
   - USD + MXN/BRL → Circle + Bitso
   - USD + EUR → Circle + Tempo
   - USD + cash anywhere → MoneyGram

2. **Which corridors have the highest demand from the participant base?**
   (Survey or evaluate based on current capital program participant locations)

3. **What is the fastest path to testnet integration?**
   - Circle has the cleanest developer docs and a known entity relationship

4. **What compliance requirements can Axiom satisfy for the anchor?**
   - All anchors will require Axiom to KYB with them as the sending business
   - Some anchors will require per-user KYC — Axiom's existing ERC-3643 data may satisfy

---

## After Anchor Selection

When anchor is selected:

1. Update `ANCHOR_CANDIDATES` in `lib/multichain/stellar/types.ts`:
   - Set `evaluationStatus: 'agreement_pending'` → `'integrated'` → `'live'`

2. Update `expansion_rail_integrations` DB row for stellar:
   ```sql
   UPDATE expansion_rail_integrations
   SET notes = 'Anchor selected: <NAME>. Agreement status: <STATUS>.',
       updated_at = now()
   WHERE chain_slug = 'stellar';
   ```

3. Begin Phase 2 (SDK review) in parallel with anchor agreement process

4. Update `STELLAR_PLANNED_CORRIDORS` in `types.ts`:
   - Set `anchorId` to the selected anchor
   - Update `status` from `'planned'` to `'anchor_pending'`

5. Remove anchor blocker from `SettlementRailService.ts` implementation blockers
