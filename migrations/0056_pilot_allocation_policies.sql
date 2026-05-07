-- Migration: 0056_pilot_allocation_policies
-- Stores per-scope allocation policy used by /founder-ops Axiom Rail tab to
-- split each weekly settlement statement net-pay across Axiom Protocol
-- assets and reserves.  Two rows: scope='driver' and scope='treasury'.

CREATE TABLE IF NOT EXISTS pilot_allocation_policies (
  scope          TEXT PRIMARY KEY CHECK (scope IN ('driver', 'treasury')),
  share_pct      NUMERIC(6,3) NOT NULL,
  weights        JSONB NOT NULL,
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by     TEXT
);

INSERT INTO pilot_allocation_policies (scope, share_pct, weights, updated_by) VALUES
  ('driver',   80, '{"operating_spend":40,"cash_reserve":25,"axusd":15,"usdc":10,"axau":10,"kag":0,"paxg":0,"wbtc":0,"cbeth":0}'::jsonb, 'system_default'),
  ('treasury', 20, '{"axau":30,"paxg":20,"axusd":20,"kag":15,"cbeth":10,"wbtc":5,"usdc":0,"cash_reserve":0,"operating_spend":0}'::jsonb, 'system_default')
ON CONFLICT (scope) DO NOTHING;
