/**
 * POST /api/capinfra/operator/eligibility/inspect — operator probe.
 *
 * Same input shape as `/policy/evaluate` but tagged with productContext
 * `operator-inspector` so dashboard probes are distinguishable from
 * production policy calls in the audit log. Compliance-admin auth.
 */

import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../../lib/capinfra/auth';
import { ZEligibilityInspect } from '../../../../../lib/capinfra/types';
import { evaluatePolicy } from '../../../../../lib/capinfra/policy';
import { getProjection } from '../../../../../lib/capinfra/identity';

export default createRouter([
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.COMPLIANCE_ADMIN,
    handler: async (req, res) => {
      const input = ZEligibilityInspect.parse(req.body);
      const actor = getActor(req);
      const decision = await evaluatePolicy(
        { ...input, productContext: 'operator-inspector' },
        actor,
      );
      const projection = await getProjection(input.userId);
      const claimPosture = {
        capClaims: projection.claims.map((c) => ({
          claimType: c.claimType,
          status: c.status,
          issuer: c.issuer,
          issuedAt: c.issuedAt instanceof Date ? c.issuedAt.toISOString() : c.issuedAt,
          expiresAt: c.expiresAt instanceof Date ? c.expiresAt.toISOString() : c.expiresAt,
        })),
        legacyKyc: projection.legacy.kycVerifications,
        legacyComplianceClaims: projection.legacy.complianceClaims,
      };
      res.status(200).json({ decision, claimPosture });
    },
  },
]);
