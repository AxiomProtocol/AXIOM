# Whitepaper Corrections — Axiom Protocol v1.1 Delta

**Version:** 1.1  
**Date:** 2026-03-30  
**Purpose:** Records all corrections, retractions, and supersessions relative to previously published or circulated protocol descriptions.

---

## 1. Purpose

This document records every factual correction, superseded claim, or outdated reference relative to any prior version of the Axiom Protocol whitepaper, pitch materials, or technical documentation. It is the authoritative correction log for institutional due diligence review.

Corrections are categorized as:
- **RETRACTION** — claim is now known to be false and is retracted
- **SUPERSEDED** — claim was true at time of writing but has been replaced by subsequent development
- **CLARIFICATION** — language was ambiguous or misleading and is clarified here
- **STATUS UPDATE** — item's operational status has changed

---

## 2. AXUSD Token Architecture

### CORRECTION 1 — Dual-Ecosystem Model Superseded
**Category:** SUPERSEDED  
**Prior Claim:** Axiom Protocol operates two parallel AXUSD ecosystems (GENIUS and Euler) with a strict non-mixing rule. Each ecosystem has its own AXUSD token and PSM.  
**Correction:** Both legacy AXUSD tokens (`0x73585df5...` GENIUS; `0xA7907b6B...` Euler) have been deprecated. The protocol now operates a single canonical ERC-3643 Unified AXUSD at `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7`. There is no dual ecosystem. The Canonical PSM (`0xDB669bb6...`) is the sole active mint/redeem venue. Legacy PSM USDC reserves remain valid for solvency accounting until formally migrated.

### CORRECTION 2 — Legacy AXUSD Supply Not Canonical
**Category:** CLARIFICATION  
**Prior Claim:** "AXUSD total supply" referred to the aggregate of all three token generations.  
**Correction:** "AXUSD total supply" for all reporting, solvency snapshots, and coverage ratio computations refers exclusively to the ERC-3643 Unified AXUSD (`0xD6110F59...`) `totalSupply()`. Legacy token supplies are tracked separately and are not included in canonical supply or liability figures.

---

## 3. Euler Vault

### CORRECTION 3 — Euler AXUSD Vault Version
**Category:** SUPERSEDED  
**Prior Claim:** "eAXUSD-4" (at `0xe3048078...`) is the active Euler V2 lending vault for AXUSD.  
**Correction:** eAXUSD-4 has been deprecated due to a hook configuration issue that prevents new deposits (WITHDRAW_ONLY mode). The canonical active lending vault is **eAXUSD-6** at `0xacdA87801f6409bB5157BA78aF1BD9631d6609B2`, deployed via the Euler V2 EVK factory. All new lending positions use eAXUSD-6.

### CORRECTION 4 — AXM EVK Vault Added
**Category:** STATUS UPDATE  
**Prior Claim:** The only EVK vault is the AXUSD open market vault.  
**Correction:** An AXM EVK vault (eAXM-1) has been deployed at `0x8e28ffa89d168599156004db4f4d12c2af7c250e` as a supply-only collateral vault backing the AXM/AXUSD EulerSwap pool.

---

## 4. EulerSwap Pools

### CORRECTION 5 — EulerSwap AXUSD/USDC Pool Live
**Category:** STATUS UPDATE  
**Prior Claim:** EulerSwap AXUSD/USDC pool is planned.  
**Correction:** AXUSD/USDC EulerSwap pool is DEPLOYED and UNLOCKED at `0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8` (deployed 2026-03-26). LPM whitelisted at index [10].

### CORRECTION 6 — AXM/AXUSD Pool Live
**Category:** STATUS UPDATE  
**Prior Claim:** AXM/AXUSD EulerSwap pool is planned.  
**Correction:** AXM/AXUSD EulerSwap pool is DEPLOYED and SEEDED at `0x981763699D269E129a08E216b1AeC7caa376A8a8` (deployed 2026-03-28). Pool reserves: 10,000 AXM / 9,000 AXUSD, fee=0.3%, concentration=0.5.

---

## 5. Governance

