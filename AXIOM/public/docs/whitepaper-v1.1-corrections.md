# Whitepaper Corrections — Axiom Protocol v1.1 Delta

**Version:** 1.1  
**Date:** 2026-03-30  
**Purpose:** Records all corrections, retractions, and supersessions relative to previously published or circulated protocol descriptions.

---

## 1. Purpose

This document records every factual correction, superseded claim, or outdated reference relative to any prior version of the Axiom Protocol whitepaper, pitch materials, or technical documentation. It is the authoritative correction log for institutional due diligence review.

Each correction entry uses the following structure:
- **Section Reference** — the whitepaper section and heading where the prior text appeared
- **Category** — RETRACTION | SUPERSEDED | CLARIFICATION | STATUS UPDATE
- **Prior Text** — the exact prior language or claim
- **Corrected Text** — the replacement language that supersedes it
- **Effective Date** — when the correction takes effect

Corrections are categorized as:
- **RETRACTION** — claim is now known to be false and is retracted without replacement
- **SUPERSEDED** — claim was true at time of writing but has been replaced by subsequent development
- **CLARIFICATION** — language was ambiguous or misleading and is clarified here
- **STATUS UPDATE** — item's operational status has changed since publication

---

## 2. AXUSD Token Architecture

### CORRECTION 1 — Dual-Ecosystem Model Superseded
**Section Reference:** Section 3.1 — AXUSD Stablecoin Architecture / Dual-Ecosystem Design  
**Category:** SUPERSEDED  
**Effective Date:** 2026-03-30  
**Prior Text:** "Axiom Protocol operates two parallel AXUSD ecosystems (GENIUS and Euler) with a strict non-mixing rule. Each ecosystem has its own AXUSD token and PSM. GENIUS AXUSD and Euler AXUSD must never be combined or reported as a single supply."  
**Corrected Text:** Both legacy AXUSD tokens (GENIUS `0x73585df5...`; Euler `0xA7907b6B...`) have been deprecated. The protocol now operates a single canonical ERC-3643 Unified AXUSD at `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7`. The dual-ecosystem rule is retired. The Canonical PSM (`0xDB669bb6...`) is the sole active mint/redeem venue. Legacy PSM USDC reserves remain valid for solvency accounting until formally transferred via Governance Safe.

### CORRECTION 2 — Canonical Supply Definition
**Section Reference:** Section 3.2 — AXUSD Supply and Liability Reporting  
**Category:** CLARIFICATION  
**Effective Date:** 2026-03-30  
**Prior Text:** "AXUSD total supply is the aggregate of all deployed AXUSD token generations outstanding on Arbitrum One."  
**Corrected Text:** "AXUSD total supply" for all reporting, solvency snapshots, and coverage ratio computations refers exclusively to the ERC-3643 Unified AXUSD (`0xD6110F59...`) `totalSupply()` function. Legacy token supplies are tracked separately and are not included in canonical supply, liability figures, or reserve ratio computations.

---

## 3. Euler Vault

### CORRECTION 3 — Active Euler AXUSD Vault Version
**Section Reference:** Section 4.1 — Euler V2 Lending Vault (eAXUSD)  
**Category:** SUPERSEDED  
**Effective Date:** 2026-03-30  
**Prior Text:** "The active Euler V2 lending vault for AXUSD is eAXUSD-4 at address `0xe3048078286eA27fF91Eed10AA5FD749F0Ce7059`, accepting deposits from verified AXUSD holders."  
**Corrected Text:** eAXUSD-4 (`0xe3048078...`) has been deprecated due to a hook configuration issue that permanently prevents new deposits (WITHDRAW_ONLY mode). The canonical active lending vault is eAXUSD-6 at `0xacdA87801f6409bB5157BA78aF1BD9631d6609B2`, deployed via the Euler V2 EVK factory on Arbitrum One. All new lending positions use eAXUSD-6. Existing eAXUSD-4 depositors may withdraw only.

### CORRECTION 4 — AXM EVK Vault (eAXM-1)
**Section Reference:** Section 4.3 — EVK Vault Inventory  
**Category:** STATUS UPDATE  
**Effective Date:** 2026-03-28  
**Prior Text:** "The protocol deploys one EVK vault: eAXUSD-6 for AXUSD lending."  
**Corrected Text:** The protocol has deployed a second EVK vault, eAXM-1 (supply-only), at `0x8e28ffa89d168599156004db4f4d12c2af7c250e`. eAXM-1 accepts AXM collateral for the AXM/AXUSD EulerSwap pool. No borrowing is enabled; oracle is `address(0)`. All ops enabled (hookTarget=address(0), hookedOps=32767).

