/**
 * Capital Infrastructure — per-role admin auth wrapper + canonical
 * operator role constants.
 *
 * Each of the six declared operator roles has its own credential, set
 * via env vars (see `ROLE_ENV_VAR` below). A single env var may hold a
 * comma-separated list so multiple operators can share a role; each
 * key may also be prefixed with an operator label using
 * `<label>:<key>` so audit rows can record who acted (e.g.
 * `alice:s3cret,bob:hunter2`).
 *
 * `requireOperator(req, res, requiredRole)`:
 *   1. Honours the shared IP-based brute-force lockout from
 *      `requireAdminAuth` (capinfra and axiom-rail share the same
 *      failure map).
 *   2. Resolves the `x-admin-key` header to a role + operator label.
 *   3. Allows the call when the resolved role matches `requiredRole`
 *      OR when the resolved role is `SUPER_ADMIN` (super admin is the
 *      only privileged-bypass role).
 *   4. Rejects with 403 ROLE_INSUFFICIENT when the credential is valid
 *      but bound to the wrong role (no failure increment — the caller
 *      is authenticated, just not authorised for this route).
 *   5. Rejects with 403 Unauthorized + failure increment when the key
 *      is unknown.
 *
 * Backward compatibility: `ADMIN_SOLVENCY_KEY` (the Phase 1 shared
 * key) is treated as a SUPER_ADMIN credential so the operator console
 * cookie auth, the smoke harness, and all axiom-rail endpoints keep
 * working unchanged. New deployments should provision per-role keys
 * and stop sharing the legacy key.
 *
 * The resolved role is stamped onto the request object so `getActor`
 * can include it in the audit row's `actor` field, satisfying the
 * "record the operator's role alongside the existing actor stamp"
 * requirement.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  checkAdminAuthLockout,
  recordAdminAuthFailure,
  recordAdminAuthSuccess,
} from '../multichain/stellar/axiom-rail/adminAuth';

export const CAP_INFRA_ROLES = {
  SUPER_ADMIN: 'super_admin',
  COMPLIANCE_ADMIN: 'compliance_admin',
  TREASURY_OPERATOR: 'treasury_operator',
  RISK_OPERATOR: 'risk_operator',
  SUPPORT_READ_ONLY: 'support_read_only',
  AUDITOR_READ_ONLY: 'auditor_read_only',
} as const;

export type CapInfraRole = (typeof CAP_INFRA_ROLES)[keyof typeof CAP_INFRA_ROLES];

const ROLE_ENV_VAR: Record<CapInfraRole, string> = {
  [CAP_INFRA_ROLES.SUPER_ADMIN]: 'CAPINFRA_KEY_SUPER_ADMIN',
  [CAP_INFRA_ROLES.COMPLIANCE_ADMIN]: 'CAPINFRA_KEY_COMPLIANCE_ADMIN',
  [CAP_INFRA_ROLES.TREASURY_OPERATOR]: 'CAPINFRA_KEY_TREASURY_OPERATOR',
  [CAP_INFRA_ROLES.RISK_OPERATOR]: 'CAPINFRA_KEY_RISK_OPERATOR',
  [CAP_INFRA_ROLES.SUPPORT_READ_ONLY]: 'CAPINFRA_KEY_SUPPORT_READ_ONLY',
  [CAP_INFRA_ROLES.AUDITOR_READ_ONLY]: 'CAPINFRA_KEY_AUDITOR_READ_ONLY',
};

interface ResolvedCredential {
  role: CapInfraRole;
  /** Optional operator label parsed from `<label>:<key>`. */
  label: string | null;
}

/**
 * Build the credential lookup table on demand from current env vars.
 * Recomputed per call so tests / hot-reload pick up env changes; this
 * is cheap (<= ~12 env reads per request) and avoids stale caches.
 */
