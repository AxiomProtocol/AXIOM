# 04 — Outreach Templates

> **Note (2026-04-17 — corrected):** these templates were originally
> drafted around opening a pull request to `euler-xyz/euler-interfaces`.
> That repo does not contain a per-adapter JSON file — the
> `oracleAdapterRegistry` is on-chain only and only the registry owner
> (`0xb3dCA151d92c6e40450e67098444DcF60d99Bc3d`, Euler governance
> multisig) can call `add()`. The templates below are now framed as a
> **governance request** with the calldata Euler can sign directly.

Templates for asking Euler Labs to add the AXUSD/USD adapter to the
on-chain `oracleAdapterRegistry` on Arbitrum One.

## Discord (Euler Labs server, #governance or #integrations)

> Hi Euler team — sending a governance request to add a `FixedRate`
> AXUSD/USD price adapter to the Arbitrum One `oracleAdapterRegistry`
> (`0x3942A72f87Db5Ad9C22d8826FDe15E23b81b1cBf`). AXUSD is a USD-pegged
> ERC-3643 stablecoin issued by Axiom Protocol, fully backed 1:1 by
> USDC via `CanonicalPSM`.
>
> Adapter:  `0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6`
>           (Blockscout-verified: https://arbitrum.blockscout.com/address/0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6#code)
> Base / Quote: AXUSD `0xD611...Ade7` / USD pseudo `0x...0348`
> Call:     `oracleAdapterRegistry.add(0x1862…D70d6, AXUSD, USD)`
>
> Adapter is immutable, single-pair, bidirectional, ERC-7726 conformant,
> with zero external calls and zero storage. Audit checklist + full
> source + conformance harness output are in our submission package
> (`documents/euler-adapter-submission-package/` in our repo, mirror
> available on request).
>
> Goal: registration unblocks `eulerUngoverned0xPerspective` verification
> for our canonical AXUSD eVault, removing the "Vault type: Unknown" and
> "Risk manager: Unknown" labels in the V2 UI. Happy to walk through the
> contract on a call or async if useful.
>
> Thanks!
> — Axiom Protocol team

## Email (`team@euler.xyz` or whichever address governance prefers)

**Subject:** `Governance request: register AXUSDPegOracleAdapter on Arbitrum oracleAdapterRegistry`

> Hi Euler Labs,
>
> We are requesting a governance call against the Arbitrum One
> `oracleAdapterRegistry` to register a `FixedRate` AXUSD/USD oracle
> adapter:
>
>     Registry:  0x3942A72f87Db5Ad9C22d8826FDe15E23b81b1cBf  (oracleAdapterRegistry, Arbitrum One)
>     Owner:     0xb3dCA151d92c6e40450e67098444DcF60d99Bc3d  (Euler governance multisig)
>     Function:  add(address,address,address)
>     Adapter:   0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6
>     Base:      0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7  (AXUSD ERC-3643)
>     Quote:     0x0000000000000000000000000000000000000348  (USD pseudo)
>     Type:      FixedRate
>     Network:   Arbitrum One (42161)
>     Deploy tx: 0x1274edad7ec6a203ce2df57a3416bcfd6b6a01b11fb9bac1b3c5934728517ee5
>     Source:    https://arbitrum.blockscout.com/address/0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6#code
>
> Context:
>
> - AXUSD is a USD-pegged ERC-3643 stablecoin issued by Axiom Protocol,
>   fully backed 1:1 by USDC through `CanonicalPSM` (mint and redeem
>   guaranteed by contract).
> - The adapter is a stateless, immutable single-pair adapter with no
>   external calls, no storage, no setters, no owner. Audit surface is
>   ~105 lines of Solidity. It mirrors the `FixedRateOracle` reference
>   pattern in `evk-periphery`.
> - The adapter is bidirectional and reverts (rather than returning 0)
>   for unsupported pairs — explicitly addressing the failure mode that
>   made our prior internal adapter unsuitable.
> - Full submission package (technical spec, audit checklist,
>   conformance script output, deployment artifacts, and a written
>   rejection rationale for our prior adapter at
>   `0xc894d1500CB1FBf8F045e87bd357A51345197c4e`) lives in the AXIOM
>   repo at `documents/euler-adapter-submission-package/`. Mirror copy
>   available on request.
>
> Goal: registry acceptance unblocks `eulerUngoverned0xPerspective`
> verification for our canonical AXUSD eVault, removing the "Vault type:
> Unknown" and "Risk manager: Unknown" labels in the V2 UI.
>
> If anything in the submission is missing or non-conformant, we would
> appreciate a redirect — happy to iterate quickly.
>
> Best regards,
> Axiom Protocol team

## Follow-up cadence

| When | Action |
|---|---|
| T + 0 | Discord + email sent with full request payload |
| T + 7 days | Polite Discord ping referencing the request |
| T + 14 days | Email follow-up; ask about governance queue |
| T + 30 days | Escalate via Telegram or Twitter DM to a known Euler Labs contact |

If at T + 30 days there has been no response, file an issue on
`euler-xyz/euler-interfaces` referencing the request and asking for a
public ack of the review status. (The issue is the appropriate public
forum even though no PR is involved.)

## What NOT to ask for

- Do **not** ask Euler to label the AXIOM team as a "risk manager" or
  curator. The Ungoverned-0x perspective explicitly requires the vault
  to have `governorAdmin == 0x0`, which means we hold no governance
  rights on the vault and therefore cannot be a risk manager. The label
  in the UI will show "None".
- Do **not** ask Euler to allowlist the prior adapter at
  `0xc894d1500CB1FBf8F045e87bd357A51345197c4e`. See
  [05-why-not-existing-adapter.md](./05-why-not-existing-adapter.md) for the
  on-chain evidence that adapter is broken.
