# 03 — Registry Governance Request Payload

> **Note (2026-04-17 — corrected):** an earlier draft of this document
> assumed registration happens via a pull request to
> `euler-xyz/euler-interfaces`. That is incorrect. The Arbitrum
> `oracleAdapterRegistry` (`0x3942A72f87Db5Ad9C22d8826FDe15E23b81b1cBf`)
> is governed by `Ownable`, owner =
> `0xb3dCA151d92c6e40450e67098444DcF60d99Bc3d` (Euler governance
> multisig). Registration is **on-chain only** — there is no JSON file
> in the `euler-interfaces` repo for adapters. The unblock is a
> governance request to the registry owner asking them to call `add()`.
> Outreach instructions live in `04-outreach-template.md`.

This document contains the exact governance call data Axiom needs Euler
to execute on Arbitrum One in order to register the USDC/USD adapter.

It should be requested **at the same time** as the AXUSD/USD adapter so
the two `add()` calls can be batched into a single Euler governance
transaction.

## Target

| Field | Value |
|---|---|
| Network | Arbitrum One (chainId 42161) |
| Registry | `0x3942A72f87Db5Ad9C22d8826FDe15E23b81b1cBf` (`oracleAdapterRegistry`) |
| Registry owner | `0xb3dCA151d92c6e40450e67098444DcF60d99Bc3d` (Euler governance multisig) |
| Function | `add(address element, address base, address quote)` |
| Access | `onlyOwner` |

## Call payload

```
to:    0x3942A72f87Db5Ad9C22d8826FDe15E23b81b1cBf
value: 0
data:  add(
         element = 0x49EBE245b8fAC6f9cF70c2Ca415e0749fB602E61,  // ChainlinkUSDCOracleAdapter
         base    = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,  // USDC (Arbitrum native)
         quote   = 0x0000000000000000000000000000000000000348   // USD pseudo
       )
```

Solidity-encoded selector + calldata (for direct multisig submission):

```
function: add(address,address,address)
selector: 0xa693686f   (= keccak256("add(address,address,address)")[:4])
args:
  0x00000000000000000000000049EBE245b8fAC6f9cF70c2Ca415e0749fB602E61
  0x000000000000000000000000af88d065e77c8cC2239327C5EDb3A432268e5831
  0x0000000000000000000000000000000000000000000000000000000000000348

full calldata (for paste into a multisig "raw transaction" field):
0xa693686f00000000000000000000000049ebe245b8fac6f9cf70c2ca415e0749fb602e61000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e58310000000000000000000000000000000000000000000000000000000000000348
```

Reproduce locally:

```js
const { ethers } = require('ethers');
new ethers.Interface([
  'function add(address element, address base, address quote)'
]).encodeFunctionData('add', [
  '0x49EBE245b8fAC6f9cF70c2Ca415e0749fB602E61', // adapter
  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
  '0x0000000000000000000000000000000000000348', // USD pseudo
]);
```

Expected event on success:

```
Added(
  element = 0x49EBE245b8fAC6f9cF70c2Ca415e0749fB602E61,
  asset0  = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
  asset1  = 0x0000000000000000000000000000000000000348,
  addedAt = block.timestamp
)
```

## Adapter facts (paste into outreach / governance proposal)

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
> This submission is paired with the AXUSD/USD adapter request
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
> Blockscout also verifies the feed binding — there is no deploy-time
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
> Adapter:    `0x49EBE245b8fAC6f9cF70c2Ca415e0749fB602E61` (Blockscout-verified)
> Base:       `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` (USDC)
> Quote:      `0x0000000000000000000000000000000000000348` (USD pseudo)
> Underlying: `0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3` (Chainlink USDC/USD)
> Network:    Arbitrum One (42161)
> Deploy tx:  `0x38c1745690ad9d5949c9b0f1ebbfcda056c2956a16310f3a1c24ca68fdf13a0b`
> Source:     `contracts/oracle/ChainlinkUSDCOracleAdapter.sol`
> Explorer:   https://arbitrum.blockscout.com/address/0x49EBE245b8fAC6f9cF70c2Ca415e0749fB602E61#code

## Pre-request checklist (Axiom side)

- [ ] `node scripts/check-usdc-usd-adapter-registry.js` shows no
      pre-existing valid USDC/USD adapter (re-confirm right before
      sending outreach)
- [x] Adapter deployed to Arbitrum One via
      `scripts/deploy-usdc-usd-chainlink-adapter.js`
- [x] Address recorded above
- [x] Source verified on Arbitrum Blockscout
- [ ] Conformance script run, all checks pass — capture output for the proposal
- [ ] AXUSD/USD adapter requested in the same session (so Euler can
      batch the two governance txs)
- [ ] AXIOM team has reviewed the proposal text for accuracy
- [ ] Outreach to Euler Labs queued (see `04-outreach-template.md`)

## Post-request checklist (Euler side, tracked)

- [ ] Governance request acknowledged
- [ ] Governance tx scheduled (ideally batched with the AXUSD/USD request)
- [ ] Governance tx executed:
      `oracleAdapterRegistry.add(0x49EB…2E61, USDC, USD)`
- [ ] On-chain confirmation via
      `oracleAdapterRegistry.isValid(0x49EB…2E61, ts)` returning true

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
