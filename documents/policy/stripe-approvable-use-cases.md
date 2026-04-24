# Stripe-Approvable Use Cases — Axiom Nexus, LLC

- **Document timestamp (UTC):** 2026-04-24
- **Operating entity (merchant of record):** Axiom Nexus, LLC
- **Source policy:** `replit.md` → "Card Onramp" section
- **Cross-reference (production-rail proof):** `documents/sandbox/check-57-sandbox-report.md`
- **Stripe rail surface (existing code):**
  - `lib/capinfra/cardDeposits/service.ts`
  - `pages/api/capinfra/treasury/card-deposit/webhook.ts`
  - `shared/capInfraSchema.ts` → `cap_card_deposits` (line 813)

## Purpose

This file is the canonical, exhaustive list of business activities that the
Axiom Protocol platform may charge a card for via the Stripe Checkout →
Increase rail without triggering a Stripe restricted-business review or a
Stripe Connect platform application.

The single invariant that keeps every use case on this list inside standard
Stripe Checkout / Billing underwriting is:

> **Axiom Nexus, LLC is the merchant of record for every charge on this rail,
> the buyer receives a digital good or service that Axiom itself delivers, and
> no portion of the charged funds is paid out to a third party, swept into a
> customer-controlled balance, or used to settle the sale of a token, security,
> or stored-value instrument.**

If a proposed use case fails any clause of that invariant, it does not belong
on the Stripe rail and must be routed through Coinbase Onramp, ACH/wire into
the Axiom Nexus operating account at Increase, or another rail.

## Rule-of-thumb test (must pass all four)

Before adding any new use case below, confirm:

1. **Merchant of record:** The Stripe charge descriptor reads `AXIOM NEXUS`
   (or an Axiom-Nexus-controlled trading name). Buyer's card statement names
   Axiom, not a third party.
2. **Goods/services delivered by Axiom:** The buyer receives something Axiom
   itself produces, hosts, or fulfills (a report, a subscription seat, an
   education module, a one-time service). Not a token, not a wallet top-up,
   not a payout to a counterparty.
3. **No third-party payout:** Settled funds land in Axiom's Stripe balance
   and pay out only to the Axiom Nexus operating account at Increase. No
   funds are forwarded to sellers, landlords, contributors, data vendors,
   or any other party.
4. **No tokenized or stored-value sale:** The buyer is not receiving AXUSD,
   AXAU, AXM, any other token, or a balance redeemable in a token, as the
   thing they paid for.

If all four pass, the use case is approvable on the Stripe rail. If any one
fails, the use case is out of scope and must use a different rail.

---

## Approved use cases

### 1. Property report purchases (card alternative)

- **What is sold:** A single Property Analysis report (Base $4.99, Premium
  $14.99) — a digital good Axiom generates from RentCast, Census, FHFA,
  Walk Score, OpenStreetMap, and (when enabled) Repliers MLS data.
- **Who pays whom:** Buyer → Stripe → Axiom Nexus operating account at
  Increase. The report is delivered by Axiom; no portion of the fee is
  forwarded.
- **Why approvable:** Sale of a digital research product by Axiom. Standard
  one-time digital-goods checkout. No token, no third-party payout.
- **Status / drift note:** As of Task #230, the *primary* property-report
  payment path is on-chain AXUSD on Arbitrum One
  (`pages/api/property/create-payment-intent.ts`,
  `lib/property/onchainPayment.ts`); the legacy Stripe webhook at
  `pages/api/property/webhook.ts` returns 410 Gone. Listing this here
  approves a *future card alternative* for buyers without a wallet — it
  does not describe code that is wired today. Wiring this rail is its
  own task and not in scope for the present catalog work.
- **Surfaces (current AXUSD path, for context):**
  - `pages/property/reports/index.tsx`
  - `pages/property/reports/[id].tsx`
  - `pages/api/property/create-payment-intent.ts`

### 2. Operator and data subscriptions

- **What is sold:** Recurring access to operator-tier dashboards and data
  surfaces — for example a paid seat on the Founder Operations console,
  the Capital Accounting console, the IVCEE underwriting workspace, the
  RE Intelligence terminal, or the MIRDT Capital Intelligence Terminal.
- **Who pays whom:** Subscriber → Stripe Billing (recurring) → Axiom
  Nexus operating account at Increase. Axiom hosts and operates the
  dashboard.
- **Why approvable:** SaaS subscription to software Axiom delivers.
  Standard Stripe Billing scope. No token issued, no payout to any
  third party.

### 3. Memberships

