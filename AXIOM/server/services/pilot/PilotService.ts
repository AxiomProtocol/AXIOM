import { Pool } from 'pg';

let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}
const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    return (getPool() as any)[prop];
  }
});

const DISTRIBUTION_SPLIT = {
  distributions: 0.35,
  reserves: 0.35,
  growth: 0.20,
  operatingBuffer: 0.10,
};

export class PilotService {
  // ─── SPV Methods ───────────────────────────────────────────

  async getAllSpvs() {
    const result = await pool.query('SELECT * FROM pilot_spvs ORDER BY created_at ASC');
    return result.rows;
  }

  async getSpvById(id: string) {
    const result = await pool.query('SELECT * FROM pilot_spvs WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  }

  async updateSpv(id: string, data: Record<string, any>) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const allowedFields: Record<string, string> = {
      name: 'name', label: 'label', assetType: 'asset_type', status: 'status',
      targetPurchasePrice: 'target_purchase_price', equityAllocated: 'equity_allocated',
      debtAmount: 'debt_amount', currentValuation: 'current_valuation',
      occupancyRate: 'occupancy_rate', targetYield: 'target_yield',
      targetAppreciation: 'target_appreciation', monthlyNetCashFlow: 'monthly_net_cash_flow',
      unitCount: 'unit_count', location: 'location', marketType: 'market_type',
      description: 'description', metadata: 'metadata',
    };

    for (const [key, col] of Object.entries(allowedFields)) {
      if (data[key] !== undefined) {
        fields.push(`${col} = $${idx}`);
        values.push(key === 'metadata' ? JSON.stringify(data[key]) : data[key]);
        idx++;
      }
    }

    if (fields.length === 0) return this.getSpvById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE pilot_spvs SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] ?? null;
  }

  // ─── Investor Methods ─────────────────────────────────────

  async createInvestor(data: Record<string, any>) {
    const result = await pool.query(
      `INSERT INTO pilot_investors (name, email, phone, commitment_amount, status, accreditation_verified, kyc_completed, notes, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        data.name, data.email, data.phone || null, data.commitmentAmount,
        data.status || 'invited', data.accreditationVerified ?? false,
        data.kycCompleted ?? false, data.notes || null,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );
    return result.rows[0];
  }

  async getAllInvestors() {
    const result = await pool.query('SELECT * FROM pilot_investors ORDER BY created_at ASC');
    return result.rows;
  }

  async getInvestorById(id: string) {
    const result = await pool.query('SELECT * FROM pilot_investors WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  }

  async updateInvestor(id: string, data: Record<string, any>) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const allowedFields: Record<string, string> = {
      name: 'name', email: 'email', phone: 'phone', status: 'status',
      commitmentAmount: 'commitment_amount', fundedAmount: 'funded_amount',
      proRataShare: 'pro_rata_share', accreditationVerified: 'accreditation_verified',
      kycCompleted: 'kyc_completed', notes: 'notes', metadata: 'metadata',
    };

    for (const [key, col] of Object.entries(allowedFields)) {
      if (data[key] !== undefined) {
        fields.push(`${col} = $${idx}`);
        values.push(key === 'metadata' ? JSON.stringify(data[key]) : data[key]);
        idx++;
      }
    }

    if (fields.length === 0) return this.getInvestorById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE pilot_investors SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] ?? null;
  }

  async deleteInvestor(id: string) {
    const result = await pool.query('DELETE FROM pilot_investors WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] ?? null;
  }

  // ─── Contribution Methods ─────────────────────────────────

  async createContribution(data: Record<string, any>) {
    const result = await pool.query(
      `INSERT INTO pilot_contributions (investor_id, spv_id, amount, capital_call_id, payment_method, reference_number, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        data.investorId, data.spvId || null, data.amount,
        data.capitalCallId || null, data.paymentMethod || null,
        data.referenceNumber || null, data.notes || null,
      ]
    );
    const contribution = result.rows[0];

    if (contribution) {
      await pool.query(
        `UPDATE pilot_investors SET funded_amount = funded_amount + $1::numeric, updated_at = NOW() WHERE id = $2`,
        [contribution.amount, contribution.investor_id]
      );
    }
    return contribution;
  }

