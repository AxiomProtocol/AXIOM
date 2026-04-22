# Axiom Protocol — DeFi Failure Mode → Protection Mapping

**Status:** Canonical. This document is the single source of truth for every
claim made on the public `/trust` pages. Every protection listed here MUST
point to a verifiable artifact: a contract address on Arbitrum One, a public
snapshot endpoint, an audit document in `documents/`, or a policy file in
`documents/policies/`.

If a protection is partial, the maturity label MUST reflect that. No
overstatement. Allocators verify these claims; one false statement destroys
the entire trust surface.

---

## How to read this document

Every row has four parts:

1. **Failure mode** — the real-world failure pattern as observed in
   industry incidents (Ronin, Wormhole, Mango, FTX, Curve, etc.).
2. **Axiom protection** — the specific control inside Axiom that prevents
   that failure mode.
3. **Maturity** — `LIVE` (in production), `STAGED` (deployed but not yet
   wired into the default path), `PLANNED` (designed, not yet shipped).
4. **Verify yourself** — the artifact a third party can inspect to
   confirm the claim independently.

---

## 1. Smart-contract exploit / "audited contract drained"

**Failure mode.** A contract passes one or more audits, is deployed to
mainnet, and is later drained because the deployed bytecode differs from
the audited bytecode, the audit scope was narrow, or an upgrade path was
abused after the audit.

**Axiom protection.**

- Fail-closed `CollateralGuard` admission check on every borrow and every
  AXAU mint. The guard composes per-asset enable flags, validity adapters
  (default-deny on bridged/wrapped/synthetic assets), per-asset caps, and
  per-market halt status from the `IncidentController`. Documented in
  `documents/security/collateral-exploit-prevention.md`.
- Active Contract Verification System: every privileged contract address
  in the registry has its on-chain bytecode hash compared to the audited
  bytecode hash on every snapshot.
- Audited bytecode hashes published on `/trust/audits`.

**Maturity.** `LIVE` for `CollateralGuard` (Task #210, merged
2026-04-21). `STAGED` for the bytecode-hash comparator surface — wired in
backend, public surface ships with this task.

**Verify yourself.** `/trust/audits` (public bytecode comparison),
`/disclosure/collateral-risk-policy` (canonical policy `2026-04-21.1`),
`AXIOM/contracts/risk/CollateralGuard.sol` in the public repo.

---

## 2. Bridge hack

**Failure mode.** A protocol accepts collateral that originated as a
bridged or wrapped asset. The bridge is compromised, the bridged asset is
inflated or de-pegged, and the collateral becomes worthless while still
backing live debt.

**Axiom protection.**

- The Collateral Risk Policy (`documents/policies/collateral-risk-policy.md`)
  default-denies every bridged, wrapped, synthetic, and rehypothecated
  asset. Explicit per-asset allow-list only, governed by community vote.
- On-chain enforcement via `CollateralRiskConfig` validity adapters —
  unset adapter = denied.
- The `/trust/no-bridges` page reads the on-chain allow-list live and
  publishes it. Phase 1 ships with an empty allow-list.

**Maturity.** `LIVE`.

**Verify yourself.** `/trust/no-bridges` (live on-chain allow-list read),
`documents/policies/collateral-risk-policy.md` §3 ("Validity adapters").

---

## 3. Founder rug / disappearance

**Failure mode.** Anonymous founders disappear after raising; team page
goes dark; treasury keys are unilaterally controlled; no recourse exists.

**Axiom protection.**

- Public team page with real legal name, real LinkedIn, real operating
  entity (referenced via `ENTITY_EIN`). No anonymous founders.
- BitGo CaaS multi-party authorization on Arbitrum One treasury — no
  single-key signer can move funds.
- Increase fiat custody operates against a US-incorporated entity with a
  publicly verifiable EIN. Increase is FDIC-insured at the depository
  layer.
- Append-only audit events (`capinfra` events table) record every
  privileged action with timestamp, actor, and policy version.

**Maturity.** `LIVE` for team page (this task), BitGo, Increase, capinfra
events. `PLANNED` for a fully time-locked governance migration of every
privileged role (current state documented honestly on `/trust/governance`).

**Verify yourself.** `/trust/team`, `/trust/governance` (every privileged
role + holder + timelock status, listed honestly), Increase + BitGo
account holder verification on request.

---

## 4. Opaque tokenomics

**Failure mode.** Token supply, vesting, and treasury allocations are
not published or are buried. Insiders unlock first and exit before the
public can react.

**Axiom protection.**

- AXM is governance + fee-routing only. No yield claim, no APY claim, no
  presale-pump-and-dump structure.
- All AXM contract addresses, supply, and emissions schedule are public
  on Arbitrum One. Linked from `/disclosure`.
- Glossary (`lib/glossary.ts`) forbids absolutist positioning, "guaranteed
  returns" language, and "APY-as-claim" copy across the entire site.