---

## 4. EulerSwap Pools

### CORRECTION 5 — EulerSwap AXUSD/USDC Pool Status
**Section Reference:** Section 4.4 — EulerSwap Liquidity Layer / AXUSD/USDC Pool  
**Category:** STATUS UPDATE  
**Effective Date:** 2026-03-26  
**Prior Text:** "EulerSwap AXUSD/USDC pool is planned for deployment in a future phase."  
**Corrected Text:** The AXUSD/USDC EulerSwap pool is DEPLOYED and UNLOCKED at `0x0101D5adE5Ce318FE39be50E985e4fa05362a8A8` (deployed 2026-03-26). token0=USDC, token1=AXUSD, equilibriumReserve=100 each, 1:1 peg. LPM whitelisted at index [10].

### CORRECTION 6 — AXM/AXUSD Pool Status
**Section Reference:** Section 4.5 — EulerSwap Liquidity Layer / AXM/AXUSD Pool  
**Category:** STATUS UPDATE  
**Effective Date:** 2026-03-28  
**Prior Text:** "AXM/AXUSD EulerSwap pool is planned for a future deployment phase."  
**Corrected Text:** The AXM/AXUSD EulerSwap pool is DEPLOYED and SEEDED at `0x981763699D269E129a08E216b1AeC7caa376A8a8` (deployed 2026-03-28). supplyVault0=eAXM-1, supplyVault1=eAXUSD-6. Pool reserves: 10,000 AXM / 9,000 AXUSD, fee=0.3%, concentration=0.5, feeRecipient=AxiomFeeBurner.

---

## 5. Governance

### CORRECTION 7 — Governance Infrastructure Status
**Section Reference:** Section 6.1 — Governance Architecture  
**Category:** STATUS UPDATE  
**Effective Date:** 2026-03-22  
**Prior Text:** "Multi-party governance infrastructure is planned. The Governance Safe and Timelock Controller will be deployed in a future protocol phase."  
**Corrected Text:** Governance Safe (3-of-5 Gnosis Safe) is live at `0x2Bb2c2A7A1d82097488BF0b9C2A59C1910Cd8d5d`. AXM Admin Safe is live at `0x93696b537d814Aed5875C4490143195983AED365`. Timelock Controller (24h minimum delay) is live at `0xf1B1D594d6Edc9f045dF55B32006A24e666Ed899`, with Governance Safe holding PROPOSER_ROLE. Admin role migration from Deployer EOA to these structures is in progress.

---

## 6. Lending Fund

### CORRECTION 8 — Canonical CreditMarket and FixedLoan Addresses
**Section Reference:** Section 5.2 — On-Chain Lending Fund / Contract Addresses  
**Category:** SUPERSEDED  
**Effective Date:** 2026-03-22  
**Prior Text:** "AXIOMCreditMarket address: `0xeE21B3C0D89b8EfD9eD61A7FD0B98A637eA9ab37`. AXIOMFixedLoan (NFT) address: `0x96634c2E1E80Fa51d45F0e9aB9F49B7dB3e9c859`."  
**Corrected Text:** The canonical v7 CreditMarket is at `0x85074a74774568692128eE97Da661Fe49dcF5fE4` (exported constant `CREDIT_MARKET_ADDRESS`). The canonical v7 FixedLoan NFT is at `0x511A0cD642532585dc87e41C84f7f499a9755511` (exported constant `FIXED_LOAN_NFT_ADDRESS`). These are the authoritative v7 addresses. The earlier addresses in `ACTIVE_CONTRACTS.creditMarket` and `ACTIVE_CONTRACTS.fixedLoanNFT` are superseded.

---

## 7. ERC-3643 Identity System

### CORRECTION 9 — Claim Issuance Architecture
**Section Reference:** Section 7.2 — ERC-3643 Identity Layer / Claim Issuance  
**Category:** CLARIFICATION  
**Effective Date:** 2026-03-30  
**Prior Text:** "Claims are issued by the protocol operator (Deployer EOA) directly to investor identity contracts."  
**Corrected Text:** Claims are issued through the ClaimIssuer contract at `0x579A367eaDa7606edc58f43165B53D2526D1B313`. The Deployer EOA holds the signing key for claim data, but on-chain state changes are written through each investor's ONCHAINID contract via the `issueClaim()` function. The issuer key signs the claim data hash off-chain; the claim struct is stored in the investor's ONCHAINID, not in the ClaimIssuer directly.

