# AXIOM SUI — PHASE 7 ASSET POLICY
# Sui Chain Asset Boundary Document

Document type:  Policy
Phase:          7 — Mainnet Design + Hardening + Authorization
Chain:          Sui (non-EVM, Move VM)
Date:           2026-05-15
Classification: INTERNAL — operations policy
Status:         RATIFIED — Clarence Fuqua 2026-05-15

---

## Purpose

This document defines the explicit and binding asset policy for the
Axiom Protocol Sui integration. It establishes:

1. Which asset types are permitted on Sui without additional approval
2. Which asset types are forbidden without explicit written exception
3. The relationship between Sui assets and the canonical Arbitrum One assets
4. The approval process for any exception to this policy
5. The rationale for each boundary

This policy applies to all Phase 7 and future work on Sui. It supersedes
any prior informal understanding of asset boundaries for the Sui chain.

---

## Section 1 — Canonical Asset Boundary

Arbitrum One is the canonical execution, issuance, and reserve chain
for all Axiom Protocol financial instruments.

The canonical Axiom assets and their authoritative deployments are:

| Asset | Type | Chain | Role |
|---|---|---|---|
| AXUSD | ERC-3643 stablecoin | Arbitrum One | Settlement, payments, reserve |
| AXAU | ERC-20 reserve instrument | Arbitrum One | Gold reserve, minting/redemption |
| AXM | ERC-20 governance token | Arbitrum One | Protocol governance |
| SEED | Reserve instrument | Arbitrum One | Seed allocation instrument |
| KAG | ERC-20 reserve instrument | Arbitrum One | Silver reserve |

None of these assets exist on Sui. None of these assets may be issued,
mirrored, represented, or referenced on Sui without a separate written
authorization signed by Engineering Lead, Operations Lead, Legal Counsel,
and the Axiom Board of Directors.

This policy is absolute. No operational exception exists below the level
of a Board-authorized multi-signatory document.

---

## Section 2 — Permitted Asset Types on Sui

The following asset types are permitted on Sui without additional approval
beyond the Phase 7 authorization:

### 2.1 Test Tokens

- Tokens with no monetary value, no backing, no redemption rights
- Used exclusively for testnet prototype validation
- Must be clearly labeled as testnet-only in the coin definition
- Must not share a name, symbol, or ticker with any canonical Axiom asset
- Example: AXIOM_TEST_CLAIM (Phase 6 prototype)

Permitted: YES
Additional approval required: NO (covered by phase authorization)

### 2.2 Community Reward Artifacts

- Non-transferable or limited-transferable achievement tokens
- Participation badges, governance participation records
- Community contribution receipts
- No monetary value, no redemption rights, no yield
- Must be clearly defined as non-financial in the coin/NFT definition

Permitted: YES (conditional)
Additional approval required: YES — Operations Lead sign-off per campaign
before any community reward program is launched.

### 2.3 Non-Financial Claim Assets

- Tokens distributed via claim campaign for community or protocol purposes
- Must have no monetary value
- Must carry no redemption right for any canonical Axiom asset
- Must carry no governance rights over canonical Axiom Protocol systems
- Must not be marketed as a financial instrument

Permitted: YES (conditional)
Additional approval required: YES — Engineering Lead + Operations Lead
per campaign before launch.

---

## Section 3 — Forbidden Asset Types Without Exception Approval

The following asset types are FORBIDDEN on Sui without a separate
written exception document signed by all required parties as defined
in Section 5.

### 3.1 Canonical Asset Mirrors or Representations

| Forbidden Action | Reason |
|---|---|
| Issue AXUSD on Sui | Canonical to Arbitrum One; multi-chain issuance changes reserve mechanics |
| Issue AXAU on Sui | Canonical to Arbitrum One; reserve backing is chain-specific |
| Issue AXM on Sui | Governance token; dual issuance creates governance attack surface |
| Issue SEED on Sui | Reserve allocation; off-chain backing requires chain-specific custody |
| Issue KAG on Sui | Silver reserve; same rationale as AXAU |
| Issue any "wrapped" version of canonical assets | Bridging without bridge audit creates loss risk |

### 3.2 Reserve-Backed Tokens

Any token whose value is claimed to be backed by:
- Gold (PAXG or physical gold)
- Silver (PAX Silver or physical silver)
- Real estate holdings
- USD or fiat currency
- Any other real-world asset

is FORBIDDEN without a Board-authorized exception.

