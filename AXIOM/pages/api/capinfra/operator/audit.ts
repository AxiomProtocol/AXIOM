import { createRouter } from '../../../../lib/capinfra/handler';
import { CAP_INFRA_ROLES } from '../../../../lib/capinfra/auth';
import { ZAuditQuery } from '../../../../lib/capinfra/types';
import { listAuditEvents } from '../../../../lib/capinfra/audit';

export default createRouter([
  {
    method: 'GET',
    requiredRole: CAP_INFRA_ROLES.AUDITOR_READ_ONLY,
    handler: async (req, res) => {
      const q = ZAuditQuery.parse(req.query);
      const result = await listAuditEvents({
        aggregateType: q.aggregateType,
        aggregateId: q.aggregateId,
        eventType: q.eventType,
        userId: q.userId,
        assetId: q.assetId,
        instructionId: q.instructionId,
        from: q.from ? new Date(q.from) : undefined,
        to: q.to ? new Date(q.to) : undefined,
        limit: q.limit,
        cursor: q.cursor,
      });
      res.status(200).json(result);
    },
  },
]);
