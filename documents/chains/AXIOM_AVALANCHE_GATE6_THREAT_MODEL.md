# AXIOM AVALANCHE — Gate 6 Threat Model

**Task:** Gate 6 — Security Review of Avalanche Phase 2 Stack  
**Phase:** B — Threat Model  
**Date:** 2026-05-14  
**Scope:** Fuji testnet implementation only.

---

## Threat Summary

| ID | Threat | Severity | Likelihood | Status |
|---|---|---|---|---|
| T01 | Adapter misuse (wrong kind routing) | HIGH | LOW | Mitigated — rail mismatch check |
| T02 | Accidental LIVE enablement | HIGH | LOW | Mitigated — 4-layer gating |
| T03 | Wrong-chain RPC dispatch | MEDIUM | LOW | **Fix applied — chainId verified post-provider** |
| T04 | Wrong contract address (stale/hardcoded) | MEDIUM | LOW | Mitigated — single source of truth |
| T05 | Signer/private-key misuse (shared key) | MEDIUM | LOW | Accepted — testnet; Task #484 tracks isolation |
| T06 | Duplicate settlement / replay | HIGH | LOW | Mitigated — ConflictError on terminal state |
| T07 | Premature portfolio credit | HIGH | LOW | Mitigated — SUBMITTED path blocks applySettlement |
| T08 | settlementType routing regression (EVM) | HIGH | LOW | Mitigated — chain-scoped adapters + rail mismatch |
| T09 | EVM / Arbitrum regression | HIGH | LOW | Mitigated — separate adapter, separate key, separate chainId |
| T10 | Env leakage | MEDIUM | LOW | Mitigated — secrets via env; not logged to stdout |
| T11 | Mainnet promotion before governance signoff | HIGH | LOW | Mitigated — 11/12 gates open; AVALANCHE_CONTRACTS empty |
| T12 | Fuji/mainnet address confusion | MEDIUM | LOW | Mitigated — AVALANCHE_CONTRACTS all empty; chainId gate |
| T13 | Migration compatibility | LOW | LOW | Mitigated — IF NOT EXISTS; additive only |
| T14 | Tx revert leaving instruction in SUBMITTED | LOW | LOW | Accepted — design constraint; recovery documented |
| T15 | Unlimited country compliance on Fuji | MEDIUM | LOW | Accepted — testnet only; mainnet blocker G02 |
| T16 | Single EOA holds all privileged contract roles | HIGH | LOW | Accepted — testnet only; mainnet blockers G03–G06 |

---

## Threat Detail

---

### T01 — Adapter Misuse (Wrong Kind Routing)

**Description:** An instruction with `settlementType='AVALANCHE'` is accidentally dispatched via the EVM adapter, or an EVM instruction goes through the AVALANCHE adapter.

**Severity:** HIGH  
**Likelihood:** LOW

**Current mitigation:**
- `settlement.ts` line 346 performs a rail mismatch check: if `asset.settlementType !== instruction.settlementType`, the instruction transitions to FAILED and a ConflictError is thrown. No dispatch occurs.
- `getAdapter(kind)` is a direct map lookup — the kind string determines the adapter. EVM and AVALANCHE are distinct keys.
- The EVM adapter's `SUPPORTED_LIVE_CHAIN_IDS = {42161}` refuses chainIds 43113 and 43114 at broadcast time.
- The AVALANCHE adapter's `SUPPORTED_LIVE_CHAIN_IDS = {43113, 43114}` refuses chainId 42161 at broadcast time.

**Remaining gap:** None for the routing path. Wrong-chain RPC is addressed separately in T03.

**Required fix:** None.

---

### T02 — Accidental LIVE Enablement

**Description:** An operator accidentally sets `AVALANCHE_ADAPTER_MODE=LIVE` without intending to broadcast real transactions.

**Severity:** HIGH  
**Likelihood:** LOW

**Current mitigation:**
- Four independent conditions must all be true for a real broadcast:
  1. `AVALANCHE_ADAPTER_MODE=LIVE`
  2. `MULTICHAIN_ENABLED=true`
  3. `CHAIN_AVALANCHE_ENABLED=true`
  4. Asset symbol in `AVALANCHE_ADAPTER_LIVE_ALLOWLIST`
- Missing any condition → either DRY_RUN receipt or throws before dispatch.
- The per-asset allowlist is a second operator-controlled gate independent of the mode flag.
- In production, neither `MULTICHAIN_ENABLED` nor `CHAIN_AVALANCHE_ENABLED` are set.

