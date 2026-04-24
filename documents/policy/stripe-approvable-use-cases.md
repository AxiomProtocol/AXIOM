# Stripe-Approvable Use Cases — Axiom Nexus, LLC

- **Document timestamp (UTC):** 2026-04-24
- **Operating entity (merchant of record):** Axiom Nexus, LLC
- **Source policy:** `replit.md` → "Card Onramp" section (line ~71)
- **Production-rail proof:** `documents/sandbox/check-57-sandbox-report.md`
- **Existing Stripe rail surfaces (for reference, not modified by this doc):**
  - `lib/capinfra/cardDeposits/service.ts`
  - `pages/api/capinfra/treasury/card-deposit/webhook.ts`
  - `shared/capInfraSchema.ts:813` (`cap_card_deposits`)

## Framing

Activating the Stripe Checkout → Increase rail (introduced by the Card Onramp
policy amendment in `replit.md`) only stays inside standard Stripe Checkout /
Billing underwriting if every Stripe charge has Axiom Nexus, LLC acting as
the merchant of record, selling its own services or digital goods to the
cardholder. Anything that looks like selling crypto, topping up a user-
controlled balance, or paying out to a third party triggers a Stripe
restricted-business review or a Stripe Connect platform application —
neither of which we want to file. This catalog is the canonical list of use
cases that have been pre-cleared against that constraint, plus the explicit
list of flows that must NOT use the Stripe rail and must instead route
through Coinbase Onramp, Increase ACH/wire, or another rail.

## Rule-of-thumb test

Before wiring any new flow to the Stripe rail, the proposed flow must pass
all of the following:

- **Merchant of record:** The Stripe charge descriptor names Axiom Nexus
  (or an Axiom-Nexus-controlled trading name). The buyer's card statement
  identifies Axiom, not a third party.
- **Axiom-delivered good or service:** The buyer receives something Axiom
  itself produces, hosts, or fulfills (a report, a subscription seat, an
  education product, a one-time service, a membership, a donation receipt).
  Not a token, not a wallet top-up, not a balance redeemable in a token.
- **No third-party payout:** Settled funds land in Axiom's Stripe balance
  and pay out only to the Axiom Nexus operating account at Increase. No
  funds are forwarded by Axiom to a seller, landlord, contributor, vendor,
  or any other counterparty.
- **No tokenized or stored-value sale:** The thing the buyer paid for is
  not AXUSD, AXAU, AXM, any other token, an LP interest, or a stored-value
  balance redeemable in any of those.
- **Standard underwriting category:** The flow fits inside one of Stripe's
  ordinary product types — Checkout one-time, Billing subscription, or an
  invoice — without requiring Connect or a restricted-business approval.

If all five pass, the use case is approvable. If any one fails, the use
case is out of scope for the Stripe rail.

---

## Approved use cases

### 1. Property report purchases

- **Description:** Buyer pays Stripe for a Property Analysis report (Base
  $4.99, Premium $14.99); the report is the digital good delivered, with
  on-chain AXUSD receipt as a delivery / receipting mechanism, not a sold
  instrument.
- **Surfaces:** `pages/property/reports/[id].tsx`,
  `pages/property/reports/index.tsx`,
  `pages/api/property/create-payment-intent.ts`,
  `pages/api/property/webhook.ts`, `lib/property/onchainPayment.ts`.
  Related tasks: #247, #248, #249.
- **Stripe product type:** Stripe Checkout, one-time payment.
- **Why approvable:** Sale of a digital research product Axiom generates
  itself. Standard one-time digital-goods checkout, no token or stored
  value.
- **Status note:** As of Task #230 the live property-report payment path
  is on-chain AXUSD on Arbitrum One; `pages/api/property/webhook.ts`
  currently returns 410 Gone. Listing this use case here approves a
  future card-payment alternative for buyers without a wallet — wiring
  it is out of scope for this catalog.

### 2. Operator / data subscription tiers