  async listContributions(filters?: { investorId?: string; spvId?: string }) {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filters?.investorId) { conditions.push(`investor_id = $${idx++}`); values.push(filters.investorId); }
    if (filters?.spvId) { conditions.push(`spv_id = $${idx++}`); values.push(filters.spvId); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(`SELECT * FROM pilot_contributions ${where} ORDER BY created_at DESC`, values);
    return result.rows;
  }

  async confirmContribution(id: string) {
    const result = await pool.query(
      `UPDATE pilot_contributions SET status = 'confirmed', confirmed_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  // ─── Capital Call Methods ─────────────────────────────────

  async createCapitalCall(data: Record<string, any>) {
    const result = await pool.query(
      `INSERT INTO pilot_capital_calls (spv_id, call_number, total_amount, purpose, due_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        data.spvId || null, data.callNumber, data.totalAmount,
        data.purpose, data.dueDate, data.notes || null,
      ]
    );
    return result.rows[0];
  }

  async listCapitalCalls(spvId?: string) {
    if (spvId) {
      const result = await pool.query(
        'SELECT * FROM pilot_capital_calls WHERE spv_id = $1 ORDER BY created_at DESC', [spvId]
      );
      return result.rows;
    }
    const result = await pool.query('SELECT * FROM pilot_capital_calls ORDER BY created_at DESC');
    return result.rows;
  }

