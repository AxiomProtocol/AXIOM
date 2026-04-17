# 03 — Registry PR Payload

This document contains the **exact** content to drop into a pull request
against [`euler-xyz/euler-interfaces`](https://github.com/euler-xyz/euler-interfaces).

The Euler maintainers use the merged `addresses/42161/...` files to build
the governance transaction that calls
`oracleAdapterRegistry.add(adapter, base, quote)` on Arbitrum
(`oracleAdapterRegistry` = `0x3942A72f87Db5Ad9C22d8826FDe15E23b81b1cBf`).
The on-chain registration tx is signed by Euler governance, **not** by
Axiom — that is what makes this an off-chain coordination task.

## Branch / PR title

```
arbitrum: register AXUSDPegOracleAdapter (AXUSD/USD)
```

## PR description (paste verbatim)

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
> Adapter: `<DEPLOYED_ADDRESS>` (Arbiscan-verified, see deploy tx)
> Base:    `0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7` (AXUSD)
> Quote:   `0x0000000000000000000000000000000000000348` (USD pseudo)
> Network: Arbitrum One (42161)
> Deploy tx: `<TX_HASH>`
> Source:  `contracts/oracle/AXUSDPegOracleAdapter.sol`

## File changes

### 1. `addresses/42161/SnapshotRegistry/oracleAdapterRegistry.json`

Append the entry below to the existing JSON array. Field names mirror
existing entries in the registry — confirm the exact schema with the
maintainers before committing (the file structure may include extra
fields like `addedAt` that are populated post-merge).

```json
{
  "adapter": "<DEPLOYED_ADDRESS>",
  "base":    "0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7",
  "quote":   "0x0000000000000000000000000000000000000348",
  "name":    "AXUSDPegOracleAdapter",
  "type":    "FixedRate",
  "deployer":"<DEPLOYER_EOA>",
  "deployTx":"<TX_HASH>",
  "deployBlock": <BLOCK_NUMBER>,
  "verified": true
}
```

### 2. `addresses/42161/labels.json` — optional, if format requires

```json
"<DEPLOYED_ADDRESS>": "AXUSDPegOracleAdapter (AXUSD/USD, FixedRate)"
```

### 3. Conformance attachment

Attach the full output of `DEPLOYED=<addr> node scripts/verify-axusd-peg-adapter.js`
as a comment on the PR (or as a code block in the PR description). Every
check should be `[PASS]`. If any check is `[FAIL]`, do not open the PR
until the underlying issue is resolved.

## Pre-PR checklist (Axiom side)

- [ ] Adapter deployed to Arbitrum One via `scripts/deploy-axusd-peg-adapter.js`
- [ ] Address recorded above
- [ ] Source verified on Arbiscan (`npx hardhat verify --network arbitrum <addr>`)
- [ ] Conformance script run, all checks pass
- [ ] Conformance output captured for the PR description
- [ ] AXIOM team has reviewed the PR description for accuracy
- [ ] Outreach to Euler Labs queued (see `04-outreach-template.md`)

## Post-PR checklist (Euler side, tracked)

- [ ] PR reviewed by Euler Labs
- [ ] Governance tx scheduled
- [ ] Governance tx executed: `oracleAdapterRegistry.add(<addr>, AXUSD, USD)`
- [ ] On-chain confirmation via `oracleAdapterRegistry.isValid(<addr>, ts)` returning true

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
