# Node Operator Program - Data Model

**Version:** 1.0  
**Created:** February 2, 2026  
**Source:** `shared/schema.ts`, `pages/api/operator/*`

---

## Database Schema

### node_operators

Primary table for operator profiles.

```sql
CREATE TABLE node_operators (
  id SERIAL PRIMARY KEY,
  operator_id VARCHAR(50) NOT NULL UNIQUE,
  wallet_address VARCHAR(42) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  role operator_role_enum DEFAULT 'OBSERVER',
  roles JSONB DEFAULT '["OBSERVER"]',
  status operator_status_enum DEFAULT 'PENDING',
  onboarding_phase onboarding_phase_enum DEFAULT 'APPLICATION',
  total_milestones_completed INTEGER DEFAULT 0,
  total_earnings DECIMAL(18,2) DEFAULT 0,
  pending_earnings DECIMAL(18,2) DEFAULT 0,
  attestation_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP,
  activated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX node_operators_wallet_idx ON node_operators(wallet_address);
CREATE INDEX node_operators_status_idx ON node_operators(status);
CREATE INDEX node_operators_role_idx ON node_operators(role);
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| id | SERIAL | Internal primary key |
| operator_id | VARCHAR(50) | Public operator identifier (e.g., "OP-ABC123") |
| wallet_address | VARCHAR(42) | Ethereum wallet address (lowercase) |
| display_name | VARCHAR(200) | Operator display name |
| email | VARCHAR(200) | Contact email (optional) |
| role | ENUM | Primary role (legacy, use `roles` instead) |
| roles | JSONB | Array of assigned roles ["OBSERVER", "VALIDATOR", "ATTESTOR"] |
| status | ENUM | Current operator status |
| onboarding_phase | ENUM | Detailed onboarding phase |
| total_milestones_completed | INTEGER | Count of completed milestones |
| total_earnings | DECIMAL | Total earnings (USD) |
| pending_earnings | DECIMAL | Pending earnings (USD) |
| attestation_count | INTEGER | Total attestations provided |
| last_activity_at | TIMESTAMP | Last activity timestamp |
| activated_at | TIMESTAMP | Activation timestamp |
| created_at | TIMESTAMP | Record creation |
| updated_at | TIMESTAMP | Last update |

### node_onboarding

Tracks detailed onboarding progress.

```sql
CREATE TABLE node_onboarding (
  id SERIAL PRIMARY KEY,
  onboarding_id VARCHAR(50) NOT NULL UNIQUE,
  operator_id VARCHAR(50) REFERENCES node_operators(operator_id) NOT NULL,
  current_phase onboarding_phase_enum DEFAULT 'APPLICATION',
  application_submitted_at TIMESTAMP,
  verification_completed_at TIMESTAMP,
  provisioning_completed_at TIMESTAMP,
  dry_run_completed_at TIMESTAMP,
  certification_completed_at TIMESTAMP,
  activation_completed_at TIMESTAMP,
  expires_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX node_onboarding_operator_idx ON node_onboarding(operator_id);
```

### admin_audit_logs

Audit trail for admin actions.

```sql
CREATE TABLE admin_audit_logs (
  id SERIAL PRIMARY KEY,
  action_id VARCHAR(50) NOT NULL UNIQUE,
  admin_wallet VARCHAR(42) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  target_operator_id VARCHAR(50),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX admin_audit_logs_admin_idx ON admin_audit_logs(admin_wallet);
CREATE INDEX admin_audit_logs_action_idx ON admin_audit_logs(action_type);
```

---

## Enum Definitions

*Source: `shared/schema.ts` lines 8042-8063*

### operator_status_enum (Schema Definition)

```sql
CREATE TYPE operator_status_enum AS ENUM (
  'PENDING',
  'ONBOARDING',
  'ACTIVE',
  'SUSPENDED',
  'INACTIVE'
);
```

### operator_role_enum

```sql
CREATE TYPE operator_role_enum AS ENUM (
  'OBSERVER',
  'VALIDATOR',
  'ATTESTOR'
);
```

### onboarding_phase_enum

```sql
CREATE TYPE onboarding_phase_enum AS ENUM (
  'APPLICATION',
  'VERIFICATION',
  'PROVISIONING',
  'DRY_RUN',
  'CERTIFICATION',
  'ACTIVATION'
);
```

---

## Technical Debt: Status/Phase Mismatch

**Issue:** The API layer (`pages/api/operator/apply.ts`) inserts status values ('APPLIED') that don't match the schema enum definition.

| Layer | Status Values Used |
|-------|-------------------|
| Schema (Drizzle) | PENDING, ONBOARDING, ACTIVE, SUSPENDED, INACTIVE |
| API Layer | APPLIED, VERIFIED, PROVISIONED, DRY_RUN_PASSED, CERTIFIED, ACTIVE |
| Frontend UI | APPLIED, VERIFIED, PROVISIONED, DRY_RUN_PASSED, CERTIFIED, ACTIVE |

**Root Cause:** Schema was updated to simplified values, but API and frontend still use extended status values.

**Resolution Options:**
1. Update schema enum to match API/UI values (breaking change, requires migration)
2. Update API/UI to use schema values (application logic change)
3. PostgreSQL may accept non-enum values if column type was altered

**Recommendation:** Audit database for actual column type before Step 2 implementation.

---

## API Contracts

### POST /api/operator/apply

**Request:**
```typescript
{
  walletAddress: string;  // Ethereum address
  displayName: string;    // Display name
  email?: string;         // Contact email
  roles: OperatorRole[];  // ['OBSERVER'] | ['VALIDATOR'] | ['ATTESTOR'] | combinations
}
```

**Response:**
```typescript
{
  success: boolean;
  operatorId?: string;  // e.g., "OP-ABC123"
  message?: string;     // Error message if failed
}
```

### GET /api/operator/status?wallet={address}

*Source: `pages/api/operator/status.ts` lines 48-84*

**Response:**
```typescript
{
  operator: {
    operatorId: string;
    walletAddress: string;
    displayName: string;
    email: string;
    role: OperatorRole;
    roles: OperatorRole[];
    status: string;
    onboardingPhase: string;
    totalMilestonesCompleted: number;
    attestationCount: number;
    lastActivityAt: string | null;
    activatedAt: string | null;
    createdAt: string;
  } | null;
  rewards: {
    usdAccrued: number;
    usdPaid: number;
    usdPending: number;
    conversionBucket: number;
    slashedAmount: number;
  } | null;
  onboarding: {
    onboardingId: string;
    currentPhase: string;
    applicationSubmittedAt: string | null;
    verificationCompletedAt: string | null;
    provisioningCompletedAt: string | null;
    dryRunCompletedAt: string | null;
    certificationCompletedAt: string | null;
    activationCompletedAt: string | null;
    expiresAt: string | null;
  } | null;
}
```

### GET /api/operator/stats

**Response:**
```typescript
{
  totalOperators: number;
  activeOperators: number;
  totalAttestations: number;
  totalRewardsUsd: number;
  observationWindowEnd: string;
}
```

### POST /api/operator/submit-certification

**Request:**
```typescript
{
  walletAddress: string;
  checklist: {
    charter: boolean;
    dryRun: boolean;
    keyManagement: boolean;
    communication: boolean;
    bonding: boolean;
  }
}
```

**Response:**
```typescript
{
  success: boolean;
  message?: string;
}
```

---

## Admin API Contracts

### GET /api/admin/operators

**Headers:**
- `x-wallet-address`: Admin wallet address

**Query Parameters:**
- `status`: Filter by status
- `search`: Search by wallet/name

**Response:**
```typescript
{
  operators: OperatorData[];
  total: number;
  byStatus: Record<OperatorStatus, number>;
}
```

### POST /api/admin/operators/advance

**Headers:**
- `x-wallet-address`: Admin wallet address

**Request:**
```typescript
{
  operatorId: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  newStatus: OperatorStatus;
  message?: string;
}
```

### POST /api/admin/operators/reject

**Request:**
```typescript
{
  operatorId: string;
  reason: string;
}
```

### POST /api/admin/operators/send-email

**Request:**
```typescript
{
  operatorId: string;
  subject: string;
  message: string;
}
```

### POST /api/admin/operators/bulk-advance

**Request:**
```typescript
{
  operatorIds: string[];  // Max 20
}
```

### GET /api/admin/operators/export

**Query Parameters:**
- `status`: Filter by status (optional)

**Response:** CSV file download

---

## Data Flows

### Application Flow

```
User Input → POST /api/operator/apply
     │
     ▼
Validate wallet signature
     │
     ▼
Check for existing application
     │
     ▼
Generate operatorId (OP-XXXXXX)
     │
     ▼
Insert node_operators record
     │
     ▼
Insert node_onboarding record
     │
     ▼
Return success response
```

### Status Check Flow

```
GET /api/operator/status?wallet=0x...
     │
     ▼
Query node_operators by wallet
     │
     ▼
Join with node_onboarding
     │
     ▼
Format response
     │
     ▼
Return operator data
```

### Admin Advance Flow

```
POST /api/admin/operators/advance
     │
     ▼
Verify admin wallet in ADMIN_WALLETS
     │
     ▼
Check rate limit (30/min)
     │
     ▼
Get operator by ID
     │
     ▼
Determine next status
     │
     ▼
Update node_operators.status
     │
     ▼
Update node_onboarding phase + timestamp
     │
     ▼
Send email via Resend
     │
     ▼
Log to admin_audit_logs
     │
     ▼
Return success
```

---

## Related Documents

- [architecture.md](./architecture.md) - System architecture
- [workflow.md](./workflow.md) - State machine
- [on-chain-spec.md](./on-chain-spec.md) - Contract specifications
