# AXUSD Earn Vault — AXIOM Risk Council Safe Migration

**Goal:** Replace the unlabeled deployer-EOA owner of the Axiom Earn
AXUSD vault (`0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B`, Arbitrum One)
with a real Safe multisig labeled in `euler-xyz/euler-interfaces`, so
the Euler V2 UI shows **"AXIOM Risk Council"** under both *Owner* and
*Risk Manager* on the vault page (and on every future AXUSD vault that
adopts the same Safe).

This file is the operational runbook. Nothing here mutates chain state
on its own — every step lists exactly which key signs which calldata.

Background context lives in `documents/euler-axusd-earn-vault-audit.md`
§4b. The verification tool is `scripts/audit-axusd-euler-earn-vault.js`.

---

## TL;DR — five steps

| # | Who signs | What | How |
|---|---|---|---|
| 1 | Risk-council member EOA | Deploy the AXIOM Risk Council Safe on Arbitrum at the deterministic CREATE2 address | `app.safe.global` → "Create new Safe" with the chosen signers/threshold/saltNonce, **or** broadcast the calldata printed by `scripts/deploy-axusd-risk-council-safe.js` |
| 2 | Deployer EOA `0x8d78…4C96` (current owner) | `transferOwnership(safe)` on the Earn vault | Calldata from `scripts/transfer-axusd-earn-vault-to-safe.js` (Step 1 in its output) |
| 3 | New Safe (≥ threshold sigs) | `acceptOwnership()` on the Earn vault — Earn vaults are `Ownable2Step` | Import `documents/euler-interfaces-pr/safe-accept-ownership.batch.json` into Safe Tx Builder |
| 4 | New Safe (≥ threshold sigs) | `setCurator(safe)` on the Earn vault — gives it the *Risk Manager* role | Same batch (Step 3 in its output, included by default) |
| 5 | Anyone | PR against `euler-xyz/euler-interfaces` adding `axiomRiskCouncil` to `addresses/42161/MultisigAddresses.json` | Use `documents/euler-interfaces-pr/PR_DESCRIPTION.md` + `MultisigAddresses.patch.json` |

After step 5 merges and Euler does its next interfaces-bundle redeploy,
re-run `node scripts/audit-axusd-euler-earn-vault.js` and confirm both
*Owner label* and *Curator label* flip to `LABELED ✓`.

---

## 1. Choose signers

Decide the signer set + threshold *before* running step 2 — the Safe's
address is a CREATE2 derivation of `(signers, threshold, saltNonce)`,
so changing them later means redoing every subsequent step.

Recommended starting point: **2-of-3** with the deployer EOA + two
council members. Easy to re-key later via Safe's `addOwnerWithThreshold`
/ `removeOwner` flows without changing the Safe address.

## 2. Predict + deploy the Safe

```bash
SIGNERS="0xaaa...,0xbbb...,0xccc..." \
THRESHOLD=2 \
SALT_NONCE=1 \
node scripts/deploy-axusd-risk-council-safe.js
```

The script prints:

- the **predicted Safe address** (deterministic CREATE2 — both the
  Safe web UI and the raw factory call land on the same address as
  long as the inputs match),
- raw calldata to `SafeProxyFactory.createProxyWithNonce(...)` for
  whoever wants to broadcast the deploy directly,
- and writes the predicted address into
  `documents/euler-interfaces-pr/MultisigAddresses.patch.json` so the
  PR snippet stays in sync.

If you prefer the UI flow, use `app.safe.global` → "Create new Safe"
with the *exact same* signers (in the same order), threshold, and
"Advanced → saltNonce". The resulting Safe will match the predicted
address.

## 3. Hand over the Earn vault

Once the Safe exists on-chain, run:

```bash
SAFE=0x<predicted-safe> node scripts/transfer-axusd-earn-vault-to-safe.js
```