**Maturity.** `LIVE` for AXM contract; `STAGED` for a single
consolidated tokenomics public page.

**Verify yourself.** AXM contract address on Arbiscan,
`/disclosure` for current circulating supply, `lib/glossary.ts` for the
language hardening rules.

---

## 5. Liquidity that vanishes when you need it

**Failure mode.** Stablecoin or asset is "redeemable" until the moment
many holders try to redeem at once. Reserves are insufficient or
illiquid; redemption queue is opaque or absent.

**Axiom protection.**

- Public, dated solvency snapshot at `/api/solvency/latest` and
  `/disclosure` showing Coverage Ratio, Reserve Ratio, Liquidity
  Buffer Ratio, and Liquidation Distance for AXUSD and AXAU.
- Designated Loss Coverage Reserve line on the solvency snapshot
  (added by this task) — separate from operating reserves, governed by
  the policy at `documents/trust/loss-coverage-reserve-policy.md`.
- Withdrawal rate-limiting at the contract layer (planned: see
  `WithdrawalRateLimiter` follow-up below) — caps net outflow per
  rolling window so a single block cannot drain a market.

**Maturity.** `LIVE` for solvency snapshot and reserve ratios. `LIVE`
for the dedicated Loss Coverage Reserve line (this task).
`PLANNED` for on-chain `WithdrawalRateLimiter` enforcement (deferred
to a follow-up task to keep change scope reviewable).

**Verify yourself.** `/disclosure` (live snapshot, snapshot ID,
timestamp), `documents/trust/loss-coverage-reserve-policy.md`.

---

## 6. Whale governance capture

**Failure mode.** Governance proposals pass because a small number of
whales hold a controlling vote share. Insider capture is functionally
identical to no governance.

**Axiom protection.**

- Every privileged role and current holder is listed on
  `/trust/governance`, including roles that are still EOA-controlled
  with no timelock — disclosed honestly.
- Timelock migration is a published roadmap item, not a marketing
  claim. The page distinguishes "live timelocked" from "planned
  timelock" by role.
- Quadratic voting / vote-escrow design is `PLANNED`, not claimed.

**Maturity.** `LIVE` for governance disclosure surface (this task).
`PLANNED` for timelock migration of all privileged roles. `PLANNED`
for vote-escrow governance redesign.

**Verify yourself.** `/trust/governance` (live role + holder list).

---

## 7. Insider manipulation / coordinated narrative

**Failure mode.** Market makers, insiders, and core contributors trade
ahead of public announcements; coordinated narratives pump price; exit
liquidity is provided by retail.

**Axiom protection.**

- AXM has no presale-pump structure. Treasury allocations and vesting
  are public.
- Append-only audit events record every privileged contract action.
- Glossary-enforced language rules forbid hype, absolutist claims, and
  unqualified outcome promises across all site copy.

**Maturity.** `LIVE`.

**Verify yourself.** `lib/glossary.ts`, AXM contract on Arbiscan, the
capinfra events table (read endpoint surfaced in
`/operations/cap-infra`).

---

## 8. Oracle manipulation

**Failure mode.** Borrow path uses a single price oracle; oracle is
manipulated (flash-loan, low-liquidity TWAP, or stale read); attacker
borrows against artificially valued collateral.

**Axiom protection.**

