import crypto from 'crypto';
import { pool } from '../../db';
import { AuthorizationDecision, ActionType, DecisionOutcome, SignalEvent, RegimeState } from './types';
import { AuditLogger } from './AuditLogger';

export class AuthorizationService {
  private auditLogger: AuditLogger;
  private nonceCounter: number = 0;

  constructor(auditLogger: AuditLogger) {
    this.auditLogger = auditLogger;
  }

  async initialize(): Promise<void> {
    const result = await pool.query(
      `SELECT MAX(nonce) as max_nonce FROM sentinel_decisions`
    );
    this.nonceCounter = (result.rows[0]?.max_nonce || 0) + 1;
  }

  async evaluate(
    scope: string,
    actionType: ActionType,
    subject: string,
    maxNotional: number,
    signal?: SignalEvent,
    regime?: RegimeState
  ): Promise<AuthorizationDecision> {
    const { decision, reasonCode, plainLanguage } = this.makeDecision(
      actionType, maxNotional, signal, regime
    );

    const nonce = this.nonceCounter++;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const prevHashResult = await pool.query(
      `SELECT log_hash FROM sentinel_decisions ORDER BY created_at DESC LIMIT 1`
    );
    const prevHash = prevHashResult.rows[0]?.log_hash || '0'.repeat(64);

    const decisionPayload = {
      scope, actionType, subject, maxNotional, decision, reasonCode, nonce
    };
    const canonical = JSON.stringify(decisionPayload, Object.keys(decisionPayload).sort());
    const logHash = crypto.createHash('sha256').update(prevHash + canonical).digest('hex');

    const signature = crypto
      .createHash('sha256')
      .update(logHash + (process.env.SENTINEL_SIGNER_KEY || 'sentinel-dev-key'))
      .digest('hex');

    const result = await pool.query(
      `INSERT INTO sentinel_decisions (
        id, created_at, scope, action_type, subject, max_notional, expires_at,
        decision, reason_code, plain_language, signal_id, log_hash, prev_hash,
        signature, nonce
      ) VALUES (
        gen_random_uuid(), NOW(), $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11,
        $12, $13
      ) RETURNING id`,
      [
        scope, actionType, subject, maxNotional, expiresAt,
        decision, reasonCode, plainLanguage, signal?.id || null, logHash, prevHash,
        signature, nonce
      ]
    );

    await this.auditLogger.log(
      'sentinel-system',
      'AUTHORIZATION_DECISION',
      'decision',
      result.rows[0].id,
      { scope, actionType, subject, maxNotional, decision, reasonCode, nonce, logHash }
    );

    return {
      id: result.rows[0].id,
      scope,
      actionType,
      subject,
      maxNotional,
      expiresAt,
      decision,
      reasonCode,
      plainLanguage,
      signalId: signal?.id,
      logHash,
      prevHash,
      signature,
      nonce,
    };
  }

  private makeDecision(
    actionType: ActionType,
    maxNotional: number,
    signal?: SignalEvent,
    regime?: RegimeState
  ): { decision: DecisionOutcome; reasonCode: string; plainLanguage: string } {
    if (regime === 'HIGH_VOL_DISLOCATION' && actionType !== 'PARAMETER_CHANGE') {
      return {
        decision: 'DENIED',
        reasonCode: 'HIGH_VOL_REGIME',
        plainLanguage: 'Capital deployment denied. Market regime classified as High Volatility Dislocation. All non-parameter actions are suspended until regime stabilizes.',
      };
    }

    if (signal) {
      if ((signal.finalScore || 0) < 0.5) {
        return {
          decision: 'DENIED',
          reasonCode: 'LOW_FINAL_SCORE',
          plainLanguage: `Signal final score (${signal.finalScore?.toFixed(2)}) is below the minimum threshold of 0.50. Insufficient conviction for capital deployment.`,
        };
      }

      if ((signal.confirmationScore || 0) < 0.4) {
        return {
          decision: 'DENIED',
          reasonCode: 'LOW_CONFIRMATION',
          plainLanguage: `Signal confirmation score (${signal.confirmationScore?.toFixed(2)}) is below the minimum threshold of 0.40. Multi-factor confirmation insufficient.`,
        };
      }
    }

    const notionalLimits: Record<string, number> = {
      'TREASURY_DEPLOY': 100000,
      'LEND_ISSUE': 50000,
      'MINT': 500000,
      'BURN': 500000,
      'SWAP': 25000,
      'LP_ACTION': 50000,
      'BRIDGE': 25000,
      'PARAMETER_CHANGE': 0,
    };

    const limit = notionalLimits[actionType] || 0;
    if (actionType !== 'PARAMETER_CHANGE' && maxNotional > limit) {
      return {
        decision: 'DENIED',
        reasonCode: 'EXCEEDS_NOTIONAL_LIMIT',
        plainLanguage: `Requested notional ($${maxNotional.toLocaleString()}) exceeds the ${actionType} limit of $${limit.toLocaleString()}. Reduce size or request governance override.`,
      };
    }

    let regimeNote = '';
    if (regime === 'TREND_DOWN') {
      regimeNote = ' Regime is Trend Down — reduced allocation applied.';
    } else if (regime === 'RANGE_LOW_VOL') {
      regimeNote = ' Regime is Range Low Vol — standard allocation applied.';
    }

    return {
      decision: 'APPROVED',
      reasonCode: 'CRITERIA_MET',
      plainLanguage: `Action authorized. All risk criteria satisfied for ${actionType} on ${signal?.symbol || 'target'} with notional $${maxNotional.toLocaleString()}.${regimeNote}`,
    };
  }

  async getDecisions(limit: number = 50, offset: number = 0): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM sentinel_decisions ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  async verifyChain(limit: number = 100): Promise<{ valid: boolean; checked: number; brokenAt?: string }> {
    const result = await pool.query(
      `SELECT id, prev_hash, log_hash, scope, action_type, subject, max_notional, decision, reason_code, nonce 
       FROM sentinel_decisions ORDER BY created_at ASC LIMIT $1`,
      [limit]
    );

    let expectedPrev = '0'.repeat(64);
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows[i];
      if (row.prev_hash !== expectedPrev) {
        return { valid: false, checked: i, brokenAt: row.id };
      }

      const payload = {
        actionType: row.action_type,
        decision: row.decision,
        maxNotional: parseFloat(row.max_notional),
        nonce: row.nonce,
        reasonCode: row.reason_code,
        scope: row.scope,
        subject: row.subject,
      };
      const canonical = JSON.stringify(payload, Object.keys(payload).sort());
      const computed = crypto.createHash('sha256').update(row.prev_hash + canonical).digest('hex');

      if (computed !== row.log_hash) {
        return { valid: false, checked: i, brokenAt: row.id };
      }

      expectedPrev = row.log_hash;
    }

    return { valid: true, checked: result.rows.length };
  }
}