- **What is sold:** Membership in an Axiom-operated program (for example
  a Wealth Practice cohort seat, a research membership, an investor-
  education membership, a syndication-operator-tools membership). The
  membership entitles the holder to Axiom-delivered content, tooling
  access, and community surfaces. It is **not** a security interest, an
  LP commitment, a token allocation, or a redemption claim.
- **Who pays whom:** Member → Stripe Billing or Stripe Checkout → Axiom
  Nexus operating account at Increase.
- **Why approvable:** Membership-fee model with Axiom as the sole
  provider of the membership benefits. Same shape as any SaaS or
  community-platform membership.

### 4. Education products

- **What is sold:** One-time or subscription access to Axiom-produced
  educational content — recorded courses, written curriculum, live
  cohort sessions, certifications. Includes the institutional education
  surfaces tied to the Wealth Practice and the public learning library.
- **Who pays whom:** Learner → Stripe → Axiom Nexus operating account at
  Increase.
- **Why approvable:** Sale of digital educational goods authored by
  Axiom. Standard digital-goods checkout. No token or stored value
  attached to the purchase.

### 5. One-time service fees

- **What is sold:** Discrete fees Axiom charges for work Axiom itself
  performs — for example a custom underwriting memo, a one-time data
  pull, a property-analysis bundle, an operator-onboarding fee, a
  document-ingestion batch fee, or a one-off advisory engagement.
- **Who pays whom:** Customer → Stripe Checkout → Axiom Nexus operating
  account at Increase.
- **Why approvable:** Service-fee invoicing by Axiom for work Axiom
  delivers. Same shape as any consultancy or SaaS one-time charge.

---

## Out-of-scope flows (must NOT use the Stripe rail)

These flows fail at least one clause of the rule-of-thumb test. They are
listed here so the boundary stays explicit.

| Flow | Failing clause | Correct rail |
|---|---|---|
| Selling AXUSD, AXAU, AXM, or any other token directly to a buyer | (4) tokenized sale | Coinbase Onramp at `/onramp` (card → USDC, optional PSM swap or AXAU operational queue) |
| Topping up a customer-controlled treasury, wallet, or savings balance | (2) buyer is not receiving an Axiom-delivered good or service; (4) stored value | Coinbase Onramp at `/onramp`; or ACH/wire at `/treasury/fund` for the Axiom Nexus operating account |
| Paying out to a third party — a property seller, landlord, DAO contributor, data vendor, contractor, syndication LP distribution | (3) third-party payout | Axiom Rail (Stellar, Layer 00) for contributor payroll and rent collection; ACH/wire from Increase for sellers, vendors, distributions |
| Funding a customer's bank or wallet balance held within Axiom | (3) funds leave Axiom's control to a customer balance; (4) stored value | Coinbase Onramp; ACH into the customer's own Increase-backed account |
| Investor capital calls into a syndication offering | (4) the buyer receives an LP interest, which is a security; (3) funds are pooled for downstream deployment | The Reg D / Reg CF subscription flow inside the Syndication Module — not a card charge for goods |
| AXAU minting paid by card | (4) tokenized sale | Coinbase Onramp → AXAU operational queue |
| Selling a Property Analysis report priced and settled in AXUSD | n/a (already off Stripe by design) | On-chain AXUSD per Task #230 |

## Why this scoping protects the Stripe rail

Stripe's standard Checkout / Billing underwriting covers a merchant
selling its own digital goods, services, subscriptions, and memberships,
with payouts to that merchant's own bank account. Every use case in the
"Approved" list above fits inside that envelope.

The flows in the "Out-of-scope" table would push the rail into one of
two reviewed categories:

- **Stripe Connect platform:** required when the platform routes funds
  to third parties (sellers, landlords, contributors). This is an
  application Stripe must approve and would put Axiom into the platform-
  operator regulatory posture.
- **Stripe restricted business:** sale of crypto, securities, or stored
  value. Stripe restricts these categories and approval is uncommon and
  conditional.

By keeping the Stripe rail strictly to the five approved use cases above,
Axiom can run the rail under the standard Checkout / Billing terms it
already operates under and can validate end-to-end against Increase via
the production proof captured in
`documents/sandbox/check-57-sandbox-report.md`.

---

## Change control

- Adding any new use case to the "Approved" list above requires re-running
  the four-clause rule-of-thumb test on the proposed flow and updating this
  file before any code that charges the Stripe rail for the new use case is
  written or shipped.
- Moving any flow from the "Out-of-scope" table to the "Approved" list is a
  policy change that also requires updating the "Card Onramp" section of
  `replit.md`.
- This file is the single source of truth referenced by `replit.md`.
  Disagreements between this file and any other surface should be resolved
  in favor of this file, and the conflicting surface should be brought into
  line.
