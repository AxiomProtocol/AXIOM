# 04 — Outreach Templates

> **Note (2026-04-17 — corrected):** these templates were originally
> drafted around opening pull requests to `euler-xyz/euler-interfaces`.
> That repo does not contain a per-adapter JSON file — the
> `oracleAdapterRegistry` is on-chain only and only the registry owner
> (`0xb3dCA151d92c6e40450e67098444DcF60d99Bc3d`, Euler governance
> multisig) can call `add()`. The templates below are now framed as a
> **paired governance request** with the calldata for both adapters so
> Euler can batch the two `add()` calls into a single multisig tx.

Templates for asking Euler Labs to add the **paired** AXUSD/USD and
USDC/USD adapters to the on-chain `oracleAdapterRegistry` on Arbitrum
One. Both must land for the canonical AXUSD eVault to perspective-
verify, so they should be batched.

## Discord (Euler Labs server, #governance or #integrations)

> Hi Euler team — paired governance request to register the two oracle
> adapters needed by our canonical AXUSD eVault on Arbitrum One. The
> registry is on-chain (`0x3942A72f87Db5Ad9C22d8826FDe15E23b81b1cBf`),
> so this is a request for a single multisig tx batching two `add()`
> calls.
>
> 1. AXUSD/USD `FixedRate` adapter
>    - Adapter: `0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6`
>    - Source:  https://arbitrum.blockscout.com/address/0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6#code
>    - Call:    `add(0x1862…D70d6, AXUSD 0xD611…Ade7, USD 0x…0348)`
> 2. USDC/USD `Chainlink` adapter
>    - Adapter: `0x49EBE245b8fAC6f9cF70c2Ca415e0749fB602E61`
>    - Source:  https://arbitrum.blockscout.com/address/0x49EBE245b8fAC6f9cF70c2Ca415e0749fB602E61#code
>    - Underlying: `0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3`
>      (Chainlink USDC/USD, 8 dec, 24h heartbeat)
>    - Call:    `add(0x49EB…2E61, USDC 0xaf88…5831, USD 0x…0348)`
>
> Both adapters are immutable, single-pair, bidirectional, ERC-7726
> conformant, with no setters, no fallbacks, and (for the USDC adapter)
> the Chainlink feed hard-coded as `constant` so the bytecode itself
> attests to the feed binding. Audit checklists + source + conformance
> harness output are in our submission packages
> (`documents/euler-adapter-submission-package/` and
> `documents/euler-usdc-adapter-submission-package/` in our repo,
> mirror available on request).
>
> The vault uses USDC as collateral and AXUSD as the asset, so neither
> adapter alone is sufficient — please batch the two `add()` calls if
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

**Subject:** `Governance request (paired): register AXUSDPegOracleAdapter + ChainlinkUSDCOracleAdapter on Arbitrum oracleAdapterRegistry`

> Hi Euler Labs,
>
> We are requesting two paired governance calls against the Arbitrum One
> `oracleAdapterRegistry` to register the oracle adapters needed by our
> canonical AXUSD eVault. Ideally batched into a single multisig
> transaction:
>
>   Registry:  0x3942A72f87Db5Ad9C22d8826FDe15E23b81b1cBf  (oracleAdapterRegistry, Arbitrum One)
>   Owner:     0xb3dCA151d92c6e40450e67098444DcF60d99Bc3d  (Euler governance multisig)
>   Function:  add(address,address,address)
>
>   Call 1 (AXUSD/USD, FixedRate):
>     Adapter:   0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6
>     Base:      0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7  (AXUSD ERC-3643)
>     Quote:     0x0000000000000000000000000000000000000348  (USD pseudo)
>     Source:    https://arbitrum.blockscout.com/address/0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6#code
>
>   Call 2 (USDC/USD, Chainlink):
>     Adapter:   0x49EBE245b8fAC6f9cF70c2Ca415e0749fB602E61
>     Base:      0xaf88d065e77c8cC2239327C5EDb3A432268e5831  (USDC)
>     Quote:     0x0000000000000000000000000000000000000348  (USD pseudo)
>     Feed:      0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3  (Chainlink USDC/USD)
>     Source:    https://arbitrum.blockscout.com/address/0x49EBE245b8fAC6f9cF70c2Ca415e0749fB602E61#code
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
> - Full submission packages (technical spec, audit checklist,
>   conformance script output, deployment artifacts, and a
>   registry-reuse probe) live in the AXIOM repo at
>   `documents/euler-adapter-submission-package/` and
>   `documents/euler-usdc-adapter-submission-package/`. Mirror copies
>   available on request.
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
Track both requests on the same timeline.

## What NOT to ask for

- Do **not** ask Euler to allowlist a non-Chainlink USDC oracle. The
  Ungoverned-0x perspective expects market-discoverable pricing for
  collateral assets like USDC.
- Do **not** ask Euler to skip the staleness check or accept a longer
  staleness window than the feed's heartbeat. The 86400 s window
  matches the Arbitrum USDC/USD feed heartbeat exactly and reverting
  on stale data is a feature, not a bug.
