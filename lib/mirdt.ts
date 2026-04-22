/**
 * MIRDT - Market Intelligence & Risk Disclosure Terminal
 *
 * Data Models
 *
 * ENFORCEMENT: These structures enforce the non-negotiable principles of MIRDT.
 * - All outputs are probabilistic (P5/P50/P95).
 * - Every setup includes a mandatory invalidation level.
 * - Data is structured for auditability and neutral presentation.
 */

export type AssetClass = 'CRYPTO' | 'EQUITY';

/**
 * Represents a single, auditable market setup.
 * This is an immutable record once created.
 */
export interface MarketSetup {
  // Stable, unique identifier for the setup.
  // Format: <ASSET_TICKER>-<YYYYMMDD>-<SIGNAL_ID>
  id: string;

  // The asset being analyzed. e.g., 'BTC-USD', 'AAPL'.
  asset: string;

  // The asset class.
  assetClass: AssetClass;

  // Timestamp of when the setup was generated.
  generatedAt: string; // ISO 8601 format

  // The time horizon for this setup in days.
  // V1 SCOPE: 1-5 days.
  horizonDays: 1 | 2 | 3 | 4 | 5;

  // The price range where the setup is considered active.
  // ENFORCEMENT: This is a zone, not a single price point.
  entryZone: {
    lowerBound: number;
    upperBound: number;
  };

  // The price at which the setup's rationale is considered void.
  // ENFORCEMENT: Every setup MUST have an invalidation level.
  invalidationLevel: number;

  // Probabilistic outcomes based on the model.
  // ENFORCEMENT: All outcomes are presented as a range of possibilities.
  probabilisticOutcomes: {
    p5: number;  // 5th percentile outcome (worst-case)
    p50: number; // 50th percentile outcome (median)
    p95: number; // 95th percentile outcome (best-case)
  };

  // An informational score representing the model's conviction.
  // ENFORCEMENT: This is not a prediction of success.
  confidenceScore: number; // e.g., 0.0 to 1.0

  // A transparent trace of factors contributing to the setup.
  // ENFORCEMENT: Provides an audit trail for the rationale.
  rationaleTrace: string[];
}

/**
 * Represents a user-logged paper trade against a market setup.
 */
export interface PaperTrade {
  tradeId: string; // UUID
  userId: string;
  setupId: string; // Foreign key to MarketSetup.id
  entryPrice: number;
  loggedAt: string; // ISO 8601 format
  notes: string; // User's rationale for taking the paper trade
}