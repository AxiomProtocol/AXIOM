# AXAG Silver Reserve Instrument — Custody Request for Proposal

Document class: Custody RFP — Candidate Diligence
Framework: Commodity Expansion Framework v1.0.0
Candidate: Axiom Silver (AXAG)
Stage: 2 — Technical Diligence / C-01
Issued: 2026-05-01
Status: ISSUED — responses requested

---

## Status notice

This RFP is issued for diligence and evaluation purposes only. AXAG is **not live**, **not approved for deployment**, **not minted**, and **not listed**. Responding to this RFP does not constitute engagement, selection, or any contractual relationship. No custody agreement will be executed without a completed Stage 3 governance vote and Stage 4 launch readiness gate sign-off per the Commodity Expansion Framework v1.0.0.

---

## Table of Contents

1. [Overview of AXAG Model](#1-overview-of-axag-model)
2. [Required Custody Capabilities](#2-required-custody-capabilities)
3. [Segregation Model Requirements](#3-segregation-model-requirements)
4. [Audit and Proof-of-Reserves Expectations](#4-audit-and-proof-of-reserves-expectations)
5. [Redemption Handling Expectations](#5-redemption-handling-expectations)
6. [Regulatory Expectations](#6-regulatory-expectations)
7. [Response Format](#7-response-format)
8. [Evaluation Criteria](#8-evaluation-criteria)
9. [Timeline](#9-timeline)

---

## 1. Overview of AXAG Model

### What AXAG is (candidate only)

Axiom Silver (AXAG) is a candidate reserve instrument under evaluation within the Axiom Protocol. If approved through governance, AXAG would be a silver-backed reserve instrument issued on Arbitrum One, denominated in AXUSD, with physical silver as the reserve asset. AXAG has not been issued, deployed, or listed. This RFP solicits information about custody capabilities that may support AXAG if it advances through the governance process.

### Reference implementation: AXAU

The reference implementation for AXAG is AXAU (Axiom Gold), which is backed by PAXG (Paxos Gold) and settled on Arbitrum One. PAXG represents a physically-backed gold instrument issued by Paxos Trust Company, a regulated entity holding allocated gold bars in Brink's vaults. AXAU uses PAXG as its reserve asset because:

- PAXG is issued by a regulated, qualified custodian (Paxos)
- Each token represents one troy ounce of allocated LBMA Good Delivery gold
- Token holders have a direct right to redeem for physical gold
- On-chain proof-of-reserves is available via Paxos attestation

AXAG requires a custody model that meets or exceeds this standard for silver. No equivalent regulated, on-chain silver receipt token currently exists. This RFP seeks to identify whether a respondent can provide a comparable model for silver, either directly or through a partnership.

### Reserve asset specification

- Commodity: Physical silver
- Form: LBMA Good Delivery silver bars (.999 fineness or better)
- Standard: London Bullion Market Association (LBMA) Good Delivery List
- Minimum bar weight: 750 troy ounces (industry standard)
- Maximum bar weight: 1,100 troy ounces (industry standard)
- Storage: Allocated, segregated, fully insured
- Jurisdiction preference: United Kingdom, Switzerland, United States, Singapore (preference order)
- Acceptable vault operators: LBMA-accredited vaults

---

## 2. Required Custody Capabilities

Respondents must address each capability category. Where a capability is not currently available, respondents should describe a realistic timeline and pathway to offer it.

### 2.1 Physical silver storage

| Requirement                                   | Detail                                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| LBMA Good Delivery acceptance                 | Vault must accept LBMA Good Delivery silver bars as the primary storage unit                   |
| Allocated storage                             | Each client's silver must be held in allocated form, identified by bar serial number            |
| Segregated accounts                           | Client reserves must be held in a segregated account, not pooled with other clients' assets     |
| Insured coverage                              | Full replacement value insurance by a rated insurer; policy details must be available on request |
| Multi-location capability                     | Describe whether silver can be held across multiple vault locations for resilience               |
| Audit trail                                   | Bar-level serial number records maintained; available to Axiom Protocol on demand                |

### 2.2 Chain-of-custody documentation

| Requirement                                   | Detail                                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Assay certification                           | Each bar must be accompanied by assay documentation from an LBMA-accredited refiner            |
| Transport chain                               | Transport from refiner to vault documented; counterparty carriers identified                    |
| Receipt confirmation                          | Written confirmation of receipt with bar serials issued to Axiom Protocol at each transfer     |
| Outbound transfer tracking                    | Equivalent documentation on outbound transfers (delivery or redemption)                         |

### 2.3 On-chain integration capability

| Requirement                                   | Detail                                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Proof-of-reserves API or feed                 | Ability to publish a machine-readable proof-of-reserves at a defined cadence                   |
| On-chain attestation support                  | Describe whether respondent can issue or co-issue an on-chain silver receipt token (Path A), or provide attestation data for a third-party oracle to consume (Path B) |
| Data format                                   | JSON-LD or equivalent structured format; cryptographic signature preferred                     |
| Reporting cadence                             | Minimum: quarterly. Preferred: monthly. Ideal: continuous (per-block or per-event)              |

### 2.4 Redemption facilitation

| Requirement                                   | Detail                                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Redemption initiation                         | Describe the process by which Axiom Protocol or an authorized counterparty may initiate a redemption |
| Settlement window                             | State the achievable settlement window for physical silver delivery or transfer (T+0, T+1, T+N) |
| Minimum redemption size                       | State the minimum redemption quantity (in troy ounces or bars)                                 |
| Delivery options                              | Describe available delivery modes: in-vault title transfer, physical delivery, third-party vault-to-vault |
| Partial redemption                            | Describe whether partial-bar redemption is supported and how fractional balances are handled    |
| Cancellation and reversal policy              | Describe the process and window for cancelling a redemption request after initiation            |

---

## 3. Segregation Model Requirements

AXAG reserves must be held in a manner that:

1. **Identifies each bar by serial number** in records maintained by the custodian and accessible to Axiom Protocol.
2. **Is insolvency-remote** — in the event of custodian insolvency, the silver held on behalf of Axiom Protocol is not part of the custodian's estate and cannot be claimed by custodian creditors.
3. **Is audit-accessible** — an independent auditor appointed by Axiom Protocol must be able to inspect the allocated bar inventory at any time with reasonable notice (target: 48 hours).
4. **Is not re-hypothecated** — silver held in the AXAG reserve account must not be lent, leased, or otherwise encumbered without the express written consent of Axiom Protocol governance.

Respondents must confirm in writing whether each of these conditions can be met. Where conditions cannot be met as stated, respondents should describe the nearest available alternative.

---

## 4. Audit and Proof-of-Reserves Expectations

### 4.1 Periodic attestation

Axiom Protocol requires periodic, independent attestation of physical silver reserves. Respondents must describe their existing attestation program or their ability to establish one.

| Expectation                                   | Detail                                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Attestation frequency                         | Quarterly minimum; monthly preferred                                                            |
| Attesting party                               | Independent third-party auditor (Big 4 or equivalent); not the custodian's internal audit team |
| Scope                                         | Physical count and bar-serial-number reconciliation against Axiom Protocol's ledger             |
| Report format                                 | Written report, signed by the attesting party, in a format suitable for on-chain publication   |
| Delivery timeline                             | Report delivered within 30 calendar days of the attestation date                               |

### 4.2 On-chain proof-of-reserves

Where respondent has the capability, Axiom Protocol prefers a real-time or near-real-time proof-of-reserves system in which:

- Reserve quantity is published to an on-chain feed or data availability layer
- Reserve data is cryptographically signed by the custodian or its authorized agent
- The on-chain value is reconcilable against the custodian's internal ledger
- Any change in reserve quantity (inflow or outflow) triggers an on-chain update within a defined SLA

Respondents should describe whether they currently offer this capability, are developing it, or would require a technology partnership to offer it.

### 4.3 Unannounced inspection right

Axiom Protocol reserves the right to commission unannounced vault inspections by an independent inspector. Respondents must confirm whether this right can be included in a custody agreement. Any restrictions (e.g., minimum notice period, inspector credential requirements) must be disclosed.

---

## 5. Redemption Handling Expectations

Redemption is the process by which AXAG reserve silver is returned to a designated counterparty. Redemptions must be governed by a documented SLA attached to the custody agreement. Axiom Protocol's expectations for the redemption model are:

### 5.1 Redemption initiation

- Initiation must be authenticated (multi-party authorization or equivalent, not single-signature)
- Initiation must be logged with a timestamped record available to Axiom Protocol
- Initiation triggers an immediate confirmation acknowledgment from the custodian

### 5.2 Settlement options (in order of preference)

| Option | Description | Preferred settlement window |
| ------ | ----------- | --------------------------- |
| In-vault title transfer | Ownership of designated bars transferred to a new LBMA member account; no physical movement | T+0 or T+1 |
| Vault-to-vault transfer | Physical bars moved between LBMA-accredited vaults upon direction | T+1 to T+3 |
| Physical delivery | Physical bars delivered to an authorized counterparty location | T+2 to T+5 by negotiation |

Respondents must state which options they can currently support and the achievable settlement window for each.

### 5.3 Partial and fractional handling

- Standard silver bars weigh 750–1,100 troy ounces; fractional redemptions below a full bar create a residual
- Respondents must describe how sub-bar residuals are handled: cash equivalent, allocated residual account, or equivalent
- Axiom Protocol does not commit to any minimum redemption size at this stage; respondents should state the minimum they can support

### 5.4 Fee structure

Respondents must provide a fee schedule covering:
- Monthly or annual storage fee (per troy ounce or percentage of AUM)
- Transaction fee per inbound transfer (purchase / deposit)
- Transaction fee per outbound transfer (redemption / withdrawal)
- Attestation fee (per attestation event)
- Setup or onboarding fee, if any

Fees must be denominated in USD. Variable fee structures must include the basis for variability.

---

## 6. Regulatory Expectations

### 6.1 Regulatory status of respondent

Respondents must disclose:
- Legal entity name and jurisdiction of incorporation
- Regulatory licenses held (e.g., trust company charter, money services business, commodity merchant, regulated fund administrator)
- Whether the entity is subject to examination by a prudential regulator (e.g., OCC, FDIC, state banking department, FCA, MAS)
- Whether the entity has been subject to regulatory enforcement action in the past five years; if so, a brief description

### 6.2 AML and KYC program

Respondents must confirm they operate a documented AML/KYC program and can apply it to Axiom Protocol as a counterparty. Respondents should describe:
- Onboarding requirements for a new institutional client
- Ongoing monitoring requirements
- Suspicious activity reporting obligations and how they affect custody operations

### 6.3 CFTC and securities law posture

Axiom Protocol is evaluating AXAG's regulatory status under U.S. law, including CFTC commodity analysis and securities law analysis (Reves and Howey). Respondents with experience in tokenized commodity custody or structured product custody are asked to describe:
- Prior experience with CFTC-regulated commodity custody
- Any internal or external analysis of whether a silver receipt token issued against their custody would constitute a security or commodity under U.S. law
- Any prior engagement with a U.S. regulator regarding tokenized commodity custody

### 6.4 Insurance

Respondents must provide:
- Name of the insurer and policy type covering stored silver
- Coverage limit
- Whether the policy covers allocated-specific risks (e.g., mysterious disappearance, in-transit)
- Policy terms that may affect Axiom Protocol's ability to claim in the event of a loss

---

## 7. Response Format

Respondents should provide a response document organized by the sections in this RFP. Each section should address the requirements stated. Where a requirement cannot be met, the response should state that clearly and describe the nearest available alternative.

### Required response sections

1. **Executive summary** — three paragraphs describing the respondent's custody model, key differentiators, and suitability for AXAG
2. **Physical silver capabilities** — per Section 2.1 and 2.2
3. **On-chain integration capability** — per Section 2.3; confirm Path A, Path B, or neither
4. **Segregation model** — per Section 3; confirm each condition or describe alternative
5. **Attestation program** — per Section 4; describe existing program and cadence available
6. **Redemption model** — per Section 5; describe available options and settlement windows
7. **Regulatory profile** — per Section 6; include licenses, insurance summary, and any prior regulator engagement
8. **Fee schedule** — tabulated per Section 5.4
9. **Technology and integration** — describe API or data feed capabilities for proof-of-reserves
10. **References** — at least two existing institutional clients willing to be referenced (subject to confidentiality)
11. **Path classification** — state which custody path applies to the respondent's model:
    - Path A: Regulated qualified custodian issuing a directly redeemable on-chain silver receipt token
    - Path B: Regulated custodian with segregated allocated account and quarterly PoR, without an on-chain receipt token
    - Path C: Exchange-grade multi-party arrangement with independent audit (fallback)

### Format requirements

- PDF or structured Markdown
- Maximum 30 pages excluding appendices
- All monetary amounts in USD
- All weights in troy ounces unless otherwise noted
- All dates in ISO 8601 format (YYYY-MM-DD)

---

## 8. Evaluation Criteria

Responses will be evaluated against the following criteria. Weights are indicative and subject to governance review.

| Criterion                                  | Weight |
| ------------------------------------------ | :----: |
| Regulatory standing and oversight quality  |  25%   |
| Segregation and insolvency-remote model    |  20%   |
| Attestation / proof-of-reserves capability |  20%   |
| On-chain integration capability (Path A/B) |  15%   |
| Redemption model and settlement speed      |  10%   |
| Fee structure                              |  5%    |
| References and institutional track record  |  5%    |

Path A respondents (on-chain receipt token) will receive a higher preliminary score on the on-chain integration criterion than Path B respondents. Path C respondents will not score maximum on the on-chain integration criterion.

---

## 9. Timeline

All dates are indicative. No binding commitment is made to any respondent until a custody agreement is executed following completion of all governance steps.

| Milestone                             | Target date       | Notes                                               |
| ------------------------------------- | ----------------- | --------------------------------------------------- |
| RFP issued                            | 2026-05-01        | This document                                       |
| Responses due                         | TBD               | To be set by Treasury operations lead               |
| Response tabulation complete (C-02)   | TBD               | AXAG_CUSTODY_SHORTLIST.md updated                  |
| Custodian selected (C-03)             | TBD               | Subject to governance review and evidence threshold |
| Term sheet drafted (C-04)             | TBD               | Follows C-03                                        |
| Governance vote (Stage 3)             | TBD               | Follows full Stage 2 completion                     |

---

## Evidence artifact

This document is the evidence artifact for tracker item **C-01** (Custody RFP final) in the AXAG Stage 2 Evidence Tracker. Upon issuance, C-01 transitions to CLOSED.

AXAG IS NOT LIVE AND IS NOT APPROVED FOR DEPLOYMENT. This RFP does not constitute an offer, commitment, or authorization to issue, deploy, or trade any AXAG instrument.

---

End of RFP.
