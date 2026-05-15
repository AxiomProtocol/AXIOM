# Axiom Protocol — Sui Support Playbook
**Version:** 1.0 | **Phase:** 10 | **Date:** 2026-05-15
**Scope:** AMC community distribution only. NOT AXUSD, AXAU, AXM, SEED, or KAG.

---

## Overview

This playbook covers L1–L4 support for the Phase 9/10 Sui mainnet community distribution campaign.
All support is non-financial. AMC has no monetary value and is not redeemable.

---

## Scenario 1 — Wallet Cannot Connect

**Symptoms:** Wallet button unresponsive, no wallet detected, browser shows no extension.

**Resolution steps:**
1. Confirm user has a Sui-compatible wallet installed (Sui Wallet, Martian, Suiet, Phantom Sui).
2. Confirm wallet is unlocked and browser extension is enabled.
3. Confirm user is on a supported browser (Chrome, Firefox, Brave, Edge).
4. Ask user to hard-refresh the page (Ctrl+Shift+R or Cmd+Shift+R).
5. Ask user to disable other wallet extensions temporarily (MetaMask, etc.) that may conflict.
6. If persistent, escalate to L2.

**L1 resolution rate:** ~90%

---

## Scenario 2 — Wallet Mismatch / Wrong Network

**Symptoms:** Wallet connects but shows wrong address, or RPC errors referencing Arbitrum/Ethereum/etc.

**Resolution steps:**
1. Ask user to open their Sui wallet and confirm the active network is **Sui Mainnet**.
2. Confirm the connected address in the claim UI matches the address they expect.
3. If the wallet shows "Devnet" or "Testnet", instruct user to switch network in wallet settings.
4. If using a hardware wallet, confirm it's configured for Sui Mainnet.
5. Disconnect and reconnect wallet.

**L1 resolution rate:** ~95%

---

## Scenario 3 — Claim Not Eligible

**Symptoms:** User clicks "Check Eligibility" and receives "not eligible" message.

**Resolution steps:**
1. Confirm the connected wallet address matches the address they believe is eligible.
2. Note: eligibility is determined by the Merkle root set at campaign creation — it is fixed.
3. If user believes they should be eligible, document:
   - Their wallet address
   - Screenshot of the eligibility check response
   - How they learned they were eligible
4. Escalate to L2 with documentation. **Do not promise eligibility.**
5. Inform user: eligibility cannot be added after campaign activation without closing and re-creating the campaign.

**L1 resolution rate:** ~50% (must escalate if user believes they should be eligible)

---

## Scenario 4 — Already Claimed

**Symptoms:** Proof API returns "already claimed" or on-chain check confirms the address has claimed.

**Resolution steps:**
1. Explain that each wallet may only claim once — this is enforced on-chain.
2. Ask user to check their Sui wallet for an existing AMC balance.
3. AMC token address: `0xc330a912193feaa7fe545405810732e494b57ece7bc7ecf0e4412e834c33a487::axiom_mainnet_claim::AXIOM_MAINNET_CLAIM`
4. If user claims they never received tokens, check the claim transaction on suiscan.xyz.
5. If the on-chain claim transaction exists but tokens are not visible, user may need to add the token to their wallet manually.

**L1 resolution rate:** ~85%

---

## Scenario 5 — Proof Invalid / Proof Generation Error

**Symptoms:** Proof request returns error, server-side error, or claim submission fails with "invalid proof".

**Resolution steps:**
1. Ask user to refresh the page and retry the eligibility check.
2. Check `/api/health/sui-monitoring` for proof API errors.
3. If proof API is down, escalate to L2 immediately.
4. If proof API is up but one address fails, document:
   - Wallet address
   - Error message text
   - Time of attempt
5. Escalate to L2 with documentation.

**L1 resolution rate:** ~40%

---

## Scenario 6 — Campaign Paused

**Symptoms:** Claim button shows "Campaign is currently paused" or API returns campaign inactive.

**Resolution steps:**
1. Confirm by checking `/api/health/sui-campaigns` or suiscan.xyz campaign object state.
2. Inform user that the campaign has been temporarily paused by the operator.
3. Do NOT provide an ETA for unpause without confirmation from L3.
4. Document the incident and escalate to L2/L3 if the pause was unexpected.
5. Update public channels once unpause ETA is confirmed by L3.

**L1 resolution rate:** N/A (operator action required)

---

## Scenario 7 — Campaign Closed

**Symptoms:** API or UI indicates campaign is closed. Claim button disabled.

**Resolution steps:**
1. Confirm campaign is closed on-chain via suiscan.xyz.
2. Inform user that the campaign has ended and no further claims are possible.
3. Remaining pool balance is returned to the operator wallet on close.
4. Escalate to L3 if closure was unexpected.

**L1 resolution rate:** N/A (final state)

---

## Scenario 8 — Claim Transaction Pending / Stuck

**Symptoms:** User submitted a claim transaction but it is pending or unconfirmed after >5 minutes.

**Resolution steps:**
1. Ask user for the transaction digest from their wallet.
2. Check the transaction on suiscan.xyz.
3. If the transaction is pending: Sui typically finalizes in <3 seconds. A >5 minute pending state suggests RPC or network issues.
4. Check `/api/health/sui-rpc` for mainnet latency and status.
5. If RPC is degraded, escalate to L2.
6. If transaction failed on-chain, check the error code:
   - `ENotActive (1)` — campaign was paused during submission
   - `EAlreadyClaimed (2)` — address already claimed
   - `EInvalidProof (3)` — proof is stale or invalid, retry eligibility check
   - `EInsufficientPool (4)` — pool depleted
   - `EExpired (5)` — campaign expired

**L1 resolution rate:** ~60%

---

## Scenario 9 — RPC Outage

**Symptoms:** All users report connection failures simultaneously, `/api/health/sui-rpc` returns DOWN.

**Resolution steps:**
1. Escalate immediately to L2 → L3.
2. Check Sui network status at status.sui.io.
3. Do not attempt to resolve RPC provider issues at L1.
4. Post public notice via community channels: "Sui network connectivity issues detected. Claim functionality temporarily unavailable."
5. Do not confirm timing until L3 provides confirmation.

**L1 resolution rate:** 0% (escalate immediately)

---

## Scenario 10 — Wrong Network (User on Testnet)

**Symptoms:** User receives "package not found" or proof returns empty despite claiming eligibility.

**Resolution steps:**
1. Ask user to confirm their Sui wallet is set to **Mainnet**, not Testnet or Devnet.
2. The AMC campaign only exists on Sui Mainnet.
3. Testnet addresses have no eligibility.
4. Walk user through switching network in their Sui wallet app.

**L1 resolution rate:** ~98%

---

## Scenario 11 — User Confusion: AMC vs AXUSD / Other Tokens

**Symptoms:** User believes AMC is a financial asset, stablecoin, or redeemable.

**Resolution steps:**
1. Clearly state: AMC is a community reward token with no monetary value.
2. AMC is NOT AXUSD, AXAU, AXM, SEED, or KAG.
3. AMC is not redeemable for any asset or currency.
4. Direct user to `/sui/disclosure` for the full public disclosure.
5. Do not make any statements about future value.

**L1 resolution rate:** ~99%

---

*Playbook version 1.0 · Axiom Protocol Sui Phase 10 · 2026-05-15*
*Community distribution only — NOT AXUSD, AXAU, AXM, SEED, or KAG*
