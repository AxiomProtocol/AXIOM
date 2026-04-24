# Field Intelligence + Real Estate Shared Contract Implementation Plan

Date: 2026-03-18
Source spec: docs/superpowers/specs/2026-03-18-field-intelligence-real-estate-shared-contract-design.md
Status: Ready for execution

## 1. Objective

Implement Phase 1 of the approved shared contract design across Field Intelligence and Real Estate:
- Canonical identity and status contracts
- Shared status mutation/read flows
- Centralized authz, audit, reliability semantics, and migration readiness

This plan is optimized for the current AXIOM hybrid architecture:
- Next.js App Router and Pages Router coexist
- Existing FI and RE tables/services remain in place
- New contract infrastructure is additive and reversible

## 2. Delivery Strategy

Implementation order:
1. Shared contract core
2. Persistence and migration primitives
3. Service-layer policy and reliability controls
4. FI adapter and endpoints
5. RE adapter and endpoints
6. Shared UI status components
7. Backfill and parity tooling
8. Test hardening and pilot gates

Execution rule:
- Do not begin event-timeline or financial-payload implementation until identity/status is fully pilot-ready.

## 3. Workstreams

## 3.1 Workstream A: Shared Contract Core

Goal:
- Create one canonical contract module consumed by both FI and RE.

Deliverables:
- Canonical TypeScript types for `AssetIdentity`, `LifecycleStatus`, `ActorRef`
- Shared canonical status enum
- Canonical reason-code taxonomy
- Request/response envelope definitions
- Status transition matrix artifact
- Shared validators for contract write commands

Likely file targets:
- `shared/contracts/identityStatus.ts`
- `shared/contracts/envelopes.ts`
- `shared/contracts/reasonCodes.ts`
- `shared/contracts/transitionMatrix.ts`
- `shared/contracts/validators.ts`

Exit criteria:
- Both verticals import the same contract types.
- Transition matrix is explicit, versioned, and testable.
- Contract validation works without domain-specific code.

## 3.2 Workstream B: Persistence and Schema Layer

Goal:
- Add canonical persistence without breaking current FI/RE flows.

Deliverables:
- New Drizzle tables:
  - `contract_entities`
  - `contract_status_history`
  - `contract_events`
  - `contract_financial_payloads`
  - `contract_adapter_links`
- Optional `contract_event_outbox` table if kept separate from `contract_events`
- Drizzle migration files
- Shared repository helpers for contract reads/writes

Likely file targets:
- `shared/contractSchema.ts`
- `drizzle/migrations/*contract*.sql`
- `server/services/contracts/repository.ts`

Exit criteria:
- Schema migration is additive only.
- Tables support append-only history and outbox semantics.
- Repository helpers support transactional writes.

## 3.3 Workstream C: Authz, Reliability, and Service Layer

Goal:
- Centralize policy enforcement and make writes safe.

Deliverables:
- Server-side canonical auth-context resolver
- Shared policy guard utility
- Transaction wrapper for contract mutations
- Idempotency key enforcement
- Optimistic concurrency enforcement
- Audit writer and outbox writer
- Canonical error mapper

Likely file targets:
- `server/services/contracts/authContext.ts`
- `server/services/contracts/policy.ts`
- `server/services/contracts/service.ts`
- `server/services/contracts/audit.ts`
- `server/services/contracts/outbox.ts`
- `server/services/contracts/errors.ts`

Exit criteria:
- All contract writes use one service entrypoint.
- Client identity hints are ignored for authorization.
- Writes are atomic across domain mutation, history, audit, and outbox.

## 3.4 Workstream D: Field Intelligence Adapter

Goal:
- Map FI inspection sessions into canonical entity/status flows.

Deliverables:
- FI native-to-canonical status mapping
- FI adapter link resolution
- FI status mutation integration through service layer
- Canonical reads for FI session page

Likely file targets:
- `server/services/contracts/adapters/fieldIntelligence.ts`
- `app/api/field-intelligence/*`
- `app/field-intelligence/sessions/[sessionId]/page.tsx`
- `components/InspectionWalkthrough.tsx`

Exit criteria:
- Session page reads canonical identity/status.
- Session status updates go through shared contract endpoints.
- Unmapped FI statuses are blocked with explicit remediation reason.

## 3.5 Workstream E: Real Estate Adapter

Goal:
- Map RE properties/deals into canonical entity/status flows.

Deliverables:
- RE native-to-canonical status mapping
- Canonical entity resolution for property/deal pages
- Shared status mutation flow for RE pipeline records

Likely file targets:
- `server/services/contracts/adapters/realEstate.ts`
- `pages/api/real-estate/**`
- `app/api/re/**`
- `pages/re/**`
- `pages/deal-intelligence/**`

Exit criteria:
- RE property/deal reads can resolve canonical identity/status.
- Status changes use shared policy and shared contract responses.

## 3.6 Workstream F: Shared UI Components

Goal:
- Replace local status display logic with shared contract-aware components.

Deliverables:
- Shared `StatusChip`
- Shared `StatusTransitionModal`
- Shared `ActorBadge`
- Shared `ContractEntityHeader`
- Shared contract query/mutation hooks

