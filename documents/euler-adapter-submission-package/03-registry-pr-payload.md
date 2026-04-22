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
> The full PR-flow boilerplate has been removed below; outreach
> instructions live in `04-outreach-template.md`.

This document contains the exact governance call data Axiom needs Euler
to execute on Arbitrum One in order to register the AXUSD/USD adapter.

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
         element = 0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6,  // AXUSDPegOracleAdapter
         base    = 0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7,  // AXUSD
         quote   = 0x0000000000000000000000000000000000000348   // USD pseudo
       )
```

Solidity-encoded selector + calldata (for direct multisig submission):

```
function: add(address,address,address)
selector: 0xa693686f   (= keccak256("add(address,address,address)")[:4])
args:
  0x0000000000000000000000001862D3c85382c4f4b81a9a9e0d31b289963D70d6
  0x000000000000000000000000D6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7
  0x0000000000000000000000000000000000000000000000000000000000000348

full calldata (for paste into a multisig "raw transaction" field):
0xa693686f0000000000000000000000001862d3c85382c4f4b81a9a9e0d31b289963d70d6000000000000000000000000d6110f59a978ada6ef5c0e9d6baa04455d46ade70000000000000000000000000000000000000000000000000000000000000348
```

Reproduce locally:

```js
const { ethers } = require('ethers');
new ethers.Interface([
  'function add(address element, address base, address quote)'
]).encodeFunctionData('add', [
  '0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6', // adapter
  '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7', // AXUSD
  '0x0000000000000000000000000000000000000348', // USD pseudo
]);
```

Expected event on success:

```
Added(
  element = 0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6,
  asset0  = 0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7,
  asset1  = 0x0000000000000000000000000000000000000348,
  addedAt = block.timestamp
)
```

## Adapter facts (paste into outreach / governance proposal)

> Adds the AXUSD/USD price adapter to the Arbitrum One
> `oracleAdapterRegistry`. AXUSD is a USD-pegged ERC-3643 stablecoin
> issued by Axiom Protocol, fully backed 1:1 by USDC through
> `CanonicalPSM` (`contracts/axusd/CanonicalPSM.sol`).
>
> The adapter is a `FixedRate` adapter (1 AXUSD = 1.000 USD) — the same
> pattern used for other USD-pegged stablecoins in the registry. It is
> immutable, single-pair, bidirectional, ERC-7726 conformant, and
> performs no external calls.
>
> ### Why a fixed-rate adapter
> The AXUSD peg is a contract guarantee, not a market-discovered price.
> `CanonicalPSM` mints AXUSD only against 1:1 USDC deposits and burns
> AXUSD only against 1:1 USDC redemptions. A market-price oracle would
> introduce phantom volatility around a structurally maintained peg.
>
> ### Submission package
> Full submission package, audit checklist, source, deploy script,
> verification harness, and the rejection rationale for the prior
> AXIOM adapter (which was unsuitable for the registry) is in the AXIOM
> repo at `documents/euler-adapter-submission-package/`. Mirror copy
> available on request.
>
> ### Conformance
> Output of `node scripts/verify-axusd-peg-adapter.js` against the
> deployed adapter is attached below.
>
> ### Address
> Adapter:    `0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6` (Blockscout-verified)
> Base:       `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7` (AXUSD)
> Quote:      `0x0000000000000000000000000000000000000348` (USD pseudo)
> Network:    Arbitrum One (42161)
> Deploy tx:  `0x1274edad7ec6a203ce2df57a3416bcfd6b6a01b11fb9bac1b3c5934728517ee5`
> Source:     `contracts/oracle/AXUSDPegOracleAdapter.sol`
> Explorer:   https://arbitrum.blockscout.com/address/0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6#code

## Pre-request checklist (Axiom side)

- [x] Adapter deployed to Arbitrum One via `scripts/deploy-axusd-peg-adapter.js`
- [x] Address recorded above
- [x] Source verified on Arbitrum Blockscout
- [ ] Conformance script run, all checks pass — capture output for the proposal
- [ ] AXIOM team has reviewed the proposal text for accuracy
- [ ] Outreach to Euler Labs queued (see `04-outreach-template.md`)

## Post-request checklist (Euler side, tracked)

- [ ] Governance request acknowledged
- [ ] Governance tx scheduled
- [ ] Governance tx executed: `oracleAdapterRegistry.add(0x1862…D70d6, AXUSD, USD)`
- [ ] On-chain confirmation via `oracleAdapterRegistry.isValid(0x1862…D70d6, ts)` returning true

## Post-acceptance checklist (Axiom side, tracked)

- [ ] Re-run `node scripts/audit-axusd-evk-vault.js` against the canonical
      AXUSD vault — adapter row turns green
- [ ] Re-run `node scripts/fix-axusd-evk-vault-metadata.js` —
      `perspectiveVerify` succeeds
- [ ] Confirm Euler V2 UI shows recognized vault type and (for the
      Ungoverned 0x case) "Risk manager: None"
- [ ] Update `replit.md` and `documents/euler-axusd-vault-unknown-fix.md`
      with the registration tx hash and the timestamp at which the UI
      labels updated
