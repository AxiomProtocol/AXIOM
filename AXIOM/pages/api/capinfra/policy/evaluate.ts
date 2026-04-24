import { createRouter } from '../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../lib/capinfra/auth';
import { ZPolicyEvaluate } from '../../../../lib/capinfra/types';
import { evaluatePolicy } from '../../../../lib/capinfra/policy';

export default createRouter([
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.COMPLIANCE_ADMIN,
    handler: async (req, res) => {
      const input = ZPolicyEvaluate.parse(req.body);
      const actor = getActor(req);
      const decision = await evaluatePolicy(input, actor);
      res.status(200).json({
        allowed: decision.allowed,
        reasonCode: decision.reasonCode,
        policyVersion: decision.policyVersion,
        requiredClaims: decision.requiredClaims,
        warnings: decision.warnings,
        limits: decision.limits,
        decisionId: decision.decisionId,
        decision,
      });
    },
  },
]);