**Remaining gap:** No additional code-level fix needed. Operational discipline required for production env management.

**Required fix:** None.

---

### T03 — Wrong-Chain RPC Dispatch

**Description:** `AVALANCHE_RPC_URL` is misconfigured and points to a different network (e.g. Arbitrum, Ethereum mainnet). The adapter broadcasts a transaction to the wrong chain without detecting the error.

**Severity:** MEDIUM  
**Likelihood:** LOW

**Current mitigation (before Gate 6):**
- `SUPPORTED_LIVE_CHAIN_IDS` check against `asset.chainId` prevents broadcasting if the asset's expected chain is not in the allowed set.
- However, `asset.chainId` comes from the DB, not from the RPC endpoint. If the RPC points to the wrong network, the chainId check passes but the tx lands on the wrong chain.

**Remaining gap:** The provider's actual network chainId is not verified against `asset.chainId` before broadcast.

**Fix applied (Gate 6):** `liveDispatch()` in `dispatcher.ts` now calls `await provider.getNetwork()` immediately after provider creation and compares the RPC's actual chainId to `asset.chainId`. Mismatch → throws before any transaction is sent.

---

### T04 — Wrong Contract Address (Stale/Hardcoded)

**Description:** The dispatcher calls `mint()` on a stale or incorrect contract address, either minting to the wrong contract or causing a revert.

**Severity:** MEDIUM  
**Likelihood:** LOW

**Current mitigation:**
- `shared/contracts-avalanche.ts` is the single source of truth for all Fuji/mainnet addresses.
- `scripts/vault-sprint-avalanche-fuji.ts` imports `FUJI_CONTRACTS, FUJI_CHAIN_ID` from `shared/contracts-avalanche.ts` — no hardcoded address literals in the proof script.
- Asset `contractAddress` comes from `cap_assets` (seeded from `shared/contracts-avalanche.ts` values).
- `deployments/avalanche/fuji-phase1.json` matches `shared/contracts-avalanche.ts` — verified by review.
- `AVALANCHE_CONTRACTS` mainnet object: all 8 fields are empty string `""`. No mainnet contract can be accidentally called.

**Remaining gap:** No additional fix needed.

**Required fix:** None.

---

### T05 — Signer/Private-Key Misuse (Shared Key)

**Description:** `deployerPrivateKey()` falls back to `DEPLOYER_PRIVATE_KEY` when `AVALANCHE_DEPLOYER_PRIVATE_KEY` is not set. This is the same key used for Arbitrum. A single key compromise affects both chains simultaneously.

**Severity:** MEDIUM  
**Likelihood:** LOW (testnet-only; Fuji AVAX has no real value)

**Current mitigation:**
- Fallback is explicitly documented in `config.ts` header comment and in replit.md Task #484 tracker.
- On Fuji testnet the deployer holds no assets of real value.
- The fallback throws if both vars are unset — it never silently uses an undefined key.

**Remaining gap:** Key isolation is not enforced in code — `AVALANCHE_DEPLOYER_PRIVATE_KEY` is optional. If Avalanche adapter is ever promoted to mainnet with the shared key, a compromise of the Arbitrum deployer key also enables unauthorized Avalanche minting.

**Required fix:** None at this scope. Tracked as Task #484. A pre-mainnet gate (add to G05) must require `AVALANCHE_DEPLOYER_PRIVATE_KEY` to be a distinct key from `DEPLOYER_PRIVATE_KEY`.

**Accepted risk:** Fuji testnet only. Accepted until Task #484 closes.

---

### T06 — Duplicate Settlement / Replay

**Description:** An attacker or buggy automation calls `externallySettleInstruction` twice for the same instruction, crediting the portfolio twice.

**Severity:** HIGH  
**Likelihood:** LOW

**Current mitigation:**
- `externallySettleInstruction` first checks `TERMINAL: Status[] = ['SETTLED', 'FAILED', 'CANCELLED']`.
- If the current status is terminal, it throws `ConflictError('external_settle_on_terminal:SETTLED')` before any DB write.
- The check is re-performed inside the DB transaction on the reloaded instruction (TOCTOU protection).
- Proof script invariant F1 and F2 verified this behavior with a real duplicate call returning ConflictError and no portfolio change.

**Remaining gap:** None.

**Required fix:** None.

---

### T07 — Premature Portfolio Credit

**Description:** A SUBMITTED instruction (broadcast accepted by RPC but not yet mined/confirmed) credits the user's portfolio position before on-chain confirmation.

**Severity:** HIGH  
**Likelihood:** LOW

