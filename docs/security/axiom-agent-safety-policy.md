# Axiom Protocol - Agent Safety Policy

**Version**: 1.0.0  
**Effective Date**: December 2025  
**Last Updated**: December 26, 2025

## Purpose

This document establishes the security policies and operational boundaries for AI agents, automated systems, and privileged operations within the Axiom Protocol platform.

## Non-Negotiable Rules

### 1. No Keys in Prompts or Logs

- Private keys, seed phrases, and wallet secrets MUST NEVER be:
  - Included in AI prompts
  - Logged to any log sink (console, file, database)
  - Stored in plain text outside of secure secret management
  - Transmitted in API responses
  - Included in error messages

- All logging systems MUST implement secret redaction for:
  - Patterns matching private keys (0x followed by 64 hex chars)
  - Patterns matching seed phrases (12/24 word sequences)
  - Environment variable values for sensitive keys

### 2. Staging Only by Default

- AI Agent Mode (`AI_AGENT_MODE`) defaults to `off` in production
- AI endpoints are DISABLED in production unless explicitly enabled
- All automated operations MUST support dry-run mode in staging
- Production deployments require human approval

### 3. Human Approval Gates

The following actions ALWAYS require human approval:

| Action Category | Approval Requirement |
|-----------------|---------------------|
| Fund movements > $5,000 | Superadmin approval |
| Payout reversals | Superadmin approval |
| Payout overrides | Superadmin approval |
| Role escalation | Two distinct superadmins |
| Privileged user creation | Two distinct superadmins |
| Privileged user disabling | Superadmin approval |
| Smart contract deployment | Manual deployment only |
| Database migrations | Manual execution only |

### 4. Audit Logging Required for Admin Actions

Every privileged action MUST be logged with:

- `id`: Unique log entry identifier
- `timestamp`: ISO 8601 timestamp
- `actorUserId`: User performing the action
- `actorRole`: Role of the actor
- `actionType`: Type of action performed
- `targetType`: Type of target (user, payout, transaction, etc.)
- `targetId`: Identifier of the target
- `beforeState`: JSON snapshot before action
- `afterState`: JSON snapshot after action
- `reason`: Mandatory reason for the action
- `correlationId`: Request correlation ID
- `ipAddress`: Request IP when available

Audit logs are APPEND-ONLY and IMMUTABLE.

## Environment Configuration

### Required Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AXIOM_ENV` | `local` | Environment: local, staging, production |
| `AI_AGENT_MODE` | `off` | AI mode: off, observe, propose |
| `AUDIT_LOG_SINK` | `database` | Where to send audit logs |

### Production Safety Defaults

```
AXIOM_ENV=production
AI_AGENT_MODE=off
```

### Staging Configuration

```
AXIOM_ENV=staging
AI_AGENT_MODE=observe  # or propose
```

## AI Agent Boundaries

### Permitted Operations

- Read-only database queries for diagnostics
- Code analysis and review suggestions
- Documentation generation
- Test case suggestions
- Architecture recommendations

### Prohibited Operations

- Direct database writes
- Smart contract interactions
- Fund movements
- User data modifications
- Secret access or manipulation
- Production deployments

## Incident Response

If a security incident is detected:

1. Immediately disable AI_AGENT_MODE
2. Review audit logs for unauthorized actions
3. Engage incident response team
4. Preserve evidence before any changes
5. Document incident timeline

## Compliance

This policy aligns with:

- SOC 2 Type II controls
- GDPR data protection requirements
- PCI DSS where applicable
- Internal security standards

## Policy Enforcement

Violations of this policy will result in:

1. Immediate system lockdown
2. Audit log review
3. Incident documentation
4. Remediation planning

---

**Approved by**: Axiom Protocol Security Team  
**Review Cycle**: Quarterly
