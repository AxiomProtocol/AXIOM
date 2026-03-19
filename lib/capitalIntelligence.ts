import { pool } from './db';

export interface CapitalIntelligenceEventInput {
  dealId?: string | null;
  offeringId?: string | null;
  eventType: string;
  capitalSourceType?: string | null;
  raiseVelocity?: number | null;
  minimumCapitalMet?: boolean | null;
  investorDemandScore?: number | null;
  lenderPathChosen?: string | null;
  refiOutcome?: string | null;
  payload?: Record<string, unknown> | null;
}

export async function recordCapitalIntelligenceEvent(event: CapitalIntelligenceEventInput): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO capital_intelligence_events
         (deal_id, offering_id, event_type, capital_source_type, raise_velocity,
          minimum_capital_met, investor_demand_score, lender_path_chosen, refi_outcome, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        event.dealId ?? null,
        event.offeringId ?? null,
        event.eventType,
        event.capitalSourceType ?? null,
        event.raiseVelocity ?? null,
        event.minimumCapitalMet ?? null,
        event.investorDemandScore ?? null,
        event.lenderPathChosen ?? null,
        event.refiOutcome ?? null,
        event.payload ? JSON.stringify(event.payload) : null,
      ]
    );
  } catch (err: any) {
    console.error('[capitalIntelligence] recordCapitalIntelligenceEvent DROPPED event:', JSON.stringify({
      event_type: event.eventType,
      offering_id: event.offeringId ?? null,
      deal_id: event.dealId ?? null,
      error: err?.message ?? String(err),
    }));
  }
}