**Current mitigation:**
- `executeInstruction` receipt routing: `if (receipt.submitted)` → transitions to SUBMITTED with no `applySettlement()` call.
- The comment on line 485 of `settlement.ts` explicitly states: `// No applySettlement — SUBMITTED ≠ chain-/bank-final. Portfolio write blocked.`
- `applySettlement()` is only called in the SETTLED transition (`externallySettleInstruction`).
- Proof script invariant D2 verified: portfolio qty unchanged after SUBMITTED insertion.

**Remaining gap:** None.

**Required fix:** None.

---

### T08 — settlementType Routing Regression (EVM)

**Description:** Adding `'AVALANCHE'` to `capSettlementTypeEnum` breaks EVM routing — an EVM asset accidentally routes to the AVALANCHE adapter.

**Severity:** HIGH  
**Likelihood:** LOW

**Current mitigation:**
- `getAdapter(kind)` is a plain Map lookup keyed on `kind` string. Adding `'AVALANCHE'` to the enum does not change the EVM key or EVM adapter registration.
- The EVM adapter is registered under key `'EVM'`; AVALANCHE under `'AVALANCHE'`. These are distinct map entries.
- The `capSettlementTypeEnum` change is additive — existing rows retain their `settlement_type` value.
- Migration 0059 does not touch any existing EVM rows.
- EVM adapter's `SUPPORTED_LIVE_CHAIN_IDS = {42161}` — chainId 43113/43114 still rejected.

**Remaining gap:** None.

**Required fix:** None.

---

### T09 — EVM / Arbitrum Regression

**Description:** Avalanche adapter code changes affect Arbitrum One production behavior.

**Severity:** HIGH  
**Likelihood:** LOW

**Current mitigation:**
- Avalanche adapter is isolated in `lib/capinfra/adapters/avalanche/`. No Arbitrum code was modified.
- `lib/capinfra/adapters/evm.ts` is unchanged.
- `settlement.ts` routing logic is unchanged — only the enum and seed data changed.
- EVM adapter env vars (`EVM_ADAPTER_MODE`, `EVM_ADAPTER_LIVE_ALLOWLIST`, `ALCHEMY_API_KEY`) are independent of AVALANCHE vars.
- No shared mutable state between EVM and AVALANCHE adapters (separate module scopes, separate env vars, separate RPC providers).

**Remaining gap:** None.

**Required fix:** None.

---

### T10 — Env Leakage

**Description:** Private keys or API keys are logged to stdout or written to DB/audit log payloads.

**Severity:** MEDIUM  
**Likelihood:** LOW

**Current mitigation:**
- `config.ts` `deployerPrivateKey()` returns the raw key but never logs it.
- `dispatcher.ts` does not log the key; `wallet = new ethers.Wallet(pk, provider)` — pk is used once.
- `receiptJson` stored in DB contains: txHash, nonce, from_address, chainId, amountWei — no private key, no API key.
- Proof script env printout: `AVALANCHE_DEPLOYER_PRIVATE_KEY=<SET>` and `DEPLOYER_PRIVATE_KEY=<SET>` — masked, never printed raw.
- `wallet.address` (public address) is stored in receiptJson — not sensitive.

**Remaining gap:** `nonce` is included in receiptJson. Nonce is public on-chain and not sensitive. No gap.

**Required fix:** None.

---

### T11 — Mainnet Promotion Before Governance Signoff

**Description:** Avalanche mainnet contracts are deployed before all 12 promotion gates are satisfied.

**Severity:** HIGH  
**Likelihood:** LOW

**Current mitigation:**
- `AVALANCHE_CONTRACTS` in `shared/contracts-avalanche.ts` has all 8 fields as empty string.
- `isAvalancheContractsPopulated()` returns false — any code checking for mainnet contracts fails gracefully.
- 11 of 12 promotion gates remain OPEN (`AXIOM_AVALANCHE_MAINNET_PROMOTION_GATES.md`).
- Arbitrum One remains canonical — no API route, no product flow queries AVALANCHE_CONTRACTS.
- Deploying mainnet contracts requires `AVALANCHE_PHASE2_REAL_DEPLOY=true` and `AVALANCHE_RPC_URL` pointing to mainnet — explicit operator action.

**Remaining gap:** No code-level enforcement prevents mainnet deploy if someone sets the env vars. This is a governance/process control, not a technical lock. Acceptable at this stage.

**Required fix:** None.

---

### T12 — Fuji/Mainnet Address Confusion

**Description:** Fuji contract addresses are accidentally used in a mainnet deployment, or mainnet addresses are written into Fuji config.

