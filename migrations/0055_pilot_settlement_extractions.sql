-- Migration: 0055_pilot_settlement_extractions
-- Adds 'settlement_statement' to the pilot_doc_category enum and creates the
-- pilot_settlement_extractions table that stores Gemini-extracted payloads
-- (driver header, mileage rows, deduction sections, totals) keyed 1:1 to a
-- pilot_documents row.

ALTER TYPE pilot_doc_category ADD VALUE IF NOT EXISTS 'settlement_statement';

CREATE TABLE IF NOT EXISTS pilot_settlement_extractions (
  document_id        UUID         PRIMARY KEY REFERENCES pilot_documents(id) ON DELETE CASCADE,
  status             TEXT         NOT NULL,
  confidence         NUMERIC,
  field_count        INTEGER,
  processing_time_ms INTEGER,
  payload            JSONB,
  error              TEXT,
  extracted_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pse_status_idx
  ON pilot_settlement_extractions (status);

CREATE INDEX IF NOT EXISTS pse_extracted_at_idx
  ON pilot_settlement_extractions (extracted_at DESC);
