# Euler Oracle Adapter Submission Package — USDC/USD (Arbitrum)

This directory contains everything needed to submit the **USDC/USD price
adapter** (`ChainlinkUSDCOracleAdapter`) to Euler Finance's
`oracleAdapterRegistry` on Arbitrum One. It is the collateral-leg
counterpart to the AXUSD/USD adapter submitted via
`documents/euler-adapter-submission-package/`.

The canonical AXUSD eVault uses USDC as collateral. For
`eulerUngoverned0xPerspective` to verify the vault, the `EulerRouter` it
uses must price BOTH legs:

| Leg | Pair | Adapter |
|---|---|---|
| Asset | AXUSD/USD | `AXUSDPegOracleAdapter` (separate submission) |
| Collateral | USDC/USD | `ChainlinkUSDCOracleAdapter` (this submission) |

Without both adapters in `oracleAdapterRegistry`, perspective
verification still fails on the collateral leg with
`ERROR__ORACLE_INVALID_ADAPTER (512)`.

## What is being submitted

| Field | Value |
|---|---|
| Adapter contract | `ChainlinkUSDCOracleAdapter` (`contracts/oracle/ChainlinkUSDCOracleAdapter.sol`) |
| Network | Arbitrum One (chain id 42161) |
| Base | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` (native USDC) |
| Quote | `0x0000000000000000000000000000000000000348` (USD pseudo, ISO 4217 numeric 840) |
| Adapter type | `Chainlink` |
| Pricing | Chainlink USDC/USD aggregator `0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3` (8 dec) |
| Staleness window | 86400 s (24h heartbeat, immutable constant) |
| Governance | None — adapter has no setters |
| External calls | One: `latestRoundData()` on the Chainlink aggregator |
| Deployed at | `0x49EBE245b8fAC6f9cF70c2Ca415e0749fB602E61` (Arbitrum One, block 453471601) |
| Deploy tx | `0x38c1745690ad9d5949c9b0f1ebbfcda056c2956a16310f3a1c24ca68fdf13a0b` |
| Deployer | `0x8d7892CF226B43d48B6e3ce988A1274e6D114C96` (EOA) |
| Gas used | 456,434 |
| Wrapped feed | `0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3` (Chainlink USDC/USD, 8 dec, 24h heartbeat) |
| Post-deploy probe | `getQuote(1e6 USDC, USDC, USD) = 99984400` (≈ $0.999844, live feed) ; `getQuote(1e8 USD, USD, USDC) = 1000156` ✓ |

## Why this adapter is fit for the registry

Euler's adapter registry accepts adapters that are:

1. **Single-pair** — one `(base, quote)` per registry entry.
2. **Bidirectional** — non-zero quote in both directions.
3. **Immutable** — no governance, no setters, no upgradeable storage.
4. **Fail-closed on staleness** — reverts if the underlying feed is
   stale, never silently returns the last good value.
5. **ERC-7726 conformant** — the standard
   `getQuote(inAmount, base, quote)` signature.

`ChainlinkUSDCOracleAdapter` satisfies all five. The contract is ~180
lines including the inline ERC-3643/Chainlink interface and zero
storage. Conformance is provable by the verification script in
`scripts/verify-usdc-usd-chainlink-adapter.js`.

## Why we are NOT reusing an existing adapter

Probing the Euler `oracleAdapterRegistry` on Arbitrum One on 2026-04-17
returned **zero `Added(...)` events** — the registry has no entries on
this chain, including no USDC/USD adapter. There is therefore no
pre-existing registry-accepted adapter to reuse.

The reproducible probe is in `scripts/check-usdc-usd-adapter-registry.js`;
re-run it before opening the PR to confirm the situation has not
changed (i.e. another submitter beat us to it). If a registry-accepted
USDC/USD adapter exists at the time of submission, abandon this
submission and use the existing one as `USDC_USD_ADAPTER` for the
canonical AXUSD vault deploy script instead.

## Submission steps (chronological)

> **Note:** an earlier draft listed step 4 as "open a PR against
> `euler-xyz/euler-interfaces`". That repo holds no per-adapter JSON
> file; the `oracleAdapterRegistry` is on-chain only and only the
> registry owner (Euler governance multisig) can call `add()`. Step 4
> is therefore an off-chain governance request, not a PR.

| # | Step | Owner | Status |
|---|------|-------|--------|
| 0 | Re-confirm registry is empty (`node scripts/check-usdc-usd-adapter-registry.js`) | AXIOM | pending |
| 1 | Deploy adapter (`scripts/deploy-usdc-usd-chainlink-adapter.js`) | AXIOM deployer | done — block 453471601, tx `0x38c17456…3a0b` |
| 2 | Verify on Arbitrum Blockscout (`npx hardhat verify --network arbitrum`) | AXIOM deployer | done — https://arbitrum.blockscout.com/address/0x49EBE245b8fAC6f9cF70c2Ca415e0749fB602E61#code |
| 3 | Run conformance script and capture output for the proposal | AXIOM | pending |
| 4 | Send governance request to Euler Labs asking the registry owner to call `oracleAdapterRegistry.add(adapter, USDC, USD)` (template in [04-outreach-template.md](./04-outreach-template.md), call payload in [03-registry-pr-payload.md](./03-registry-pr-payload.md)) | AXIOM | pending |
| 5 | Wait for Euler governance tx | Euler Labs | pending |
| 6 | Re-run `scripts/deploy-axusd-evk-vault-canonical.js` against the new canonical AXUSD vault (without `SKIP_PERSPECTIVE_VERIFY` / `SKIP_RENOUNCE`) to confirm `perspectiveVerify` succeeds | AXIOM | pending |
| 7 | Confirm Euler V2 UI shows recognized vault type / risk manager and `scripts/audit-axusd-evk-vault.js` shows green on both oracle rows | AXIOM | pending |

Steps 0–4 are the AXIOM scope of this task. Steps 5–7 wait on Euler
governance and the canonical vault redeploy (tracked separately).

This submission should be sent **at the same time** as the AXUSD/USD
adapter submission so the two can be batched into a single Euler
governance multisig transaction.

## Files in this package

| File | Purpose |
|---|---|
| `README.md` (this file) | Index and submission timeline |
| `01-adapter-spec.md` | Technical specification of `ChainlinkUSDCOracleAdapter` |
| `02-audit-checklist.md` | Standard Euler oracle-adapter review questions, answered |
| `03-registry-pr-payload.md` | Governance call payload (the exact `add(…)` calldata for Euler's multisig) |
| `04-outreach-template.md` | Discord / email message templates for the Euler governance request |

## Related artifacts in the repo

| File | Role |
|---|---|
| `contracts/oracle/ChainlinkUSDCOracleAdapter.sol` | The adapter contract being submitted |
| `scripts/deploy-usdc-usd-chainlink-adapter.js` | Deployment script (idempotent printout, single tx) |
| `scripts/verify-usdc-usd-chainlink-adapter.js` | Read-only conformance harness — attach output to the PR |
| `scripts/check-usdc-usd-adapter-registry.js` | Pre-submission reuse check — confirms registry status |
| `documents/euler-adapter-submission-package/` | Sister submission for the AXUSD/USD adapter |
| `documents/euler-axusd-vault-unknown-fix.md` | Upstream context: why both submissions exist |
| `scripts/deploy-axusd-evk-vault-canonical.js` | Vault deploy that consumes both adapters |
| `scripts/audit-axusd-evk-vault.js` | Vault-side audit; both oracle rows turn green once both registry txs land |
