# Axiom Protocol Liquidity Pool Strategy

This document is the operator-facing strategy note for the canonical liquidity
registry in `lib/liquidity`. It is scoped to the root Next.js application and
Arbitrum One.

## Audit summary

- The repo already contains Camelot, EulerSwap, PSM, treasury, oracle, and AXAU
  reserve operations code.
- `shared/contracts.ts`, `src/config/activeContracts.generated.ts`,
  `lib/tokens.ts`, and `lib/assets/internalRegistry.ts` contain the important
  address sources for AXUSD, AXM, AXAU, USDC, existing Camelot, EulerSwap, and
  treasury-adjacent contracts.
- Product liquidity paths today include Camelot read services, EulerSwap
  liquidity APIs, PSM swaps, AXAU PAXG quote routes, and DEX UI components.
- Uniswap exists mainly for PAXG quoting and swap/bridge copy. There was no
  canonical Uniswap pool deployment registry for AXUSD/USDC or AXM/AXUSD.
- Curve Finance and Balancer pool integrations were not present as canonical
  pool venues. Existing "Curve" references are mostly vote-escrow, Euler curve
  math, or Morpho IRM terminology.
- AXAU is live as a reserve-linked ERC-3643 token with identity-gated transfer
  behavior. It is not safe to assume public AMM compatibility.

## Canonical market structure

### AXUSD

AXUSD is the internal settlement spine. It must receive the cleanest routing,
deepest launch support, and strongest parity monitoring.

Default structure:

1. Phase 1: `AXUSD / USDC` on Uniswap V3.
2. Phase 2: `AXUSD / USDC` on Curve, only after the Uniswap pool is live and
   AXUSD has real flow.

AXUSD should be quoted externally against USDC. Do not add additional AXUSD
venues until the primary pair has durable depth and monitoring.

### AXM

AXM is a governance, coordination, and ecosystem growth asset. It is not stable
and should not receive the same market structure as AXUSD.

Default structure:

1. Phase 1: `AXM / AXUSD` on Uniswap V3.
2. Phase 3 evaluation: possible AXM weighted pool on Balancer, only after AXM
   has real Uniswap price discovery.

Do not launch `AXM / USDC` unless a later governance review documents a clear
need. AXM should use AXUSD as its primary quote asset.

### AXAU

AXAU is reserve-linked and transfer-restricted. It must not be forced into a
generic public AMM design.

Current default:

- Public AMM trading: blocked.
- Potential first pair if approved: `AXAU / AXUSD` on Uniswap V3.
- Required before approval: all compatibility gates in
  `lib/liquidity/axauCompatibility.ts` must be affirmative.

If AXAU remains identity-gated or otherwise incompatible with permissionless
pool/router flows, use a wrapper design, restricted-market model, or hold the
listing. Do not deploy a standard public pool.

## Venue sequencing

| Phase | Venue | Pair | Status | Rationale |
| --- | --- | --- | --- | --- |
| 1 | Uniswap V3 | AXUSD / USDC | Planned | Deepest launch pool and primary parity route |
| 1 | Uniswap V3 | AXM / AXUSD | Planned | Controlled AXM access using AXUSD quote gravity |
| 2 | Curve | AXUSD / USDC | Planned later | Stable-depth venue after AXUSD has real flow |
| 3 | Balancer | AXM / AXUSD weighted | Evaluation only | Only if AXM matures and liquidity quality improves |
| Conditional | Uniswap V3 | AXAU / AXUSD | Blocked | Requires AXAU compatibility approval |
| Later only | Camelot | TBD | Deferred | Only if Arbitrum-native distribution improves without fragmentation |

## Treasury policy

The canonical treasury policy is in `lib/liquidity/policy.ts`.

Key rules:

- Deepest pool at launch: `axusd-usdc-uniswap-v3`.
- Controlled smaller launch pool: `axm-axusd-uniswap-v3`.
- No allocation to non-core pools at launch.
- AXUSD parity defense is the highest priority.
- Liquidity fragmentation is a strict risk constraint.
- Secondary venues require explicit readiness checks.
- Curve must not launch before AXUSD has real flow.
- Balancer must not launch before AXM has real price discovery.
- AXAU must not launch before transfer and compliance behavior is validated.

## AXAU compatibility checklist

AXAU public AMM deployment is allowed only when all of the following are true:

- Unrestricted ERC-20 behavior is confirmed.
- Transfers through user wallets work.
- Transfers through pool contracts work.
- Transfers through router contracts work.
- Compliance logic does not break swaps.
- Holder restrictions do not break public market flows.
- Wrapper requirement is resolved.
- Governance approval is recorded.
- `approvedForPublicAmm` is explicitly true.

The default checklist is intentionally `no_go`.

## How to add a pool safely

1. Add or update the asset and venue in `lib/liquidity/registry.ts`.
2. Add a pool definition with launch phase, activation flag, risk flags,
   readiness checks, compliance flags, analytics hooks, and admin controls.
3. Update `lib/liquidity/policy.ts` only if the pool changes launch sequencing
   or treasury allocation rules.
4. Update `lib/liquidity/deploymentScaffolding.ts` only if the venue requires
   new deployment inputs.
5. Update monitoring hooks in `lib/liquidity/monitoring.ts` when metrics become
   live.
6. Add or update tests in `tests/liquidity-registry.test.ts`.
7. Never mark a pool active or add a deployment address until the on-chain
   deployment is verified.

## Operator visibility

Operators can review the registry at:

- `/operator/liquidity`

The page is read-only and uses the existing operator cookie gate. It exposes
configured assets, venues, pools, policy rules, deployment placeholders,
monitoring hooks, and AXAU blocking reasons.

## What to avoid

- Do not list everywhere.
- Do not launch three to five shallow pools.
- Do not treat AXUSD and AXM as the same market structure.
- Do not treat AXAU as safe by default.
- Do not launch AXM/USDC in the first wave.
- Do not launch Curve before AXUSD has real flow.
- Do not launch Balancer before AXM has mature price discovery.
- Do not use Camelot as a first-wave venue for this strategy.
- Do not invent deployment addresses, pool addresses, or live state.