function buildCredentialIndex(): Map<string, ResolvedCredential> {
  const index = new Map<string, ResolvedCredential>();

  for (const role of Object.values(CAP_INFRA_ROLES) as CapInfraRole[]) {
    const raw = process.env[ROLE_ENV_VAR[role]];
    if (!raw) continue;
    for (const entry of raw.split(',')) {
      const trimmed = entry.trim();
      if (!trimmed) continue;
      const colon = trimmed.indexOf(':');
      let label: string | null = null;
      let key = trimmed;
      if (colon > 0) {
        label = trimmed.slice(0, colon).trim() || null;
        key = trimmed.slice(colon + 1).trim();
      }
      if (!key) continue;
      // First binding wins; later duplicates are ignored so a key
      // accidentally listed under two roles cannot silently widen.
      // A warning is logged so misconfigurations are visible in ops
      // logs rather than masked by the deterministic precedence.
      const existing = index.get(key);
      if (existing) {
        if (existing.role !== role) {
          console.warn(
            `[capinfra.auth] duplicate credential bound to multiple roles; ignoring '${role}' binding (kept '${existing.role}'). Fix the CAPINFRA_KEY_* env vars to avoid silent privilege ambiguity.`,
          );
        }
        continue;
      }
      index.set(key, { role, label });
    }
  }

  // Backward-compat: legacy single shared key is treated as super
  // admin. Only registered when no per-role binding already claims it.
  const legacy = process.env.ADMIN_SOLVENCY_KEY;
  if (legacy && !index.has(legacy)) {
    index.set(legacy, { role: CAP_INFRA_ROLES.SUPER_ADMIN, label: null });
  }

  return index;
}

interface CapInfraAuthState {
  role: CapInfraRole;
  label: string | null;
}

const REQ_AUTH_KEY = '__capInfraAuth';

function attachAuthState(req: NextApiRequest, state: CapInfraAuthState): void {
  (req as unknown as Record<string, unknown>)[REQ_AUTH_KEY] = state;
}

export function getOperatorAuth(req: NextApiRequest): CapInfraAuthState | null {
  const state = (req as unknown as Record<string, unknown>)[REQ_AUTH_KEY];
  if (state && typeof state === 'object' && 'role' in (state as object)) {
    return state as CapInfraAuthState;
  }
  return null;
}

/**
 * Returns true when the request carries a credential bound to the
 * required role (or to SUPER_ADMIN). Sends 4xx and returns false
 * otherwise. The resolved role is stamped on the request for
 * downstream `getActor` audit tagging.
 */
export function requireOperator(
  req: NextApiRequest,
  res: NextApiResponse,
  requiredRole: CapInfraRole,
): boolean {
  if (!checkAdminAuthLockout(req, res)) return false;

  const provided = req.headers['x-admin-key'];
  const key = typeof provided === 'string' ? provided : undefined;

  if (!key) {
    recordAdminAuthFailure(req);
    res.status(403).json({ error: 'Unauthorized' });
    return false;
  }

  const credential = buildCredentialIndex().get(key);
  if (!credential) {
    recordAdminAuthFailure(req);
    res.status(403).json({ error: 'Unauthorized' });
    return false;
  }

  // Authenticated — never count toward IP lockout from here on.
  recordAdminAuthSuccess(req);

  const allowed =
    credential.role === requiredRole || credential.role === CAP_INFRA_ROLES.SUPER_ADMIN;

  if (!allowed) {
    res.status(403).json({
      error: 'ROLE_INSUFFICIENT',
      message: `role '${credential.role}' is not permitted for this endpoint (requires '${requiredRole}')`,
    });
    return false;
  }

  attachAuthState(req, { role: credential.role, label: credential.label });
  return true;
}

/**
 * Returns the audit `actor` stamp for the current request.
 *
 * Format: `<operator>@<role>` when a role has been resolved by
 * `requireOperator`. The `<operator>` portion comes from (in order):
 *   1. The credential label (`<label>:<key>` env entry)
 *   2. The free-form `x-operator` request header
 *   3. The literal `admin_key` (legacy single-key fallback)
 *
 * The operator portion is capped at 80 chars so the final stamp fits
 * comfortably in the `cap_audit_events.actor` column.
 */
export function getActor(req: NextApiRequest): string {
  const auth = getOperatorAuth(req);

  let operator: string;
  const headerOperator = req.headers['x-operator'];
  if (auth?.label) {
    operator = auth.label;
  } else if (typeof headerOperator === 'string' && headerOperator.length > 0) {
    operator = headerOperator;
  } else {
    operator = 'admin_key';
  }
  operator = operator.slice(0, 80);

  if (auth?.role) return `${operator}@${auth.role}`;
  return operator;
}
