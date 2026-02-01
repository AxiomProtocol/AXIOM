# Admin Proposals System

This document describes the two-step approval proposal system for sensitive admin actions.

## Overview

The proposal system ensures that sensitive operations (reversals, refunds, role changes, etc.) require approval from a second admin before execution. This provides:

- **Accountability**: Clear audit trail of who proposed and who approved
- **Security**: No single admin can perform sensitive actions alone
- **Idempotency**: Safe retries with unique keys
- **Atomicity**: All-or-nothing execution

## Proposal Lifecycle

```
┌──────────┐     ┌─────────┐     ┌──────────┐
│ PENDING  │────▶│APPROVED │────▶│ EXECUTED │
└──────────┘     └─────────┘     └──────────┘
     │                                 
     ├───────────────────────────────▶ REJECTED
     │
     ├───────────────────────────────▶ CANCELLED
     │
     └───────────────────────────────▶ EXPIRED (after 72h)
```

### States

| State | Description |
|-------|-------------|
| `pending` | Awaiting approval from second admin |
| `executed` | Approved and successfully executed |
| `rejected` | Denied by approving admin |
| `cancelled` | Cancelled by proposer or superadmin |
| `expired` | Not acted upon within expiration window |

## Idempotency

Every proposal requires a `unique_key` that prevents duplicate proposals for the same action.

### Best Practices for Unique Keys

```
# Format: action_type:target_id:timestamp_or_intent
transaction_reverse:tx_12345:20251226_refund_request
payout_reverse:pay_67890:20251226_customer_complaint_123
role_escalation:user_abc:20251226_promote_to_admin
```

If you attempt to create a proposal with a duplicate `unique_key`:
- Returns HTTP 409 Conflict
- Includes existing proposal ID and status
- Safe for retry logic

## Execution Atomicity

When a proposal is approved, the executor:

1. **Locks** the proposal row with `FOR UPDATE`
2. **Validates** status is `pending` and not expired
3. **Validates** approver is different from proposer
4. **Validates** approver has required role for action
5. **Captures** before-state of target
6. **Executes** the action in a database transaction
7. **Captures** after-state of target
8. **Records** events (approved, executed)
9. **Records** audit log with before/after snapshots
10. **Commits** transaction

### Safe Retries

If execution is retried after success:
- Returns stored `execution_result` without re-executing
- Idempotent behavior prevents duplicate side effects

## Audit Logging

Every proposal action generates audit log entries:

### Proposal Events (admin_proposal_events)

Append-only stream of proposal state changes:
- `created`: Proposal submitted
- `approved`: Proposal approved
- `executed`: Action completed
- `rejected`: Proposal denied
- `cancelled`: Proposal withdrawn
- `expired`: Proposal timed out

### Audit Log (admin_audit_log)

Comprehensive action logging:
- Actor (user ID, role)
- Action type
- Target (type, ID)
- Before/after state snapshots
- Reason text
- Request metadata (IP, user agent, request ID)

## Request ID Propagation

Every request receives a unique `requestId` (UUID v4) that:
- Links all actions in the same request
- Returns in every API response
- Records in audit logs
- Enables request tracing

## API Usage

### Creating a Proposal

```bash
curl -X POST https://your-domain.com/api/admin/proposals/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actionType": "transaction_reverse",
    "targetType": "transaction",
    "targetId": "12345",
    "amount": 150.00,
    "payload": {
      "originalTransactionId": "12345",
      "amount": 150.00,
      "accountId": 1
    },
    "reason": "Customer reported unauthorized charge",
    "uniqueKey": "tx_reverse_12345_20251226"
  }'
```

Response:
```json
{
  "proposalId": "abc-123-def",
  "requestId": "req-456-ghi",
  "status": "pending",
  "expiresAt": "2025-12-29T12:00:00.000Z"
}
```

### Approving a Proposal

```bash
curl -X POST https://your-domain.com/api/admin/proposals/abc-123-def/approve \
  -H "Authorization: Bearer DIFFERENT_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "approval_reason": "Verified unauthorized charge, approving reversal"
  }'
```

Response:
```json
{
  "success": true,
  "proposalId": "abc-123-def",
  "action": "transaction_reverse",
  "executedAt": "2025-12-26T12:30:00.000Z",
  "executedBy": "user-xyz",
  "result": {
    "originalTransactionId": "12345",
    "reversalId": "REV-abc12345",
    "amount": 150.00,
    "status": "reversed"
  },
  "requestId": "req-789-jkl"
}
```

### Rejecting a Proposal

```bash
curl -X POST https://your-domain.com/api/admin/proposals/abc-123-def/reject \
  -H "Authorization: Bearer DIFFERENT_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rejection_reason": "Transaction appears legitimate, no reversal needed"
  }'
```

### Cancelling a Proposal

Only the proposer or a superadmin can cancel:

```bash
curl -X POST https://your-domain.com/api/admin/proposals/abc-123-def/cancel \
  -H "Authorization: Bearer PROPOSER_OR_SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Customer withdrew complaint"
  }'
```

### Listing Proposals

```bash
curl -X GET "https://your-domain.com/api/admin/proposals/list?status=pending&limit=25" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Query parameters:
- `status`: Filter by status (pending, executed, rejected, cancelled, expired)
- `action_type`: Filter by action type
- `target_type`: Filter by target type
- `created_by`: Filter by proposer user ID
- `limit`: Max results (default 50, max 100)
- `cursor`: Pagination cursor (created_at timestamp)

## Error Handling

| Scenario | HTTP Status | Response |
|----------|-------------|----------|
| Duplicate unique_key | 409 | Existing proposal ID and status |
| Proposal not pending | 409 | Current status message |
| Same user approval | 403 | "Approver must be different" |
| Insufficient role | 403 | Required roles listed |
| Proposal expired | 400 | "Proposal has expired" |
| Missing required fields | 400 | Field list |

## Database Schema

### admin_proposals

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| action_type | TEXT | Type of action |
| target_type | TEXT | Type of target entity |
| target_id | TEXT | Target entity ID |
| amount | NUMERIC | Amount (for threshold logic) |
| payload | JSONB | Action-specific data |
| status | TEXT | Current status |
| reason | TEXT | Proposal reason |
| approval_reason | TEXT | Approval/rejection reason |
| unique_key | TEXT | Idempotency key (unique) |
| created_by | UUID | Proposer user ID |
| approved_by | UUID | Approver user ID |
| executed_by | UUID | Executor user ID |
| execution_result | JSONB | Execution outcome |
| expires_at | TIMESTAMP | Expiration time |

### admin_proposal_events

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| proposal_id | UUID | Foreign key |
| event_type | TEXT | Event type |
| actor_user_id | UUID | Actor user ID |
| actor_role | TEXT | Actor role |
| request_id | TEXT | Request tracking ID |
| event_payload | JSONB | Event-specific data |
| created_at | TIMESTAMP | Event time |

## Security

1. **Server-Only Execution**: All proposal logic runs on server
2. **JWT Verification**: All requests verified against Supabase
3. **Role Enforcement**: Roles checked from database, not token
4. **Distinct Approvers**: System enforces different users
5. **Immutable Logs**: Append-only audit trail
6. **Atomic Execution**: Database transactions for consistency