- **Description:** Recurring SaaS for capinfra dashboard access, alert-log
  exports, prune CSVs, the ATTOM preforeclosure feed, asset-registry
  exports, and audit / assurance document subscriptions.
- **Surfaces:** capinfra operator console surfaces; data-export endpoints
  under `lib/capinfra/`; `.local/tasks/attom-preforeclosure-feed.md`;
  `.local/tasks/axusd-audit-assurance-readiness.md`.
- **Stripe product type:** Stripe Billing, recurring subscription.
- **Why approvable:** SaaS subscription to software and data Axiom hosts
  and operates. Standard Stripe Billing scope. No token, no payout to a
  third party.

### 3. Per-seat / per-org operator console licensing

- **Description:** Stripe Billing seats for institutional users of the
  operator console — per-seat or per-org licensing of the Founder
  Operations, Capital Accounting, IVCEE, RE Intelligence, and MIRDT
  workspaces.
- **Surfaces:** capinfra operator console surfaces (Founder Ops, Capital
  Accounting, Solvency, IVCEE, MIRDT terminals).
- **Stripe product type:** Stripe Billing, recurring subscription with
  per-seat or per-org quantity pricing.
- **Why approvable:** Software seat licensing of dashboards Axiom hosts.
  Same shape as any B2B SaaS seat-based subscription.

### 4. Early-access / membership fees

- **Description:** Paid membership for AXAU early access, the Wealth
  Practice onramp, gated research, and the podcast premium tier. The
  buyer pays for membership in an Axiom-operated program (early-access
  application slot, curriculum cohort seat, research access, premium
  podcast feed). The membership is **not** a token presale, not an LP
  interest, and confers no claim on protocol assets or governance rights.
- **Surfaces:** `.local/tasks/axau-early-access.md`,
  `.local/tasks/wealth-practice-onramp-framing.md`,
  `documents/Axiom_Banking_RealEstate_Podcast_Script.md`.
- **Stripe product type:** Stripe Checkout one-time fee for an application
  slot, or Stripe Billing for a recurring membership.
- **Why approvable:** Membership-fee model with Axiom as sole provider of
  membership benefits. Same shape as any community-platform or research-
  membership subscription. Explicitly framed as access to content and
  programs, not as the sale of a token.

### 5. One-time service fees

- **Description:** Discrete fees Axiom charges for work Axiom itself
  performs — onboarding / setup fees, premium KYC review fees (Axiom
  charges; the KYC vendor runs the check), custom report generation,
  one-time API access activation, document-ingestion batch fees, and
  one-off advisory engagements.
- **Surfaces:** capinfra service endpoints; document-ingestion pipelines;
  premium KYC review surfaces inside the operator console.
- **Stripe product type:** Stripe Checkout, one-time payment, or Stripe
  Invoicing for negotiated engagements.
- **Why approvable:** Service-fee invoicing by Axiom for work Axiom
  delivers. Same shape as any consultancy or SaaS one-time charge.

### 6. Education and events

- **Description:** Webinars, training, paid workshops, certifications,
  and the premium podcast tier — Axiom-produced educational content
  delivered live or on-demand.
- **Surfaces:** Education / events surfaces under the public marketing
  site; `documents/Axiom_Banking_RealEstate_Podcast_Script.md`.
- **Stripe product type:** Stripe Checkout one-time for events; Stripe
  Billing recurring for premium subscriptions.
- **Why approvable:** Sale of digital educational goods authored by
  Axiom. Standard digital-goods / event-ticketing checkout.

### 7. On-call / paging support tier

- **Description:** Paid operator support tier covering 24x7 paging,
  runbook access, and incident escalation for institutional users of the
  capinfra operator console.
- **Surfaces:** capinfra operator console support surfaces. References
  tasks #257, #258, #259.
- **Stripe product type:** Stripe Billing, recurring subscription
  (typically monthly or annual per-org).
