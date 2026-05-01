# AXAG Silver Reserve Instrument — Custody Candidate Shortlist

Document class: Custody Candidate Evaluation
Framework: Commodity Expansion Framework v1.0.0
Candidate: Axiom Silver (AXAG)
Stage: 2 — Technical Diligence / C-02
Prepared: 2026-05-01
Status: IN PROGRESS — tabulation template ready; outreach started; formal responses pending

---

## Status notice

AXAG is **not live**, **not approved for deployment**, **not minted**, and **not listed**. This shortlist is a preliminary diligence document used to evaluate potential custody counterparties against the Commodity Expansion Framework v1.0.0 standards. No custodian has been selected. C-03 (custodian selection) remains ASSIGNED and will not advance until this tabulation is complete and reviewed. Inclusion in this shortlist does not constitute engagement, selection, or any contractual relationship with any listed entity.

---

## Evaluation standard

All candidates are evaluated against the AXAU / PAXG reference standard. AXAU uses PAXG (Paxos Gold) as its reserve asset. Paxos Trust Company is a New York-regulated trust, holds LBMA Good Delivery gold bars in Brink's vaults, publishes monthly attestation data, and issues a directly redeemable on-chain ERC-20 receipt token (PAXG). This is the Path A ceiling. AXAG candidates are evaluated on how closely they match or exceed this model for silver.

### Custody path definitions (per AXAG_CUSTODY_RFP.md Section 7)

| Path | Description                                                                                           | Stage 1 score |
| ---- | ----------------------------------------------------------------------------------------------------- | :-----------: |
| A    | Regulated qualified custodian issuing a directly redeemable on-chain silver receipt token             | → score 1     |
| B    | Regulated custodian with segregated allocated account and periodic PoR; no on-chain receipt token     | → score 2     |
| C    | Exchange-grade multi-party arrangement with independent audit; no regulated custodian                 | → score 3     |

The AXAG Stage 1 score of 3 for Custody Risk was assigned because no Path A or confirmed Path B arrangement exists today. Closing C-02 through C-03 is required to move Custody Risk to ≤ 2.

---

## Candidate Shortlist

Six candidates have been identified for initial evaluation. These were selected based on market knowledge of silver vault operators, regulated custodians active in digital-asset markets, and entities with documented on-chain or proof-of-reserves capability. Outreach has been initiated.

---

### Candidate 1 — Brink's Company (Silver Vault Operations)

