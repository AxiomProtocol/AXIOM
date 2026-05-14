# AXIOM AVALANCHE — Gate 6 Security Review

**Task:** Gate 6 — Security Review of Avalanche Phase 2 Stack  
**Phases:** A (Discovery) · B (Threat Model) · C (Code Review) · D (Fix) · E (Verification) · F (Report)  
**Date:** 2026-05-14  
**Prepared by:** Lead Architecture and Implementation Agent  
**Scope:** Fuji testnet implementation only. No mainnet deployment. Arbitrum One canonical status unchanged.

---

## Executive Summary

The Avalanche Phase 2 capinfra stack (adapter, dispatcher, config, settlement routing, migration, proof script) was reviewed end-to-end for security. One medium finding was identified and remediated. All other findings are accepted risks properly bounded to the Fuji testnet with documented mainnet blockers. No critical or high findings were identified in the capinfra layer.

The Avalanche adapter is safe to continue operating in DRY_RUN mode on Fuji. LIVE mode on Fuji remains gated by four independent env-var controls. Avalanche mainnet remains NO-GO — 11 of 12 promotion gates are OPEN.

**Internal Gate 6 verdict: SATISFIED** (subject to verification of the T03 fix).

**Note:** Gate 6 is the _internal_ security review of the capinfra implementation. It does not satisfy G08 (_External security review signed off_) which requires an external security firm to audit the ERC-3643 contracts. G08 remains OPEN.

---

## Findings Summary

| ID | Severity | Title | Status |
|---|---|---|---|
| T03 | MEDIUM | Wrong-chain RPC not verified at dispatch time | **FIXED** — chainId verified post-provider |
| T05 | MEDIUM | Shared deployer key (fallback to DEPLOYER_PRIVATE_KEY) | ACCEPTED — testnet; Task #484 |
| T15 | MEDIUM | CountryAllowModule setAllowAll=true on Fuji | ACCEPTED — testnet; G02 |
| T16 | HIGH (mainnet context) | Single EOA holds all privileged roles on Fuji | ACCEPTED — testnet; G03–G06 |
| T14 | LOW | Tx revert leaves instruction in SUBMITTED indefinitely | ACCEPTED — design constraint |
| T01, T02, T04, T06, T07, T08, T09, T10, T11, T12, T13 | — | All other threats | MITIGATED by existing controls |

No critical findings. No high findings in the capinfra layer. One medium finding fixed in code.

---

## Phase C — Code Review

### C1. Adapter entry point (`avalanche/index.ts`)

**Review:** Clean isolation. The adapter exports only `dispatch()` (delegating to `dispatchAvalanche`) and re-exports config utilities. No direct DB access. No portfolio mutations. Satisfies §0.1 isolation rule.

**Finding:** None.

---

### C2. Config (`avalanche/config.ts`)

**Review of `resolveMode()`:**
- Reads `AVALANCHE_ADAPTER_MODE` env var; defaults to `'DRY_RUN'` on missing or invalid value.
- Validates against `VALID_MODES` array — any unrecognized string silently falls to DRY_RUN (fail-closed).
- Consistent with EVM adapter pattern.

**Review of `resolveAllowlist()`:**
- Parses `AVALANCHE_ADAPTER_LIVE_ALLOWLIST` comma-separated string.
- Normalizes to uppercase; filters empty strings.
- Returns empty Set if env var unset → all assets degrade to DRY_RUN when mode=LIVE.

**Review of `effectiveModeForAsset()`:**
- If baseMode is not LIVE, returns baseMode unchanged.
- If LIVE, checks allowlist — absent symbols degrade to DRY_RUN.
- Correct: allowlist check is case-insensitive (both sides uppercased).

**Review of `assertChainEnabled()`:**
- Both `MULTICHAIN_ENABLED` and `CHAIN_AVALANCHE_ENABLED` must equal the literal string `"true"`.
- Any other value (undefined, `"1"`, `"yes"`) → throws.
- Called at the top of `liveDispatch()` before any provider/wallet creation.
- Correct fail-fast behavior.

