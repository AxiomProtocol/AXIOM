# Stellar — Compliance and Identity

---

## Identity Model on Stellar

Stellar does not have a native on-chain identity system equivalent to ERC-3643. Identity on Stellar is managed:

1. **At the application layer** — Axiom verifies participant identity before allowing Stellar payment initiation
2. **Via SEP-0010** — Cryptographic wallet authentication (proves control of Stellar keypair)
3. **Via anchor KYC** — The anchor partner performs their own KYC before releasing fiat

---

## Axiom Identity Gate for Stellar Payments

Before any Stellar payment is initiated from Axiom's systems:

1. **Arbitrum ERC-3643 check:** Participant wallet must have valid KYC + accreditation claims on Arbitrum
2. **Application-layer gate:** Stellar payment API (`/api/stellar/payment`) must verify identity before calling `StellarPaymentAdapter`
3. **Anchor KYC:** The anchor partner independently KYCs the recipient for fiat release (regulatory requirement on anchor side)

Axiom does NOT need to issue Stellar-native credentials. The trust chain is:
```
Arbitrum ERC-3643 (identity) → Axiom application gate → Stellar payment → Anchor KYC → Fiat
```

---

## SEP-0010 Authentication

SEP-0010 allows participants to authenticate with a Stellar-native wallet. This is relevant if participants hold Stellar keypairs.

For Axiom's outbound payment model, SEP-0010 is relevant for:
- Anchor authentication (Axiom's system authenticates with anchor using its own Stellar keypair)
- NOT for participant authentication — participants authenticate via Axiom's ERC-3643 / Auth0 system

---

## Sanctions and AML

Stellar payments cross jurisdictions. Axiom must implement:

1. **OFAC sanctions screening** on recipient addresses/accounts before initiating Stellar payments
2. **Country-level restrictions** — some anchor corridors may not be available in sanctioned jurisdictions
3. **Amount thresholds** — large payments may trigger additional reporting requirements

**Existing tools:**
- `lib/circle/complianceEngine.ts` — Circle compliance screening (verify if Stellar addresses are supported)
- `lib/compliance.ts` — Axiom's compliance service
- `lib/sentinel/` — Sentinel risk authorization layer

**Action:** Extend Sentinel authorization to include Stellar payment risk assessment before any outbound payment.

---

## AML / BSA Compliance

Cross-border payments via Stellar are subject to:
- FinCEN Travel Rule (for amounts ≥ $3,000)
- Bank Secrecy Act reporting requirements
- Anchor-specific AML requirements (each anchor has its own compliance requirements)

**Axiom must:**
1. Implement Travel Rule data passing for cross-border payments
2. Record all Stellar transactions for AML audit trail
3. Integrate with Sentinel for payment authorization
4. Store correspondent data required by Travel Rule

---

## Compliance Implementation Checklist

- [ ] Extend Sentinel to include Stellar payment authorization
- [ ] Implement sanctions screening for Stellar payment recipients
- [ ] Design Travel Rule compliance data model
- [ ] Review anchor's KYC/AML requirements for selected partner
- [ ] Define country/corridor restriction list
- [ ] Build Stellar transaction audit trail in DB
- [ ] Verify Circle compliance API supports Stellar addresses/transactions
