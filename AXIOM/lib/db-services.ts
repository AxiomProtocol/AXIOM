import { pool } from './db';

export interface DbQuest {
  id: number;
  title: string;
  description: string;
  category: string;
  requirements: any;
  rewards: any;
  startDate?: Date;
  endDate?: Date;
  maxCompletions?: number;
  currentCompletions: number;
  repeatable: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface DbUserQuest {
  id: number;
  userId: number;
  questId: number;
  status: string;
  progress: number;
  requirementProgress?: any;
  startedAt?: Date;
  completedAt?: Date;
  rewardsClaimedAt?: Date;
}

export interface DbUserXpLevel {
  id: number;
  userId: number;
  totalXp: number;
  level: number;
  badges?: any;
  loginStreak: number;
  longestStreak: number;
  lastLoginDate?: Date;
}

export interface DbSubscription {
  id: number;
  userId: number;
  tier: string;
  status: string;
  monthlyPrice?: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
}

export interface DbKycVerification {
  id: number;
  userId: number;
  walletAddress?: string;
  status: string;
  level: number;
  documents?: any;
  amlScore: number;
  riskLevel: string;
  notes?: string;
  submittedAt?: Date;
  verifiedAt?: Date;
  expiresAt?: Date;
}

export interface DbComplianceLog {
  id: number;
  action: string;
  actor: string;
  actorType: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  txHash?: string;
  severity: string;
  immutable: boolean;
  createdAt: Date;
}

export interface DbIotDevice {
  id: number;
  name: string;
  deviceType: string;
  landAssetId?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  status: string;
  lastSeen?: Date;
  metadata?: any;
}

export interface DbAssetOracle {
  id: number;
  name: string;
  oracleType: string;
  source: string;
  value: number;
  unit?: string;
  confidence?: number;
  chainlinkAddress?: string;
  lastUpdate: Date;
}

export interface DbAnalyticsAlert {
  id: number;
  name: string;
  description?: string;
  metric: string;
  condition: string;
  threshold: number;
  currentValue?: number;
  status: string;
  severity: string;
  triggeredAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

export const questService = {
  async getAll(category?: string): Promise<DbQuest[]> {
    let query = 'SELECT * FROM quests WHERE is_active = true';
    const params: any[] = [];
    if (category) {
      query += ' AND category = $1';
      params.push(category);
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    return result.rows;
  },

  async getById(id: number): Promise<DbQuest | null> {
    const result = await pool.query('SELECT * FROM quests WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async create(quest: Omit<DbQuest, 'id' | 'createdAt'>): Promise<DbQuest> {
    const result = await pool.query(
      `INSERT INTO quests (title, description, category, requirements, rewards, start_date, end_date, max_completions, current_completions, repeatable, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [quest.title, quest.description, quest.category, JSON.stringify(quest.requirements), JSON.stringify(quest.rewards), quest.startDate, quest.endDate, quest.maxCompletions, quest.currentCompletions || 0, quest.repeatable, quest.isActive ?? true]
    );
    return result.rows[0];
  },

  async incrementCompletions(id: number): Promise<void> {
    await pool.query('UPDATE quests SET current_completions = current_completions + 1 WHERE id = $1', [id]);
  }
};

export const userQuestService = {
  async getByUserId(userId: number): Promise<DbUserQuest[]> {
    const result = await pool.query('SELECT * FROM user_quests WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return result.rows;
  },

  async getByUserAndQuest(userId: number, questId: number): Promise<DbUserQuest | null> {
    const result = await pool.query('SELECT * FROM user_quests WHERE user_id = $1 AND quest_id = $2', [userId, questId]);
    return result.rows[0] || null;
  },

  async create(userQuest: Omit<DbUserQuest, 'id'>): Promise<DbUserQuest> {
    const result = await pool.query(
      `INSERT INTO user_quests (user_id, quest_id, status, progress, requirement_progress, started_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userQuest.userId, userQuest.questId, userQuest.status, userQuest.progress, JSON.stringify(userQuest.requirementProgress || {}), userQuest.startedAt || new Date()]
    );
    return result.rows[0];
  },

  async updateProgress(id: number, progress: number, requirementProgress: any): Promise<void> {
    await pool.query(
      'UPDATE user_quests SET progress = $1, requirement_progress = $2, updated_at = NOW() WHERE id = $3',
      [progress, JSON.stringify(requirementProgress), id]
    );
  },

  async complete(id: number, rewards?: any): Promise<void> {
    await pool.query(
      `UPDATE user_quests SET status = 'completed', progress = 100, completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );
  }
};

export const userXpService = {
  async getByUserId(userId: number): Promise<DbUserXpLevel | null> {
    const result = await pool.query('SELECT * FROM user_xp_levels WHERE user_id = $1', [userId]);
    return result.rows[0] || null;
  },

  async createOrUpdate(userId: number, xpToAdd: number): Promise<DbUserXpLevel> {
    const existing = await this.getByUserId(userId);
    if (existing) {
      const newXp = existing.totalXp + xpToAdd;
      const newLevel = Math.floor(newXp / 500) + 1;
      const result = await pool.query(
        'UPDATE user_xp_levels SET total_xp = $1, level = $2, updated_at = NOW() WHERE user_id = $3 RETURNING *',
        [newXp, Math.min(newLevel, 10), userId]
      );
      return result.rows[0];
    } else {
      const level = Math.floor(xpToAdd / 500) + 1;
      const result = await pool.query(
        'INSERT INTO user_xp_levels (user_id, total_xp, level, badges, login_streak, longest_streak) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [userId, xpToAdd, Math.min(level, 10), JSON.stringify([]), 0, 0]
      );
      return result.rows[0];
    }
  },

  async updateStreak(userId: number): Promise<void> {
    const existing = await this.getByUserId(userId);
    if (!existing) return;
    
    const today = new Date().toDateString();
    const lastLogin = existing.lastLoginDate ? new Date(existing.lastLoginDate).toDateString() : null;
    
    if (lastLogin === today) return;
    
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    let newStreak = lastLogin === yesterday ? existing.loginStreak + 1 : 1;
    let longestStreak = Math.max(existing.longestStreak, newStreak);
    
    await pool.query(
      'UPDATE user_xp_levels SET login_streak = $1, longest_streak = $2, last_login_date = NOW(), updated_at = NOW() WHERE user_id = $3',
      [newStreak, longestStreak, userId]
    );
  },

  async getLeaderboard(limit: number = 10): Promise<DbUserXpLevel[]> {
    const result = await pool.query(
      'SELECT * FROM user_xp_levels ORDER BY total_xp DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }
};

export const subscriptionService = {
  async getByUserId(userId: number): Promise<DbSubscription | null> {
    const result = await pool.query(
      `SELECT * FROM membership_subscriptions WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  },

  async create(subscription: Omit<DbSubscription, 'id'>): Promise<DbSubscription> {
    await pool.query(
      `UPDATE membership_subscriptions SET status = 'canceled', updated_at = NOW() WHERE user_id = $1 AND status = 'active'`,
      [subscription.userId]
    );
    const result = await pool.query(
      `INSERT INTO membership_subscriptions (user_id, tier, status, monthly_price, current_period_start, current_period_end, cancel_at_period_end, stripe_subscription_id, stripe_customer_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [subscription.userId, subscription.tier, subscription.status || 'active', subscription.monthlyPrice, subscription.currentPeriodStart, subscription.currentPeriodEnd, subscription.cancelAtPeriodEnd ?? false, subscription.stripeSubscriptionId, subscription.stripeCustomerId]
    );
    return result.rows[0];
  },

  async cancel(id: number): Promise<void> {
    await pool.query(
      `UPDATE membership_subscriptions SET cancel_at_period_end = true, updated_at = NOW() WHERE id = $1`,
      [id]
    );
  }
};

export const kycService = {
  async getByUserId(userId: number): Promise<DbKycVerification | null> {
    const result = await pool.query('SELECT * FROM kyc_verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]);
    return result.rows[0] || null;
  },

  async create(kyc: Omit<DbKycVerification, 'id'>): Promise<DbKycVerification> {
    const result = await pool.query(
      `INSERT INTO kyc_verifications (user_id, wallet_address, status, level, documents, aml_score, risk_level, notes, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [kyc.userId, kyc.walletAddress, kyc.status, kyc.level, JSON.stringify(kyc.documents || []), kyc.amlScore || 0, kyc.riskLevel || 'low', kyc.notes, kyc.submittedAt]
    );
    return result.rows[0];
  },

  async updateStatus(id: number, status: string, verifiedAt?: Date): Promise<void> {
    await pool.query(
      'UPDATE kyc_verifications SET status = $1, verified_at = $2, updated_at = NOW() WHERE id = $3',
      [status, verifiedAt, id]
    );
  }
};

export const complianceLogService = {
  async create(log: Omit<DbComplianceLog, 'id' | 'createdAt'>): Promise<DbComplianceLog> {
    const result = await pool.query(
      `INSERT INTO compliance_audit_logs (action, actor, actor_type, resource, resource_id, details, ip_address, tx_hash, severity, immutable)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [log.action, log.actor, log.actorType || 'user', log.resource, log.resourceId, JSON.stringify(log.details || {}), log.ipAddress, log.txHash, log.severity || 'info', log.immutable ?? true]
    );
    return result.rows[0];
  },

  async getRecent(limit: number = 100): Promise<DbComplianceLog[]> {
    const result = await pool.query(
      'SELECT * FROM compliance_audit_logs ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  },

  async getByResource(resource: string, resourceId?: string): Promise<DbComplianceLog[]> {
    let query = 'SELECT * FROM compliance_audit_logs WHERE resource = $1';
    const params: any[] = [resource];
    if (resourceId) {
      query += ' AND resource_id = $2';
      params.push(resourceId);
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    return result.rows;
  }
};

export const iotDeviceService = {
  async getAll(): Promise<DbIotDevice[]> {
    const result = await pool.query('SELECT * FROM iot_devices ORDER BY created_at DESC');
    return result.rows;
  },

  async getById(id: number): Promise<DbIotDevice | null> {
    const result = await pool.query('SELECT * FROM iot_devices WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async create(device: Omit<DbIotDevice, 'id'>): Promise<DbIotDevice> {
    const result = await pool.query(
      `INSERT INTO iot_devices (name, device_type, land_asset_id, latitude, longitude, address, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [device.name, device.deviceType, device.landAssetId, device.latitude, device.longitude, device.address, device.status || 'offline', JSON.stringify(device.metadata || {})]
    );
    return result.rows[0];
  },

  async updateStatus(id: number, status: string): Promise<void> {
    await pool.query(
      'UPDATE iot_devices SET status = $1, last_seen = NOW(), updated_at = NOW() WHERE id = $1',
      [status, id]
    );
  }
};

export const assetOracleService = {
  async getAll(): Promise<DbAssetOracle[]> {
    const result = await pool.query('SELECT * FROM asset_oracles ORDER BY last_update DESC');
    return result.rows;
  },

  async getByType(oracleType: string): Promise<DbAssetOracle[]> {
    const result = await pool.query('SELECT * FROM asset_oracles WHERE oracle_type = $1', [oracleType]);
    return result.rows;
  },

  async upsert(oracle: Omit<DbAssetOracle, 'id'>): Promise<DbAssetOracle> {
    const existing = await pool.query('SELECT * FROM asset_oracles WHERE name = $1 AND oracle_type = $2', [oracle.name, oracle.oracleType]);
    if (existing.rows[0]) {
      const result = await pool.query(
        'UPDATE asset_oracles SET value = $1, confidence = $2, last_update = NOW() WHERE id = $3 RETURNING *',
        [oracle.value, oracle.confidence, existing.rows[0].id]
      );
      return result.rows[0];
    }
    const result = await pool.query(
      `INSERT INTO asset_oracles (name, oracle_type, source, value, unit, confidence, chainlink_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [oracle.name, oracle.oracleType, oracle.source, oracle.value, oracle.unit, oracle.confidence, oracle.chainlinkAddress]
    );
    return result.rows[0];
  }
};

export const analyticsAlertService = {
  async getAll(): Promise<DbAnalyticsAlert[]> {
    const result = await pool.query('SELECT * FROM analytics_alerts ORDER BY created_at DESC');
    return result.rows;
  },

  async getActive(): Promise<DbAnalyticsAlert[]> {
    const result = await pool.query(`SELECT * FROM analytics_alerts WHERE status IN ('pending', 'triggered') ORDER BY severity DESC, created_at DESC`);
    return result.rows;
  },

  async create(alert: Omit<DbAnalyticsAlert, 'id'>): Promise<DbAnalyticsAlert> {
    const result = await pool.query(
      `INSERT INTO analytics_alerts (name, description, metric, condition, threshold, current_value, status, severity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [alert.name, alert.description, alert.metric, alert.condition, alert.threshold, alert.currentValue, alert.status || 'pending', alert.severity || 'info']
    );
    return result.rows[0];
  },

  async acknowledge(id: number, acknowledgedBy: string): Promise<void> {
    await pool.query(
      `UPDATE analytics_alerts SET status = 'acknowledged', acknowledged_at = NOW(), acknowledged_by = $1, updated_at = NOW() WHERE id = $2`,
      [acknowledgedBy, id]
    );
  },

  async resolve(id: number): Promise<void> {
    await pool.query(
      `UPDATE analytics_alerts SET status = 'resolved', updated_at = NOW() WHERE id = $1`,
      [id]
    );
  }
};

export default {
  questService,
  userQuestService,
  userXpService,
  subscriptionService,
  kycService,
  complianceLogService,
  iotDeviceService,
  assetOracleService,
  analyticsAlertService
};
