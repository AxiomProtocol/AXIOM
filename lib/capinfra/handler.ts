/**
 * Capital Infrastructure — Next.js API handler helper.
 *
 * Wraps method dispatch + admin auth + error envelope in one place so
 * every endpoint file stays small and uniform.
 *
 * Per the Phase 1 spec (§940-946): writes, operator endpoints, and
 * policy evaluation require admin-key auth; specified reads are open.
 * Each route declares both `requiredRole` (enforced by `requireOperator`
 * — the credential must be bound to that role or to SUPER_ADMIN) and
 * `requireAuth` (which gates the admin-key check today).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { sendError } from './errors';
import { requireOperator, type CapInfraRole } from './auth';

export type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface RouteSpec {
  method: Method;
  requiredRole: CapInfraRole;
  /**
   * If true (default), the admin-key check via `requireOperator` runs
   * before the handler. Set to false for the small set of canonical
   * read endpoints the spec keeps open: asset list/detail and the two
   * market-data read endpoints.
   */
  requireAuth?: boolean;
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void;
}

export function createRouter(routes: RouteSpec[]) {
  return async function (req: NextApiRequest, res: NextApiResponse) {
    const route = routes.find((r) => r.method === req.method);
    if (!route) {
      res.setHeader('Allow', routes.map((r) => r.method).join(', '));
      res.status(405).json({ error: 'METHOD_NOT_ALLOWED', message: `${req.method} not allowed` });
      return;
    }
    const needsAuth = route.requireAuth !== false;
    if (needsAuth && !requireOperator(req, res, route.requiredRole)) return;
    try {
      await route.handler(req, res);
    } catch (err) {
      sendError(res, err);
    }
  };
}