- `AXIOMOracleAdapter` fail-closes on PSM read failure when the PSM is
  configured (the silent 1:1 fallback bug was fixed during Task #210).
- Oracle staleness windows are per-asset and enforced at admission.
- Multiple oracle sources for AXAU pricing via the ERC-7726 adapter
  infrastructure.

**Maturity.** `LIVE`.

**Verify yourself.** `AXIOM/contracts/oracle/AXIOMOracleAdapter.sol`,
`/trust/security` (live staleness windows per asset).

---

## 9. Synthetic / receipt-token recursion

**Failure mode.** A protocol accepts its own LP tokens, receipt tokens,
or synthetic representations as collateral, creating recursive leverage
that unwinds catastrophically when the underlying moves.

**Axiom protection.**

- `CollateralRiskConfig` default-denies receipt tokens, LP positions,
  and synthetic assets unless explicitly allow-listed.
- Treasury isolation (planned Phase 2): core collateral is held in a
  contract that cannot itself be pledged.

**Maturity.** `LIVE` for default-deny. `PLANNED` for treasury
isolation contract.

**Verify yourself.** `/trust/no-bridges` (which doubles as the
"no-synthetics" surface — same allow-list mechanism),
`documents/security/collateral-exploit-prevention.md`.

---

## 10. Custody comingling

**Failure mode.** Customer funds are commingled with operating funds;
in a default, customers become unsecured creditors.

**Axiom protection.**

- AXUSD reserves (USD/USDC) are segregated from AXAU reserves (PAXG)
  are segregated from operating cash (Increase) are segregated from
  the Loss Coverage Reserve. Each has a distinct address and a distinct
  line on the solvency snapshot.
- Increase fiat custody is FDIC-insured at the depository layer.
- BitGo crypto custody on Arbitrum One uses multi-party authorization;
  the custody addresses are published on `/trust/security`.

**Maturity.** `LIVE`.

**Verify yourself.** `/disclosure` (per-asset reserve breakdown),
`/trust/security` (custody address list).

---

## 11. Audit theater

**Failure mode.** A protocol publishes "audited by X" with no scope, no
date, no commit hash, and no comparison to deployed bytecode. The audit
covered a different version than what is live.

**Axiom protection.**

- `/trust/audits` lists every audit with: firm, date, scope, audited
  bytecode hash, current deployed bytecode hash, match indicator
  (green/amber/red).
- No claim of "audited by" is made on any page without a corresponding
  row on `/trust/audits` linking to the actual audit document in
  `documents/`.

**Maturity.** `LIVE` for the published audits in `documents/`. The
bytecode-hash comparator UI ships as part of this task.

**Verify yourself.** `/trust/audits`, `documents/` audit files.

---

## 12. Compliance theater

**Failure mode.** A protocol claims "compliant with X regulation"
without engaging counsel or qualifying the statement; a single
enforcement action invalidates the claim and shocks the market.

**Axiom protection.**

- Glossary forbids "compliant with GENIUS Act" — only "designed to
  align with" is permitted in disclosure copy.
- AXUSD ERC-3643 (T-REX) standard provides on-chain identity
  verification and modular compliance enforcement.
- Lending Fund operates under SEC Reg D 506(c).
- Investor Portal documents accreditation verification flow.

**Maturity.** `LIVE`.

**Verify yourself.** `/disclosure`, `lib/glossary.ts` (search for
"GENIUS"), AXUSD ERC-3643 contract on Arbiscan.

---

## 13. Pump-dump-exit token cycle

**Failure mode.** A token launches with hype, pumps on coordinated
narrative, founders exit during the pump, retail is left with worthless
bag.

**Axiom protection.**

- AXM is a governance and fee-routing token. No yield claim. No
  presale. No founder unlock-and-dump structure.
- Treasury vesting is public.
- The protocol's revenue model is documented (real-world cash flows
  from real estate operations, lending fund fees, payment-rail fees,
  card-onramp fees) and visible in the operating reports surfaced on
  `/disclosure`.

**Maturity.** `LIVE`.

**Verify yourself.** AXM contract on Arbiscan, `/disclosure` operating
reports section.

---

## 14. Failure response opacity

**Failure mode.** When something goes wrong, the protocol goes silent.
No incident report, no post-mortem, no public timeline.

**Axiom protection.**

- `IncidentController` is on-chain and publicly readable. Per-market
  halt status is shown on `/trust/security`.
- All privileged actions emit append-only events to the capinfra events
  table.
- Public commitment (this document, §14): post-mortem within 72 hours
  of any incident affecting user funds, published to `documents/`
  and linked from `/trust`.

**Maturity.** `LIVE` for the technical surface; the 72-hour commitment
is a stated policy.

**Verify yourself.** `/trust/security` (live halt status),
`AXIOM/contracts/risk/IncidentController.sol`.

---

## 15. Untested code shipped to mainnet

**Failure mode.** Protocol ships to production without integration
tests covering the failure paths.

**Axiom protection.**

- 41 Hardhat tests covering the Collateral Exploit Prevention framework
  (Task #210), all passing as of the merge commit.
- CI runs render tests on every PR (Task #197).
- Migration runner is hardened against CI test crashes (Task #194).

**Maturity.** `LIVE` for the tests just listed; coverage continues to
expand per published task list.

**Verify yourself.** `AXIOM/test/CollateralExploitPrevention.unit.js`,
`.github/workflows/main.yml`.

---

## Deferred follow-ups (honestly disclosed)

The following protections are designed and partially specified but
intentionally not shipped in this task to keep the change scope
reviewable. Each is published here so allocators can see the roadmap
without surprise.

1. `WithdrawalRateLimiter` contract wiring into `MintRedeemController`
   and `AXIOMFixedLoan`. Designed; deferred to its own task so the
   integration tests and emergency-bypass governance flow get
   dedicated review.
2. Full timelock migration of every privileged role on Arbitrum One.
   Roadmap item; current EOA-controlled roles are disclosed honestly
   on `/trust/governance`.
3. Bridge allow-list governance flow (proposal → vote → on-chain
   adapter set) — the on-chain machinery exists; the governance UX
   is deferred.
4. On-chain Loss Coverage Reserve claim adjudication. Phase 1 stands
   up the dedicated reserve address and the claim policy doc; claim
   processing is manual until adjudication is contractualized.