### CORRECTION 7 — Governance Safe Is Active
**Category:** STATUS UPDATE  
**Prior Claim:** Governance is planned but not yet implemented.  
**Correction:** Governance Safe (3-of-5 Gnosis Safe) is live at `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d`. AXM Admin Safe is live at `0x93696b537d814Aed5875C4490143195983AED365`. Timelock Controller (24h minimum delay) is live at `0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899`. Admin role migration from Deployer EOA to these structures is in progress (Task #42).

---

## 6. Lending Fund

### CORRECTION 8 — Credit Market v7 Is Canonical
**Category:** SUPERSEDED  
**Prior Claim:** AXIOMCreditMarket and AXIOMFixedLoan addresses are at the `creditMarket` and `fixedLoanNFT` slots in `ACTIVE_CONTRACTS`.  
**Correction:** The canonical v7 CreditMarket is at `0x85074a74774568692128eE97Da661Fe49dcF5fE4` (CREDIT_MARKET_ADDRESS). The canonical v7 FixedLoan NFT is at `0x511A0cD642532585dc87e41C84f7f499a9755511` (FIXED_LOAN_NFT_ADDRESS). The `ACTIVE_CONTRACTS.creditMarket` and `ACTIVE_CONTRACTS.fixedLoanNFT` entries reference different addresses — only the exported `CREDIT_MARKET_ADDRESS` and `FIXED_LOAN_NFT_ADDRESS` constants are authoritative for v7.

---

## 7. ERC-3643 Identity System

### CORRECTION 9 — Claim Issuer Is a Contract
**Category:** CLARIFICATION  
**Prior Claim:** Claims are issued by the protocol operator (Deployer EOA).  
**Correction:** Claims are issued through the ClaimIssuer contract at `0x579A367eaDa7606edc58f43165B53D2526D1B313`. The Deployer EOA holds the issuer key that signs claim data, but all on-chain state changes are written through the ONCHAINID interface. The Deployer EOA key is used to sign claim data off-chain; the `issueClaim()` call writes the signed claim to the investor's ONCHAINID contract.

### CORRECTION 10 — Sanctions Clear Topic Has 180-Day Validity
**Category:** CLARIFICATION  
**Prior Claim:** All claims have the same validity period.  
**Correction:** Claim validity periods differ by topic: KYC_VERIFIED (Topic 1) = 365 days; ACCREDITED_INVESTOR (Topic 2) = 365 days; SANCTIONS_CLEAR (Topic 3) = 180 days. The shorter sanctions window requires semi-annual re-screening. See `docs/claim-topic-registry.md`.

---

## 8. GENIUS Act References

### CORRECTION 11 — GENIUS Act Language Standardization
**Category:** CLARIFICATION  
**Prior Claim (in various documents):** "AXUSD is GENIUS Act compliant."  
**Correction:** All materials must use the formulation: "designed to align with the GENIUS Act (Public Law 119-27)." No external regulatory body has confirmed compliance. Compliance posture is under ongoing legal evaluation. External attestation is pending. The word "compliant" must not be used without an explicit legal opinion from qualified counsel.

---

## 9. Operational Status Corrections

### CORRECTION 12 — Canonical PSM Is Configured-Inactive at Deployment
**Category:** CLARIFICATION  
**Prior Claim:** Canonical PSM is Live at deployment.  
**Correction:** The Canonical PSM requires two additional Governance Safe transactions before it can process volume: (1) `axusd.addAgent(CANONICAL_PSM)` to grant mint/burn authority, and (2) `LendingPlatformModule.addPlatform(AXUSD, CANONICAL_PSM)` to whitelist the PSM in the compliance module. Until executed, the PSM status is `Configured-Inactive`. See `docs/reserve-methodology.md` §11.

### CORRECTION 13 — eAXUSD-4 Is WITHDRAW_ONLY
**Category:** RETRACTION  
**Prior Claim:** eAXUSD-4 accepts deposits.  
**Correction:** eAXUSD-4 (`0xe3048078...`) has a hook configuration issue that prevents new deposits. It is permanently in WITHDRAW_ONLY mode. No new deposits should be directed to this vault. Existing depositors may withdraw. This vault is deprecated.

---

## 10. Oracle

### CORRECTION 14 — ERC-7726 Oracle Is Deployed
**Category:** STATUS UPDATE  
**Prior Claim:** ERC-7726 Oracle Adapter is pending deployment.  
**Correction:** AXIOMOracleAdapter v2 is deployed at `0xc894d1500CB1FBf8F045e87bd357A51345197c4e` on Arbitrum One and is baked into the eAXUSD-6 EVK vault as its immutable oracle.

---

## 11. Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-01-11 | Original whitepaper / protocol launch |
| 1.1 | 2026-03-30 | ERC-3643 migration complete; corrections 1–14 applied |

---

*Document produced by Axiom Protocol. Last updated: 2026-03-30.*
