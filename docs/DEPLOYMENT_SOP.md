# AXIOM Protocol - Deployment Standard Operating Procedure

This document defines the deployment configuration settings and environment variables for AXIOM Protocol. **Never deviate from these settings.**

---

## Deployment Target

| Setting | Value |
|---------|-------|
| Deployment Type | `autoscale` |
| Port | `5000` |
| Host | `0.0.0.0` |

---

## Build Configuration

```bash
build = ["npm", "run", "build"]
```

**Note:** Uses standard Next.js build. Legacy standalone/deploy scripts have been removed to prevent incomplete builds.

---

## Run Configuration

```bash
run = ["npm", "run", "start"]
```

**Note:** The `start` script uses `next start -p 5000` which runs the production server directly.

---

## Required Environment Variables

These are automatically provided by Replit and must not be manually overridden:

| Variable | Description | Source |
|----------|-------------|--------|
| `DATABASE_URL` | PostgreSQL connection string | Auto-provided by Replit PostgreSQL |
| `PGHOST` | Database host | Auto-provided |
| `PGPORT` | Database port | Auto-provided |
| `PGUSER` | Database user | Auto-provided |
| `PGPASSWORD` | Database password | Auto-provided |
| `PGDATABASE` | Database name | Auto-provided |
| `REPLIT_CONNECTORS_HOSTNAME` | Connectors API hostname | Auto-provided |
| `REPL_IDENTITY` | Replit identity token | Auto-provided |

---

## Configurable Environment Variables

These can be set in the Replit Secrets panel:

| Variable | Description | Default | Format |
|----------|-------------|---------|--------|
| `ADMIN_WALLETS` | Comma-separated list of admin wallet addresses | `0xa6ed10e752d5facd989ee9ced113b3a064b47493` | Lowercase Ethereum addresses, comma-separated |
| `SESSION_SECRET` | Session encryption key | Auto-generated | String |

### Example ADMIN_WALLETS Configuration

```
ADMIN_WALLETS=0xa6ed10e752d5facd989ee9ced113b3a064b47493,0xsecondadminwallet,0xthirdadminwallet
```

---

## Required Integrations

| Integration | Status | Purpose |
|-------------|--------|---------|
| Resend | Required | Email notifications for operator status changes |

The Resend integration must be connected via Replit's integration panel. The API key is managed automatically through the connector system.

---

## Wallet Connectivity (SIWE Authentication)

### Critical Build Configuration

The standalone build must include all drizzle-orm files for SIWE nonce generation to work. In `next.config.js`, ensure the following is present:

```javascript
experimental: {
  outputFileTracingIncludes: {
    '*': [
      './node_modules/drizzle-orm/**',
      './node_modules/pg/**',
      // ... other packages
    ],
  },
}
```

**Without this configuration, the `/api/auth/siwe/nonce` endpoint will return 500 errors with "Cannot find module '../cache/core/index.cjs'".**

### Environment Variables for SIWE

| Variable | Description | Value |
|----------|-------------|-------|
| `PUBLIC_DOMAIN` | Production domain for SIWE verification | `axiomprotocol.app` |

### Required Database Tables

| Table | Purpose |
|-------|---------|
| `siwe_nonces` | Stores SIWE nonces with expiration |
| `wallet_sessions` | Manages authenticated wallet sessions |

### Wallet Connection Flow

1. User clicks "Connect Wallet" → MetaMask popup appears
2. User approves connection → Address captured
3. Frontend requests nonce from `/api/auth/siwe/nonce`
4. User signs SIWE message in MetaMask
5. Signature verified via `/api/auth/siwe/verify`
6. Session created in `wallet_sessions` table

### Troubleshooting Wallet Connection

| Error | Cause | Solution |
|-------|-------|----------|
| "Failed to get nonce (500)" | drizzle-orm not bundled | Add drizzle-orm to outputFileTracingIncludes |
| "Domain mismatch" | SIWE domain validation failed | Set PUBLIC_DOMAIN env var |
| "Nonce expired" | User took too long to sign | Retry connection (5-minute expiry) |
| "MetaMask not detected" | Extension not installed | Install MetaMask browser extension |

---

## Database Tables (Auto-Created)

The following tables must exist in production:

| Table | Purpose |
|-------|---------|
| `node_operators` | Operator applications and status |
| `node_onboarding` | Onboarding progress tracking |
| `operator_rewards` | Operator earnings and rewards |
| `admin_audit_logs` | Audit trail of all admin actions |
| `siwe_nonces` | SIWE authentication nonces |
| `wallet_sessions` | Wallet session management |

---

## Admin Panel Security Configuration

| Setting | Value |
|---------|-------|
| Authentication Method | Wallet-based (MetaMask) |
| Admin Wallet Source | `ADMIN_WALLETS` env var |
| Rate Limit | 30 requests per minute per admin wallet |
| Audit Logging | Enabled (all actions logged) |

---

## Pre-Deployment Checklist

1. [ ] Verify `ADMIN_WALLETS` is set with production admin addresses
2. [ ] Verify Resend integration is connected
3. [ ] Verify all database tables exist
4. [ ] Run build locally to confirm no errors: `npm run build`
5. [ ] Test admin panel access with authorized wallet

---

## Post-Deployment Verification

1. [ ] Homepage loads without errors
2. [ ] Admin panel requires wallet connection
3. [ ] Authorized wallet can access admin panel
4. [ ] Operator advancement triggers email notification
5. [ ] Audit logs are being recorded

---

## Rollback Procedure

If deployment fails:
1. Use Replit's checkpoint system to rollback to previous stable version
2. Verify database integrity after rollback
3. Do not manually modify database schema

---

## Contact

For deployment issues, refer to:
- `docs/UNIVERSE_L3_ROADMAP.md` for strategic context
- `replit.md` for project architecture

---

*Last Updated: February 2, 2026*
*Version: 1.1 - Added Wallet Connectivity (SIWE) section*
