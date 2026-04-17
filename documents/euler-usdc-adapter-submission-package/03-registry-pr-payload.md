# 03 — Registry PR Payload

This document contains the **exact** content to drop into a pull
request against
[`euler-xyz/euler-interfaces`](https://github.com/euler-xyz/euler-interfaces).

The Euler maintainers use the merged `addresses/42161/...` files to
build the governance transaction that calls
`oracleAdapterRegistry.add(adapter, base, quote)` on Arbitrum
(`oracleAdapterRegistry` = `0x3942A72f87Db5Ad9C22d8826FDe15E23b81b1cBf`).
The on-chain registration tx is signed by Euler governance, **not** by
Axiom — that is what makes this an off-chain coordination task.

This PR should be opened **at the same time** as the AXUSD/USD adapter
PR so the two can be batched into a single Euler governance
transaction.

## Branch / PR title

```
arbitrum: register ChainlinkUSDCOracleAdapter (USDC/USD)
```

## PR description (paste verbatim)

> Adds a USDC/USD price adapter to the Arbitrum One
> `oracleAdapterRegistry`. The adapter wraps the Chainlink `USDC / USD`
> aggregator at `0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3` (8 dec, 24h
> heartbeat) and exposes USDC↔USD pricing via ERC-7726.
>
> The adapter is a `Chainlink` adapter — the same pattern used for
> other Chainlink-sourced USD feeds in the registry. It is immutable,
> single-pair, bidirectional, ERC-7726 conformant, fail-closed on
> staleness, and performs exactly one external call
> (`latestRoundData()`).
>
> ### Why a separate USDC/USD adapter
> This submission is paired with the AXUSD/USD adapter PR
> (`AXUSDPegOracleAdapter`). The canonical AXUSD eVault uses USDC as
> collateral; for `eulerUngoverned0xPerspective` to verify the vault
> the EulerRouter must price BOTH the asset (AXUSD) and the collateral
> (USDC). On Arbitrum One the registry currently has no USDC/USD
> adapter (probed via `Added(...)` events on
> `0x3942A72f87Db5Ad9C22d8826FDe15E23b81b1cBf` on 2026-04-17 — zero
> entries to date), so one must be deployed and registered.
>
> ### Why hard-code the feed
> The Chainlink feed address is a `constant` baked into bytecode rather
> than a constructor parameter. This means verifying the contract on
> Arbiscan also verifies the feed binding — there is no deploy-time
> knob for an attacker to mis-set.
>
> ### Submission package
> Full submission package, audit checklist, source, deploy script,
> verification harness, and the registry-reuse probe are in the AXIOM
> repo at `documents/euler-usdc-adapter-submission-package/`. Mirror
> copy available on request.
>
> ### Conformance
> Output of `node scripts/verify-usdc-usd-chainlink-adapter.js` against
> the deployed adapter is attached below.
>
> ### Address
> Adapter:    `<DEPLOYED_ADDRESS>` (Arbiscan-verified, see deploy tx)
> Base:       `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` (USDC)
> Quote:      `0x0000000000000000000000000000000000000348` (USD pseudo)
> Underlying: `0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3` (Chainlink USDC/USD)
> Network:    Arbitrum One (42161)
> Deploy tx:  `<TX_HASH>`
> Source:     `contracts/oracle/ChainlinkUSDCOracleAdapter.sol`

## File changes

### 1. `addresses/42161/SnapshotRegistry/oracleAdapterRegistry.json`

Append the entry below to the existing JSON array. Field names mirror
existing entries in the registry — confirm the exact schema with the
maintainers before committing (the file structure may include extra
fields like `addedAt` that are populated post-merge).

```json
{
  "adapter": "<DEPLOYED_ADDRESS>",
  "base":    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  "quote":   "0x0000000000000000000000000000000000000348",
  "name":    "ChainlinkUSDCOracleAdapter",
  "type":    "Chainlink",
  "feed":    "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3",
  "feedDescription": "USDC / USD",
  "feedDecimals": 8,
  "maxStaleness": 86400,
  "deployer":"<DEPLOYER_EOA>",
  "deployTx":"<TX_HASH>",
  "deployBlock": <BLOCK_NUMBER>,
  "verified": true
}
```

### 2. `addresses/42161/labels.json` — optional, if format requires

```json
"<DEPLOYED_ADDRESS>": "ChainlinkUSDCOracleAdapter (USDC/USD, Chainlink)"
```

### 3. Conformance attachment

Attach the full output of
`DEPLOYED=<addr> node scripts/verify-usdc-usd-chainlink-adapter.js`
as a comment on the PR (or as a code block in the PR description).
Every check should be `[PASS]`. If any check is `[FAIL]`, do not open
the PR until the underlying issue is resolved.

## Pre-PR checklist (Axiom side)

- [ ] `node scripts/check-usdc-usd-adapter-registry.js` shows no
      pre-existing valid USDC/USD adapter (re-confirm right before
      opening the PR)
- [ ] Adapter deployed to Arbitrum One via
      `scripts/deploy-usdc-usd-chainlink-adapter.js`
- [ ] Address recorded above
- [ ] Source verified on Arbiscan
      (`npx hardhat verify --network arbitrum <addr>`)
- [ ] Conformance script run, all checks pass
- [ ] Conformance output captured for the PR description
- [ ] AXUSD/USD adapter PR opened in the same session (so Euler can
      batch the two governance txs)
- [ ] AXIOM team has reviewed the PR description for accuracy
- [ ] Outreach to Euler Labs queued (see `04-outreach-template.md`)

## Post-PR checklist (Euler side, tracked)

- [ ] PR reviewed by Euler Labs
- [ ] Governance tx scheduled (ideally batched with the AXUSD/USD PR)
- [ ] Governance tx executed:
      `oracleAdapterRegistry.add(<addr>, USDC, USD)`
- [ ] On-chain confirmation via
      `oracleAdapterRegistry.isValid(<addr>, ts)` returning true

## Post-acceptance checklist (Axiom side, tracked)

- [ ] Re-run `node scripts/audit-axusd-evk-vault.js` against the
      canonical AXUSD vault — both oracle rows turn green
- [ ] Re-run `scripts/deploy-axusd-evk-vault-canonical.js` without
      `SKIP_PERSPECTIVE_VERIFY=1` and without `SKIP_RENOUNCE=1` so the
      vault perspective-verifies and renounces governance
- [ ] Confirm Euler V2 UI shows recognized vault type and (for the
      Ungoverned-0x case) "Risk manager: None"
- [ ] Update `replit.md` and
      `documents/euler-axusd-vault-unknown-fix.md` with the
      registration tx hash and the timestamp at which the UI labels
      updated
