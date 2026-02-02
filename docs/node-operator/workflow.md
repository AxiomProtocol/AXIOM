# Node Operator Program - Workflow

**Version:** 1.0  
**Created:** February 2, 2026  
**Source:** `pages/operator.tsx`, `shared/schema.ts`

---

## Operator Lifecycle State Machine

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │                   OPERATOR LIFECYCLE                         │
                    └─────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ NOT_APPLIED │───▶│   APPLIED   │───▶│  VERIFIED   │───▶│ PROVISIONED │
│             │    │             │    │             │    │             │
│ No record   │    │ Application │    │ Identity    │    │ Credentials │
│ in database │    │ submitted   │    │ confirmed   │    │ issued      │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                          │                  │                  │
                          │                  │                  │
                          ▼                  ▼                  ▼
                    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
                    │  REJECTED   │    │  REJECTED   │    │  REJECTED   │
                    └─────────────┘    └─────────────┘    └─────────────┘
                                              │
                                              ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   ACTIVE    │◀───│  CERTIFIED  │◀───│DRY_RUN_PASS │
│             │    │             │    │             │
│ Fully       │    │ Certificate │    │ Training    │
│ operational │    │ issued      │    │ complete    │
└─────────────┘    └─────────────┘    └─────────────┘
      │
      ▼
┌─────────────┐
│  SUSPENDED  │ (Can be applied at any stage after ACTIVE)
└─────────────┘
```

---

## State Definitions

*Source: `pages/operator.tsx` lines 6, 43-50*

| UI State | API/DB Value | Description | Exit Criteria |
|----------|--------------|-------------|---------------|
| NOT_APPLIED | No record | Wallet connected, no application | Submit application form |
| APPLIED | `APPLIED` | Application submitted | Admin advances to VERIFIED |
| VERIFIED | `VERIFIED` | Identity confirmed | Admin advances to PROVISIONED |
| PROVISIONED | `PROVISIONED` | Credentials issued | Complete dry-run exercises |
| DRY_RUN_PASSED | `DRY_RUN_PASSED` | Training complete | Complete certification checklist |
| CERTIFIED | `CERTIFIED` | Certificate issued | Admin activates |
| ACTIVE | `ACTIVE` | Fully operational | N/A (terminal state) |
| SUSPENDED | `SUSPENDED` | Temporarily disabled | Admin reinstates |
| REJECTED | `REJECTED` | Application denied | Reapply (new application) |

**Note:** See [data-model.md](./data-model.md#technical-debt-statusphase-mismatch) for technical debt regarding schema vs API value mismatch.

---

## Onboarding Phases

The `onboarding_phase` field tracks detailed progress within each state:

| Phase | Description | Corresponding Status |
|-------|-------------|---------------------|
| APPLICATION | Initial application | APPLIED |
| VERIFICATION | Identity check | VERIFIED |
| PROVISIONING | Credential issuance | PROVISIONED |
| DRY_RUN | Training exercises | DRY_RUN_PASSED |
| CERTIFICATION | Final certification | CERTIFIED |
| ACTIVATION | Full activation | ACTIVE |

---

## Operator Roles

Operators can hold one or more roles simultaneously (multi-role support):

| Role | Capabilities | Requirements |
|------|--------------|--------------|
| OBSERVER | Read-only access to settlement pipeline | Email verification, Wallet signature, Charter acknowledgment |
| VALIDATOR | Review artifacts, verify underwriting, submit reports | KYC, Reference check, Dry-run exercises, Charter |
| ATTESTOR | Final attestations for settlement authorization | Full KYC, Competency test, Bonding proof, Dual attestation training |

**Role Hierarchy:**
- Attestor includes Validator capabilities
- Validator includes Observer capabilities
- Operators can select all 3 roles ("Full Operator Mode")

---

## Transition Events

### Application Submission

**Trigger:** User submits application form  
**From:** NOT_APPLIED  
**To:** APPLIED  
**Actions:**
1. Create `node_operators` record
2. Create `node_onboarding` record
3. Generate unique `operatorId`
4. Store selected roles in `roles` jsonb field

### Admin Advancement

**Trigger:** Admin clicks "Advance" in admin panel  
**From:** Any state (except ACTIVE/REJECTED)  
**To:** Next state in sequence  
**Actions:**
1. Update `status` field
2. Update `onboarding_phase` field
3. Update timestamp in `node_onboarding`
4. Send email notification (Resend)
5. Log action to `admin_audit_logs`

### Admin Rejection

**Trigger:** Admin clicks "Reject" in admin panel  
**From:** Any state (except ACTIVE)  
**To:** REJECTED  
**Actions:**
1. Update `status` to REJECTED
2. Send rejection email with reason
3. Log action to `admin_audit_logs`

### Certification Completion

**Trigger:** User completes certification checklist  
**From:** PROVISIONED/DRY_RUN_PASSED  
**To:** CERTIFIED  
**Actions:**
1. Validate all checklist items checked
2. Update `status` to CERTIFIED
3. Set `certificationCompletedAt` timestamp
4. Certificate becomes available for display/print

---

## Certification Checklist

Operators must complete all items before certification:

| Item | Description | Verification |
|------|-------------|--------------|
| Charter | Read and acknowledge Node Charter | Checkbox |
| Dry-Run | Complete practice attestation | Checkbox |
| Key Management | Review security requirements | Checkbox |
| Communication | Acknowledge response SLA | Checkbox |
| Bonding | Confirm bonding requirements (Attestors) | Checkbox |

---

## Email Notifications

| Event | Template | Recipient |
|-------|----------|-----------|
| Application Received | Confirmation | Operator |
| Advanced to Verified | Status Update | Operator |
| Advanced to Provisioned | Credentials Info | Operator |
| Advanced to Dry-Run Passed | Training Complete | Operator |
| Certified | Certificate Ready | Operator |
| Activated | Welcome to Active | Operator |
| Rejected | Rejection Notice | Operator |
| Custom Message | Admin Custom | Operator |

---

## Admin Workflow

```
Admin Login (Wallet + ADMIN_WALLETS check)
          │
          ▼
   ┌─────────────────┐
   │  View Dashboard │ (Stats, counts by status)
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ Filter/Search   │ (By status, search by wallet/name)
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │ Select Operator │
   └────────┬────────┘
            │
    ┌───────┼───────┬────────┐
    ▼       ▼       ▼        ▼
 Advance  Reject  Email   View Details
    │       │       │        │
    └───────┴───────┴────────┘
            │
            ▼
   ┌─────────────────┐
   │ Action Logged   │ (admin_audit_logs)
   └─────────────────┘
```

---

## Bulk Operations

Admin can perform bulk operations on multiple operators:

| Operation | Limit | Requirements |
|-----------|-------|--------------|
| Bulk Advance | 20 operators max | All must be same status |
| CSV Export | All filtered | Any status filter |

---

## Rate Limiting

| Scope | Limit | Window |
|-------|-------|--------|
| Admin APIs | 30 requests | 1 minute |
| Per wallet | Individual | Rolling |

---

## Related Documents

- [architecture.md](./architecture.md) - System architecture
- [data-model.md](./data-model.md) - Database schema
- [on-chain-spec.md](./on-chain-spec.md) - Contract specifications
