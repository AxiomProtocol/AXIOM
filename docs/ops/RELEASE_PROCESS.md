# Axiom Release Process

## Overview

This document outlines the release governance process for the Axiom platform, ensuring safe, auditable deployments with proper human oversight.

## Pre-Release Checklist

### 1. Code Quality
- [ ] All TypeScript type checks pass (`npx tsc --noEmit`)
- [ ] No linting errors in production code
- [ ] Code review completed by at least one team member
- [ ] All new features have corresponding tests

### 2. Security Verification
- [ ] No hardcoded secrets or API keys
- [ ] All sensitive operations use environment variables
- [ ] npm audit shows no high/critical vulnerabilities
- [ ] Admin RBAC policies reviewed

### 3. Database Migrations
- [ ] All migrations tested in staging environment
- [ ] Migration rollback procedure documented
- [ ] Data integrity verified after migration

### 4. Admin System Verification
- [ ] Two-step approval workflow tested
- [ ] Dry-run mode verified in staging
- [ ] Audit logging functional
- [ ] Threshold policies working correctly

## Release Process

### Step 1: Run Governance Script

```bash
./scripts/release-governance.sh
```

This script performs automated checks and generates release notes.

### Step 2: Staging Deployment

1. Deploy to staging environment
2. Run integration tests
3. Verify all admin workflows
4. Test dry-run mode for proposals

### Step 3: Production Approval

Requires two-step approval from superadmin:
1. One admin creates deployment proposal
2. Different superadmin approves and executes

### Step 4: Production Deployment

1. Apply database migrations
2. Deploy application code
3. Verify health endpoints
4. Monitor logs for errors

### Step 5: Post-Deployment Verification

- [ ] Application accessible
- [ ] Admin endpoints functional
- [ ] Audit logging active
- [ ] No error spikes in logs

## Rollback Procedure

### Immediate Rollback
If critical issues detected within first 15 minutes:
1. Revert to previous deployment
2. Create incident report
3. Notify stakeholders

### Database Rollback
For migration issues:
1. Use Replit checkpoint restore
2. Or execute manual rollback SQL
3. Verify data integrity

## Environment Configuration

### Required Environment Variables

| Variable | Description | Required In |
|----------|-------------|-------------|
| AXIOM_ENV | Environment (local/staging/production) | All |
| AI_AGENT_MODE | Agent mode (off/observe/propose) | All |
| AUDIT_LOG_SINK | Log destination (database/console/file) | All |
| DATABASE_URL | PostgreSQL connection string | All |
| SESSION_SECRET | Session encryption key | Staging/Production |

### Production Safety Flags

```bash
# Production must have these settings
AXIOM_ENV=production
AI_AGENT_MODE=off  # Unless AI_AGENT_PRODUCTION_OVERRIDE=true
```

## Audit Trail

All releases must have:
1. Git commit hash
2. Deployment timestamp
3. Deployer identity
4. Release notes reference
5. Approval chain (if applicable)

## Emergency Contacts

For critical issues:
1. Check Replit deployment logs
2. Use checkpoint restore if needed
3. Contact platform admin for escalation