| Field                        | Detail                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| Entity type                  | Publicly traded security transport and vault operator (NYSE: BCO)                               |
| Headquarters                 | Richmond, Virginia, USA                                                                          |
| Vault locations              | London (LBMA-accredited), New York, Zurich, Singapore, and others                               |
| Commodity custody experience | Current custody provider for Paxos (PAXG gold); extensive precious metals vault history          |
| Silver capability            | Brink's vaults hold silver for institutional clients; LBMA Good Delivery silver accepted         |
| Regulatory standing          | Regulated in each operating jurisdiction; subject to SOC 2 audits                               |
| Proof-of-reserves capability | Provides attestation data to Paxos for PAXG. Direct silver PoR feed: not confirmed              |
| On-chain receipt token       | Does not issue tokens directly; provides underlying custody for issuer-layer entities            |
| Path classification          | Path B (Brink's as vault; requires separate issuer or attestation layer) or Path A enabler if Paxos or equivalent launches silver token |
| Insolvency remoteness        | Allocated storage; client assets are off Brink's balance sheet                                   |
| Silver experience            | Confirmed: holds allocated silver for institutional clients                                       |
| Preliminary feasibility      | **HIGH** — strongest existing operational reference (PAXG custody analogy); silver capability confirmed |
| Gaps vs AXAU/PAXG standard  | No on-chain silver receipt token issued directly by Brink's. Path A requires a Paxos-equivalent issuer on top of Brink's custody. Path B is achievable via Brink's directly with an independent attestation arrangement. |
| Key open question            | Can Brink's provide a signed, machine-readable PoR feed for silver independently, or only via an issuer like Paxos? |
| Outreach status              | Initiated                                                                                        |

---

### Candidate 2 — Loomis International (Vault and Transport)

| Field                        | Detail                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| Entity type                  | Privately held security transport and vault operator                                            |
| Headquarters                 | Stockholm, Sweden                                                                                |
| Vault locations              | London (LBMA-accredited), Zurich, Stockholm, and others                                         |
| Commodity custody experience | Precious metals vault services; active in European commodity storage market                      |
| Silver capability            | LBMA Good Delivery silver storage confirmed at London and Zurich locations                       |
| Regulatory standing          | Regulated in operating jurisdictions; SOC 2 equivalent under European standards                  |
| Proof-of-reserves capability | Provides periodic attestation on request; no known public on-chain proof-of-reserves product     |
| On-chain receipt token       | Does not issue tokens; operates as a physical custodian layer only                               |
| Path classification          | Path B (physical custody + periodic PoR via independent auditor)                                 |
| Insolvency remoteness        | Allocated storage; standard precious metals industry practice of off-balance-sheet client assets |
| Silver experience            | Confirmed: longstanding LBMA silver storage operations                                           |
| Preliminary feasibility      | **HIGH** — strong operational capability; lower digital-asset integration footprint than Brink's but fully capable for Path B |
| Gaps vs AXAU/PAXG standard  | No on-chain integration capability currently. PoR reporting requires bespoke arrangement with an auditor. No existing tokenized silver product. |
| Key open question            | Willingness to participate in a monthly attestation program with a cryptographically signed output compatible with Axiom Protocol's oracle layer. |
| Outreach status              | Initiated                                                                                        |

---

### Candidate 3 — BitGo Trust Company (Digital Asset Custody)

| Field                        | Detail                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| Entity type                  | Regulated trust company (South Dakota charter); subsidiary of BitGo Holdings                    |
| Headquarters                 | Palo Alto, California, USA                                                                       |
| Vault locations              | Digital-native custody (multi-party authorization vaults); physical commodity custody via partners |
| Commodity custody experience | Digital asset custody specialist; physical silver custody not a native product                   |
| Silver capability            | Does not natively hold physical silver. Would require a physical vault sub-custodian arrangement  |
| Regulatory standing          | South Dakota Trust Company; qualified custodian under SEC custody rule                           |
| Proof-of-reserves capability | Strong: BitGo offers proof-of-reserves tooling for digital assets; physical commodity PoR would require integration with a vault partner |
| On-chain receipt token       | Can co-issue or support on-chain receipt token as the qualified custodian / trust layer (Path A potential if paired with a physical sub-custodian) |
| Path classification          | Path A potential (BitGo as regulated issuer layer + Brink's or Loomis as physical sub-custodian) or Path B if used as attestation and record-keeping layer only |
| Insolvency remoteness        | Trust company charter; client assets held in trust; off-balance-sheet                            |
| Silver experience            | Low for physical silver; high for digital representation of assets                               |
| Preliminary feasibility      | **MEDIUM** — strong on digital infrastructure and qualified-custodian regulatory standing; gap on physical silver operations. Most viable as a dual-layer solution (BitGo trust + Brink's/Loomis vault). |
| Gaps vs AXAU/PAXG standard  | No physical silver vault capability. Requires a sub-custodian for physical storage. Path A feasibility depends on whether BitGo is willing to structure a silver trust product analogous to PAXG. |
| Key open question            | Willingness to co-develop a silver trust product; fee structure for a dual-layer arrangement; timeline for standing up physical sub-custody integration. |
| Outreach status              | Initiated — BitGo CaaS relationship already established for AXAU |

---

### Candidate 4 — Anchorage Digital Bank (Regulated Digital Asset Bank)

| Field                        | Detail                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| Entity type                  | Federally chartered digital asset bank (OCC charter)                                            |
| Headquarters                 | San Francisco, California, USA                                                                   |
| Vault locations              | Digital-native custody; physical commodity via sub-custodian arrangement                         |
| Commodity custody experience | Digital asset custody; limited physical commodity history                                        |
| Silver capability            | No native physical silver vault capability                                                       |
| Regulatory standing          | OCC-chartered federal bank; among the highest regulatory standing available for digital asset custody in the U.S. |
| Proof-of-reserves capability | Strong on-chain and API-based reporting for digital assets; physical commodity PoR via sub-custodian |
| On-chain receipt token       | Potential Path A issuer capability as a federally regulated bank; would require product development effort |
| Path classification          | Path A potential (highest regulatory standing); physical capability gap requires sub-custodian   |
| Insolvency remoteness        | Federal bank charter; client assets protected under banking law                                  |
| Silver experience            | Low for physical silver; regulatory standing is the key differentiator                           |
| Preliminary feasibility      | **MEDIUM** — exceptional regulatory standing; significant physical silver gap. Path A structurally possible but requires product development and physical sub-custody arrangement. Timeline uncertain. |
| Gaps vs AXAU/PAXG standard  | No physical silver custody. On-chain silver receipt token would require new product development. Longer lead time than Brink's or Loomis for Path B. |
| Key open question            | Appetite for a silver trust product; sub-custody partner preference; product development timeline |
| Outreach status              | Initiated                                                                                        |

---

### Candidate 5 — Malca-Amit (Precious Metals Vault Specialist)

| Field                        | Detail                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| Entity type                  | Privately held precious metals and valuables transport and storage firm                          |
| Headquarters                 | Tel Aviv, Israel (global operations)                                                             |
| Vault locations              | London (LBMA-accredited), Geneva, Hong Kong, Singapore, New York                                |
| Commodity custody experience | Specialist in precious metals; extensive silver and gold storage for institutional clients        |
| Silver capability            | LBMA Good Delivery silver storage at multiple locations; strong operational track record          |
| Regulatory standing          | Regulated in each operating jurisdiction; LBMA member firm; no known enforcement history         |
| Proof-of-reserves capability | Provides attestation reports on request; no known on-chain integration product                   |
| On-chain receipt token       | Does not issue tokens                                                                             |
| Path classification          | Path B (physical custody + periodic PoR via independent auditor)                                 |
| Insolvency remoteness        | Allocated storage; standard LBMA precious metals custody practice                                |
| Silver experience            | **Confirmed high** — silver is a core product for Malca-Amit, not an extension of a gold service |
| Preliminary feasibility      | **HIGH** — operational silver capability matches or exceeds Brink's for pure-physical Path B; lower digital-asset integration than BitGo |
| Gaps vs AXAU/PAXG standard  | No on-chain integration; no token issuance capability; digital PoR would require bespoke build. Path B is the achievable path. |
| Key open question            | Willingness to participate in a monthly cryptographically signed attestation; API or data-feed availability |
| Outreach status              | Initiated                                                                                        |

---

### Candidate 6 — Via Mat International (Precious Metals Logistics and Vault)

| Field                        | Detail                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| Entity type                  | Subsidiary of Loomis AB; specialized precious metals and valuables division                     |
| Headquarters                 | Zurich, Switzerland                                                                              |
| Vault locations              | Zurich (LBMA-accredited), London, Singapore                                                     |
| Commodity custody experience | Precious metals vault and transport; long institutional track record in Switzerland              |
| Silver capability            | LBMA Good Delivery silver storage at Zurich and London                                           |
| Regulatory standing          | Swiss and UK regulated; LBMA member                                                              |
| Proof-of-reserves capability | Provides attestation on request via the Loomis network; no dedicated on-chain product            |
| On-chain receipt token       | Does not issue tokens                                                                             |
| Path classification          | Path B                                                                                           |
| Insolvency remoteness        | Allocated storage; Swiss legal framework provides strong asset-protection precedent              |
| Silver experience            | Confirmed: silver storage is a standard product offering                                          |
| Preliminary feasibility      | **MEDIUM** — strong physical capability; Zurich jurisdiction offers favorable legal framework; lower digital integration than Brink's London operation |
| Gaps vs AXAU/PAXG standard  | No on-chain integration; attestation bespoke; digital PoR requires build. Path B achievable.     |
| Key open question            | Relationship with Loomis parent and whether that relationship enables combined capabilities; API readiness |
| Outreach status              | Initiated                                                                                        |

---

## Capability Comparison Table

| Criterion                            | Brink's | Loomis | BitGo | Anchorage | Malca-Amit | Via Mat |
| ------------------------------------ | :-----: | :----: | :---: | :-------: | :--------: | :-----: |
| Physical silver storage              |   ✓     |   ✓    |   —   |     —     |     ✓      |    ✓    |
| LBMA Good Delivery silver            |   ✓     |   ✓    |   —   |     —     |     ✓      |    ✓    |
| Allocated / segregated accounts      |   ✓     |   ✓    |   ✓   |     ✓     |     ✓      |    ✓    |
| Insolvency-remote structure          |   ✓     |   ✓    |   ✓   |     ✓     |     ✓      |    ✓    |
| Independent audit / attestation      |   ✓     |   ✓    |   ✓   |     ✓     |     ✓      |    ✓    |
| Regulated entity status              |   ✓     |   ✓    |   ✓   |     ✓     |     ✓      |    ✓    |
| Qualified custodian (trust/bank)     |   —     |   —    |   ✓   |     ✓     |     —      |    —    |
| Proof-of-reserves (periodic)         |   ✓     |   ✓    |   ✓   |     ✓     |     ✓      |    ✓    |
| Proof-of-reserves (on-chain/API)     |   —     |   —    |   ✓   |     ✓     |     —      |    —    |
| On-chain receipt token capability    |   —     |   —    | potl  |   potl    |     —      |    —    |
| Sub-custody capability               |   ✓     |   ✓    |   —   |     —     |     ✓      |    ✓    |
| Digital-asset integration track rec. |   ✓     |   —    |   ✓   |     ✓     |     —      |    —    |
| Existing Axiom Protocol relationship |   —     |   —    |   ✓   |     —     |     —      |    —    |

Legend: ✓ = confirmed available, — = not available or not confirmed, potl = potential with product development

---

## Gap Analysis vs AXAU / PAXG Standard

| Gap                                        | AXAU / PAXG position              | AXAG gap and candidates addressing it                             |
| ------------------------------------------ | --------------------------------- | ----------------------------------------------------------------- |
| On-chain redeemable receipt token          | PAXG token (ERC-20, Paxos-issued) | No silver equivalent exists. BitGo and Anchorage are the only candidates with potential Path A capability; both require new product development. |
| Regulated qualified custodian at token level | Paxos Trust Company (NY charter) | BitGo (SD trust) and Anchorage (OCC bank) match or exceed Paxos regulatory standing but lack physical silver capability natively. |
| Physical vault at LBMA standard            | Brink's London (Paxos sub-vault) | Brink's, Loomis, Malca-Amit, and Via Mat all have physical capability. |
| Monthly independent attestation            | Paxos publishes monthly           | All candidates can provide periodic attestation; monthly cadence requires contractual commitment. |
| On-chain PoR API                           | Paxos attestation data on-chain   | BitGo and Anchorage have digital PoR APIs; physical silver integration requires build. |
| Redemption at T+0 or T+1                   | PAXG: in-vault title transfer T+0 | Brink's and Malca-Amit can support in-vault title transfer; timeline depends on SLA negotiation. |

---

## Preliminary Feasibility Ratings

| Candidate   | Path   | Feasibility  | Summary                                                                            |
| ----------- | ------ | :----------: | ---------------------------------------------------------------------------------- |
| Brink's     | B      | **HIGH**     | Best physical silver operational reference; PAXG custody analogy; Path B achievable now. Path A requires a new issuer layer. |
| Loomis      | B      | **HIGH**     | Strong physical capability; lower digital footprint; Path B achievable.             |
| BitGo       | A / B  | **MEDIUM**   | Best digital-asset infrastructure; physical silver gap requires sub-custody. Path A possible with product development; strongest overall if dual-layer structure is viable. |
| Anchorage   | A / B  | **MEDIUM**   | Highest regulatory standing; physical gap; longer product timeline than BitGo.     |
| Malca-Amit  | B      | **HIGH**     | Specialist silver vault; strong physical track record; weaker digital integration. Path B achievable. |
| Via Mat     | B      | **MEDIUM**   | Solid physical capability; Zurich jurisdiction benefit; lower digital footprint.    |

---

## Custody Path Hypothesis (preliminary — see tracker Section 14)

Based on this shortlist analysis, the preliminary path assessment for AXAG custody is:

**Recommended path: Path B as primary, with active exploration of Path A dual-layer**

- **Path A (score → 1):** Requires a new qualified-custodian silver receipt token that does not currently exist. The only credible route is a BitGo Trust + physical sub-custodian (Brink's or Malca-Amit) dual-layer arrangement where BitGo issues the trust receipt and Brink's/Malca-Amit holds the physical bars. Paxos has not announced a silver equivalent of PAXG; if Paxos launches one, Path A becomes immediately available. Path A is **aspirational — not confirmed viable** on current information.

- **Path B (score → 2):** Achievable with Brink's, Loomis, or Malca-Amit as the physical custodian, with an independent auditor providing monthly signed attestation. This would close the custody remediation and move the AXAG Custody Risk score from 3 to 2. Path B is **the confirmed viable path** pending RFP responses.

- **Path C (score → 3):** Fallback only. No targeted pursuit. Would not close the Stage 1 remediation.

---

## Next steps (C-02 → C-03 inputs)

The following actions will convert this shortlist into the C-03 input once formal RFP responses are received:

1. Receive formal responses to AXAG_CUSTODY_RFP.md from all outreach targets
2. Score each response against the evaluation criteria in RFP Section 8
3. Update this document with scored results in the comparison table
4. Update the preliminary feasibility ratings based on confirmed response content
5. Identify one primary candidate and one alternate for term sheet negotiation (C-04)
6. Present recommendation to Axiom Treasury Lead for C-03 selection decision

---

## Tracker linkage

| Tracker item | Status      | This document's role                                          |
| ------------ | :---------: | ------------------------------------------------------------- |
| C-01         | CLOSED      | AXAG_CUSTODY_RFP.md is the C-01 evidence artifact            |
| C-02         | IN PROGRESS | This document is the C-02 evidence artifact (in progress)     |
| C-03         | ASSIGNED    | C-03 opens when C-02 is CLOSED with final scored responses    |

AXAG IS NOT LIVE AND IS NOT APPROVED FOR DEPLOYMENT. This shortlist does not constitute selection of any custodian, execution of any agreement, or authorization to hold any silver reserves on behalf of Axiom Protocol.

---

End of shortlist.
