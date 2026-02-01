# Admin RBAC System

This document describes the Role-Based Access Control (RBAC) system for the Axiom admin panel.

## Roles

The system supports four hierarchical admin roles:

| Role | Level | Description |
|------|-------|-------------|
| `superadmin` | Highest | Full system access, can approve all actions |
| `admin` | High | General admin access, can propose most actions |
| `finance` | Medium | Financial operations access |
| `moderator` | Base | Content moderation access only |

## Role Hierarchy

```
superadmin
    ├── admin
    │   ├── finance
    │   └── moderator
```

## Action Authorization Matrix

### Direct Actions (Single Admin)

| Action | Allowed Roles | Notes |
|--------|---------------|-------|
| List users | admin, superadmin | |
| Create non-privileged user | admin, superadmin | moderator role only |
| List transactions | finance, superadmin | |
| List payouts | finance, admin, superadmin | |
| Routine payout transitions | finance, admin, superadmin | Non-reversal only |
| List audit logs | admin, superadmin | |
| Moderation flag management | moderator, admin, superadmin | |
| Ban non-privileged user | admin, superadmin | |

### Two-Step Actions (Proposal Required)

These actions require a proposal from one admin and approval from a different admin.

| Action Type | Proposer Roles | Approver Roles (Under $5000) | Approver Roles ($5000+) |
|-------------|----------------|------------------------------|-------------------------|
| `transaction_reverse` | admin, finance, superadmin | admin, finance, superadmin | superadmin only |
| `transaction_refund` | admin, finance, superadmin | admin, finance, superadmin | superadmin only |
| `payout_reverse` | admin, finance, superadmin | superadmin only | superadmin only |
| `payout_override` | admin, finance, superadmin | superadmin only | superadmin only |
| `role_escalation` | superadmin only | superadmin only | superadmin only |
| `disable_privileged_user` | admin, superadmin | superadmin only | superadmin only |
| `user_create_privileged` | superadmin only | superadmin only | superadmin only |
| `moderation_ban_privileged` | admin, superadmin | superadmin only | superadmin only |

## Threshold-Based Policy

The system uses a threshold of **$5,000** to determine approval requirements:

- **Under threshold**: Proposer and approver can be any allowed role (must be distinct users)
- **At or over threshold**: Approver must be a superadmin (still must be distinct from proposer)

### Actions That ALWAYS Require Superadmin Approval

Regardless of amount:
- Payout reversals
- Payout historical overrides
- Role escalation to admin/superadmin
- Disabling privileged users
- Creating privileged users
- Banning privileged users

### Role Escalation Requirements

Escalating a user to `admin` or `superadmin` role requires:
1. Proposer must be a superadmin
2. Approver must be a different superadmin

This ensures no single superadmin can unilaterally create new privileged accounts.

## Authentication

All admin endpoints require:

1. **JWT Token**: Valid Supabase JWT in `Authorization: Bearer <token>` header
2. **Role Assignment**: User must have a role in the `user_roles` table

### Token Verification Flow

```
Request → Extract Bearer Token → Verify JWT with Supabase → Get User ID → Lookup Role in DB → Authorize
```

## API Endpoints

### Proposals

| Endpoint | Method | Required Role |
|----------|--------|---------------|
| `/api/admin/proposals/create` | POST | Per action type |
| `/api/admin/proposals/list` | GET | moderator+ |
| `/api/admin/proposals/[id]` | GET | moderator+ |
| `/api/admin/proposals/[id]/approve` | POST | Per action type |
| `/api/admin/proposals/[id]/reject` | POST | Per action type |
| `/api/admin/proposals/[id]/cancel` | POST | proposer or superadmin |

### Users

| Endpoint | Method | Required Role |
|----------|--------|---------------|
| `/api/admin/users` | GET | admin, superadmin |
| `/api/admin/users/create` | POST | admin, superadmin |
| `/api/admin/users/disable` | POST | admin, superadmin |
| `/api/admin/users/set-role` | POST | admin, superadmin (escalation: superadmin only) |

### Payouts

| Endpoint | Method | Required Role |
|----------|--------|---------------|
| `/api/admin/payouts` | GET | finance, admin, superadmin |
| `/api/admin/payouts/transition` | POST | finance, admin, superadmin |

### Transactions

| Endpoint | Method | Required Role |
|----------|--------|---------------|
| `/api/admin/transactions` | GET | finance, superadmin |
| `/api/admin/transactions/reverse` | POST | admin, finance, superadmin |
| `/api/admin/transactions/refund` | POST | admin, finance, superadmin |

### Moderation

| Endpoint | Method | Required Role |
|----------|--------|---------------|
| `/api/admin/moderation/flags` | GET | moderator, admin, superadmin |
| `/api/admin/moderation/remove` | POST | moderator, admin, superadmin |
| `/api/admin/moderation/ban-user` | POST | admin, superadmin |

### Audit

| Endpoint | Method | Required Role |
|----------|--------|---------------|
| `/api/admin/audit` | GET | admin, superadmin |
| `/api/admin/audit/[id]` | GET | admin, superadmin |

## Error Codes

| Status | Meaning |
|--------|---------|
| 401 | Missing or invalid authentication |
| 403 | Insufficient role permissions |
| 400 | Invalid request (missing fields, invalid action type) |
| 404 | Resource not found |
| 409 | Conflict (duplicate idempotency key, invalid proposal state) |
| 500 | Internal server error |

## Security Considerations

1. **Service Role Key**: The `SUPABASE_SERVICE_ROLE_KEY` is server-only and never bundled to the client
2. **Distinct Approvers**: No admin can approve their own proposals
3. **Audit Trail**: Every action is logged with before/after state
4. **Idempotency**: Proposals use unique keys to prevent duplicates
5. **Expiration**: Proposals expire after 72 hours by default
