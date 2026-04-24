import { z } from 'zod';
import { createRouter } from '../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES, getActor } from '../../../../lib/capinfra/auth';
import { adjustReserve } from '../../../../lib/capinfra/reserve/service';

// Per clarification #3: idempotencyKey, reasonCode, and actor are
// required at the API boundary. Actor is derived from `x-operator`
// (with fallback to `admin_key`) and validated to be present.
const ZBody = z.object({
  assetId: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d+)?$/),
  direction: z.enum(['CREDIT', 'DEBIT']),
  source: z.enum(['DEPOSIT', 'REDEMPTION', 'ATTESTATION', 'ADJUSTMENT', 'INITIAL']),
  reasonCode: z.string().min(1).max(100),
  idempotencyKey: z.string().min(8).max(200),
  referenceId: z.string().max(200).optional().nullable(),
  attestationRef: z.string().max(200).optional().nullable(),
  correlationId: z.string().max(80).optional().nullable(),
});

export default createRouter([
  {
    method: 'POST',
    requiredRole: CAP_INFRA_ROLES.TREASURY_OPERATOR,
    handler: async (req, res) => {
      const body = ZBody.parse(req.body);
      const actor = getActor(req);
      const row = await adjustReserve({
        ...body,
        actor,
        referenceId: body.referenceId ?? null,
        attestationRef: body.attestationRef ?? null,
        correlationId: body.correlationId ?? null,
      });
      res.status(201).json({ holding: row });
    },
  },
]);
