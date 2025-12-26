import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { getEnvConfig, assertNotProduction } from '../../../../lib/server/envConfig';
import { logAudit } from '../../../../lib/server/auditLogger';

interface AgentQueryRequest {
  query_type: 'proposal_status' | 'recent_proposals' | 'audit_summary' | 'system_health';
  proposal_id?: string;
  limit?: number;
}

interface AgentQueryResponse {
  success: boolean;
  query_type: string;
  data?: Record<string, unknown>;
  error?: string;
  environment: string;
  timestamp: string;
  agent_mode: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<AgentQueryResponse>) {
  const config = getEnvConfig();
  const timestamp = new Date().toISOString();
  
  const safetyCheck = assertNotProduction('AI agent query endpoint');
  if (!safetyCheck.allowed) {
    return res.status(403).json({
      success: false,
      query_type: 'blocked',
      error: safetyCheck.reason,
      environment: config.environment,
      timestamp,
      agent_mode: config.agentMode,
    });
  }

  if (config.agentMode === 'off') {
    return res.status(403).json({
      success: false,
      query_type: 'blocked',
      error: 'AI agent mode is disabled. Set AI_AGENT_MODE=observe or AI_AGENT_MODE=propose to enable.',
      environment: config.environment,
      timestamp,
      agent_mode: config.agentMode,
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      query_type: 'error',
      error: 'Method not allowed',
      environment: config.environment,
      timestamp,
      agent_mode: config.agentMode,
    });
  }

  const body = req.body as AgentQueryRequest;

  if (!body.query_type) {
    return res.status(400).json({
      success: false,
      query_type: 'error',
      error: 'query_type is required. Options: proposal_status, recent_proposals, audit_summary, system_health',
      environment: config.environment,
      timestamp,
      agent_mode: config.agentMode,
    });
  }

  const correlationId = `agent-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  try {
    logAudit({
      action: `agent_query:${body.query_type}`,
      actorUserId: 'system:agent',
      actorRole: 'agent',
      targetType: 'system',
      targetId: body.proposal_id ?? 'n/a',
      requestId: correlationId,
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] ?? 'unknown',
      reason: `Agent query: ${body.query_type}`,
      metadata: { query_type: body.query_type, limit: body.limit },
    });

    let data: Record<string, unknown> = {};

    switch (body.query_type) {
      case 'proposal_status':
        if (!body.proposal_id) {
          return res.status(400).json({
            success: false,
            query_type: body.query_type,
            error: 'proposal_id is required for proposal_status query',
            environment: config.environment,
            timestamp,
            agent_mode: config.agentMode,
          });
        }
        const proposalResult = await pool.query(
          `SELECT id, action_type, target_type, target_id, status, reason, 
                  created_at, expires_at, approved_at, executed_at
           FROM admin_proposals WHERE id = $1`,
          [body.proposal_id]
        );
        data = {
          found: proposalResult.rows.length > 0,
          proposal: proposalResult.rows[0] ?? null,
        };
        break;

      case 'recent_proposals':
        const limit = Math.min(body.limit ?? 10, 50);
        const recentResult = await pool.query(
          `SELECT id, action_type, target_type, status, reason, created_at
           FROM admin_proposals 
           ORDER BY created_at DESC 
           LIMIT $1`,
          [limit]
        );
        data = {
          count: recentResult.rows.length,
          proposals: recentResult.rows,
        };
        break;

      case 'audit_summary':
        const auditLimit = Math.min(body.limit ?? 20, 100);
        const auditResult = await pool.query(
          `SELECT action, target_type, target_id, actor_role, created_at, reason
           FROM admin_audit_log 
           ORDER BY created_at DESC 
           LIMIT $1`,
          [auditLimit]
        );
        data = {
          count: auditResult.rows.length,
          entries: auditResult.rows,
        };
        break;

      case 'system_health':
        const [pendingCount, executedToday, roleCount] = await Promise.all([
          pool.query(`SELECT COUNT(*) as count FROM admin_proposals WHERE status = 'pending'`),
          pool.query(
            `SELECT COUNT(*) as count FROM admin_proposals 
             WHERE status = 'executed' AND executed_at >= CURRENT_DATE`
          ),
          pool.query(`SELECT role, COUNT(*) as count FROM user_roles GROUP BY role`),
        ]);
        data = {
          pending_proposals: parseInt(pendingCount.rows[0]?.count ?? '0'),
          executed_today: parseInt(executedToday.rows[0]?.count ?? '0'),
          roles_distribution: roleCount.rows,
          environment: config.environment,
          agent_mode: config.agentMode,
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          query_type: body.query_type,
          error: `Unknown query_type: ${body.query_type}`,
          environment: config.environment,
          timestamp,
          agent_mode: config.agentMode,
        });
    }

    return res.status(200).json({
      success: true,
      query_type: body.query_type,
      data,
      environment: config.environment,
      timestamp,
      agent_mode: config.agentMode,
    });

  } catch (error) {
    console.error(`[${correlationId}] Agent query error:`, error);
    return res.status(500).json({
      success: false,
      query_type: body.query_type,
      error: 'Internal server error during agent query',
      environment: config.environment,
      timestamp,
      agent_mode: config.agentMode,
    });
  }
}
