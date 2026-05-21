# Axiom Protocol — Persona Business Onboarding: Compliance Posture

**Prepared:** May 2026  
**Status:** Internal reference document  
**Scope:** Answers to the Persona identity verification platform business questionnaire, reflecting the current state of Axiom Protocol's compliance program.

> This document is for internal and operator use only. It is not a legal opinion, a regulatory certification, or a public disclosure. All compliance conclusions remain subject to ongoing legal and operational review.

---

## 1. BSA/AML Program

**Do you have a written Bank Secrecy Act / Anti-Money Laundering program?**

Axiom Protocol maintains a written compliance framework governing participant onboarding and capital activity. The framework includes:

- **Customer Identification Program (CIP):** Identity verification is performed at onboarding via Persona's hosted inquiry flow. Required fields: legal name, date of birth, government-issued identity document, proof of address, and liveness check.
- **Customer Due Diligence (CDD):** A risk-tiered profile is assigned at onboarding based on declared income band, source of funds, investment experience, and PEP/criminal-record disclosures. High-risk profiles (isPoliticallyExposed=true or hasCriminalRecord=true) trigger mandatory manual review before access is granted.
- **Transaction monitoring:** Automated transaction monitoring is **not yet implemented**. Current controls are limited to per-tier access gates enforced by the KYCVerificationGate component. Ongoing monitoring is deferred to a future compliance module.
- **Suspicious Activity Reporting (SAR) readiness:** Operator procedures designate a compliance officer responsible for reviewing flagged participants and filing SARs as required under 31 U.S.C. § 5318(g). Automated SAR filing is deferred; current process is manual operator review.
- **Record retention:** Audit entries written by `lib/compliance.ts` `addAuditEntry()` and `kyc_verifications` database rows are retained per platform data policy. Formal five-year retention enforcement is **planned** and not yet automated.

**Program maturity:** Operational draft. External BSA/AML examination has not yet been completed. External attestation is pending.

---

## 2. Independent Certified Audit

**Has your AML program been reviewed by an independent certified auditor?**

No independent certified audit of the AML program has been completed as of this document date. The program is operating under internal controls with planned external review.

**Planned actions:**
- Engage a qualified AML compliance consultant or licensed third-party auditor for program review within 12 months of live participant onboarding launch.
- Annual independent review cycle thereafter.

**Current compensating controls:**
- Immutable audit trail via `lib/compliance.ts` `addAuditEntry()` — every verification decision, webhook event, and status change is appended to a non-deletable in-process ledger.
- Operator review of all Persona `needs_review` inquiry outcomes before upgrading participant status to `approved`.
- Role-segregated admin access — no single operator can both approve KYC and withdraw protocol treasury.

---

## 3. KYC Process

**Describe your Know Your Customer process.**

Axiom Protocol's participant identity verification process operates as follows:

1. **Wallet connection:** Participant connects a self-custody wallet (Arbitrum One). Wallet address serves as the unique participant identifier.
2. **Persona hosted inquiry:** Participant is presented the Persona embedded inquiry flow (template: configurable per deployment). The flow collects:
   - Government-issued photo ID (front and back)
   - Liveness selfie with biometric matching
   - Proof of address (optional per template configuration)
3. **Automated document verification:** Persona performs OCR extraction, document authenticity checks, and facial biometric matching within the hosted flow.
4. **PEP and sanctions pre-screen:** Persona's built-in screening checks are enabled for the inquiry template. The platform operator may additionally run post-inquiry screening via a dedicated sanctions API (deferred — see §4).
5. **Webhook outcome:** Persona delivers a signed webhook to `/api/persona/webhook`. On `inquiry.approved`, the participant's `kyc_verifications` row is updated to `approved` and the `persona_inquiry_id` is stored. On `inquiry.declined` or `inquiry.needs_review`, appropriate status is set and an immutable audit entry is written.
6. **Access unlock:** The `KYCVerificationGate` component re-fetches participant status from `/api/kyc/verification` upon Persona flow completion. Gated protocol features (AXUSD transactions, lending fund participation, syndication) unlock only on `approved` status.
7. **Expiry:** KYC verifications carry an expiry date. Re-verification is required at renewal. Re-KYC flows are deferred to a future release.