  async getCapitalCallById(id: string) {
    const result = await pool.query('SELECT * FROM pilot_capital_calls WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  }

  async updateCapitalCallStatus(id: string, status: string, fundedAmount?: string) {
    let query = 'UPDATE pilot_capital_calls SET status = $1';
    const values: any[] = [status];
    let idx = 2;

    if (fundedAmount) { query += `, funded_amount = $${idx++}`; values.push(fundedAmount); }
    if (status === 'issued') { query += `, issued_at = NOW()`; }
    if (status === 'closed') { query += `, closed_at = NOW()`; }

    query += ` WHERE id = $${idx} RETURNING *`;
    values.push(id);

    const result = await pool.query(query, values);
    return result.rows[0] ?? null;
  }

  async getCapitalCallFundedAmounts(callId: string) {
    const result = await pool.query(
      'SELECT * FROM pilot_contributions WHERE capital_call_id = $1', [callId]
    );
    const totalFunded = result.rows.reduce(
      (sum: number, c: any) => sum + parseFloat(c.amount || '0'), 0
    );
    return { totalFunded: totalFunded.toFixed(2), contributions: result.rows };
  }

  // ─── Distribution Methods ─────────────────────────────────

  async calculateDistribution(params: {
    spvId: string | null;
    periodStart: Date;
    periodEnd: Date;
    grossRevenue: string;
    operatingExpenses: string;
    distributionType?: string;
    notes?: string;
  }) {
    const gross = parseFloat(params.grossRevenue);
    const expenses = parseFloat(params.operatingExpenses);
    const netIncome = gross - expenses;

    const treasuryBuckets = await this.getTreasuryBuckets(params.spvId ?? undefined);
    const reserveBucket = treasuryBuckets.find((b: any) => b.bucket_name === 'reserves');
    const reserveMin = parseFloat(reserveBucket?.min_reserve || '0');
    const reserveBalance = parseFloat(reserveBucket?.current_balance || '0');
    const reserveDeficit = Math.max(0, reserveMin - reserveBalance);

    let distributionAmount: number;
    let reserveAmount: number;
    let growthAmount: number;
    let operatingBufferAmount: number;

    if (netIncome <= 0) {
      distributionAmount = 0;
      reserveAmount = 0;
      growthAmount = 0;
      operatingBufferAmount = 0;
    } else if (reserveDeficit > 0 && reserveDeficit >= netIncome) {
      distributionAmount = 0;
      reserveAmount = netIncome;
      growthAmount = 0;
      operatingBufferAmount = 0;
    } else if (reserveDeficit > 0) {
      const remaining = netIncome - reserveDeficit;
      reserveAmount = reserveDeficit + remaining * DISTRIBUTION_SPLIT.reserves;
      distributionAmount = remaining * DISTRIBUTION_SPLIT.distributions;
      growthAmount = remaining * DISTRIBUTION_SPLIT.growth;
      operatingBufferAmount = remaining * DISTRIBUTION_SPLIT.operatingBuffer;
    } else {
      distributionAmount = netIncome * DISTRIBUTION_SPLIT.distributions;
      reserveAmount = netIncome * DISTRIBUTION_SPLIT.reserves;
      growthAmount = netIncome * DISTRIBUTION_SPLIT.growth;
      operatingBufferAmount = netIncome * DISTRIBUTION_SPLIT.operatingBuffer;
    }

    const distResult = await pool.query(
      `INSERT INTO pilot_distributions
        (spv_id, period_start, period_end, gross_revenue, operating_expenses, net_income,
         distribution_amount, reserve_amount, growth_amount, operating_buffer_amount,
         distribution_type, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        params.spvId, params.periodStart, params.periodEnd,
        gross.toFixed(2), expenses.toFixed(2), netIncome.toFixed(2),
        distributionAmount.toFixed(2), reserveAmount.toFixed(2),
        growthAmount.toFixed(2), operatingBufferAmount.toFixed(2),
        params.distributionType || 'cash_flow', params.notes || null,
      ]
    );
    const distribution = distResult.rows[0];

    if (distributionAmount > 0) {
      const investors = await this.getAllInvestors();
      const totalCommitment = investors.reduce(
        (sum: number, inv: any) => sum + parseFloat(inv.commitment_amount || '0'), 0
      );

      if (totalCommitment > 0) {
        for (const inv of investors) {
          const share = parseFloat(inv.commitment_amount || '0') / totalCommitment;
          await pool.query(
            `INSERT INTO pilot_investor_distributions
              (distribution_id, investor_id, amount, pro_rata_share)
             VALUES ($1, $2, $3, $4)`,
            [distribution.id, inv.id, (distributionAmount * share).toFixed(2), share.toFixed(6)]
          );
        }
      }
    }

    await this.updateTreasuryAfterDistribution(params.spvId ?? undefined, {
      reserves: reserveAmount, growth: growthAmount, operatingBuffer: operatingBufferAmount,
    });

    return distribution;
  }

  async listDistributions(spvId?: string) {
    if (spvId) {
      const result = await pool.query(
        'SELECT * FROM pilot_distributions WHERE spv_id = $1 ORDER BY created_at DESC', [spvId]
      );
      return result.rows;
    }
    const result = await pool.query('SELECT * FROM pilot_distributions ORDER BY created_at DESC');
    return result.rows;
  }

  async getDistributionById(id: string) {
    const distResult = await pool.query('SELECT * FROM pilot_distributions WHERE id = $1', [id]);
    if (distResult.rows.length === 0) return null;

    const breakdownResult = await pool.query(
      'SELECT * FROM pilot_investor_distributions WHERE distribution_id = $1', [id]
    );

    return { distribution: distResult.rows[0], investorBreakdown: breakdownResult.rows };
  }

  // ─── Treasury Bucket Methods ──────────────────────────────

  async getTreasuryBuckets(spvId?: string) {
    if (spvId) {
      const result = await pool.query(
        'SELECT * FROM pilot_treasury_buckets WHERE spv_id = $1', [spvId]
      );
      return result.rows;
    }
    const result = await pool.query('SELECT * FROM pilot_treasury_buckets');
    return result.rows;
  }

  async updateTreasuryAfterDistribution(
    spvId: string | undefined,
    amounts: { reserves: number; growth: number; operatingBuffer: number }
  ) {
    const buckets = await this.getTreasuryBuckets(spvId);
    for (const bucket of buckets) {
      let addAmount = 0;
      if (bucket.bucket_name === 'reserves') addAmount = amounts.reserves;
      else if (bucket.bucket_name === 'growth_pool') addAmount = amounts.growth;
      else if (bucket.bucket_name === 'operating_buffer') addAmount = amounts.operatingBuffer;

      if (addAmount > 0) {
        await pool.query(
          `UPDATE pilot_treasury_buckets SET current_balance = current_balance + $1::numeric, updated_at = NOW() WHERE id = $2`,
          [addAmount.toFixed(2), bucket.id]
        );
      }
    }
  }

  // ─── Document Methods ─────────────────────────────────────

  async addDocument(data: Record<string, any>) {
    const result = await pool.query(
      `INSERT INTO pilot_documents (spv_id, title, category, file_name, file_url, file_size, mime_type, uploaded_by, description, is_public)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        data.spvId || null, data.title, data.category, data.fileName,
        data.fileUrl, data.fileSize || null, data.mimeType || null,
        data.uploadedBy, data.description || null, data.isPublic ?? false,
      ]
    );
    return result.rows[0];
  }

  async listDocuments(filters?: { spvId?: string; category?: string }) {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filters?.spvId) { conditions.push(`spv_id = $${idx++}`); values.push(filters.spvId); }
    if (filters?.category) { conditions.push(`category = $${idx++}`); values.push(filters.category); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(`SELECT * FROM pilot_documents ${where} ORDER BY created_at DESC`, values);
    return result.rows;
  }

  // ─── Audit Trail Methods ──────────────────────────────────

  async logAuditAction(data: Record<string, any>) {
    const result = await pool.query(
      `INSERT INTO pilot_audit_trail
        (action, actor_id, actor_role, spv_id, investor_id, entity_type, entity_id,
         amount, description, before_state, after_state, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        data.action, data.actorId, data.actorRole,
        data.spvId || null, data.investorId || null,
        data.entityType || null, data.entityId || null,
        data.amount || null, data.description,
        data.beforeState ? JSON.stringify(data.beforeState) : null,
        data.afterState ? JSON.stringify(data.afterState) : null,
        data.ipAddress || null,
      ]
    );
    return result.rows[0];
  }

  async listAuditTrail(filters?: {
    action?: string; spvId?: string; investorId?: string;
    startDate?: Date; endDate?: Date; limit?: number; offset?: number;
  }) {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filters?.action) { conditions.push(`action = $${idx++}`); values.push(filters.action); }
    if (filters?.spvId) { conditions.push(`spv_id = $${idx++}`); values.push(filters.spvId); }
    if (filters?.investorId) { conditions.push(`investor_id = $${idx++}`); values.push(filters.investorId); }
    if (filters?.startDate) { conditions.push(`created_at >= $${idx++}`); values.push(filters.startDate); }
    if (filters?.endDate) { conditions.push(`created_at <= $${idx++}`); values.push(filters.endDate); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const countValues = [...values];
    values.push(limit, offset);

    const [entriesResult, countResult] = await Promise.all([
      pool.query(`SELECT * FROM pilot_audit_trail ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`, values),
      pool.query(`SELECT count(*)::int as count FROM pilot_audit_trail ${where}`, countValues),
    ]);

    return {
      entries: entriesResult.rows,
      total: countResult.rows[0]?.count ?? 0,
      limit,
      offset,
    };
  }

  // ─── Asset Metrics Methods ────────────────────────────────

  async recordAssetMetric(data: Record<string, any>) {
    const result = await pool.query(
      `INSERT INTO pilot_asset_metrics
        (spv_id, record_date, occupancy_rate, gross_rent, operating_expenses,
         net_operating_income, cap_rate, current_valuation, reserve_balance,
         debt_service_payment, maintenance_costs, vacancy_loss, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        data.spvId, data.recordDate,
        data.occupancyRate || null, data.grossRent || null,
        data.operatingExpenses || null, data.netOperatingIncome || null,
        data.capRate || null, data.currentValuation || null,
        data.reserveBalance || null, data.debtServicePayment || null,
        data.maintenanceCosts || null, data.vacancyLoss || null,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );
    return result.rows[0];
  }

  async getAssetMetricHistory(spvId: string, limit = 24) {
    const result = await pool.query(
      'SELECT * FROM pilot_asset_metrics WHERE spv_id = $1 ORDER BY record_date DESC LIMIT $2',
      [spvId, limit]
    );
    return result.rows;
  }

  // ─── Report Methods ───────────────────────────────────────

  async generateReport(data: Record<string, any>) {
    const result = await pool.query(
      `INSERT INTO pilot_reports (spv_id, report_type, period_start, period_end, data, generated_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        data.spvId || null, data.reportType,
        data.periodStart, data.periodEnd,
        JSON.stringify(data.data), data.generatedBy,
      ]
    );
    return result.rows[0];
  }

  async listReports(spvId?: string) {
    if (spvId) {
      const result = await pool.query(
        'SELECT * FROM pilot_reports WHERE spv_id = $1 ORDER BY created_at DESC', [spvId]
      );
      return result.rows;
    }
    const result = await pool.query('SELECT * FROM pilot_reports ORDER BY created_at DESC');
    return result.rows;
  }

  async publishReport(id: string) {
    const result = await pool.query(
      'UPDATE pilot_reports SET published_at = NOW() WHERE id = $1 RETURNING *', [id]
    );
    return result.rows[0] ?? null;
  }

  // ─── Benchmark Methods ────────────────────────────────────

  async recordBenchmark(data: Record<string, any>) {
    const result = await pool.query(
      `INSERT INTO pilot_benchmarks (spv_id, record_date, local_cap_rate, treasury_yield_10yr, sp500_return, pilot_return, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        data.spvId || null, data.recordDate,
        data.localCapRate || null, data.treasuryYield10yr || null,
        data.sp500Return || null, data.pilotReturn || null,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );
    return result.rows[0];
  }

  async getLatestBenchmarks(spvId?: string, limit = 12) {
    if (spvId) {
      const result = await pool.query(
        'SELECT * FROM pilot_benchmarks WHERE spv_id = $1 ORDER BY record_date DESC LIMIT $2',
        [spvId, limit]
      );
      return result.rows;
    }
    const result = await pool.query(
      'SELECT * FROM pilot_benchmarks ORDER BY record_date DESC LIMIT $1', [limit]
    );
    return result.rows;
  }

  // ─── Expansion Gate Methods ───────────────────────────────

  async evaluateExpansionGate(data: Record<string, any>) {
    const isReady =
      data.occupancyAbove90 === true &&
      data.reservesFullyFunded === true &&
      (data.consecutivePositiveMonths ?? 0) >= 6;

    const result = await pool.query(
      `INSERT INTO pilot_expansion_gate
        (check_date, occupancy_above_90, reserves_fully_funded, consecutive_positive_months,
         investor_satisfaction_score, total_aum, is_ready_for_expansion, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        data.checkDate, data.occupancyAbove90 ?? false,
        data.reservesFullyFunded ?? false, data.consecutivePositiveMonths ?? 0,
        data.investorSatisfactionScore || null,
        data.totalAssetsUnderManagement || null, isReady, data.notes || null,
      ]
    );
    return result.rows[0];
  }

  async getLatestExpansionGateCheck() {
    const result = await pool.query(
      'SELECT * FROM pilot_expansion_gate ORDER BY check_date DESC LIMIT 1'
    );
    return result.rows[0] ?? null;
  }

  // ─── Notification Methods ─────────────────────────────────

  async sendNotification(data: Record<string, any>) {
    const result = await pool.query(
      `INSERT INTO pilot_notifications (investor_id, notification_type, subject, body, metadata)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        data.investorId || null, data.notificationType,
        data.subject, data.body,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );
    return result.rows[0];
  }

  async getNotificationsForInvestor(investorId: string) {
    const result = await pool.query(
      'SELECT * FROM pilot_notifications WHERE investor_id = $1 ORDER BY created_at DESC',
      [investorId]
    );
    return result.rows;
  }

  // ─── Waterfall Projection Methods ─────────────────────────

  async projectWaterfallReturns(params: {
    holdingPeriodYears?: number;
    conservativeMultiplier?: number;
    baseMultiplier?: number;
    optimisticMultiplier?: number;
  }) {
    const holdYears = params.holdingPeriodYears ?? 5;
    const conservativeMult = params.conservativeMultiplier ?? 0.85;
    const baseMult = params.baseMultiplier ?? 1.0;
    const optimisticMult = params.optimisticMultiplier ?? 1.25;

    const spvs = await this.getAllSpvs();
    const totalEquity = spvs.reduce(
      (sum: number, s: any) => sum + parseFloat(s.equity_allocated || '0'), 0
    );
    const totalTargetYield = spvs.reduce(
      (sum: number, s: any) => sum + parseFloat(s.target_yield || '0'), 0
    );
    const avgYield = spvs.length > 0 ? totalTargetYield / spvs.length : 0;
    const totalTargetAppreciation = spvs.reduce(
      (sum: number, s: any) => sum + parseFloat(s.target_appreciation || '0'), 0
    );
    const avgAppreciation = spvs.length > 0 ? totalTargetAppreciation / spvs.length : 0;

    function buildScenario(label: string, multiplier: number) {
      const annualCashYield = (avgYield / 100) * multiplier;
      const annualAppreciation = (avgAppreciation / 100) * multiplier;
      const totalCashFlow = totalEquity * annualCashYield * holdYears;
      const exitValue = totalEquity * Math.pow(1 + annualAppreciation, holdYears);
      const totalReturn = totalCashFlow + exitValue - totalEquity;
      const multiple = totalEquity > 0 ? (totalCashFlow + exitValue) / totalEquity : 0;
      const annualizedReturn = totalEquity > 0
        ? (Math.pow((totalCashFlow + exitValue) / totalEquity, 1 / holdYears) - 1) * 100
        : 0;

      return {
        label,
        multiplier,
        annualCashYieldPct: (annualCashYield * 100).toFixed(2),
        annualAppreciationPct: (annualAppreciation * 100).toFixed(2),
        totalCashFlow: totalCashFlow.toFixed(2),
        exitValue: exitValue.toFixed(2),
        totalReturn: totalReturn.toFixed(2),
        equityMultiple: multiple.toFixed(2),
        annualizedReturnPct: annualizedReturn.toFixed(2),
      };
    }

    return {
      holdingPeriodYears: holdYears,
      totalEquityInvested: totalEquity.toFixed(2),
      spvCount: spvs.length,
      scenarios: {
        conservative: buildScenario('Conservative', conservativeMult),
        base: buildScenario('Base Case', baseMult),
        optimistic: buildScenario('Optimistic', optimisticMult),
      },
    };
  }

  // ─── Dashboard Summary ────────────────────────────────────

  async getDashboardSummary() {
    const [spvs, investors, distributions, treasuryBuckets, latestGate] =
      await Promise.all([
        this.getAllSpvs(),
        this.getAllInvestors(),
        this.listDistributions(),
        this.getTreasuryBuckets(),
        this.getLatestExpansionGateCheck(),
      ]);

    const totalCapitalCommitted = investors.reduce(
      (sum: number, i: any) => sum + parseFloat(i.commitment_amount || '0'), 0
    );
    const totalCapitalFunded = investors.reduce(
      (sum: number, i: any) => sum + parseFloat(i.funded_amount || '0'), 0
    );
    const totalDistributed = distributions.reduce(
      (sum: number, d: any) => sum + parseFloat(d.distribution_amount || '0'), 0
    );
    const totalNetIncome = distributions.reduce(
      (sum: number, d: any) => sum + parseFloat(d.net_income || '0'), 0
    );

    const reserveBuckets = treasuryBuckets.filter((b: any) => b.bucket_name === 'reserves');
    const reserveHealth = reserveBuckets.map((b: any) => ({
      spvId: b.spv_id,
      currentBalance: b.current_balance,
      minReserve: b.min_reserve,
      healthPct: parseFloat(b.min_reserve || '0') > 0
        ? ((parseFloat(b.current_balance || '0') / parseFloat(b.min_reserve || '0')) * 100).toFixed(1)
        : '100.0',
    }));

    return {
      spvs: spvs.map((s: any) => ({
        id: s.id,
        name: s.name,
        label: s.label,
        assetType: s.asset_type,
        status: s.status,
        targetPurchasePrice: s.target_purchase_price,
        equityAllocated: s.equity_allocated,
        debtAmount: s.debt_amount,
        currentValuation: s.current_valuation,
        occupancyRate: s.occupancy_rate,
        targetYield: s.target_yield,
        monthlyNetCashFlow: s.monthly_net_cash_flow,
      })),
      investorCount: investors.length,
      totalCapitalCommitted: totalCapitalCommitted.toFixed(2),
      totalCapitalFunded: totalCapitalFunded.toFixed(2),
      distributionHistory: {
        count: distributions.length,
        totalDistributed: totalDistributed.toFixed(2),
        totalNetIncome: totalNetIncome.toFixed(2),
      },
      reserveHealth,
      treasuryBuckets: treasuryBuckets.map((b: any) => ({
        bucketName: b.bucket_name,
        spvId: b.spv_id,
        currentBalance: b.current_balance,
        allocationPercent: b.allocation_percent,
      })),
      expansionGate: latestGate,
    };
  }
}

export const pilotService = new PilotService();