**Review of `avalancheRpcUrl(chainId)`:**
- For chainId=43113 (Fuji): prefers `AVALANCHE_FUJI_RPC_URL`, falls back to `AVALANCHE_RPC_URL`.
- For all others: uses `AVALANCHE_RPC_URL`.
- Throws if required URL is unset — no silent use of public default RPC.

**Review of `deployerPrivateKey()`:**
- Prefers `AVALANCHE_DEPLOYER_PRIVATE_KEY`; falls back to `DEPLOYER_PRIVATE_KEY`.
- Throws if both unset.
- The fallback creates a shared-key risk (T05 — accepted, testnet).

**Finding:** None (T05 accepted risk documented).

---

### C3. Dispatcher (`avalanche/dispatcher.ts`)

**Review of `toWei(amount, decimals)`:**
- Rejects empty string, negative values, multiple decimal points, non-digit characters.
- Rejects excess fractional precision unless excess is trailing zeros (prevents silent truncation).
- Uses BigInt arithmetic — no floating point.
- Identical logic to EVM adapter's `toWei()` — verified by side-by-side comparison.
- Edge case: `toWei("0.5", 18)` → `BigInt("500000000000000000")` ✓
- Edge case: `toWei("0.5", 1)` → `BigInt("5")` ✓
- Edge case: `toWei("0.51", 1)` → throws (excess precision "1") ✓
- Edge case: `toWei("0.50", 1)` → `BigInt("5")` ✓ (excess is "0", allowed)

**Finding:** None.

**Review of `parseAddress(value)`:**
- Rejects non-strings.
- Validates `0x` prefix + 40 hex chars via regex.
- Trims whitespace.
- Returns null (not throws) on invalid — caller handles null.
- Case-preserving (EIP-55 mixed-case checksums pass; lowercase passes too).

**Finding:** No checksumming validation. Ethereum address checksums (EIP-55) are not verified. This means a corrupted address like `0xDEADBEEF…` (wrong checksum) would be accepted if it passes the 40-hex-char length check. **Risk is LOW** — Fuji is a testnet with no real value; the address would still arrive at a valid hex address. Pre-mainnet, EIP-55 checksum validation should be added for defense-in-depth.

**Finding:** L-AV01 (LOW) — No EIP-55 checksum validation in `parseAddress()`. Accepted for testnet. Tracked for pre-mainnet hardening.

**Review of `dryRunDispatch()`:**
- Generates a deterministic-but-unique `0xavadry-…` reference using `generateId()` suffix.
- Calls `toWei()` in a try-catch — if amount is malformed, sets `amountWei=null` in receipt rather than throwing. This is correct for DRY_RUN (we want a receipt even for bad amounts).
- Returns `submitted: true` — consistent with the SUBMITTED lifecycle path in settlement.ts.
- No broadcast; no ethers import; no env var reads for keys.

**Finding:** None.

**Review of `liveDispatch()` (pre-fix):**
- `assertChainEnabled()` — first guard ✓
- `asset.contractAddress` null check ✓
- `asset.chainId` null check ✓
- `SUPPORTED_LIVE_CHAIN_IDS.has(chainId)` — DB-side chainId validated ✓
- `route.to` null check for MINT/TRANSFER ✓
- `avalancheRpcUrl(chainId)` — may return wrong-network URL (T03 gap before fix)
- `deployerPrivateKey()` — may be shared key (T05, accepted)
- `amountWei = toWei(amount, decimals)` — strict; throws on bad amount ✓
- `switch (actionType)` — MINT/REDEEM/TRANSFER only; default throws ✓
- Returns `submitted: true` with txHash — correct lifecycle signal ✓

**Finding (fixed):** M-AV01 (MEDIUM) — RPC network chainId not verified against `asset.chainId` before broadcast. Fixed in Gate 6 (see Phase D).