### CORRECTION 10 — SANCTIONS_CLEAR Validity Period
**Section Reference:** Section 7.3 — Claim Topic Definitions / Validity Periods  
**Category:** CLARIFICATION  
**Effective Date:** 2026-03-30  
**Prior Text:** "All claim topics (KYC_VERIFIED, ACCREDITED_INVESTOR, SANCTIONS_CLEAR) are valid for 365 days from issuance."  
**Corrected Text:** Validity periods differ by topic: KYC_VERIFIED (Topic 1) = 365 days; ACCREDITED_INVESTOR (Topic 2) = 365 days; SANCTIONS_CLEAR (Topic 3) = 180 days. Topic 3 has a shorter 180-day window to require semi-annual sanctions re-screening. See `docs/claim-topic-registry.md` for complete definitions.

---

## 8. GENIUS Act References

### CORRECTION 11 — GENIUS Act Compliance Language
**Section Reference:** Section 8.1 — Regulatory Framework / GENIUS Act Alignment  
**Category:** CLARIFICATION  
**Effective Date:** 2026-01-20 (retroactive)  
**Prior Text:** "AXUSD is GENIUS Act compliant."  
**Corrected Text:** AXUSD is "designed to align with the GENIUS Act (Securing and Enabling Commerce Using Stablecoins in the Internet to Nurture the Economy — Public Law 119-27)." No external regulatory body has confirmed compliance. Compliance posture is under ongoing legal evaluation. External attestation has not been completed and is pending. The word "compliant" must not appear without an explicit legal opinion from qualified counsel. All protocol materials must use the "designed to align with" formulation.

---

## 9. Operational Status Corrections

### CORRECTION 12 — Canonical PSM Activation Requirements
**Section Reference:** Section 3.3 — Canonical PSM / Operational Status  
**Category:** CLARIFICATION  
**Effective Date:** 2026-03-30  
**Prior Text:** "The Canonical PSM is Live at deployment and available for AXUSD mint and redeem operations."  
**Corrected Text:** The Canonical PSM (`0xDB669bb6...`) was deployed on 2026-03-30 in a `Configured-Inactive` state. Two Governance Safe transactions are required before mint/redeem become available: (1) `axusd.addAgent(CANONICAL_PSM)` — grants the PSM mint and burn authority on the ERC-3643 token; (2) `LendingPlatformModule.addPlatform(AXUSD, CANONICAL_PSM)` — whitelists the PSM in the compliance module so PSM-to-wallet transfers pass the compliance check. Until both are executed, mint and redeem will revert.

### CORRECTION 13 — eAXUSD-4 Deposit Status
**Section Reference:** Section 4.1 — Euler V2 Lending Vault / Deposit Status  
**Category:** RETRACTION  
**Effective Date:** 2026-02-01  
**Prior Text:** "eAXUSD-4 (`0xe3048078...`) is accepting new AXUSD deposits from verified participants."  
**Corrected Text:** This statement is retracted. eAXUSD-4 has a hook configuration issue that permanently prevents new deposits. The vault is in WITHDRAW_ONLY mode. No new deposits should be directed to this contract. Existing depositors may withdraw. The vault is deprecated and replaced by eAXUSD-6.

---

## 10. Oracle

### CORRECTION 14 — ERC-7726 Oracle Adapter Status
**Section Reference:** Section 4.2 — Price Oracle Infrastructure  
**Category:** STATUS UPDATE  
**Effective Date:** 2026-03-25  
**Prior Text:** "The ERC-7726 AXIOMOracleAdapter is pending deployment. Pricing will be provided once the oracle is live."  
**Corrected Text:** AXIOMOracleAdapter v2 is deployed at `0xc894d1500CB1FBf8F045e87bd357A51345197c4e` on Arbitrum One. It is baked into the eAXUSD-6 EVK vault as its immutable oracle at deployment. Interface: `getQuote(uint256 inAmount, address base, address quote) → uint256 outAmount`. Supported pairs: USDC↔AXUSD, USDT↔AXUSD, WETH→AXUSD, ARB→AXUSD, WBTC→AXUSD.

---

## 11. Revision History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-01-11 | Original whitepaper / protocol launch |
| 1.1 | 2026-03-30 | ERC-3643 migration complete; corrections 1–14 applied |

---

*Document produced by Axiom Protocol. Last updated: 2026-03-30.*