It prints calldata for the three handover steps (transferOwnership →
acceptOwnership → setCurator) and writes
`documents/euler-interfaces-pr/safe-accept-ownership.batch.json` for
the new Safe to import into Transaction Builder.

> **Why two-step transfer:** Euler Earn vaults inherit `Ownable2Step`,
> so the new owner must call `acceptOwnership()` to take effect. This
> protects against a typo in the new-owner address sending the vault
> into a dead end.

## 4. PR against `euler-xyz/euler-interfaces`

Open a PR adding the Safe address to
`addresses/42161/MultisigAddresses.json` under the key
`axiomRiskCouncil` (matches the file's existing camelCase).

Everything you need is in `documents/euler-interfaces-pr/`:

- `MultisigAddresses.patch.json` — the actual JSON snippet (the
  predicted address is filled in automatically by step 2).
- `PR_DESCRIPTION.md` — copy/paste body for the PR, including the
  diff and reviewer verification steps.

## 5. Verify after merge

After Euler ships the next interfaces bundle:

```bash
node scripts/audit-axusd-euler-earn-vault.js
```

Expected diff in the verdict block:

```
- Owner label:    UNLABELED ✗ (deployer EOA — UI shows raw address)
- Curator label:  NONE (curator=0x0 — UI typically shows "None" or owner)
+ Owner label:    LABELED ✓
+ Curator label:  LABELED ✓
```

The Euler V2 UI will then show **AXIOM Risk Council** under both
*Owner* and *Risk Manager* on the Axiom Earn AXUSD vault page, and on
any other Arbitrum vault whose `owner` / `curator` is the same Safe.

---

## Appendix A — Signer rotation (without changing the Safe address)

The Safe address is a CREATE2 derivation of `(initial signers, initial
threshold, saltNonce)` — but **owner-set mutations after deploy do not
change the address**. Adding/removing signers or moving the threshold
happens via `OwnerManager` calls *inside the existing proxy*, and the
proxy's address (and therefore the `axiomRiskCouncil` label registered
in `euler-xyz/euler-interfaces`) is preserved.

> **⚠️ Do not "re-deploy" to rotate signers.** Running
> `scripts/deploy-axusd-risk-council-safe.js` again with a different
> signer set, threshold, or saltNonce produces a **different** Safe at
> a **different** address. The Euler UI would silently fall back to the
> raw address (the labeled one no longer holds the role) and you'd have
> to redo steps 3–5 from scratch. Always rotate **inside** the existing
> Safe.

### A.1 The four rotation primitives

All four calls below are sent **by the Safe to itself** — i.e. they are
ordinary Safe transactions that need ≥ threshold signatures from the
*current* owners.

| Action | Function (on the Safe) | When to use |
|---|---|---|
| Add a signer | `addOwnerWithThreshold(newOwner, threshold)` | A new council member joins. Optionally bumps threshold in the same tx. |
| Remove a signer | `removeOwner(prevOwner, owner, threshold)` | A signer leaves or a key is rotated out. Drops the count by 1; you must also pass the new threshold (≤ remaining owners). |
| Replace a signer | `swapOwner(prevOwner, oldOwner, newOwner)` | A signer rotates one key for another (e.g. lost-key recovery while the old quorum is still reachable). Threshold unchanged. |
| Re-key threshold only | `changeThreshold(threshold)` | Move from 2-of-3 ↔ 3-of-3 etc. without changing the owner set. |

`prevOwner` is the linked-list predecessor of `owner` in
`Safe.getOwners()` (or the sentinel `0x0000…0001` if `owner` is the
first entry). The helper script computes it for you from a live RPC
read; you only need to pass `PREV_OWNER=0x...` explicitly when the
RPC lookup is unavailable (e.g. running fully offline).

### A.2 Helper script