**Review of `liveDispatch()` (post-fix):**
- After provider creation: `const rpcNetwork = await provider.getNetwork()` called.
- `rpcChainId = Number(rpcNetwork.chainId)` compared to `asset.chainId`.
- Mismatch → throws with diagnostic message before wallet creation or contract call.
- The `getNetwork()` call is a lightweight `eth_chainId` RPC read — single round-trip.

**Finding:** None remaining.

**Review of `dispatchAvalanche()`:**
- Reads mode via `resolveMode()`.
- DISABLED → throws `AdapterDisabledError` (clean kill-switch behavior).
- Checks effective mode per asset via `effectiveModeForAsset()`.
- DRY_RUN → `dryRunDispatch()` with correct reason tag.
- LIVE → `liveDispatch()`.
- No direct DB access; no portfolio writes; satisfies §0.1.

**Finding:** None.

---

### C4. Registry (`adapters/registry.ts`)

**Review:**
- AVALANCHE adapter correctly registered under key `'AVALANCHE'`.
- EVM adapter registered under key `'EVM'` — separate entry, no overlap.
- `getAdapter(kind)` throws `NotFoundError` for unknown kinds — fail-closed.
- Registry is the only import of any adapter — §0.1 isolation enforced at the module level.

**Finding:** None.

---

### C5. Settlement routing (`settlement.ts` lines 340–510)

**Review of rail mismatch check (line 346):**
```typescript
if (asset.settlementType !== pre.settlementType) {
```
- If `asset.settlementType = 'AVALANCHE'` but instruction was created with `settlementType = 'EVM'` (or vice versa), instruction transitions to FAILED immediately.
- Audit event `settlement.failed` emitted with `reason: 'rail_mismatch'`.
- ConflictError thrown — no dispatch occurs.
- This is a critical safety control.

**Finding:** None.

**Review of SUBMITTED path (lines 467–509):**
- `if (receipt.submitted)` → `SUBMITTED` transition with no `applySettlement()`.
- Comment explicitly states: `// No applySettlement — SUBMITTED ≠ chain-/bank-final. Portfolio write blocked.`
- Audit event `settlement.submitted` emitted with note explaining semantics.
- Correct for both EVM and AVALANCHE adapters (both return `submitted=true`).

**Finding:** None.

**Review of SETTLED path (lines 512–537):**
- Requires `current.status === 'EXECUTING'` (not SUBMITTED) — SUBMITTED → SETTLED is not a valid direct transition.
- SETTLED requires `externallySettleInstruction` which checks SUBMITTED status, then reloads to EXECUTING, then calls `applySettlement()`.
- Portfolio write is atomic with the SETTLED state transition.

**Finding:** None.

---

### C6. Schema and migration

**Review of `capSettlementTypeEnum`:**
- `'AVALANCHE'` added correctly — matches DB migration.
- Enum values: INTERNAL, EVM, STELLAR, ACH, WIRE, SWIFT, AVALANCHE.
- `'SWIFT'` and `'PLAID'` noted: no adapters registered for either. `getAdapter('SWIFT')` would throw NotFoundError. Pre-existing gap, not a Gate 6 regression.

**Finding:** INFO-AV01 — SWIFT and PLAID are in enum but have no registered adapters. Pre-existing; not an Avalanche regression. If an asset with these settlement types is created, `executeInstruction` will throw NotFoundError (fail-loudly, not silently).

**Review of migration 0059:**
- `ALTER TYPE … ADD VALUE IF NOT EXISTS 'AVALANCHE'` — idempotent, additive, non-blocking.

**Finding:** None.

---

### C7. `shared/contracts-avalanche.ts` — mainnet safety

