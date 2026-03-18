# Field Intelligence + Real Estate Shared Contract Design

Date: 2026-03-18
Status: Draft
Decision: Approach A (Canonical Domain Contract + Adapter Layer)

## 1. Context and Goals

AXIOM has both Field Intelligence and Real Estate surfaces deployed, but UI and backend integration are inconsistent across verticals. Both verticals will be implemented in parallel through one shared contract layer.

Primary goal:
- Establish one canonical contract surface across Field Intelligence and Real Estate.

Phased priority (approved):
1. Identity + status
2. Workflow events
3. Financial payloads

Success bar for Phase 1 (approved):
- Pilot-ready: end-to-end functionality plus centralized authz, audit logging, validation, role-to-control visibility matrix, and migration/backfill support.

## 2. Architecture Decision

Recommended approach (selected):
- Canonical Contract Core + Vertical Adapters

### 2.1 Canonical Contract Core
The shared core owns:
- Type definitions
- Validation rules
- Status vocabulary
- Contract request/response envelopes
- Reason-code taxonomy

### 2.2 Vertical Adapters
- Field Intelligence adapter maps FI-native entities and transitions into canonical contract objects.
- Real Estate adapter maps RE-native entities and transitions into canonical contract objects.
- Adapters preserve backward compatibility with existing tables/services while exposing one unified contract outward.

### 2.3 Application Service Layer
A thin orchestration layer between API routes and adapters enforces:
- Authentication and authorization
- Validation
- Policy-based status transition checks
- Audit logging
- Outbox-backed workflow event emission

### 2.4 UI Integration Pattern
Both vertical UIs consume shared contract view models for common concerns:
- Status chips
- Status transition controls
- Actor attribution
- Timeline/event feed

Vertical-specific details remain in local panels.

## 3. Canonical Contract Model (Phased)

## 3.1 Phase 1: Identity + Status

### Canonical entities

`AssetIdentity`
- id (canonical UUID)
- externalId (native ID, optional)
- domain (`field_intelligence` | `real_estate`)
- entityType (`inspection_session` | `property` | `deal`)
- title
- ownerOrgId
- operatorId
- createdAt
- updatedAt

`LifecycleStatus`
- status (canonical enum)
- substatus (domain-specific)
- statusReasonCode (optional)
- effectiveAt
- changedBy (actor ref)

`ActorRef`
- actorId
- actorType (`admin` | `operator` | `system` | `investor`)
- wallet (optional)
- displayName

### Shared status enum
- draft
- intake
- under_review
- approved
- in_execution
- completed
- blocked
- rejected
- archived

### Mapping rules
- FI adapter maps inspection session states into canonical statuses.
- RE adapter maps property/deal pipeline states into canonical statuses.
- Unmapped legacy states map to `blocked` with `statusReasonCode = unmapped_legacy_state` and preserve original in `substatus`.
- Unmapped states cannot transition until an explicit remediation mapping is approved.

### Transition matrix requirement
- A role-by-domain transition matrix is required for all status mutations.
- Denied transitions return `409` with canonical reason codes.
- The matrix is versioned and treated as a tested policy artifact.

## 3.2 Phase 2: Workflow Events

`WorkflowEvent`
- eventId
- entityRef
- eventType (`status_changed` | `approval_requested` | `approval_granted` | `approval_rejected` | `comment_added` | `assignment_changed`)
- payload (typed by eventType)
- occurredAt
- actor
- correlationId

Rules:
- Every status mutation emits `status_changed`.
- Approval actions require role checks and produce immutable event records.

## 3.3 Phase 3: Financial Payloads

`AssumptionSet`
- normalized underwriting inputs
- version
- source
- confidence

`ScenarioResult`
- scenarioId
- label
- outputs (IRR, CoC, DSCR, payback months, downside metrics)
- qualityScore
- validationFlags

`CapitalDecisionPayload`
- recommendation (`go` | `hold` | `decline`)
- rationale codes
- threshold checks
- approver metadata

## 4. API and Data Flow Design

## 4.1 Request path
1. UI sends typed canonical command.
2. API validates canonical schema.
3. Service layer enforces authz + transition policy.
4. Service layer opens one transaction and passes transaction context to the FI/RE adapter.
5. Adapter applies native persistence updates using the active transaction.
6. The same transaction writes status history, audit rows, and an outbox event record.
7. Transaction commits atomically or fully rolls back.
8. Outbox publisher emits workflow events asynchronously with dedupe by `eventId`.
9. API returns canonical DTO.

## 4.2 Contract-first endpoints
Keep existing endpoints alive for compatibility and introduce:
- `/api/contracts/v1/entities`
- `/api/contracts/v1/entities/[id]`
- `/api/contracts/v1/entities/[id]/status`
- `/api/contracts/v1/entities/[id]/events`
- `/api/contracts/v1/entities/[id]/financials`

## 4.3 Data model additions
New tables:
- `contract_entities`
- `contract_status_history`
- `contract_events`
- `contract_financial_payloads`
- `contract_adapter_links`

Migration strategy:
- Non-destructive additions only in Phase 1.
- Backfill from existing FI sessions and RE properties/deals.
- Reconciliation report on completeness and mapping exceptions.

## 4.4 Reliability semantics
- All write commands require an idempotency key.
- All status writes require optimistic concurrency preconditions (`version` or `updatedAt`).
- Retries are safe and must not create duplicate status or audit entries.
- Transactional order for writes: domain mutation -> status history -> audit row -> outbox event.
- Event publishing is at-least-once from outbox with exactly-once effect enforced via dedupe keys.