- **Why approvable:** Support-tier subscription to a service Axiom
  staff delivers. Standard SaaS support-tier model.

### 8. Protocol research / foundation support

- **Description:** Donations or grant tiers for DAO operating accounts,
  framed as supporting protocol research and operations. Explicitly
  non-investment, confers no governance rights, no token allocation,
  no economic claim, and no expectation of profit. Buyer receives a
  donation receipt and (optionally) acknowledgement, nothing more.
- **Surfaces:** DAO operating-accounts surfaces; the public research
  / foundation page.
- **Stripe product type:** Stripe Checkout, one-time payment, or Stripe
  Billing for a recurring donor tier.
- **Why approvable:** Donation / patronage with no investment character.
  Buyer receives a non-financial benefit only. Standard donation /
  patronage checkout pattern.

---

## Off-Stripe flows

The following flows must NOT be put on the Stripe rail. Each is mapped
to the rail that handles it instead.

- **Selling AXUSD or AXAU directly to buyers** — routes through Coinbase
  Onramp at `/onramp` and the existing PSM swap path or the AXAU
  operational queue. Card → USDC on Arbitrum settles in the buyer's own
  wallet; downstream conversion to AXUSD or AXAU is a separate on-chain
  step the buyer initiates.
- **Topping up a customer-controlled wallet or treasury balance** —
  routes through Coinbase Onramp; on-chain custody belongs to the user,
  not to Axiom, so the funds never sit on Axiom's books and the flow
  does not fit the merchant-of-record model.
- **Payouts to sellers, landlords, contributors, or data providers** —
  handled by Increase ACH / wire from the Axiom Nexus operating account,
  or by future Stripe Connect work (which would require a Stripe Connect
  platform application and is explicitly not in scope today).
- **Any "buy this tokenized asset" framing** — including any flow whose
  marketing copy, checkout descriptor, or post-purchase delivery would
  read as the sale of a token, an LP interest, a stored-value balance,
  or a redemption claim. These are restricted-business categories on
  Stripe and are not approvable on this rail under any framing.

## Operating constraints

The Stripe rail operates under the following invariants. Every approved
use case above must satisfy all four; any future use case that cannot
must use a different rail.

- **Merchant of record:** Axiom Nexus, LLC is the merchant of record on
  every Stripe charge. The Stripe account, the public statement
  descriptor, and all customer-facing receipt copy name Axiom Nexus.
- **Settlement destination:** Settled funds pay out only to the Axiom
  Nexus operating account at Increase — the same production rail
  validated end-to-end by the check-57 sandbox proof in
  `documents/sandbox/check-57-sandbox-report.md`. No other settlement
  destination is configured on the Stripe account for this rail.
- **No PAN handling on Axiom servers:** Card data (PAN, CVV, expiration)
  never touches Axiom servers. Axiom hosts only Stripe-issued
  client-side checkout surfaces (Stripe Checkout, Stripe Elements) and
  receives only Stripe webhook payloads, which carry no card data.
- **Processor-owned KYC for cardholders:** KYC and identity verification
  for cardholders on this rail is Stripe's responsibility, not Axiom's.
  Axiom does not perform cardholder identity verification for a
  cardholder solely on the basis of having paid a Stripe charge; any
  Axiom-side KYC requirement (for example, AXAU early-access KYC) is
  enforced by Axiom's own identity surfaces and is decoupled from the
  Stripe charge.

---

## Change control

- Adding any new use case to the Approved list above requires re-running
  the rule-of-thumb test on the proposed flow and updating this file
  before any code that charges the Stripe rail for the new use case is
  written or shipped.
- Moving any flow from the Off-Stripe section into the Approved list is
  a policy change that also requires updating the Card Onramp section of
  `replit.md` (line ~71).
- This file is the single source of truth referenced by `replit.md`.
  Disagreements between this file and any other surface should be
  resolved in favor of this file, and the conflicting surface should be
  brought into line.