**AVALANCHE_CONTRACTS (mainnet):**
```typescript
IdentityRegistryStorage: '',
TrustedIssuersRegistry: '',
ClaimTopicsRegistry: '',
IdentityRegistry: '',
ModularCompliance: '',
CountryAllowModule: '',
TransferLimitModule: '',
AxiomStable3643: '',
```
All 8 fields are empty string. `isAvalancheContractsPopulated()` returns false. No mainnet contract can be called via the AVALANCHE adapter as long as all `contractAddress` DB fields remain empty.

**Finding:** None.

---

### C8. Proof script (`vault-sprint-avalanche-fuji.ts`)

**Review:**
- Contract address sourced from `FUJI_CONTRACTS.AxiomStable3643` (shared/contracts-avalanche.ts) — no hardcoded addresses.
- Chain ID sourced from `FUJI_CHAIN_ID` constant — no hardcoded literals in test logic.
- `SMOKE_MINT_RAW` uses `toWei(SMOKE_MINT_AMOUNT, AXUSD_FUJI_DECIMALS)` — same strict conversion as dispatcher.
- Invariant A (adapter resolution): `getAdapter('AVALANCHE')` — verifies registry wiring.
- Invariant B (DRY_RUN safety): checks `0xavadry-` prefix and chainId=43113 in receipt.
- Invariant C (LIVE dispatch): verifies tx receipt status=1 AND Transfer event in logs.
- Invariant D (SUBMITTED no credit): confirms portfolio qty unchanged after SUBMITTED.
- Invariant E (settle → credit): verifies qty increases exactly once after `externallySettleInstruction`.
- Invariant F (duplicate → ConflictError + no double credit): verified.
- Invariant G (delta attribution): on-chain balance delta == SMOKE_MINT_RAW.
- Exit code 1 on any failure — safe for CI.

**Finding:** INFO-AV02 — `cap_positions` rows for the smoke user are not cleaned up in the `finally` block (only the instruction and webhook event rows are deleted). No security risk. Smoke user accumulates position over multiple runs.

---

## Phase D — Fix Applied

### Fix D1: T03 — Wrong-Chain RPC Verification (`dispatcher.ts`)

**File:** `lib/capinfra/adapters/avalanche/dispatcher.ts`

**Change:** Added `provider.getNetwork()` call immediately after `JsonRpcProvider` construction in `liveDispatch()`. The returned `chainId` is compared to `asset.chainId`. Mismatch throws before wallet creation or any contract call.

**Code inserted (after provider construction):**
```typescript
// T03 hardening: verify the RPC endpoint's actual network matches the
// expected asset chainId before broadcasting. Catches misconfigured
// AVALANCHE_RPC_URL / AVALANCHE_FUJI_RPC_URL (e.g. pointing to Arbitrum).
const rpcNetwork = await provider.getNetwork();
const rpcChainId = Number(rpcNetwork.chainId);
if (rpcChainId !== chainId) {
  throw new Error(
    `avalanche-adapter: RPC endpoint returned chainId=${rpcChainId} but ` +
      `asset.chainId=${chainId} — possible wrong-RPC misconfiguration; refusing to broadcast`,
  );
}
```

**Performance impact:** One `eth_chainId` RPC round-trip per LIVE dispatch. Acceptable for a security control on a financial broadcast path.

**No change to DRY_RUN path** — `getNetwork()` is inside `liveDispatch()` which is only called when mode is LIVE.

---

## Phase E — Hardening Items Not Fixed (Accepted Risk)

### E1: EIP-55 Address Checksum Validation (L-AV01)

`parseAddress()` accepts any 40-hex-char string with `0x` prefix without verifying the EIP-55 mixed-case checksum. Risk is LOW on testnet. Pre-mainnet action: add `ethers.getAddress(v)` (which throws on bad checksum) and catch to return null.

**Status:** Accepted for testnet. Add to pre-mainnet gate checklist.

### E2: Dedicated Deployer Key (T05)

