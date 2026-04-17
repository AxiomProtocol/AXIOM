# 04 — Outreach Templates

Templates for notifying Euler Labs that a PR has been opened. Acceptance
of an oracle adapter into the registry requires governance action; an
unannounced PR can sit for weeks.

## Discord (Euler Labs server, #governance or #integrations)

> Hi Euler team — opened a PR against `euler-xyz/euler-interfaces` to
> register a `FixedRate` AXUSD/USD price adapter on Arbitrum One. AXUSD
> is a USD-pegged ERC-3643 stablecoin issued by Axiom Protocol, fully
> backed 1:1 by USDC via `CanonicalPSM`.
>
> PR: `<LINK_TO_PR>`
> Adapter: `0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6` (Arbiscan-verified)
> Base / Quote: AXUSD `0xD611...Ade7` / USD pseudo `0x...0348`
>
> Adapter is immutable, single-pair, bidirectional, ERC-7726 conformant,
> with zero external calls and zero storage. Audit checklist + full
> source + conformance harness output are linked in the PR description.
>
> Goal: registration unblocks `eulerUngoverned0xPerspective` verification
> for our canonical AXUSD eVault, removing the "Vault type: Unknown" and
> "Risk manager: Unknown" labels in the V2 UI. Happy to walk through the
> contract on a call or async if useful.
>
> Thanks!
> — Axiom Protocol team

## Email (`team@euler.xyz` or whichever address governance prefers)

**Subject:** `Adapter registry PR: AXUSDPegOracleAdapter (Arbitrum)`

> Hi Euler Labs,
>
> We have opened a pull request against
> `euler-xyz/euler-interfaces` to register a `FixedRate` AXUSD/USD oracle
> adapter on Arbitrum One:
>
>     PR:        <LINK_TO_PR>
>     Adapter:   0x1862D3c85382c4f4b81a9a9e0d31b289963D70d6
>     Base:      0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7  (AXUSD ERC-3643)
>     Quote:     0x0000000000000000000000000000000000000348  (USD pseudo)
>     Type:      FixedRate
>     Network:   Arbitrum One (42161)
>     Deploy tx: 0x1274edad7ec6a203ce2df57a3416bcfd6b6a01b11fb9bac1b3c5934728517ee5
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
>   `0xc894d1500CB1FBf8F045e87bd357A51345197c4e`) is committed to the
>   AXIOM repo and excerpted in the PR description.
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
| T + 0 | PR opened, Discord + email sent |
| T + 7 days | Polite Discord ping referencing PR number |
| T + 14 days | Email follow-up; ask about review queue |
| T + 30 days | Escalate via Telegram or Twitter DM to a known Euler Labs contact |

If at T + 30 days there has been no response, file an issue on
`euler-xyz/euler-interfaces` referencing the PR and asking for a public
ack of the review status.

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
