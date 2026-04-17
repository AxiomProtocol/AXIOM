# Euler Oracle Adapter Submission Package — AXUSD/USD

This directory contains everything needed to submit the **AXUSD/USD price
adapter** to Euler Finance's `oracleAdapterRegistry` on Arbitrum One. Once
accepted, AXUSD-asset eVaults can be perspective-verified by
`eulerUngoverned0xPerspective` and `eulerUngovernedNzxPerspective`,
removing the **Vault type: Unknown** / **Risk manager: Unknown** labels
in the Euler V2 UI.

## What is being submitted

| Field | Value |
|---|---|
| Adapter contract | `AXUSDPegOracleAdapter` (`contracts/oracle/AXUSDPegOracleAdapter.sol`) |
| Network | Arbitrum One (chain id 42161) |
| Base | `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7` (AXUSD ERC-3643) |
| Quote | `0x0000000000000000000000000000000000000348` (USD pseudo, ISO 4217 numeric 840) |
| Adapter type | `FixedRate` |
| Pricing | 1 AXUSD = 1.000 USD (fixed peg, immutable) |
| Governance | None — adapter has no setters |
| External calls | None — pure decimal conversion |
| Deployed at | `0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6` (Arbitrum One, block 453471379) |
| Deploy tx | `0x1274edad7ec6a203ce2df57a3416bcfd6b6a01b11fb9bac1b3c5934728517ee5` |
| Deployer | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` (EOA) |
| Gas used | 320,204 |
| Post-deploy probe | `getQuote(1e18 AXUSD, AXUSD, USD) = 100000000` ✓ ; `getQuote(1e8 USD, USD, AXUSD) = 1e18` ✓ |

## Why this adapter is fit for the registry

Euler's adapter registry accepts adapters that are:

1. **Single-pair** — one `(base, quote)` per registry entry.
2. **Bidirectional** — non-zero quote in both directions.
3. **Immutable** — no governance, no setters, no upgradeable storage.
4. **Deterministic and fail-open-only-on-overflow** — no external reads, no
   staleness windows, no fallbacks that could hide pricing failures.
5. **ERC-7726 conformant** — the standard `getQuote(inAmount, base, quote)`
   signature.

`AXUSDPegOracleAdapter` satisfies all five. The contract is 105 lines
including comments and has zero storage. Conformance is provable by the
verification script in `scripts/verify-axusd-peg-adapter.js`.

## Why we are NOT submitting the existing AXIOMOracleAdapter

The pre-existing adapter at `0xc894d1500CB1FBf8F045e87bd357A51345197c4e` was
written for AXIOM-internal use and **does not satisfy the registry's
preconditions**. Submitting it would (a) fail Euler's review and (b)
endanger users if accepted. See
[05-why-not-existing-adapter.md](./05-why-not-existing-adapter.md) for the
detailed rejection rationale and on-chain evidence.

## Submission steps (chronological)

> **Note:** an earlier draft listed step 4 as "open a PR against
> `euler-xyz/euler-interfaces`". That repo holds no per-adapter JSON
> file; the `oracleAdapterRegistry` is on-chain only and only the
> registry owner (Euler governance multisig) can call `add()`. Step 4
> is therefore an off-chain governance request, not a PR.

| # | Step | Owner | Status |
|---|------|-------|--------|
| 1 | Deploy adapter (`scripts/deploy-axusd-peg-adapter.js`) | AXIOM deployer | done — block 453471379, tx `0x1274edad…17ee5` |
| 2 | Verify on Arbitrum Blockscout (`npx hardhat verify --network arbitrum`) | AXIOM deployer | done — https://arbitrum.blockscout.com/address/0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6#code |
| 3 | Run conformance script and capture output for the proposal | AXIOM | pending |
| 4 | Send governance request to Euler Labs asking the registry owner to call `oracleAdapterRegistry.add(adapter, AXUSD, USD)` (template in [04-outreach-template.md](./04-outreach-template.md), call payload in [03-registry-pr-payload.md](./03-registry-pr-payload.md)) | AXIOM | pending |
| 5 | Wait for Euler governance tx | Euler Labs | pending |
| 6 | Re-run `scripts/fix-axusd-evk-vault-metadata.js` against the new canonical AXUSD vault to confirm `perspectiveVerify` succeeds | AXIOM | pending |
| 7 | Confirm Euler V2 UI shows recognized vault type / risk manager | AXIOM | pending |

Steps 1–4 are the AXIOM scope of this task. Steps 5–7 wait on Euler
governance and the canonical vault redeploy (tracked separately).

## Files in this package

| File | Purpose |
|---|---|
| `README.md` (this file) | Index and submission timeline |
| `01-adapter-spec.md` | Technical specification of `AXUSDPegOracleAdapter` |
| `02-audit-checklist.md` | Standard Euler oracle-adapter review questions, answered |
| `03-registry-pr-payload.md` | Governance call payload (the exact `add(…)` calldata for Euler's multisig) |
| `04-outreach-template.md` | Discord / email message templates for the Euler governance request |
| `05-why-not-existing-adapter.md` | Rejection rationale for `0xc894...7c4e` with on-chain probe results |

## Related artifacts in the repo

| File | Role |
|---|---|
| `contracts/oracle/AXUSDPegOracleAdapter.sol` | The adapter contract being submitted |
| `scripts/deploy-axusd-peg-adapter.js` | Deployment script (idempotent printout, single tx) |
| `scripts/verify-axusd-peg-adapter.js` | Read-only conformance harness — attach output to the PR |
| `documents/euler-axusd-vault-unknown-fix.md` | Upstream context: why this submission exists |
| `scripts/audit-axusd-evk-vault.js` | Vault-side audit; will turn green once registry tx lands |
| `scripts/fix-axusd-evk-vault-metadata.js` | Idempotent perspective-verify call; safe to re-run |