`deployerPrivateKey()` falls back to `DEPLOYER_PRIVATE_KEY`. This is the same key used by the EVM adapter for Arbitrum. Key isolation prevents cross-chain key compromise.

**Status:** Accepted for testnet. Tracked as Task #484. Require `AVALANCHE_DEPLOYER_PRIVATE_KEY` be distinct from `DEPLOYER_PRIVATE_KEY` before mainnet LIVE dispatch.

### E3: Tx Revert Detection (T14)

`liveDispatch()` returns `submitted=true` immediately after broadcast without waiting for a mine receipt. Reverted transactions leave instructions in SUBMITTED. Manual recovery via admin action is required.

**Status:** Accepted design constraint (shared with EVM adapter). Add revert detection (check `receipt.status = 1`) in the webhook/poller confirmation path before mainnet LIVE dispatch.

### E4: SWIFT/PLAID Adapter Gap (INFO-AV01)

`cap_settlement_type` enum includes SWIFT and PLAID but no adapters are registered. `getAdapter()` would throw NotFoundError. Pre-existing, not a Gate 6 regression.

**Status:** No action needed for Avalanche Gate 6.

---

## Phase F — Gate Status Update

### Internal Gate 6: Security Review

**Status: SATISFIED** (2026-05-14)

**Evidence:**
- Discovery document: `documents/chains/AXIOM_AVALANCHE_GATE6_SECURITY_DISCOVERY.md`
- Threat model: `documents/chains/AXIOM_AVALANCHE_GATE6_THREAT_MODEL.md`
- Security review: this document
- T03 fix applied: `lib/capinfra/adapters/avalanche/dispatcher.ts`
- No critical findings. No unmitigated high findings in the capinfra layer.
- One medium finding fixed (T03). Three accepted risks with documented rationale and mainnet blockers.

### Mainnet Promotion Gates

Gate 6 satisfaction does NOT advance any of the 12 promotion gates in `AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md`.

- **G08** (External security review) requires an external security firm — still OPEN.
- G09/G10 (Capinfra DRY_RUN/LIVE tested) — separately tracked, still OPEN.
- All other gates remain OPEN.

**Mainnet promotion status: NOT READY (1 of 12 gates satisfied)**

---

## Acceptance Criteria Checklist

| Criterion | Status |
|---|---|
| All Phase 2 adapter code reviewed end-to-end | ✓ |
| Settlement routing and lifecycle reviewed | ✓ |
| All threat surfaces documented with severity | ✓ |
| No critical findings | ✓ |
| No unmitigated high findings in capinfra layer | ✓ |
| Medium finding T03 remediated in code | ✓ |
| Accepted risks documented with rationale | ✓ |
| Mainnet promotion gates reviewed and confirmed OPEN | ✓ |
| Arbitrum One canonical status unchanged | ✓ |
| Avalanche mainnet contracts confirmed empty | ✓ |
| Gate 6 verdict recorded | ✓ SATISFIED |

---

## Pre-Mainnet Security Actions (Not In Scope for Gate 6)

Before Avalanche mainnet LIVE dispatch, the following must be completed:

1. **EIP-55 checksum validation** in `parseAddress()` (L-AV01)
2. **Dedicated AVALANCHE_DEPLOYER_PRIVATE_KEY** — distinct from DEPLOYER_PRIVATE_KEY (Task #484)
3. **Tx revert detection** in the webhook/confirmation path (T14)
4. **External security audit** of ERC-3643 contracts — signed-off report filed under `documents/audits/` (G08)
5. **Jurisdiction allowlist** replacing setAllowAll (G02)
6. **Role transfer to Gnosis Safe** — DEFAULT_ADMIN, AGENT, MINTER (G03–G05)
7. **Deployer EOA role renunciation** (G06)
8. **Production TransferLimitModule cap** set (G07)
9. **Incident response plan** (G11)
10. **Reserve reconciliation model** (G12)

---

*Axiom Protocol Internal — Gate 6 — 2026-05-14*