### 3.3 Yield-Bearing Instruments

Any token that:
- Accrues interest or yield
- Entitles the holder to periodic payments
- Represents a share in a lending fund or yield pool

is FORBIDDEN without a Board-authorized exception.

### 3.4 Financial Rights Instruments

Any token that:
- Represents an ownership share
- Carries voting rights over financial decisions
- Entitles the holder to distributions from protocol revenue

is FORBIDDEN without a Board-authorized exception.

### 3.5 Redemption Instruments

Any token that:
- Can be redeemed for a canonical Axiom asset
- Can be redeemed for fiat currency
- Can be redeemed for any real-world asset

is FORBIDDEN without a Board-authorized exception.

---

## Section 4 — Policy Rationale

### 4.1 Why Sui is Distribution-Only

Sui's object model and Move VM are well-suited for distribution
mechanics (claim campaigns, community programs). Sui's native assets
do not have custody infrastructure (BitGo CaaS does not support Sui).
Sui's regulatory classification is less established than Ethereum/EVM.

Therefore, Sui is appropriate for community-layer operations with no
monetary value but inappropriate for financial instrument issuance
until:
- Custody infrastructure is available
- Regulatory guidance on Sui assets is clearer
- A bridge has been independently audited

### 4.2 Why Canonical Assets Stay on Arbitrum

Arbitrum One has:
- Established BitGo CaaS custody (AXUSD, AXAU)
- ERC-3643 KYC compliance framework (AXUSD)
- PSM stability mechanism (AXUSD)
- LandNAVOracle integration (AXAU)
- Regulatory treatment as securities/commodities precedent from EVM

Moving canonical asset issuance to Sui would require re-engineering
all of the above, plus creating a bridge (major security surface).

### 4.3 Why Multi-Chain Issuance is Forbidden by Default

Issuing the same-name token on multiple chains without a bridge creates:
- Competing issuance — total supply becomes undefined
- Reserve confusion — which chain's token is backed?
- User harm — users may hold an un-backed version
- Legal risk — different chains may have different securities classifications

---

## Section 5 — Exception Approval Process

Any exception to Section 3 (Forbidden Asset Types) requires:

Level 1 — Non-financial community asset on Sui mainnet:
  Required signatures: Engineering Lead, Operations Lead
  Documentation: Exception memo with asset definition, use case, and
                 explicit statement of no monetary value or redemption

Level 2 — Any asset touching canonical Axiom financial infrastructure:
  Required signatures: Engineering Lead, Operations Lead, Legal Counsel
  Documentation: Full asset design document, risk analysis, custody plan

Level 3 — Canonical asset mirror or bridge:
  Required signatures: Engineering Lead, Operations Lead, Legal Counsel,
                       Axiom Board of Directors
  Documentation: Complete bridge security audit, custody plan, regulatory
                 analysis, rollback plan

No exception may be granted at a lower level than specified above.
The Engineering Lead may not grant a self-exception.

---

## Section 6 — Policy Enforcement

### 6.1 Move Code Review

All Move packages intended for Sui deployment must pass a review against
this policy before deployment authorization is granted. The review must
explicitly confirm that no prohibited asset type is issued or referenced.

### 6.2 Operator Console

The Sui Phase 7 operator console (pages/operator/chains/sui-phase7.tsx)
displays the current asset policy status and a NO-GO banner confirming
no canonical asset issuance is active.

### 6.3 Environment Flag

CHAIN_SUI_ENABLED must remain false until Phase 8 is authorized.
The operator console confirms this flag state on every render.

### 6.4 Code Review Checklist

The AXIOM_SUI_MOVE_REVIEW_CHECKLIST.md Section 12 (No Canonical Asset
References) must be completed for all future Sprint reviews. All items
must be PASS before any deployment authorization is granted.

---

## Section 7 — Policy Change Control

This policy may only be modified by:

1. A written policy amendment signed by Engineering Lead and Operations Lead
2. The amendment must state explicitly what is being changed and why
3. The amendment must be stored alongside this document with a date stamp
4. The amendment must not retroactively authorize any past unauthorized action

---

## Policy Ratification

Policy author:         Clarence Fuqua (Axiom Protocol — Founder / Operator)
Engineering Lead:      Clarence Fuqua
Operations Lead:       Clarence Fuqua
Ratification date:     2026-05-15
Effective date:        2026-05-15
Document version:      1.0

---

*End of Sui Phase 7 Asset Policy*
