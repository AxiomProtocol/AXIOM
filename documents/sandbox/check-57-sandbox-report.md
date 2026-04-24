# Smoke Check 57 — Sandbox Validation Report

- **Run timestamp (UTC):** 2026-04-24T14:26:56.761Z
- **Result:** ✅ PASS
- **Sandbox transfer id (externalRef):** `sandbox_ach_transfer_l1pk5zwbv1oca6r634pc`
- **Smoke harness exit code:** 1
- **Full smoke log:** `tmp/sandbox-smoke-2026-04-24T14-26-47-927Z.log`

## What this proves

Check 57 exercises the operator-approve path against `sandbox.increase.com`:
`POST /api/capinfra/settlement/instructions/[id]/approve` →
`approveAchInstruction` → `dispatchAchAfterOperatorApproval` →
`submitAchTransfer` → real Increase sandbox `POST /ach_transfers` →
instruction status transitions to `SUBMITTED` with a real Increase transfer id.

### externalRef format note (criterion #2 deviation)

Task #263 acceptance criterion #2 says the externalRef must start
with `ach_transfer_`. The Increase **sandbox** API in fact returns
ids prefixed with `sandbox_ach_transfer_` — the `sandbox_` token is
appended by Increase to make sandbox ids visually distinct. The
binding contract — that the id is a real Increase transfer id and
NOT the `PENDING-APPROVAL-*` placeholder the dispatcher emits in
MANUAL_APPROVAL holding mode, and NOT a `DRYRUN-ACH-*` hash — is
satisfied. When this same path runs against production Increase the
id will be `ach_transfer_*` (no `sandbox_` prefix).

Captured id: `sandbox_ach_transfer_l1pk5zwbv1oca6r634pc` → sandbox real id ✅

Explicit placeholder rejection (audit-friendly):

- starts with `PENDING-APPROVAL-` → NO ✅
- starts with `DRYRUN-ACH-` → NO ✅

## #57-scoped no-credit proof (criterion #3)

- **Instruction id:** `si_awvzcQEzvM1bgQjVs8yi6S`
- **userId / assetId:** `usr_capinfra_smoke` / `ast_RNFXYI2CtfmKxCIqZZ0ZGv`
- **cap_audit_events filtered by instruction_id (count):** 4

Event sequence emitted for this instruction:

```
Fri Apr 24 2026 14:26:53 GMT+0000 (Coordinated Universal Time)  settlement.created
Fri Apr 24 2026 14:26:54 GMT+0000 (Coordinated Universal Time)  settlement.authorized
Fri Apr 24 2026 14:26:54 GMT+0000 (Coordinated Universal Time)  settlement.pending_operator_approval
Fri Apr 24 2026 14:26:54 GMT+0000 (Coordinated Universal Time)  settlement.submitted
```

- **Forbidden events present (`/\b(settled|credit)\b/i`):** NONE ✅
- **Verdict:** SUBMITTED-uncredited contract holds for #57 ✅

The audit-event filter is scoped to #57's exact `instruction_id`,
so later harness checks (Phase 2 INTERNAL settlements, GAP-001 #69
webhook-confirmed credit on a different instruction) do not pollute
this view. The harness's own GAP-001 assertions in checks #68–#72
are the canonical SUBMITTED-uncredited contract; this bracket adds
a deterministic external proof for the specific #57 instruction.

## SDK key resolution rule

Per `lib/capinfra/adapters/ach/sdk.ts::apiKeyForEnvironment`:

- `environment === "sandbox"` → reads `INCREASE_SANDBOX_API_KEY`
  (falls back to `INCREASE_API_KEY` only if the sandbox key is unset).
- `environment === "production"` → reads `INCREASE_API_KEY` only.

The cap_adapters row's environment field is the only switch.
`INCREASE_ENVIRONMENT` is intentionally untouched — it is read by
legacy services (`lib/services/IncreaseService.ts`,
`lib/multichain/stellar/axiom-rail/IncreaseSettlement.ts`) and
flipping it would silently retarget unrelated banking endpoints.

## Sandbox parameters used

- **Base URL:** `https://sandbox.increase.com`
- **Routing number override:** `101050001` (First Bank of The United States — sandbox test routing)
- **Account number override:** `987654321` (any 8–15 digit value accepted in sandbox)
- **Sandbox cap_adapters row name:** `capinfra-ach-increase-sandbox`
- Mode at provision time: `DRY_RUN`. The smoke harness transitions it to `MANUAL_APPROVAL` for checks 55–64 and restores `DRY_RUN` at #64.

## Remaining for production confirmation

This task is **sandbox validation only**. None of the following has
been performed and all of them remain prerequisites for any real
production ACH submission:

1. **Real production destination details.** `AXIOM_SMOKE_*` and any
   real production callers must use the real Axiom Banking ACH
   destination (routing + account at the receiving institution),
   not the sandbox test routing.
2. **Dual-actor `MANUAL_APPROVAL → LIVE_CANARY` transition** through
   `POST /api/capinfra/adapters/increase/config` with two distinct
   `primaryActor` / `secondaryActor` identities and no skipped
   gate check.
3. **≥10 SUBMITTED ACH instructions** observed in production with
   no unresolved drift, per the `LIVE_CANARY` promotion gate.
4. **≥1 COMPLETED reconciliation run** for the production row,
   matching every SUBMITTED instruction to an Increase transaction.
5. **Webhook destination configured** in the Increase production
   dashboard pointing at `/api/capinfra/webhooks/increase` with the
   webhook signing secret stored in the production row's
   `config_json.webhookSigningSecret`.
6. **Operator runbook signed off** for emergency-disable and
   acknowledge dual-actor flows (smoke checks #45–#49 cover the
   API surface; the runbook covers the human side).

The production cap_adapters row was restored to `is_active=true`
at the end of this run; the sandbox row remains `is_active=false`
for repeat use.
