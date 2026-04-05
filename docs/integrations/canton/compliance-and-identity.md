# Canton Network — Compliance and Identity

---

## Canton's Native Compliance Model

Canton's privacy architecture provides native compliance advantages that do not exist in public blockchains:

### Need-to-Know Data Sharing
Transaction data on Canton is visible ONLY to the parties explicitly included in a DAML contract. This means:
- Counterparty A cannot see Counterparty B's contracts unless explicitly added as an observer
- Regulatory data can be shared selectively (e.g., only with the regulator observer)
- Audit trail is available to authorized parties without exposing data to the entire network

### Regulator Observer Pattern
Canton supports a "regulator as observer" pattern where a regulatory party can be added as an observer to all relevant contracts. This enables:
- Real-time regulatory audit access without public data exposure
- Selective disclosure to specific regulators
- Automated compliance reporting

---

## Identity on Canton

### Parties (Canton Identity Primitive)
On Canton, identity is represented by "parties" — cryptographic identifiers allocated by the participant node. A party is not an Ethereum wallet address.

**Axiom party structure would include:**
- `AxiomProtocol::participant1` — The Axiom protocol party (operations)
- `InstitutionalLP::participant1` — Each institutional LP participant
- `RegulatoryObserver::participant1` — Optional regulatory observer party

### Party Mapping to Axiom Identity
Axiom must map its existing ERC-3643 identity system to Canton parties:

| Axiom Identity | Canton Equivalent |
|---------------|------------------|
| Wallet address (Arbitrum) | Canton party ID |
| KYC claim (ERC-3643) | KYC verification in DAML contract |
| Accredited investor claim | Accreditation field in DAML party record |
| Claim issuer | DAML template creator / exerciser |

**This mapping does not exist yet and must be designed.**

---

## KYC/AML on Canton

Canton participants are financial institutions with their own KYC/AML infrastructure. For Axiom:

1. **Institutional participant KYC:** The institutional LP (Goldman, BNY) is already KYC'd by their own compliance infrastructure. Axiom's role is to verify accreditation and regulatory eligibility for the specific offering.

2. **DAML compliance contracts:** Axiom can encode compliance checks in DAML templates — e.g., a DAML choice to subscribe to a capital program can only be exercised if the KYC field in the party record shows `verified`.

3. **Dual compliance stack:** Axiom's existing ERC-3643 system on Arbitrum and Canton's party-based compliance model are parallel systems. They do not automatically sync.

---

## Axiom's Compliance Obligations on Canton

| Obligation | Current State (Arbitrum) | Canton State |
|-----------|-------------------------|-------------|
| KYC verification | ERC-3643 claims | DAML party record field |
| Accreditation | ACCREDITED_INVESTOR claim | DAML party accreditation field |
| Sanctions screening | Circle compliance API | Must define for Canton |
| Audit trail | DB + Arbitrum on-chain | Canton ledger (visible to parties + observer) |
| Disclosure to regulator | Public Arbitrum + DB | Canton regulator observer |

---

## Regulatory Alignment

Canton's privacy model and regulator-observer pattern are specifically designed to meet institutional and regulatory requirements that public blockchains cannot satisfy. Key alignment points:

- GDPR compliance: Transaction data is not public — compliant with data minimization
- SEC audit access: Regulator observer pattern provides audit trail
- FINRA oversight: Same observer pattern applies
- Basel III / liquidity reporting: Canton party balances can be observable by authorized parties

This regulatory alignment is one of Canton's primary value propositions for Axiom.
