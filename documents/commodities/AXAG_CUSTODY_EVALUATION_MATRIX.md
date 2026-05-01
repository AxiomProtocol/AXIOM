# AXAG Silver Reserve Instrument — Custody Evaluation Matrix

Document class: Custody Candidate Evaluation Matrix
Framework: Commodity Expansion Framework v1.0.0
Candidate: Axiom Silver (AXAG)
Stage: 2 — Technical Diligence / C-02
Version: 1.0 — pre-response (based on public information and repo source documents)
Prepared: 2026-05-01
Status: IN PROGRESS — awaiting formal RFP responses from all candidates
Evidence artifact for: C-02 (supplementary — complements AXAG_CUSTODY_SHORTLIST.md)

---

## Status notice

AXAG is **not live**, **not approved for deployment**, **not minted**, and **not listed**. This matrix is a diligence preparation document used to structure evaluation of potential custody counterparties. No custodian has been selected. C-03 (custodian selection) remains ASSIGNED and will not advance until this evaluation is complete, formal RFP responses have been received and scored, and at least one candidate meets the minimum custody standard defined in Section 3 of this document. Inclusion in this matrix does not constitute engagement, selection, or any contractual relationship.

---

## Table of Contents

1. [Evaluation Framework](#1-evaluation-framework)
2. [Scoring Guide](#2-scoring-guide)
3. [Minimum Custody Standard for C-03 Advancement](#3-minimum-custody-standard-for-c-03-advancement)
4. [Candidate Evaluations](#4-candidate-evaluations)
   - 4.1 Brink's Company
   - 4.2 Loomis International
   - 4.3 BitGo Trust Company
   - 4.4 Anchorage Digital Bank
   - 4.5 Malca-Amit
   - 4.6 Via Mat International
5. [Comparative Scoring Matrix](#5-comparative-scoring-matrix)
6. [Gap Analysis vs AXAU / PAXG Standard](#6-gap-analysis-vs-axau--paxg-standard)
7. [Path Classification Summary](#7-path-classification-summary)
8. [Open Questions Register](#8-open-questions-register)
9. [C-03 Precondition Checklist](#9-c-03-precondition-checklist)

---

## 1. Evaluation Framework

### Evaluation dimensions

Each candidate is evaluated across 10 dimensions derived from AXAG_CUSTODY_RFP.md requirements and Commodity Expansion Framework v1.0.0 Section 6 (Custody Standards).

| Dimension ID | Dimension name                     | RFP source         | CEF source       |
| :----------: | ---------------------------------- | ------------------ | ---------------- |
| D1           | Physical silver custody capability | RFP Section 2.1    | CEF Section 6.1  |
| D2           | LBMA / accredited vault status     | RFP Section 2.1    | CEF Section 6.2  |
| D3           | Allocated storage support          | RFP Section 2.1    | CEF Section 6.3  |
| D4           | Segregation model                  | RFP Section 3      | CEF Section 6.4  |
| D5           | Proof-of-reserves / audit support  | RFP Section 4      | CEF Section 6.5  |
| D6           | Insurance / chain-of-custody       | RFP Section 4.3    | CEF Section 6.6  |
| D7           | Digital integration ability        | RFP Section 2.3    | CEF Section 6.7  |
| D8           | Regulatory posture                 | RFP Section 6      | CEF Section 6.8  |
| D9           | Path A / B / C fit                 | RFP Section 7      | CEF Section 6    |
| D10          | Overall feasibility                | All dimensions     | All sections     |

### Reference standard

All evaluations are benchmarked against the AXAU / PAXG reference: Paxos Trust Company (NY-regulated trust) + Brink's London vault (LBMA-accredited) + monthly attestation + directly redeemable PAXG ERC-20 token. This is the Path A ceiling.

### Information basis

All assessments in version 1.0 are based on:
- Publicly available company information
- LBMA Good Delivery List membership records (public)
- Regulatory filings and publicly disclosed charter information
- Prior Axiom Protocol engagement records (BitGo CaaS for AXAU)
- AXAG_CUSTODY_SHORTLIST.md prior analysis
- Commodity Expansion Framework v1.0.0

Assessments will be updated to version 2.0 once formal RFP responses are received.

---

## 2. Scoring Guide

Each dimension is scored 1–4. Where a dimension cannot be assessed from public information alone, the score is marked PND (Pending) until RFP responses arrive.

| Score | Label       | Meaning                                                                                    |
| :---: | ----------- | ------------------------------------------------------------------------------------------ |
| 4     | Exceeds     | Meets or exceeds the AXAU / PAXG standard on this dimension                               |
| 3     | Meets       | Meets the minimum requirement for this dimension; no material gap                         |
| 2     | Partial     | Partially meets the requirement; a gap exists that is addressable with contractual or operational effort |
| 1     | Gap         | Material gap; requires significant structural work or a third party to address             |
| PND   | Pending     | Cannot be assessed without formal RFP response                                             |

Weighted scoring (applies when formal RFP responses are received):

| Dimension | Weight | Rationale                                                           |
| :-------: | :----: | ------------------------------------------------------------------- |
| D1        |  20%   | Physical silver capability is the foundational requirement          |
| D2        |  10%   | LBMA standard is mandatory for reserve legitimacy                  |
| D3        |  10%   | Allocated storage is a binary requirement                           |
| D4        |  15%   | Segregation is a binary requirement for insolvency-remote model     |
| D5        |  15%   | PoR is the evidence mechanism for on-chain trust                    |
| D6        |  10%   | Insurance is a binary requirement; chain-of-custody is evidence     |
| D7        |  10%   | Digital integration determines Path A / B scoring impact           |
| D8        |  10%   | Regulatory standing determines custody quality ceiling              |
| D9        | (output)|Path derived from the above                                         |
| D10       | (output)|Aggregate judgment; not independently weighted                      |

---

## 3. Minimum Custody Standard for C-03 Advancement

C-03 (custodian selection) may not advance until at least one candidate meets **all** of the following minimum conditions. This is the C-03 precondition gate.

| ID    | Minimum condition                                                                   | Source              |
| ----- | ----------------------------------------------------------------------------------- | ------------------- |
| MC-01 | Candidate holds physical silver in LBMA Good Delivery form or confirms they will   | CEF Section 6.2     |
| MC-02 | Candidate provides allocated, segregated storage (not pooled)                       | CEF Section 6.3–6.4 |
| MC-03 | Candidate is insolvency-remote: client assets are off-balance-sheet                 | CEF Section 6.4     |
| MC-04 | Candidate confirms willingness to provide periodic attestation (quarterly minimum)  | CEF Section 6.5     |
| MC-05 | Candidate is regulated in at least one major jurisdiction                           | CEF Section 6.8     |
| MC-06 | Candidate confirms no material regulatory enforcement action in the past 5 years    | RFP Section 6.1     |
| MC-07 | Candidate provides a fee schedule in response to the RFP                            | RFP Section 5.4     |

A candidate meeting MC-01 through MC-07 is eligible for C-03 selection consideration. Selection still requires governance review. Meeting these conditions is necessary but not sufficient for selection.

---

## 4. Candidate Evaluations

---

### 4.1 Brink's Company

**Entity:** Brink's Company (NYSE: BCO) — publicly traded security transport and vault operator.
**Headquarters:** Richmond, Virginia, USA.
**Axiom Protocol relationship:** Indirect — Brink's is the vault custodian underlying PAXG (Paxos Gold), which is the reserve asset for AXAU. No direct contract with Axiom Protocol.

#### D1 — Physical silver custody capability

Score: **4 — Exceeds**

Brink's operates LBMA-accredited vaults in London, New York, Zurich, and Singapore. The company has a documented, multi-decade history of holding precious metals for institutional clients, sovereign wealth funds, and central banks. Physical silver in LBMA Good Delivery form is a standard Brink's product. Brink's is the sub-custodian underlying PAXG (Paxos Gold), demonstrating that allocated precious metal custody at institutional scale is an established operational capability. Silver custody is a direct extension of the same operational model.

Source: Brink's public investor relations filings; Paxos PAXG attestation documentation; LBMA Good Delivery List (public).

#### D2 — LBMA / accredited vault status

Score: **4 — Exceeds**

Brink's London vault is LBMA-accredited. The LBMA accreditation covers both gold and silver Good Delivery. LBMA Good Delivery Rules for Silver Bars require bars of .999 fineness or better, 750–1,100 troy ounce weight, and assay certification by an LBMA-accredited refiner. Brink's operates within these standards as a matter of institutional practice.

Source: LBMA Good Delivery Rules (public); Brink's institutional vault operations (public).

#### D3 — Allocated storage support

Score: **4 — Exceeds**

Brink's provides allocated storage by bar serial number. Each client's holdings are identified as specific bars, not a share of a pooled inventory. This is the industry standard for institutional precious metal custody at Brink's tier.

Source: Paxos PAXG terms and attestation methodology; Brink's institutional custody documentation.

#### D4 — Segregation model

Score: **3 — Meets**

Brink's holds client assets in segregated allocated accounts. Client assets are off Brink's balance sheet. In a Brink's insolvency, allocated client assets are not available to Brink's creditors under standard precious metals custodian agreements. This is standard practice for the physical precious metals industry in the UK and US jurisdictions.

Gap: The specific insolvency-remote structure for an AXAG reserve account would need to be confirmed in the term sheet. The legal basis of segregation (trust, bailee, or other) should be confirmed by external counsel.

Source: Industry standard for LBMA-tier custodians; Paxos PAXG custody structure (public).

#### D5 — Proof-of-reserves / audit support

Score: **3 — Meets**

Brink's provides attestation data to Paxos, which Paxos publishes monthly as part of PAXG's proof-of-reserves program. Brink's does not independently publish a signed PoR feed for general use. For AXAG, Brink's would need to either provide attestation data to a Paxos-equivalent issuer, or agree to provide a signed machine-readable dataset directly to Axiom Protocol or its appointed auditor.

Gap: No confirmed standalone silver PoR program exists. Willingness and capability to provide a cryptographically signed monthly attestation directly (without a Paxos-equivalent intermediary) is unknown and must be confirmed in the RFP response.

Open question: OQ-01 — See Section 8.

#### D6 — Insurance / chain-of-custody indicators

Score: **3 — Meets**

Brink's carries comprehensive insurance policies covering precious metals in its vaults. Policy terms are not publicly disclosed at the bar-serial-number level. In-transit coverage is provided through Brink's global logistics network. Assay documentation accompanies bars from LBMA-accredited refiners.

Gap: Specific coverage limits and whether the policy covers allocated-client-specific risks (mysterious disappearance, in-transit) in a manner permitting client-direct claims must be confirmed in the RFP response.

Open question: OQ-02 — See Section 8.

#### D7 — Digital integration ability

Score: **2 — Partial**

Brink's has no public-facing blockchain integration product. The company provides data to Paxos, which handles the on-chain layer. For AXAG, Brink's would need to either extend an existing data feed capability or develop a new one. Brink's has digital reporting systems for institutional clients, but whether these can produce a cryptographically signed, machine-readable PoR output without an issuer intermediary is unconfirmed.

Gap: No standalone on-chain integration product. Digital integration likely requires either (a) a Paxos-equivalent issuer, or (b) bespoke development of a signed API feed.

Open question: OQ-03 — See Section 8.

#### D8 — Regulatory posture

Score: **3 — Meets**

Brink's is a publicly traded company (NYSE: BCO) subject to SEC reporting requirements. It is regulated in each operating jurisdiction (UK: FCA oversight context; US: state and federal; Switzerland: FINMA context). It is not a trust company or bank and does not hold a qualified custodian designation, which limits its scoring vs. BitGo or Anchorage on this dimension.

Gap: Not a qualified custodian. For Path A (on-chain receipt token issuance), a qualified-custodian layer would be required on top of Brink's.

#### D9 — Path classification

**Path B** (physical custodian layer; requires separate issuer or attestation layer for on-chain integration).
**Path A enabler**: Brink's could serve as the physical sub-custodian in a Brink's + BitGo dual-layer arrangement, making Path A achievable with a partner.

#### D10 — Overall feasibility

**HIGH**

Brink's is the strongest pure physical custody candidate. Its existing role in the PAXG infrastructure makes it the most directly analogous to the AXAU reference model. Path B is achievable with Brink's as the primary vault. Path A is achievable with Brink's as the physical sub-custodian to a regulated issuer layer.

| Dimension | Score | Notes                                                              |
| :-------: | :---: | ------------------------------------------------------------------ |
| D1        |   4   | Physical silver confirmed; PAXG analogy established               |
| D2        |   4   | LBMA London vault accredited                                      |
| D3        |   4   | Allocated serial-number storage confirmed                         |
| D4        |   3   | Off-balance-sheet; legal segregation basis needs term sheet       |
| D5        |   3   | PoR via Paxos confirmed; standalone silver PoR unconfirmed        |
| D6        |   3   | Insurance confirmed; specific terms pending                       |
| D7        |   2   | No standalone digital integration; requires issuer layer or build |
| D8        |   3   | Public company; regulated; not a qualified custodian              |
| D9        |   —   | Path B primary; Path A enabler                                    |
| D10       |   —   | **HIGH**                                                          |

---

### 4.2 Loomis International

**Entity:** Loomis AB — listed on Nasdaq Stockholm (LOOMIS); Loomis International is the international precious metals and valuables division.
**Headquarters:** Stockholm, Sweden (group); operational centers in London, Zurich, and elsewhere.
**Axiom Protocol relationship:** None.

#### D1 — Physical silver custody capability

Score: **4 — Exceeds**

Loomis International operates precious metals vault and transport services at LBMA-accredited locations in London and Zurich. Physical silver in LBMA Good Delivery form is a standard institutional product. Loomis is active in the European precious metals market for sovereign, institutional, and high-net-worth clients.

Source: Loomis AB annual reports (public); LBMA Good Delivery List membership (public).

#### D2 — LBMA / accredited vault status

Score: **4 — Exceeds**

Loomis International is an LBMA-accredited vault operator. London and Zurich vault locations meet LBMA Good Delivery requirements for silver.

Source: LBMA Good Delivery List (public).

#### D3 — Allocated storage support

Score: **3 — Meets**

Loomis provides allocated storage for institutional precious metals clients. Bar-serial-number identification is standard practice. No indication of pooled storage for institutional accounts.

Gap: Specific bar-serial-number reporting format and client access to inventory records must be confirmed in the RFP response.

#### D4 — Segregation model

Score: **3 — Meets**

Allocated storage model provides off-balance-sheet client asset treatment consistent with industry standards. Insolvency-remote structure follows standard UK / Swiss precious metals custodian practice.

Gap: Legal basis of segregation in Loomis's specific client agreement template must be confirmed; external counsel should review.

#### D5 — Proof-of-reserves / audit support

Score: **2 — Partial**

Loomis provides attestation reports on request for institutional clients. There is no known public PoR product or scheduled attestation program. A monthly attestation cadence with a signed report delivered by an independent auditor is achievable but would require bespoke contractual arrangement.

Gap: No existing structured attestation program with cryptographic signing capability. Would require Axiom Protocol to appoint and fund an independent auditor; Loomis would need to cooperate with scheduled and unannounced inspections.

Open question: OQ-04 — See Section 8.

#### D6 — Insurance / chain-of-custody indicators

Score: **3 — Meets**

Loomis carries institutional precious metals insurance covering vault storage and in-transit movement. Assay documentation is standard. Chain-of-custody follows LBMA transport norms.

Gap: Policy specifics (insurer name, coverage limit, allocated-specific risk coverage) must be confirmed in the RFP response.

#### D7 — Digital integration ability

Score: **1 — Gap**

No known digital integration product or API. Loomis does not issue tokens and has no blockchain integration history. A cryptographically signed, machine-readable PoR feed would require bespoke build. This is the largest gap for Loomis relative to BitGo or Anchorage.

Open question: OQ-05 — See Section 8.

#### D8 — Regulatory posture

Score: **3 — Meets**

Loomis AB is a publicly listed company (Nasdaq Stockholm) subject to Swedish and EU regulatory frameworks. Operations in the UK are subject to FCA oversight context. No known enforcement history.

Gap: Not a trust company or bank; no qualified custodian status. Same limitation as Brink's.

#### D9 — Path classification

**Path B** — physical custody + periodic PoR via appointed independent auditor. No digital integration capability for Path A.

#### D10 — Overall feasibility

**HIGH** for Path B physical custody. Physical operations are equivalent to or comparable with Brink's. The digital integration gap is larger than Brink's (Brink's has the Paxos data-feed precedent; Loomis does not). Path A is not feasible with Loomis alone.

| Dimension | Score | Notes                                                             |
| :-------: | :---: | ----------------------------------------------------------------- |
| D1        |   4   | Physical silver at LBMA London and Zurich confirmed              |
| D2        |   4   | LBMA accreditation confirmed                                     |
| D3        |   3   | Allocated storage standard; record format pending RFP            |
| D4        |   3   | Off-balance-sheet; legal basis to be confirmed in term sheet     |
| D5        |   2   | Attestation on request; no structured program; bespoke required  |
| D6        |   3   | Insurance confirmed; specifics pending                           |
| D7        |   1   | No digital integration; no API; full bespoke build required      |
| D8        |   3   | Public company; no known enforcement; not a qualified custodian  |
| D9        |   —   | Path B only                                                      |
| D10       |   —   | **HIGH** (physical); **LOW** (digital integration)              |

---

### 4.3 BitGo Trust Company

**Entity:** BitGo Trust Company, Inc. — South Dakota chartered trust company; subsidiary of BitGo Holdings, Inc.
**Headquarters:** Palo Alto, California, USA.
**Axiom Protocol relationship:** **Existing** — BitGo CaaS is the custody layer for AXAU. A direct commercial relationship with BitGo already exists.

#### D1 — Physical silver custody capability

Score: **1 — Gap**

BitGo does not operate physical precious metals vaults. Physical silver custody is not a native product. BitGo's custody infrastructure is built for digital assets (crypto), not physical commodities. To hold physical silver, BitGo would require a sub-custodian arrangement with a physical vault operator (e.g., Brink's or Malca-Amit).

Gap: Physical silver vault capability is entirely absent. This is the largest gap for BitGo and the primary constraint on its Path A potential.

Open question: OQ-06 — See Section 8.

#### D2 — LBMA / accredited vault status

Score: **1 — Gap**

BitGo has no LBMA vault accreditation. This would be addressed through a physical sub-custodian.

#### D3 — Allocated storage support

Score: **3 — Meets** (digital assets); **1 — Gap** (physical silver without sub-custodian)

BitGo's digital custody model uses segregated wallets. If extended to physical silver via a sub-custodian, allocated storage at bar-serial-number level would depend on the sub-custodian's capability (Brink's or Malca-Amit score 4 on this dimension).

#### D4 — Segregation model

Score: **4 — Exceeds** (trust structure)

BitGo Trust Company holds client assets in trust under South Dakota law. Client assets are legally isolated from BitGo's own assets. In a BitGo insolvency, trust assets are not available to BitGo's general creditors. The trust structure provides a higher degree of legal certainty on segregation than the standard precious metals custodian model.

Source: BitGo Trust Company charter; South Dakota trust law framework.

#### D5 — Proof-of-reserves / audit support

Score: **4 — Exceeds** (digital assets); **2 — Partial** (physical silver)

BitGo has a mature proof-of-reserves tooling suite for digital assets, including cryptographic attestation and API-based reporting. For physical silver, a PoR feed would require integration between BitGo's reporting infrastructure and a physical sub-custodian's inventory data. This is technically feasible (BitGo processes custodian-reported data) but has not been done for physical commodities.

Open question: OQ-07 — See Section 8.

#### D6 — Insurance / chain-of-custody indicators

Score: **3 — Meets** (digital); **PND** (physical)

BitGo carries standard digital asset custody insurance (crime, cyber, professional indemnity). Physical silver insurance would be the responsibility of the physical sub-custodian.

#### D7 — Digital integration ability

Score: **4 — Exceeds**

BitGo has the strongest digital integration capability of all candidates. It has existing APIs, a proof-of-reserves infrastructure, cryptographic signing, and on-chain reporting tooling. For a Path A structure, BitGo Trust could issue an on-chain receipt token backed by trust-held silver (held via a physical sub-custodian), with PoR data flowing from the sub-custodian through BitGo's existing reporting pipeline.

This is the primary reason BitGo is in scope for Path A: it provides the regulatory (trust structure) and digital (API + on-chain) layer that physical vault operators cannot independently provide.

#### D8 — Regulatory posture

Score: **4 — Exceeds**

BitGo Trust Company is a South Dakota chartered trust company, qualifying it as a regulated custodian under the SEC's custody rule. This is equivalent to or exceeds Paxos Trust Company's regulatory standing (also a trust company, NY-chartered). BitGo's trust structure means it qualifies as a "qualified custodian" under 17 CFR 275.206(4)-2.

Source: BitGo Trust Company charter (public); SEC custody rule guidance.

#### D9 — Path classification

**Path A potential** — BitGo Trust as the regulated issuer layer + physical sub-custodian (Brink's or Malca-Amit) as the vault layer. This is the only confirmed structural route to Path A currently available.

**Path B** — BitGo could also function as the record-keeping and attestation coordination layer only, with a physical sub-custodian holding the silver. In this configuration, BitGo's trust structure provides enhanced legal certainty vs. using a physical vault operator directly.

#### D10 — Overall feasibility

**MEDIUM** for standalone; **HIGH** if dual-layer (BitGo + Brink's or Malca-Amit) is confirmed viable.

The dual-layer model would be the only credible route to Path A. It requires: (a) BitGo willingness to structure a silver trust product, (b) a physical sub-custodian arrangement, and (c) integration between BitGo's PoR tooling and the sub-custodian's inventory data. Given the existing BitGo CaaS relationship for AXAU, this is the highest-potential candidate for long-term path evolution.

| Dimension | Score | Notes                                                             |
| :-------: | :---: | ----------------------------------------------------------------- |
| D1        |   1   | No physical silver vault; sub-custodian required                 |
| D2        |   1   | No LBMA accreditation; sub-custodian dependent                   |
| D3        | 3/1   | Digital: meets; physical: gap without sub-custodian              |
| D4        |   4   | Trust structure; strongest segregation model in the set          |
| D5        | 4/2   | Digital PoR: exceeds; physical PoR: partial; requires integration|
| D6        |   3   | Digital insurance: meets; physical: sub-custodian dependent      |
| D7        |   4   | Strongest digital integration of all candidates                  |
| D8        |   4   | Qualified custodian; trust company; highest regulatory standing  |
| D9        |   —   | Path A potential (dual-layer); Path B achievable                 |
| D10       |   —   | **MEDIUM** standalone; **HIGH** dual-layer                       |

---

### 4.4 Anchorage Digital Bank

**Entity:** Anchorage Digital Bank NA — federally chartered digital asset bank (OCC charter).
**Headquarters:** San Francisco, California, USA.
**Axiom Protocol relationship:** None.

#### D1 — Physical silver custody capability

Score: **1 — Gap**

Anchorage is a digital-native bank. It does not operate physical precious metals vaults. Physical silver capability would require a physical sub-custodian, same as BitGo.

#### D2 — LBMA / accredited vault status

Score: **1 — Gap**

No LBMA accreditation. Sub-custodian dependent.

#### D3 — Allocated storage support

Score: **3 — Meets** (digital assets); **1 — Gap** (physical silver without sub-custodian)

Same pattern as BitGo for digital assets. Physical allocated storage would depend entirely on the sub-custodian.

#### D4 — Segregation model

Score: **4 — Exceeds**

Anchorage Digital Bank is a federally chartered national bank under OCC supervision. Client assets are held under federal banking law, providing the strongest available insolvency-remote structure for a U.S. entity. The OCC charter provides a statutory framework for client asset protection that exceeds the trust company model on legal certainty.

Source: OCC preliminary conditional approval letter for Anchorage (public); National Bank Act framework.

#### D5 — Proof-of-reserves / audit support

Score: **3 — Meets** (digital); **2 — Partial** (physical)

Anchorage has on-chain and API-based proof-of-reserves capabilities for digital assets. Physical commodity PoR would require sub-custodian integration. Federal banking regulations require Anchorage to maintain strong internal audit and external audit relationships, which could support a structured attestation program.

#### D6 — Insurance / chain-of-custody indicators

Score: **3 — Meets** (digital); **PND** (physical)

Anchorage holds FDIC insurance for deposit-taking activities and carries separate digital asset custody insurance. Physical silver insurance would be sub-custodian dependent.

#### D7 — Digital integration ability

Score: **4 — Exceeds**

Anchorage has strong digital integration capability, including API-based custody and on-chain reporting. As a bank, it also has more robust internal controls and audit infrastructure than BitGo, which may translate to more defensible PoR documentation.

#### D8 — Regulatory posture

Score: **4 — Exceeds** (highest in the candidate set)

Anchorage holds an OCC-issued federal bank charter — the highest regulatory standing available for a digital asset custodian in the United States. OCC examination is ongoing. This exceeds the trust company model (BitGo, Paxos) on regulatory quality.

Gap for this use case: The OCC's guidance on bank activities including physical commodity custody is evolving. Whether the OCC would permit a federally chartered bank to hold physical silver as a custodial activity, or whether silver receipts issued by the bank would trigger additional regulatory analysis, is an open question requiring legal review.

Open question: OQ-08 — See Section 8.

#### D9 — Path classification

**Path A potential** — highest regulatory standing; same physical gap as BitGo. Anchorage as issuer + Brink's or Malca-Amit as physical vault is structurally viable but requires more product development effort and a longer timeline than BitGo.

**Path B** — achievable but represents underutilization of Anchorage's regulatory standing. If Path B only is needed, Brink's or Malca-Amit are faster and simpler partners.

#### D10 — Overall feasibility

**MEDIUM** — exceptional regulatory standing; significant physical gap; longer product timeline than BitGo; OCC physical commodity custody posture requires legal confirmation.

| Dimension | Score | Notes                                                             |
| :-------: | :---: | ----------------------------------------------------------------- |
| D1        |   1   | No physical silver vault; sub-custodian required                 |
| D2        |   1   | No LBMA accreditation; sub-custodian dependent                   |
| D3        | 3/1   | Digital: meets; physical: gap without sub-custodian              |
| D4        |   4   | Federal bank charter; strongest legal segregation basis          |
| D5        | 3/2   | Digital PoR: meets; physical: partial (sub-custodian dependent)  |
| D6        |   3   | Federal insurance framework for deposits; physical: pending       |
| D7        |   4   | Strong digital integration; bank-grade audit infrastructure      |
| D8        |   4   | OCC federal charter; highest U.S. regulatory standing            |
| D9        |   —   | Path A potential (long timeline); Path B underutilizes standing  |
| D10       |   —   | **MEDIUM** — strongest regulatory floor; longest Path A timeline |

---

### 4.5 Malca-Amit

**Entity:** Malca-Amit Global Ltd — privately held precious metals, diamonds, and valuables logistics and vault specialist.
**Headquarters:** Tel Aviv, Israel (global operational network).
**Axiom Protocol relationship:** None.

#### D1 — Physical silver custody capability

Score: **4 — Exceeds**

Malca-Amit is a precious metals specialist. Unlike Brink's and Loomis, whose precious metals divisions are part of a broader security services business, Malca-Amit's core business is precious metals and high-value goods. Physical silver in LBMA Good Delivery form is a central product offering, not an extension. Malca-Amit operates LBMA-accredited vaults in London, Geneva, Hong Kong, Singapore, and New York.

Source: Malca-Amit institutional custody documentation (public); LBMA Good Delivery List (public).

#### D2 — LBMA / accredited vault status

Score: **4 — Exceeds**

Malca-Amit is listed on the LBMA's approved vault operators list. Multiple vault locations hold LBMA-accredited status for precious metals including silver.

Source: LBMA Good Delivery List (public).

#### D3 — Allocated storage support

Score: **4 — Exceeds**

Allocated storage at bar-serial-number level is a core operational practice for Malca-Amit's institutional precious metals custody service. The company's systems are built specifically for tracking individual bars by serial number, refiner, assay certificate, and weight.

#### D4 — Segregation model

Score: **3 — Meets**

Standard LBMA precious metals custody practice: client assets in allocated accounts are off-balance-sheet and not available to Malca-Amit's creditors in insolvency. As a privately held company, the legal framework for insolvency remoteness depends on the jurisdiction of the specific custody entity.

Gap: As a private company, Malca-Amit's balance sheet and financial condition are not publicly disclosed. The insolvency-remote analysis for a private custodian requires more specific legal review than for a publicly regulated bank or trust company.

Open question: OQ-09 — See Section 8.

#### D5 — Proof-of-reserves / audit support

Score: **2 — Partial**

Malca-Amit provides attestation reports to institutional clients on request. There is no known standing PoR program or cryptographically signed attestation product. Independent audit access is available with reasonable notice. A bespoke attestation arrangement (monthly, signed by an independent auditor appointed by Axiom Protocol) is feasible.

Gap: No standing attestation program. Monthly cadence with cryptographic signing would require bespoke contractual arrangement and possible technology work.

Open question: OQ-10 — See Section 8.

#### D6 — Insurance / chain-of-custody indicators

Score: **4 — Exceeds**

Malca-Amit carries specialized precious metals insurance from Lloyd's of London syndicates — arguably the most relevant insurer class for physical commodity custody risk. In-transit coverage is comprehensive given the company's logistics focus. Assay documentation accompanies all bars. Chain-of-custody tracking is a core competency.

Source: Malca-Amit institutional documentation references Lloyd's coverage (public trade documentation).

#### D7 — Digital integration ability

Score: **1 — Gap**

No known blockchain integration product. Malca-Amit does not issue tokens and has no on-chain reporting capability. A machine-readable PoR feed would require full bespoke development. This is the most significant gap for Malca-Amit relative to BitGo and Anchorage.

Open question: OQ-11 — See Section 8.

#### D8 — Regulatory posture

Score: **2 — Partial**

Malca-Amit is regulated in each operating jurisdiction and holds LBMA member status. It is not a trust company, bank, or qualified custodian. As a private company, its regulatory standing is lower on formal legal certainty than BitGo or Anchorage, but its precious metals operational standing (LBMA membership, Lloyd's insurance) is higher than any other candidate in the set.

Gap: Private company; no public financial disclosures; regulatory standing depends on operating jurisdiction of specific custody entity; no qualified custodian designation.

#### D9 — Path classification

**Path B** — physical custody + periodic PoR via appointed independent auditor. Digital integration gap prevents Path A without a regulated issuer layer partner.
**Path A enabler** — could serve as physical sub-custodian to a BitGo or Anchorage issuer layer, given its superior physical silver capability.

#### D10 — Overall feasibility

**HIGH** for Path B. Malca-Amit's physical silver capability is the strongest in the candidate set, particularly for a silver-specialist use case. The digital integration gap is addressable for Path B (attestation is contractual, not technical). Path A would require pairing with a regulated issuer.

| Dimension | Score | Notes                                                             |
| :-------: | :---: | ----------------------------------------------------------------- |
| D1        |   4   | Precious metals specialist; silver is core product               |
| D2        |   4   | Multiple LBMA-accredited vaults including London and Geneva      |
| D3        |   4   | Bar-serial-number allocated storage is operational core          |
| D4        |   3   | Off-balance-sheet; private company; legal basis needs review     |
| D5        |   2   | Attestation on request; no standing program; bespoke required    |
| D6        |   4   | Lloyd's coverage; strongest insurance profile in candidate set   |
| D7        |   1   | No digital integration; full bespoke build required              |
| D8        |   2   | LBMA member; regulated; private; not a qualified custodian       |
| D9        |   —   | Path B primary; Path A enabler (sub-custodian to issuer layer)   |
| D10       |   —   | **HIGH** — strongest physical; weakest digital                   |

---

### 4.6 Via Mat International

**Entity:** Via Mat International — a division of Loomis AB, specializing in precious metals and valuables transport and vault services in Switzerland and Singapore.
**Headquarters:** Zurich, Switzerland.
**Axiom Protocol relationship:** None. Parent relationship: Loomis AB (same parent as Candidate 2).

#### D1 — Physical silver custody capability

Score: **3 — Meets**

Via Mat provides precious metals vault and transport services from its Zurich and London locations. Physical silver in LBMA Good Delivery form is a standard product. Via Mat's operations are somewhat smaller in scale than Brink's or Malca-Amit's global network but are well-established in the Swiss and Singapore institutional market.

Source: Via Mat institutional documentation (public); LBMA Good Delivery List (public).

#### D2 — LBMA / accredited vault status

Score: **4 — Exceeds**

Via Mat's Zurich vault is LBMA-accredited. London vault operations also meet LBMA Good Delivery standards.

Source: LBMA Good Delivery List (public).

#### D3 — Allocated storage support

Score: **3 — Meets**

Allocated storage is standard practice. Bar-serial-number tracking is part of the operational model for institutional precious metals clients.

Gap: Specific reporting format and client access mechanisms must be confirmed in the RFP response.

#### D4 — Segregation model

Score: **3 — Meets**

Standard LBMA precious metals custody: allocated client assets are off-balance-sheet. Swiss legal framework provides strong asset protection for allocated custody agreements — arguably stronger than U.S. or UK equivalents for precious metals under Swiss property law.

Note: Swiss jurisdiction benefit is a differentiator. Swiss law for allocated precious metals custody has a long established tradition; asset segregation in Swiss vaults is well-precedented.

#### D5 — Proof-of-reserves / audit support

Score: **2 — Partial**

Via Mat provides attestation via the Loomis network. No standalone on-chain PoR product. Monthly attestation with an independent auditor is achievable contractually.

Open question: OQ-12 — See Section 8.

#### D6 — Insurance / chain-of-custody indicators

Score: **3 — Meets**

Standard precious metals insurance via the Loomis group. Assay documentation accompanies bars. Chain-of-custody follows LBMA norms.

Gap: Insurance specifics and whether coverage is provided at the Loomis group level or via Mat entity must be confirmed.

#### D7 — Digital integration ability

Score: **1 — Gap**

No known digital integration. Shares Loomis's limitation on this dimension. A signed API or PoR feed would require full bespoke development.

Open question: OQ-13 — See Section 8.

#### D8 — Regulatory posture

Score: **3 — Meets**

Via Mat operates within the Loomis AB group's regulatory framework. Swiss FINMA oversight context. UK FCA oversight context for London operations. No known enforcement history.

Gap: Not a trust company or bank; no qualified custodian status. Same limitation as Brink's and Loomis.

#### D9 — Path classification

**Path B** — physical custody + independent auditor attestation. No digital integration capability for Path A.

**Note on Loomis parent relationship:** Via Mat and Loomis (Candidate 2) share a parent. Axiom Protocol should determine whether engaging both would be redundant or whether the Loomis group could offer a combined solution. RFP responses should be requested from both entities independently; the Treasury Lead should evaluate whether a Loomis group solution (combining Via Mat's Zurich presence and Loomis's London presence) would be preferable to selecting either individually.

#### D10 — Overall feasibility

**MEDIUM** — solid physical capability with a Zurich jurisdiction advantage; limited digital integration; redundant with Loomis at the group level.

| Dimension | Score | Notes                                                             |
| :-------: | :---: | ----------------------------------------------------------------- |
| D1        |   3   | Physical silver meets standard; smaller global network           |
| D2        |   4   | Zurich and London LBMA accreditation                             |
| D3        |   3   | Allocated storage standard; reporting format pending             |
| D4        |   3   | Swiss law advantage; off-balance-sheet; off-parent-estate        |
| D5        |   2   | Attestation via Loomis network; no on-chain PoR                  |
| D6        |   3   | Standard insurance via Loomis group; specifics pending           |
| D7        |   1   | No digital integration capability                                |
| D8        |   3   | Swiss and UK regulated; Loomis group structure                   |
| D9        |   —   | Path B only                                                      |
| D10       |   —   | **MEDIUM** — Zurich advantage; Loomis group redundancy concern   |

---

## 5. Comparative Scoring Matrix

Scores are based on public information available as of 2026-05-01, prior to formal RFP responses.
PND = Pending formal RFP response.
Weighted score = sum of (dimension score × dimension weight) for D1–D8 only (D9 and D10 are derived).

| Dimension              | Weight | Brink's | Loomis | BitGo | Anchorage | Malca-Amit | Via Mat |
| ---------------------- | :----: | :-----: | :----: | :---: | :-------: | :--------: | :-----: |
| D1 Physical silver     |  20%   |    4    |    4   |   1   |     1     |     4      |    3    |
| D2 LBMA vault          |  10%   |    4    |    4   |   1   |     1     |     4      |    4    |
| D3 Allocated storage   |  10%   |    4    |    3   |   3   |     3     |     4      |    3    |
| D4 Segregation         |  15%   |    3    |    3   |   4   |     4     |     3      |    3    |
| D5 PoR / audit         |  15%   |    3    |    2   |   3   |     3     |     2      |    2    |
| D6 Insurance / CoC     |  10%   |    3    |    3   |   3   |     3     |     4      |    3    |
| D7 Digital integration |  10%   |    2    |    1   |   4   |     4     |     1      |    1    |
| D8 Regulatory posture  |  10%   |    3    |    3   |   4   |     4     |     2      |    3    |
| **Weighted score**     |        |**3.25** |**2.95**|**2.75**|**2.75**|**2.90**   |**2.70** |
| Feasibility            |        |  HIGH   |  HIGH  |MEDIUM |  MEDIUM   |    HIGH    | MEDIUM  |
| Best path              |        |    B    |   B    |  A/B  |    A/B    |     B      |    B    |

Note: Weighted scores are based on version 1.0 (public information only). Scores in specific dimensions (particularly D5 and D7) may shift significantly once formal RFP responses are received, particularly for attestation capability and digital integration willingness.

---

## 6. Gap Analysis vs AXAU / PAXG Standard

The AXAU / PAXG standard is: Paxos Trust (NY chartered) + Brink's London vault + monthly attestation + ERC-20 receipt token with direct redemption right.

| Gap dimension                            | AXAU / PAXG position                    | AXAG gap status                                                                                              |
| ---------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| On-chain redeemable receipt token (ERC-20)| PAXG ERC-20 issued by Paxos Trust      | No silver equivalent exists. Only Path A dual-layer (BitGo or Anchorage + physical sub-custodian) could close this gap. Timeline: uncertain. |
| Regulated trust or bank at token level   | Paxos Trust Company (NY charter)       | BitGo (SD trust, score 4) and Anchorage (OCC bank, score 4) match or exceed Paxos regulatory standing. Both have physical gap. |
| LBMA Good Delivery vault (accredited)    | Brink's London (LBMA-accredited)       | Brink's, Loomis, Malca-Amit, Via Mat all have LBMA vault accreditation. This gap is closeable for Path B. |
| Allocated serial-number storage          | Bar-serial-number at Brink's London    | Brink's, Malca-Amit, and Via Mat all score 3+ on this dimension. Gap is closeable. |
| Monthly independent signed attestation  | Paxos publishes monthly                | All candidates can provide periodic attestation contractually; monthly cadence with cryptographic signing requires bespoke arrangement for all physical vault candidates. |
| On-chain PoR API or feed               | Paxos on-chain attestation via Chainlink| Only BitGo and Anchorage have existing digital PoR infrastructure. Physical candidates require bespoke build. |
| In-vault title transfer at T+0 or T+1  | PAXG: in-vault title transfer T+0     | Brink's and Malca-Amit have demonstrated in-vault title transfer capability. SLA must be confirmed contractually. |
| Insurance by rated insurer             | Lloyd's coverage via Brink's           | Brink's: institutional insurance (specific terms pending). Malca-Amit: Lloyd's coverage (strongest). Loomis/Via Mat: standard group insurance. |

Summary of gaps by path:
- **Path B gap to close:** Attestation cadence (contractual), digital PoR or signed attestation (bespoke build or appointed auditor). All physical candidates can close this gap.
- **Path A gap to close:** Physical silver vault capability (sub-custodian), silver trust product development (new), PoR integration between digital and physical layers (new). Only BitGo or Anchorage can lead this; physical sub-custodian required.

---

## 7. Path Classification Summary

| Candidate   | Primary path | Secondary path     | Sub-custodian potential | Path A timeline |
| ----------- | :----------: | :----------------: | :---------------------: | :-------------: |
| Brink's     |      B       | A enabler          |          Yes            |  Via issuer only |
| Loomis      |      B       | —                  |          Yes            |  Not viable alone |
| BitGo       |    A / B     | B standalone       |          No             |  Requires build  |
| Anchorage   |    A / B     | B (underutilizes)  |          No             |  Longer timeline |
| Malca-Amit  |      B       | A enabler          |          Yes            |  Via issuer only |
| Via Mat     |      B       | —                  |          Yes            |  Not viable alone |

**Most likely C-03 outcome:** Path B with Brink's, Loomis, or Malca-Amit as primary custodian. Path A remains aspirational pending BitGo or Anchorage product development confirmation.

**Optimal long-term structure:** BitGo Trust (issuer/trust layer) + Malca-Amit or Brink's (physical vault layer) — Path A dual-layer. This structure would match the AXAU/PAXG reference model with a bespoke silver implementation. Timeline and feasibility depend on BitGo's product appetite, which is the subject of OQ-06.

---

## 8. Open Questions Register

All open questions must be resolved via formal RFP response before C-02 can close. Questions are addressed to the identified candidate.

| OQ ID | Candidate   | Question                                                                                                                           | Dimension | C-02 gate? |
| ----- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- | :-------: | :--------: |
| OQ-01 | Brink's     | Can Brink's provide a signed, machine-readable PoR feed for silver independently (without an issuer like Paxos), or only via an issuer layer? What format and cadence? | D5, D7 | Yes |
| OQ-02 | Brink's     | What is the name of Brink's insurer for allocated precious metals in storage? What is the coverage limit and does it cover mysterious disappearance and in-transit for silver specifically? | D6 | Yes |
| OQ-03 | Brink's     | Is Brink's willing to develop or enable a cryptographically signed monthly silver PoR API for a new institutional client, without an issuer intermediary? What is the development timeline and cost? | D7 | Yes |
| OQ-04 | Loomis      | What is Loomis's existing attestation program for precious metals clients? Who is the appointed auditor? What is the maximum achievable attestation cadence? | D5 | Yes |
| OQ-05 | Loomis      | Does Loomis have any API or data feed capability for precious metals inventory reporting? If not, what is the timeline and cost to develop a cryptographically signed monthly PoR output? | D7 | Yes |
| OQ-06 | BitGo       | Is BitGo willing to develop a silver trust product — specifically, to issue an on-chain receipt token backed by physical silver held by a physical sub-custodian (e.g., Brink's or Malca-Amit)? If so, what is the product development timeline and required minimum asset size? | D1, D9 | Yes |
| OQ-07 | BitGo       | Can BitGo's existing PoR tooling integrate with a physical vault sub-custodian's inventory data? What is the technical integration path and how would cryptographic attestation of physical bars work? | D5 | Yes |
| OQ-08 | Anchorage   | Has Anchorage received OCC guidance or internal legal advice on whether a federally chartered bank may provide custody of physical silver and issue a receipt instrument against it? What is the regulatory risk posture? | D8 | Yes |
| OQ-09 | Malca-Amit  | What is the legal entity and jurisdiction of the Malca-Amit entity that would be party to the custody agreement? Is this entity subject to external audit? What is the insolvency-remote mechanism? | D4, D8 | Yes |
| OQ-10 | Malca-Amit  | What is the maximum attestation cadence Malca-Amit can support? Is Malca-Amit willing to commit to monthly signed attestation by an independent auditor appointed by Axiom Protocol, including unannounced inspection rights? | D5 | Yes |
| OQ-11 | Malca-Amit  | Does Malca-Amit have any existing data API for inventory reporting? What would be required to produce a machine-readable, cryptographically signed monthly PoR output? | D7 | Yes |
| OQ-12 | Via Mat     | What is Via Mat's relationship with Loomis AB for attestation purposes? Is Via Mat's attestation program separate from Loomis's or consolidated? What auditor is used? | D5 | Yes |
| OQ-13 | Via Mat     | Does Via Mat have any digital integration roadmap — API, data feed, or blockchain integration? If not, what is the estimated cost and timeline? | D7 | Yes |
| OQ-14 | All         | Provide a fee schedule per RFP Section 5.4: storage fee (per troy oz or AUM%), inbound transaction fee, outbound transaction fee, attestation fee, and setup fee. | D10 | Yes |
| OQ-15 | All         | Confirm whether the candidate has been subject to any regulatory enforcement action, license revocation, or material legal proceeding in the past 5 years. | D8 | Yes |
| OQ-16 | BitGo/Anch  | If a dual-layer structure (regulated issuer + physical sub-custodian) is used, which physical vault operator would you recommend as a sub-custodian, and do you have existing relationships with Brink's, Loomis, or Malca-Amit? | D1, D9 | Yes |

---

## 9. C-03 Precondition Checklist

C-03 (custodian selection) may not advance until all of the following preconditions are satisfied. This section is the formal C-03 gate that must be confirmed before the tracker item advances.

| Precondition | Description                                                                                  | Status         |
| :----------: | -------------------------------------------------------------------------------------------- | :------------: |
| PRE-01       | Formal RFP responses received from at least three candidates                                 | NOT MET        |
| PRE-02       | At least one candidate satisfies all seven Minimum Custody Standards (MC-01 through MC-07)   | NOT MET        |
| PRE-03       | Evaluation matrix updated to version 2.0 with scored formal RFP responses                   | NOT MET        |
| PRE-04       | At least one candidate confirmed as Path B viable (or Path A if confirmed available)         | NOT MET        |
| PRE-05       | Open questions OQ-01 through OQ-16 addressed for each responding candidate                  | NOT MET        |
| PRE-06       | Feasibility ratings updated to reflect formal response content, not public-information basis | NOT MET        |
| PRE-07       | Treasury Lead and Compliance Lead have reviewed the updated evaluation matrix               | NOT MET        |
| PRE-08       | Governance steward informed that C-03 selection is being prepared                           | NOT MET        |

All eight preconditions must be met before C-03 may advance from ASSIGNED to IN PROGRESS.

---

## Evidence artifact linkage

| Tracker item | Status      | This document's role                                              |
| ------------ | :---------: | ----------------------------------------------------------------- |
| C-01         | CLOSED      | AXAG_CUSTODY_RFP.md                                              |
| C-02         | IN PROGRESS | This document (evaluation matrix) supplements AXAG_CUSTODY_SHORTLIST.md |
| C-03         | ASSIGNED    | C-03 precondition checklist (Section 9) gates C-03 advancement  |

AXAG IS NOT LIVE AND IS NOT APPROVED FOR DEPLOYMENT. This matrix does not constitute selection of any custodian, execution of any agreement, or authorization to hold any silver reserves on behalf of Axiom Protocol.

---

End of evaluation matrix.
