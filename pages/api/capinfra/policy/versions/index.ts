import { z } from 'zod';
import { createRouter } from '../../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../../lib/capinfra/auth';
import {
  listPolicyVersions,
  publishPolicyVersion,
} from '../../../../../lib/capinfra/policy/publication';

const ZPublish = z.object({
  name: z.string().min(1).max(200),
  version: z.string().min(1).max(40),
  scope: z.record(z.unknown()),
  rules: z.record(z.unknown()),
  effectiveAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  reasonCode: z.string().min(1).max(100),
});

const ZList = z.object({
  name: z.string().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  scopeHash: z.string().length(64).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.AUDITOR_READ_ONLY,
    handler: async (req, res) => {
      const filters = ZList.parse(req.query);
      const items = await listPolicyVersions(filters);
      res.status(200).json({ items });
    },
  },
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.COMPLIANCE_ADMIN,
    handler: async (req, res) => {
      const body = ZPublish.parse(req.body);
      const actor = getActor(req);
      const row = await publishPolicyVersion({
        ...body,
        effectiveAt: body.effectiveAt ? new Date(body.effectiveAt) : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        actor,
      });
      res.status(201).json({ policy: row });
    },
  },
]);