**Verification levels:**
| Level | Requirements | Protocol Access |
|-------|-------------|-----------------|
| 0 – Unverified | Wallet connected only | Read-only dashboard |
| 1 – Identity Verified | Persona inquiry approved | AXUSD, Savings, basic operations |
| 2 – Accredited Verified | Level 1 + accredited investor attestation | Lending Fund, Syndication |

---

## 4. PEP and Sanctions Screening

**Do you screen participants against Politically Exposed Person (PEP) and sanctions lists?**

**Current state:** Persona's built-in adverse media and watchlist screening is configured within the Persona inquiry template. This covers OFAC SDN, EU consolidated list, UN consolidated list, and major PEP databases at the time of initial inquiry.

**Limitations acknowledged:**
- Persona's built-in screening covers the inquiry snapshot only. Ongoing/continuous screening against updated watchlists is **not yet implemented** — this is deferred.
- No secondary third-party sanctions API (e.g. Dow Jones Watchlist, LexisNexis WorldCheck) is currently integrated beyond Persona's built-in checks.

**Compensating controls:**
- Participants from FATF high-risk jurisdictions are flagged at inquiry submission and require manual operator review before approval.
- The `riskLevel` field on `kyc_verifications` is set to `high` when `isPoliticallyExposed` is declared true in the risk assessment questionnaire, triggering mandatory manual review.
- Operator procedures require re-running a sanctions check for any participant whose status changes after approval (address change, name update, etc.).

**Planned:** Continuous watchlist monitoring integration in a future compliance module release.

---

## 5. Compliance Personnel

**Who is responsible for your compliance program?**

Axiom Protocol is in its bootstrap phase. The compliance function is currently fulfilled by the founding operator team with the following responsibilities assigned:

- **Compliance Officer (designated):** Reviews Persona `needs_review` inquiries, approves or rejects manually, oversees SAR filing obligation, and maintains BSA/AML program documentation.
- **Technical Operator:** Monitors webhook delivery logs, `/api/persona/webhook` audit trail, and `kyc_verifications` database for anomalies.
- **No dedicated in-house counsel** has been retained as of this document date. External legal counsel advises on securities compliance on an engagement basis.

**Planned:** As participant volume grows, a dedicated compliance hire and a formal compliance committee charter are planned prior to institutional capital raise.

---

## 6. Elder Customer Monitoring

**Do you have policies for monitoring elder or vulnerable customers?**

Axiom Protocol does not currently have a formal written elder financial exploitation (EFE) prevention program. The platform is designed for financially sophisticated participants (accredited investor tier for capital-intensive operations) and currently operates with a limited participant base.

**Compensating controls in place:**
- Risk assessment questionnaire asks about investment experience and risk tolerance. Participants declaring no investment experience and high-risk tolerance are flagged for additional review.
- There is no automated age-based trigger or senior account flag at this time.

**Planned:** A formal EFE policy will be developed prior to any marketing or outreach directed at retail or senior audiences. The policy will include:
- Voluntary designation of a trusted contact
- Transaction velocity monitoring with human review thresholds
- Cooling-off period for first-time large transactions

---

## 7. Licensing

**What licenses or registrations does your entity hold?**

Axiom Protocol (the operating entity) holds the following:

- **No money transmission license (MTL)** has been applied for or obtained. The protocol does not directly hold or transmit fiat currency. Settlement is conducted on-chain via AXUSD (an ERC-3643 stablecoin) on Arbitrum One.
- **No broker-dealer or investment adviser registration** has been filed. The protocol's offerings are structured under SEC Regulation D 506(c) (Lending Fund) — participants must be accredited investors and the protocol does not provide investment advice.
- **No banking charter.** Custody services are provided by BitGo CaaS under BitGo's existing trust charter.
- **EIN on file.** The entity holds a federal Employer Identification Number for tax reporting purposes.

**Regulatory posture:**
The protocol is structured with reference to emerging stablecoin and digital asset frameworks. The protocol's compliance posture remains subject to ongoing legal and operational evaluation. External compliance attestation has not been completed. No compliance conclusion is made herein regarding the GENIUS Act or any other pending legislation.

---

## Document History

| Date | Change |
|------|--------|
| May 2026 | Initial draft — covers Persona onboarding questionnaire fields |

---

*This document reflects the operational state of Axiom Protocol as of the date above. It is an internal working document. It does not constitute legal advice and should not be relied upon as a representation of legal compliance.*