Likely file targets:
- `components/contracts/StatusChip.tsx`
- `components/contracts/StatusTransitionModal.tsx`
- `components/contracts/ActorBadge.tsx`
- `components/contracts/ContractEntityHeader.tsx`
- `lib/contracts/client.ts`
- `lib/contracts/hooks.ts`

Exit criteria:
- FI and RE use the same status display and transition controls.
- Role-to-control visibility is enforced in UI and server policy.

## 3.7 Workstream G: Backfill and Parity Tooling

Goal:
- Prepare safe rollout and rollback.

Deliverables:
- Dry-run backfill script
- Canonical entity seeding for existing FI sessions and RE records
- Parity report by domain/entity/status
- Dual-read comparison tool
- Cutover readiness report

Likely file targets:
- `scripts/contracts/backfill.ts`
- `scripts/contracts/parity-report.ts`
- `scripts/contracts/dual-read-check.ts`

Exit criteria:
- Backfill can run without mutating production records in dry-run mode.
- Parity reports expose mismatch classes and counts.

## 3.8 Workstream H: Testing and Rollout Gates

Goal:
- Make Phase 1 pilot-safe.

Deliverables:
- Contract schema tests
- Transition matrix tests
- Adapter mapping tests
- Authz tests by role/domain/provider
- Concurrency tests
- Migration parity tests
- FI and RE API integration tests
- UI visibility and mutation tests

Likely file targets:
- `tests/contracts/*.test.ts`
- `tests/field-intelligence/*.test.ts`
- `tests/real-estate/*.test.ts`
- `tests/integration/contracts/*.test.ts`

Exit criteria:
- Zero unauthorized transition escapes.
- Zero critical parity mismatches.
- Deterministic failures for invalid transitions and stale concurrency tokens.

## 4. Recommended Execution Sequence

## Phase 1A: Contract Foundation
1. Add shared contract types, reason codes, envelopes, and transition matrix.
2. Add validators and canonical error taxonomy.
3. Add unit tests for schema and transition matrix.

## Phase 1B: Schema and Service Infrastructure
1. Add canonical contract schema and migrations.
2. Add service-layer transaction wrapper, auth-context resolver, and policy guard.
3. Add audit and outbox infrastructure.
4. Add repository helpers.

## Phase 1C: FI Integration
1. Implement FI adapter.
2. Add `/api/contracts/v1/entities` FI-backed reads.
3. Add `/api/contracts/v1/entities/[id]/status` mutation path for FI.
4. Replace FI page status UI with shared components.

## Phase 1D: RE Integration
1. Implement RE adapter.
2. Add RE-backed canonical reads and status writes.
3. Replace RE status display/actions with shared components.

## Phase 1E: Rollout Tooling and Hardening
1. Add backfill and parity scripts.
2. Add dual-read validation.
3. Add integration/concurrency/security tests.
4. Gate rollout behind feature flags.

## 5. Feature Flags

Add flags for controlled rollout:
- `contracts.phase1.identityStatus.enabled`
- `contracts.fi.enabled`
- `contracts.re.enabled`
- `contracts.dualRead.enabled`
- `contracts.dualWriteShadow.enabled`

Initial rollout recommendation:
1. Enable core infrastructure with no UI cutover.
2. Enable FI canonical reads.
3. Enable FI status writes.
4. Enable RE canonical reads.
5. Enable RE status writes.

## 6. API Contract Decisions

Contract route namespace:
- `/api/contracts/v1/...`

Minimum endpoints for Phase 1:
- `GET /api/contracts/v1/entities/:id`
- `POST /api/contracts/v1/entities/:id/status`
- `GET /api/contracts/v1/entities/:id/events` as stub or deferred behind flag

Minimum write envelope:
- `requestId`
- `idempotencyKey`
- `concurrency`
- `reasonCode`
- `payload`

Server authority rule:
- `actorContext` is server-derived and authoritative.
- Client-provided identity or scope claims are ignored for authz.

## 7. Immediate Next Coding Tasks

These are the first implementation tasks to execute in order:

1. Create shared contract module and transition matrix.
2. Add canonical schema file and initial migration.
3. Build service-layer auth-context and policy guard.
4. Implement canonical status read/write service with transaction wrapper.
5. Wire FI adapter to current field-intelligence session flow.
6. Replace FI session page status rendering with shared contract components.
7. Implement RE adapter for one initial entity type:
   - recommended first target: `deal`
8. Add integration tests for FI and RE status mutations.

## 8. Risks to Watch During Execution

1. Native status sprawl
- Mitigation: adapter mapping table checked into source with test coverage.

2. Hybrid route duplication
- Mitigation: put canonical contract endpoints in one place and keep legacy endpoints read-through only during migration.

3. Auth-provider inconsistency
- Mitigation: normalize context once in the contract service layer, not per route.

4. Partial-write risk
- Mitigation: single transaction plus outbox requirement is non-negotiable.

## 9. Done Definition for Phase 1

Phase 1 is complete only when all of the following are true:
- FI and RE can both resolve canonical identity/status.
- FI and RE can both mutate status through `/api/contracts/v1/entities/:id/status`.
- Shared status UI is active in both verticals.
- Policy guard enforces role/domain transitions centrally.
- Audit and outbox writes are atomic with domain mutations.
- Backfill dry run and parity report pass the pilot gate.
- Integration, concurrency, and authz tests pass.