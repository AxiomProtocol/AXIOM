# 04 — Outreach Templates

Templates for notifying Euler Labs that a PR has been opened. The
USDC/USD adapter PR should be sent in the **same** outreach message as
the AXUSD/USD adapter PR so Euler can batch the two governance
transactions.

## Discord (Euler Labs server, #governance or #integrations)

> Hi Euler team — opened **two paired PRs** against
> `euler-xyz/euler-interfaces` to register the oracle adapters needed
> by our canonical AXUSD eVault on Arbitrum One:
>
> 1. AXUSD/USD `FixedRate` adapter
>    - PR: `<LINK_TO_AXUSD_PR>`
>    - Adapter: `<AXUSD_DEPLOYED_ADDRESS>`
> 2. USDC/USD `Chainlink` adapter (this submission)
>    - PR: `<LINK_TO_USDC_PR>`
>    - Adapter: `<USDC_DEPLOYED_ADDRESS>`
>    - Underlying: `0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3`
>      (Chainlink USDC/USD, 8 dec, 24h heartbeat)
>
> Both adapters are immutable, single-pair, bidirectional, ERC-7726
> conformant, with no setters, no fallbacks, and (for the USDC adapter)
> the Chainlink feed hard-coded as `constant` so the bytecode itself
> attests to the feed binding. Audit checklists + source + conformance
> harness output are linked in each PR description.
>
> The vault uses USDC as collateral and AXUSD as the asset, so neither
> adapter alone is sufficient — please batch the two governance txs if
> possible.
>
> Goal: registration unblocks `eulerUngoverned0xPerspective`
> verification for our canonical AXUSD eVault, removing the "Vault
> type: Unknown" and "Risk manager: Unknown" labels in the V2 UI. Happy
> to walk through both contracts on a call or async if useful.
>
> Thanks!
> — Axiom Protocol team

## Email (`team@euler.xyz` or whichever address governance prefers)

**Subject:** `Adapter registry PRs (paired): AXUSDPegOracleAdapter + ChainlinkUSDCOracleAdapter (Arbitrum)`

> Hi Euler Labs,
>
> We have opened two paired pull requests against
> `euler-xyz/euler-interfaces` to register the oracle adapters needed
> by our canonical AXUSD eVault on Arbitrum One:
>
>   PR 1 (AXUSD/USD, FixedRate):
>     PR:        <LINK_TO_AXUSD_PR>
>     Adapter:   <AXUSD_DEPLOYED_ADDRESS>
>     Base:      0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7  (AXUSD ERC-3643)
>     Quote:     0x0000000000000000000000000000000000000348  (USD pseudo)
>
>   PR 2 (USDC/USD, Chainlink):
>     PR:        <LINK_TO_USDC_PR>
>     Adapter:   <USDC_DEPLOYED_ADDRESS>
>     Base:      0xaf88d065e77c8cC2239327C5EDb3A432268e5831  (USDC)
>     Quote:     0x0000000000000000000000000000000000000348  (USD pseudo)
>     Feed:      0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3  (Chainlink USDC/USD)
>
> Context:
>
> - The canonical AXUSD eVault uses USDC as collateral. Both the
>   AXUSD/USD and USDC/USD legs of the EulerRouter must be in the
>   adapter registry for the Ungoverned-0x perspective to verify the
>   vault.
> - Probing `oracleAdapterRegistry`
>   (`0x3942A72f87Db5Ad9C22d8826FDe15E23b81b1cBf`) on 2026-04-17 found
>   no `Added(...)` events to date on Arbitrum One — neither a USDC/USD
>   nor an AXUSD/USD adapter is currently registered. We are submitting
>   both.
> - The USDC adapter (`ChainlinkUSDCOracleAdapter`) is a stateless,
>   immutable single-pair adapter with the Chainlink feed address baked
>   into bytecode as a `constant`. It reverts (rather than returning 0
>   or stale prices) on stale rounds, non-positive answers, future-
>   dated rounds, and unsupported pairs. Audit surface is ~180 lines of
>   Solidity. It mirrors the `ChainlinkOracle` reference pattern in
>   `evk-periphery`.
> - Full submission package (technical spec, audit checklist,
>   conformance script output, deployment artifacts, and a
>   registry-reuse probe) for the USDC adapter is committed to the
>   AXIOM repo at `documents/euler-usdc-adapter-submission-package/`
>   and excerpted in the USDC PR description.
>
> Goal: registry acceptance of both adapters unblocks
> `eulerUngoverned0xPerspective` verification for our canonical AXUSD
> eVault, removing the "Vault type: Unknown" and "Risk manager:
> Unknown" labels in the V2 UI.
>
> If anything in either submission is missing or non-conformant, we
> would appreciate a redirect — happy to iterate quickly.
>
> Best regards,
> Axiom Protocol team

## Follow-up cadence

Same cadence as the AXUSD submission (see
`documents/euler-adapter-submission-package/04-outreach-template.md`).
Track both PRs on the same timeline.

## What NOT to ask for

- Do **not** ask Euler to allowlist a non-Chainlink USDC oracle. The
  Ungoverned-0x perspective expects market-discoverable pricing for
  collateral assets like USDC.
- Do **not** ask Euler to skip the staleness check or accept a longer
  staleness window than the feed's heartbeat. The 86400 s window
  matches the Arbitrum USDC/USD feed heartbeat exactly and reverting
  on stale data is a feature, not a bug.