```bash
# Add a new council member, bump threshold to 2.
SAFE=0x<existing-safe> ACTION=add \
  NEW_OWNER=0x<new-member> THRESHOLD=2 \
  node scripts/rotate-axusd-risk-council-safe-signers.js

# Replace a lost key in-place (threshold unchanged).
SAFE=0x<existing-safe> ACTION=swap \
  OLD_OWNER=0x<lost-key> NEW_OWNER=0x<replacement> \
  node scripts/rotate-axusd-risk-council-safe-signers.js

# Remove a departing signer, lower threshold to match.
SAFE=0x<existing-safe> ACTION=remove \
  OLD_OWNER=0x<leaver> THRESHOLD=2 \
  node scripts/rotate-axusd-risk-council-safe-signers.js

# Just bump the threshold.
SAFE=0x<existing-safe> ACTION=threshold THRESHOLD=3 \
  node scripts/rotate-axusd-risk-council-safe-signers.js
```

For each action the script:

- Reads the live owner set / threshold via RPC and sanity-checks the
  request (e.g. refuses to "add" a signer that's already an owner, or
  set a threshold above the post-rotation owner count).
- Resolves `prevOwner` from the on-chain linked list when needed.
- Prints raw calldata targeting the Safe address itself.
- Writes a Safe Transaction Builder batch JSON to
  `documents/euler-interfaces-pr/safe-rotate-<action>.batch.json`
  (override with `OUT=...`) that the existing signers can import via
  `app.safe.global → Apps → Transaction Builder → Load batch`.

### A.3 Example Safe Tx Builder batch (add + raise threshold)

The script emits, e.g. for `ACTION=add NEW_OWNER=0xNEW THRESHOLD=2`:

```json
{
  "version": "1.0",
  "chainId": "42161",
  "meta": {
    "name": "AXIOM Risk Council — rotate signers (add)",
    "description": "In-place owner-set rotation on the existing Safe 0x<safe>. Action: addOwnerWithThreshold(0xNEW, 2). Executed inside the existing Safe proxy so its CREATE2 address — and the axiomRiskCouncil label registered in euler-xyz/euler-interfaces — are preserved."
  },
  "transactions": [
    {
      "to": "0x<safe>",
      "value": "0",
      "data": "0x0d582f13000000000000000000000000<NEW>0000000000000000000000000000000000000000000000000000000000000002"
    }
  ]
}
```

After import, collect the *current* signers' approvals and execute.
The Safe address and its registered label are unchanged; only the
owner set / threshold inside the proxy are updated.

---

## Files added by this task

| File | Purpose |
|---|---|
| `scripts/deploy-axusd-risk-council-safe.js` | Predicts + prints the deploy calldata for the AXIOM Risk Council Safe; emits the PR JSON patch. |
| `scripts/transfer-axusd-earn-vault-to-safe.js` | Emits `transferOwnership` / `acceptOwnership` / `setCurator` calldata + a Safe Tx Builder batch JSON for the handover. |
| `scripts/rotate-axusd-risk-council-safe-signers.js` | Emits in-place `addOwnerWithThreshold` / `removeOwner` / `swapOwner` / `changeThreshold` calldata + a Safe Tx Builder batch — for rotating signers without changing the Safe's CREATE2 address (Appendix A). |
| `documents/euler-axusd-risk-council-safe.md` | This runbook. |
| `documents/euler-interfaces-pr/PR_DESCRIPTION.md` | Drop-in PR body for `euler-xyz/euler-interfaces`. |
| `documents/euler-interfaces-pr/MultisigAddresses.patch.json` | JSON snippet to add to `addresses/42161/MultisigAddresses.json` (auto-filled by step 2). |
| `documents/euler-interfaces-pr/safe-accept-ownership.batch.json` | Safe Tx Builder batch the new Safe imports to accept ownership + set curator (auto-generated by step 3). |
| `documents/euler-interfaces-pr/safe-rotate-<action>.batch.json` | Safe Tx Builder batch for an in-place signer rotation (auto-generated by Appendix A's helper). |

No existing scripts or contracts were modified. No on-chain transactions
have been sent by this task — every state change is gated on a human
signing the calldata above.
