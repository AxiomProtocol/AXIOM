# AXIOM SUI PHASE 8 — AUTHORIZATION PACKAGE

**Document type:** Multi-party authorization package for Phase 9 promotion  
**Scope:** Axiom Sui Community Distribution Layer  
**Date:** 2026-05-15  
**Status:** UNSIGNED — Awaiting signatures from Engineering Lead, Operations Lead, Legal/Compliance  
**Classification:** Internal / Operator

---

> **COMMUNITY DISTRIBUTION ONLY.** Authorization of this package permits
> deployment of the Axiom Sui community rewards layer to Sui Mainnet.
> This package does NOT authorize movement of AXUSD, AXAU, AXM, SEED, KAG,
> fiat funds, or any canonical Axiom Protocol assets.

---

## 1. Authorization Purpose

This package authorizes the following actions in aggregate:

1. **Phase 9 Sui Mainnet Deployment** — publish the `axiom_sui` Move package to Sui Mainnet as a frozen package (no upgrade authority retained)
2. **Campaign Initialization** — create a `ClaimCampaign` shared object with the Phase 9 eligibility Merkle root
3. **Campaign Activation** — call `activate()` to open claims to eligible addresses
4. **GuardedTreasury Deployment** — initialize the `AXIOM_TEST_CLAIM` (ATC) coin with a MAX_SUPPLY of 1,000,000,000 ATC

This authorization package replaces any prior informal approvals and constitutes the binding authorization record for Phase 9.

---

## 2. Technical Specification

### Package Identity

| Parameter | Value |
|-----------|-------|
| Package name | `axiom_sui` |
| Version | `0.8.0` |
| Edition | `2024.beta` |
| Sui framework rev | `testnet-v1.72.1` |
| Deployment network | Sui Mainnet |
| Freeze intent | Frozen — no UpgradeCap retained |
| Testnet reference | `0x4c3b1501e9567e237186766ccaa5137289dd683a044ce6b83e12459ff7c46602` |

### Coin Parameters (ATC)

| Parameter | Value |
|-----------|-------|
| Symbol | ATC |
| Name | AXIOM TEST CLAIM |
| Decimals | 6 |
| MAX_SUPPLY (base units) | 1,000,000,000,000,000 |
| MAX_SUPPLY (display) | 1,000,000,000 ATC |
| Monetary value | NONE — community rewards only |
| Reserve backing | NONE |
| Redeemability | NONE |

### Campaign Parameters

| Parameter | Value |
|-----------|-------|
| Amount per claim | 1,000,000 base units (1 ATC) |
| Expiry | 0 (no expiry) |
| Initial state | Inactive (requires explicit `activate()`) |
| Merkle root | To be set from Phase 9 eligibility manifest |

---

## 3. Risk Acknowledgments

By signing this package, each authorizing party acknowledges:

1. **No monetary value.** The ATC token has no monetary value, no reserve backing, and is not redeemable for any asset.

2. **Community distribution only.** Distribution is limited to addresses in the eligibility list. No guarantee of value accrual is made or implied.

3. **Frozen package.** Once deployed, the package cannot be upgraded. Any bug in the deployed contracts requires a new deployment with a new authorization package.

4. **AdminCap custody.** The AdminCap will be held according to the 2-of-3 co-authorization protocol documented in `AXIOM_SUI_PHASE8_KEY_MANAGEMENT.md`. Any AdminCap transfer requires renewed authorization.

5. **External audit pending.** No formal external Move security audit has been conducted. This package authorizes Phase 9 **staging and limited distribution** only, not a broad public launch. An external audit is required before any broad public distribution.

6. **Sui network risk.** Sui Mainnet operations are subject to network risks, including validator failures, forks, and protocol upgrades outside Axiom's control.

7. **No securities offering.** Distribution of ATC does not constitute a securities offering, token sale, or investment contract. ATC has no monetary value and confers no ownership rights.

---

## 4. Authorization Scope Exclusions

This package explicitly does **NOT** authorize:

- Movement of AXUSD, AXAU, AXM, SEED, or KAG
- Fiat currency transactions of any kind
- ACH, wire, or bank account operations
- Any change to the Axiom EVM contracts (Arbitrum One)
- Any change to the Axiom banking or settlement infrastructure
- Broad public distribution without an external security audit
- Retention of an UpgradeCap after package publication

---

## 5. Signatories

This authorization package requires signatures from all three parties before Phase 9 deployment proceeds.

---

### Signature Block A — Engineering Lead

```
Name:           ________________________________
Title:          Engineering Lead, Axiom Protocol
Date:           ________________________________

I confirm that:
- I have reviewed the technical specification in Section 2.
- I have reviewed the risk acknowledgments in Section 3.
- The Move contract code in move/axiom_sui/sources/ matches the
  specification in this authorization package.
- The test suite (28 tests) passes in a Sui CLI environment.
- I accept co-authorization responsibility under the key management
  protocol in AXIOM_SUI_PHASE8_KEY_MANAGEMENT.md.

Signature:      ________________________________
Sui Address:    ________________________________
```

---

### Signature Block B — Operations Lead

```
Name:           ________________________________
Title:          Operations Lead, Axiom Protocol
Date:           ________________________________

I confirm that:
- I have reviewed the campaign parameters in Section 2.
- I have reviewed the risk acknowledgments in Section 3.
- I understand that ATC has no monetary value and the distribution
  is a community rewards program only.
- I accept co-authorization responsibility under the key management
  protocol in AXIOM_SUI_PHASE8_KEY_MANAGEMENT.md.

Signature:      ________________________________
Sui Address:    ________________________________
```

---

### Signature Block C — Legal / Compliance

```
Name:           ________________________________
Title:          Legal / Compliance, Axiom Protocol
Date:           ________________________________

I confirm that:
- I have reviewed the authorization scope in Sections 1 and 4.
- I have reviewed the risk acknowledgments in Section 3.
- Distribution of ATC as described in this package is consistent
  with Axiom Protocol's community distribution policies.
- No securities law opinion is expressed by this signature; legal
  counsel review is noted separately.

Signature:      ________________________________
```

---

## 6. Post-Deployment Verification Checklist

After Phase 9 deployment, the Engineering Lead must complete and file:

- [ ] Package ID recorded in `lib/sui/client.ts` and `lib/sui/campaignRegistry.ts`
- [ ] Publish transaction hash recorded and on-chain events verified
- [ ] `UpgradeCap` confirmed absent (query Sui explorer)
- [ ] `ClaimCampaign` shared object ID recorded
- [ ] Merkle root on-chain matches the Phase 9 eligibility manifest hash
- [ ] `AdminCap` object ID recorded; custody confirmed under Key Management protocol
- [ ] `activate()` called only after Operations Lead co-authorization
- [ ] At least one end-to-end claim verified on Mainnet before broad announcement
- [ ] Operator dashboard (`/operator/chains/sui-phase8`) updated with Phase 9 data

---

## 7. Document Control

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 0.8.0 | 2026-05-15 | Engineering Lead | Initial draft |

This document is effective upon signature by all three parties listed in Section 5. Prior informal approvals are superseded by this package.

---

*Axiom Protocol — Internal Operator Document — Phase 8 Staging*  
*Generated: 2026-05-15 — Not legal advice — Community distribution only*