## 4.4.1 Canonical write command contract
All write endpoints require this envelope:
- `requestId` (correlation metadata)
- `idempotencyKey` (required)
- `concurrency` object with exactly one required precondition: `version` or `updatedAt`
- `actorContext` (optional client hint only; non-authoritative)
- `reasonCode` (required for status transition writes)
- `payload` (operation-specific typed payload)

Auth trust rule:
- Server-derived auth context is authoritative for actor identity and scope.
- Client-supplied actor identity, org, or scope fields are ignored for authorization decisions.
- Mismatch between client hint and server context must be logged as a security signal.

## 4.4.2 Transaction ownership
- The application service layer owns and opens the transaction boundary.
- Adapters must accept the active transaction context and cannot create independent write transactions for contract mutations.
- Domain mutation, status history, audit write, and outbox insert must complete or roll back atomically under the single service-layer transaction.

## 4.5 Compatibility contract
- Versioned namespace: `/api/contracts/v1/...`.
- Stable success and error envelope fields are guaranteed across minor revisions.
- Legacy FI/RE endpoints have a documented deprecation window and sunset date.
- A dual-read parity period compares canonical reads against legacy reads before endpoint cutover.

## 4.6 Migration and rollback gates
- Dry-run backfill is mandatory with exception classes and counts.
- Parity metrics/checksums are required by entity type and status.
- Dual-write shadow window is required with mismatch alert thresholds.
- Rollback criteria are tied to SLO violations and mismatch percentages.
- Cutover is blocked if parity gates fail.

## 5. Security and Audit Requirements

## 5.1 Canonical auth context
Every write request must include normalized context derived from the active auth provider:
- actorId
- actorType
- orgId
- domainScopes
- authProvider
- sessionId

Authoritative source requirement:
- This context is computed server-side from the validated session/token.
- Authorization decisions must never depend on client-submitted identity attributes.

## 5.2 Policy enforcement model
- All contract endpoints must use one shared policy guard utility.
- Adapters are not permitted to mutate status without a successful policy evaluation.
- Policy decisions must be logged with correlationId and reasonCode.

## 5.3 Audit integrity and retention
- Audit and status history tables are append-only.
- Each audit row includes tamper-evidence metadata (row hash or chain hash).
- Retention policy is explicit and environment-specific.
- PII redaction rules are defined for details payloads before persistence and export.

Centralized policy guard is mandatory for status writes:
- Actor identity present
- Role entitlement valid
- Domain scope entitlement valid
- Status transition allowed

Every write stores:
- before/after values
- actor
- timestamp
- correlationId
- reasonCode

## 6. Error Handling Model

Standard error envelope:
- code
- reasonCode
- message
- details
- correlationId
- retryable
- fieldErrors

Status codes:
- 400 validation error
- 401 unauthenticated
- 403 unauthorized
- 404 entity not found
- 409 invalid transition
- 422 semantic/domain conflict
- 500 unexpected error

UI behavior:
- Inline errors for user-fixable fields
- Toast + retry for transient failures
- Timeline renders events only after transaction commit acknowledgement and deterministic event ordering.

Adapter behavior:
- Legacy/native errors must map to canonical `reasonCode` taxonomy.

## 7. Testing Strategy

Contract tests:
- Schema conformance
- Enum and transition matrix conformance
- Adapter mapping fidelity

Service tests:
- Role/domain authz
- Audit + event emission
- Idempotency on retries
- Optimistic concurrency conflict handling

Integration tests:
- FI and RE happy-path status updates
- Unauthorized/forbidden paths
- Event history retrieval
- Tenant boundary and auth-provider parity checks

Migration tests:
- Deterministic backfill parity validation
- Exception class handling and reporting
- Dual-write shadow mismatch threshold enforcement

Concurrency tests:
- Simultaneous status transition race handling
- Duplicate command replay with idempotency key reuse

UI tests:
- Shared status components for all canonical states
- Transition modal action gating
- Timeline actor/time/reason rendering
- Role-to-control visibility matrix coverage

## 8. Pilot Acceptance Criteria

Functional:
- FI and RE both support create/read/update status through contract endpoints.
- Both UIs use shared status and timeline components.

Security/compliance:
- Centralized RBAC enforcement.
- Immutable audit/event record for every mutation.

Reliability:
- Backfill completes with reconciliation report.
- Feature flags enable rollback per vertical.
- Zero critical parity mismatches at pilot gate.
- Zero unauthorized transition escapes at pilot gate.

Operations:
- Correlation IDs visible in logs.
- Transition failure/authz denial reporting available.

## 9. Delivery Sequence

Sprint 1:
- Canonical identity/status schemas
- New canonical tables
- Adapter link model

Sprint 2:
- FI + RE adapter implementation
- Shared status UI and status mutation flows

Sprint 3:
- Workflow timeline, audit hardening
- Backfill + reconciliation tooling
- Test hardening

Sprint 4:
- Pilot rollout (staged by vertical/org)
- Monitoring, rollback playbook, operational validation

## 10. Risks and Mitigations

Risk: Legacy status mismatch across verticals.
Mitigation: Adapter mapping table + `substatus` passthrough + explicit unmapped-state reporting.

Risk: Drift between vertical API behavior.
Mitigation: Canonical schema validation in one shared core + contract tests in CI.

Risk: Operational ambiguity during rollout.
Mitigation: Feature flags, correlation IDs, and migration reconciliation report before cutover.
