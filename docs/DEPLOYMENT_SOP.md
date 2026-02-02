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
build = ["npm", "run", "build:deploy:clean"]
```

---

## Run Configuration

```bash
run = ["bash", "-c", "export HOST=0.0.0.0 && export HOSTNAME=0.0.0.0 && export PORT=5000 && node .next/standalone/server.js"]
```

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
*Version: 1.0*
