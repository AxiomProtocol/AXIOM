# Stellar Payments Rail — Support Copy

Internal reference for support team. Use these responses when a user contacts support
after initiating or attempting to initiate a payment through the Stellar Payments Rail.

---

## Background (for support team)

The Stellar Payments Rail converts AXUSD to USDC on the Stellar network and routes it
to a destination account via a third-party SEP-24 anchor. When a user initiates a
payment, they are redirected to the anchor's hosted UI to complete destination details
(bank account number, recipient info). Axiom generates a Transfer ID and tracks the
transfer internally. Axiom does not hold user funds during the transfer.

---

## Scenario 1 — User clicked "Open Circle Withdrawal Flow" but does not know what to do

**What happened:** The user submitted the initiation form and received an interactive URL.
They clicked the link and are now on the anchor's hosted UI.

**What to tell them:**

> You should see a secure form from our payment partner asking for your destination
> account details — typically your bank account number, routing number, and the
> name on the account. Fill in those details, confirm the amount, and submit.
>
> Once you complete their form, the transfer will be queued and you will receive
> a confirmation on their site. Your Transfer ID from Axiom is:
> [insert Transfer ID from their record].
>
> You can check the status of your transfer at any time at:
> axiomprotocol.com/api/stellar/payment/[Transfer ID]?wallet=[your wallet address]

**Internal note:** Confirm the transfer exists in `stellar_payment_transfers` before
responding. Look up by Transfer ID (UUID format) or wallet address.

---

## Scenario 2 — User says the anchor link expired or returned an error

**What happened:** SEP-24 interactive sessions have a time limit (typically 30 minutes).
If the user did not complete the anchor's flow in time, the session expired.

**What to tell them:**

> The payment session link has a time limit. If it has expired, please return to
> the Stellar Payments page and initiate a new payment. Your previous session
> did not move any funds — it only opened the destination entry form.
> You are safe to start again.
>
> If you see an error on the anchor's site, do not retry through that same link.
> Start a fresh initiation from your Axiom account.

**Internal note:** The old transfer record will remain in `pending` status. It can be
marked `failed` manually if needed. No funds were debited.

---

## Scenario 3 — User completed the anchor flow but transfer shows "pending"

**What happened:** The anchor received the request and is processing. Stellar
settlement is fast (under 5 seconds on-chain), but the anchor's payout to the
destination bank can take 1–3 business days depending on the payment rail they use.

**What to tell them:**

> Your transfer is in progress. On-chain settlement on Stellar typically completes
> within seconds, but the final payout to your bank account follows standard banking
> timelines — usually 1 to 3 business days.
>
> You can check the current status using your Transfer ID:
> axiomprotocol.com/api/stellar/payment/[Transfer ID]?wallet=[your wallet address]
>
> If the status has not changed after 3 business days, please contact us with your
> Transfer ID and we will follow up with the payment processor directly.

---

## Scenario 4 — User cannot find their Transfer ID

**What happened:** The user did not record their Transfer ID after initiating.

**What to tell them:**

> Please provide the wallet address you used when you initiated the transfer.
> We can look up all transfers associated with your wallet address internally.
>
> If you also know the approximate date and amount, that will help us identify
> the correct record.

**Internal note:** Query `stellar_payment_transfers` by `axiom_wallet_address`
and filter by `initiated_at` date range if needed. Do not share other users'
transfer records.

---

## Scenario 5 — User entered incorrect bank details at the anchor

**What happened:** The user submitted wrong bank account information at the anchor's
interactive UI. Whether the transfer can be corrected depends on its current status.

**What to tell them:**

> If your transfer is still showing as "pending" or "processing," contact our
> support team immediately with your Transfer ID. We will reach out to the
> payment processor to request a hold or correction before the payout is sent.
>
> If the transfer shows as "completed," the funds have already been routed to
> the account details you entered. In that case, recovery depends on the
> receiving bank's policies.
>
> Your Transfer ID is required for us to act quickly — please have it ready.

**Internal note:** Escalate immediately if the user reports wrong bank details on a
`pending` or `processing` transfer. Contact the SEP-24 anchor's support channel
with the `anchorTransferId` from the transfer record.

---

## Scenario 6 — User asks why the payment form is not visible

**What happened:** The Stellar Payments Rail is configured but may not be activated
in their environment, or the feature is temporarily disabled.

**What to tell them:**

> The Stellar Payments Rail is currently configured but not yet active for your
> account. This feature is being rolled out in stages.
> Please check back shortly or contact us to be added to the activation queue.

**Internal note:** Verify `ENABLE_STELLAR_PAYMENTS_RAIL` environment flag is set to
`true`. If it is, check whether the user's session or region is excluded from access.

---

## Scenario 7 — User reports the anchor site looks unfamiliar or suspicious

**What happened:** User may be seeing an unexpected page or may be confused about
being redirected to a third-party domain.

**What to tell them:**

> When you initiate a payment, you are redirected to our payment partner's secure
> hosted interface to enter your destination details. This is expected — Axiom does
> not collect your bank account information directly. The partner site handles the
> destination entry under their own security and compliance controls.
>
> If the URL in your browser does not match the anchor domain listed on the
> Stellar Payments page, do not enter any information and contact us immediately
> with the URL you saw.

**Internal note:** The `interactiveUrl` stored in the transfer record should match
the anchor's configured domain. Any mismatch should be escalated to the security team.

---

## Anchor Status Reference

| Status shown on page | Meaning |
|---|---|
| REACHABLE | Stellar Horizon and anchor APIs are responding |
| UNREACHABLE | Cannot reach the anchor's stellar.toml or SEP endpoints |
| NOT FOUND | The anchor has no SEP-24 transfer server configured |
| pending | Transfer initiated, awaiting anchor processing |
| processing | Anchor has accepted the transfer and is routing funds |
| completed | Funds delivered to destination account |
| failed | Transfer could not be completed — no funds moved |

---

## Transfer ID Format

Transfer IDs are UUID v4 format:
`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`

Example: `92dd8bdf-cadc-4ea8-929e-78e4d9dd4f32`

If a user provides a string that does not match this format, it is not a valid
Transfer ID from the Stellar Payments Rail.

---

## Key Technical Notes (Internal)

- The anchor for USDC on Stellar must be a SEP-24 provider, NOT Centre/Circle directly.
  Circle issues USDC on Stellar but does not run a SEP-24 withdrawal server at centre.io.
  The correct anchor configuration requires a third-party provider such as MoneyGram,
  Bitso, or StellarX — whichever is confirmed as the operational partner.

- Transfer state lookup requires either the initiating wallet address or admin key.
  Anonymous state lookups return HTTP 403.

- All transfer records are stored in `stellar_payment_transfers` (PostgreSQL).
  The `axiom_wallet_address` field contains the EVM wallet address of the initiator.

- The `sep24_interactive_url` field contains the anchor's hosted UI link. This URL
  is time-limited by the anchor. Do not share it publicly.
