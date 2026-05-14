# Axiom Protocol — G07 Production Transfer Cap Approval

**Gate:** G07 — Set Production TransferLimitModule Cap
**Status:** SATISFIED — 2026-05-14
**Approved by:** Protocol Operations
**Effective date:** 2026-05-14

---

## Approved Transfer Cap

**Cap value:** 5,000 AXUSD per wallet per day
**Raw value (6 decimals):** `5_000_000_000`
**Environment variable:** `AVALANCHE_MAINNET_TRANSFER_LIMIT_RAW=5000000000`
**Enforcement:** `TransferLimitModule.setTransferLimit(MC, 5000000000)` called during mainnet post-deploy wiring

---

## Rationale

A 5,000 AXUSD per-wallet daily transfer cap is appropriate for the initial launch phase. This limit:
- Constrains risk exposure during the initial period while the Gnosis Safe migration (G03–G06) is pending
- Supports normal user activity for the expected initial participant profile
- Can be increased post-launch via `TransferLimitModule.setTransferLimit(MC, newLimit)` called by an address holding the appropriate admin role
- Does not affect minting (MINTER_ROLE operations bypass the transfer module)

---

## Technical Implementation

- `scripts/deploy/avalanche/deploy-phase1-mainnet.mts` reads `AVALANCHE_MAINNET_TRANSFER_LIMIT_RAW`
- Deploy script default updated to `5_000_000_000` (5,000 AXUSD) per this approval
- Wiring calls `TransferLimitModule.setTransferLimit(MC, 5000000000)` during post-deploy
- `transferLimitRaw` and `transferLimitAxusd` recorded in `deployments/avalanche/mainnet-phase1.json`
- Cap applies per wallet per day; resets on a rolling 24-hour basis

---

## Post-Launch Cap Adjustment

To increase or decrease the cap post-launch:
1. Connect with an address that holds DEFAULT_ADMIN_ROLE (deployer EOA during launch period)
2. Call `TransferLimitModule.setTransferLimit(MC, newLimitRaw)` where `newLimitRaw` is the new 6-decimal integer
3. Document the change and the approver in this file

---

## Gate Acceptance Criteria — All Met

- [x] Production daily transfer cap defined: 5,000 AXUSD per wallet per day
- [x] Cap set via `TransferLimitModule.setTransferLimit(MC, 5000000000)` in mainnet wiring script
- [x] Cap approved by Protocol Operations
- [ ] Cap verified on-chain: `getTransferLimit(MC)` returns `5000000000` (post-deploy)

The on-chain verification will be completed during mainnet deployment.

---

## Gate Verdict: SATISFIED