**Severity:** MEDIUM  
**Likelihood:** LOW

**Current mitigation:**
- `shared/contracts-avalanche.ts` separates `FUJI_CONTRACTS` (populated) from `AVALANCHE_CONTRACTS` (empty).
- `getAvalancheContracts(network)` routes by `network` parameter — `'avalanche'` vs `'avalancheFuji'`.
- Hardhat config has separate network entries `avalancheFuji` (chainId 43113) and `avalanche` (chainId 43114).
- `SUPPORTED_LIVE_CHAIN_IDS` would reject a Fuji contract if deployed mainnet (wrong chainId from RPC).

**Remaining gap:** Address confusion is possible if `FUJI_CONTRACTS` values are copy-pasted into `AVALANCHE_CONTRACTS` manually. No automatic prevention. Mitigated by the T03 fix (chainId verification post-provider).

**Required fix:** None (T03 fix reduces mainnet/Fuji confusion risk).

---

### T13 — Migration Compatibility

**Description:** Migration 0059 breaks existing settlement data or fails on apply.

**Severity:** LOW  
**Likelihood:** LOW

**Current mitigation:**
- `ALTER TYPE … ADD VALUE IF NOT EXISTS` — idempotent; safe on re-apply.
- Additive only — no existing enum values removed or renamed.
- Postgres handles `ADD VALUE` safely without locking existing rows.
- `IF NOT EXISTS` prevents error if migration was already applied.
- Existing EVM, STELLAR, INTERNAL, ACH, WIRE, SWIFT records untouched.

**Remaining gap:** `ALTER TYPE ADD VALUE` cannot run inside an explicit transaction block in Postgres 12+. Drizzle runs each migration in its own session — this is fine. The migration comment documents this explicitly.

**Required fix:** None.

---

### T14 — Tx Revert Leaving Instruction in SUBMITTED

**Description:** A broadcasted transaction reverts on-chain. The instruction stays in SUBMITTED indefinitely since there is no automatic revert detection in the adapter.

**Severity:** LOW  
**Likelihood:** LOW (Fuji testnet; controlled smoke amounts)

**Current mitigation:**
- The SUBMITTED → FAILED path exists and is callable via admin action.
- Revert detection is a known design gap in both EVM and AVALANCHE adapters — both delegate confirmation to the webhook/poller path.
- For testnet purposes, the deployer can manually call `externallySettleInstruction` with the reverted txHash (which would fail on the Transfer event check in the proof script, not in capinfra — capinfra doesn't verify the Transfer event itself, only the DB state machine).

**Remaining gap:** Capinfra's `externallySettleInstruction` does not call `eth_getTransactionReceipt` to verify the tx actually succeeded before crediting SETTLED. The proof script manually verifies receipt.status=1, but this is not enforced in the settlement engine.

**Accepted risk:** This is a known design constraint shared by the EVM adapter. Receipt verification at settlement time is deferred to the webhook/confirmation layer. Acceptable for testnet. Pre-mainnet, the webhook implementation should verify receipt.status=1 before calling `externallySettleInstruction`.

**Required fix:** None at this scope. Tracked as a pre-mainnet hardening item.

---

### T15 — Unlimited Country Compliance on Fuji

**Description:** `CountryAllowModule.setAllowAll(MC, true)` disables jurisdiction checking on Fuji. If replicated to mainnet, any wallet could receive AXUSD.

**Severity:** MEDIUM  
**Likelihood:** LOW

**Current mitigation:**
- `setAllowAll(true)` is only called in the Fuji deploy script — not in any mainnet path.
- Promotion gate G02 requires this to be replaced with per-jurisdiction allowlist before mainnet.
- There is no mainnet deployment yet; AVALANCHE_CONTRACTS is empty.

**Accepted risk:** Testnet shortcut only. Accepted pending G02.

---

### T16 — Single EOA Holds All Privileged Contract Roles

**Description:** On Fuji, the deployer EOA holds DEFAULT_ADMIN, AGENT, and MINTER roles on all 8 contracts. A key compromise gives full control over the compliance stack.

**Severity:** HIGH (for mainnet context)  
**Likelihood:** LOW (testnet; no real value at stake)

**Current mitigation:**
- Fuji testnet only — AVAX and testnet AXUSD have no real monetary value.
- Private key is an env secret managed through Replit secrets.
- Promotion gates G03, G04, G05, G06 require role transfer to Gnosis Safe and role renunciation before mainnet.

**Accepted risk:** Acceptable for testnet. Mainnet blockers G03–G06 are in place.
