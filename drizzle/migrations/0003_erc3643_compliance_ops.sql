-- Migration: ERC-3643 Compliance Operations tables
-- Adds accreditation submission tracking and compliance event log
-- for the AXUSD identity/claim lifecycle (Task #44)

CREATE TABLE IF NOT EXISTS t3_accreditation_submissions (
    id                  varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address      varchar(42)  NOT NULL,
    self_certification  boolean      NOT NULL DEFAULT false,
    accreditation_basis varchar(64),
    document_urls       text,
    notes               text,
    status              varchar(20)  NOT NULL DEFAULT 'submitted',
    review_note         text,
    reviewed_by         varchar(42),
    reviewed_at         timestamp,
    claim_id            varchar,
    created_at          timestamp    NOT NULL DEFAULT now(),
    updated_at          timestamp    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_t3_accred_wallet  ON t3_accreditation_submissions (wallet_address);
CREATE INDEX IF NOT EXISTS idx_t3_accred_status  ON t3_accreditation_submissions (status);

-- Compliance event log: one row per claim lifecycle event
-- (issuance / renewal / revocation / expiry_alert)
-- action enum: issuance | renewal | revocation | expiry_alert
CREATE TABLE IF NOT EXISTS t3_compliance_ops_log (
    id               varchar(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet           varchar(42)  NOT NULL,
    action           varchar(32)  NOT NULL,
    topic            integer,
    claim_id         varchar,
    operator_address varchar(42),
    tx_hash          varchar(66),
    result           varchar(16)  NOT NULL DEFAULT 'success',
    notes            text,
    metadata         jsonb,
    created_at       timestamp    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_t3_comp_ops_wallet   ON t3_compliance_ops_log (wallet);
CREATE INDEX IF NOT EXISTS idx_t3_comp_ops_action   ON t3_compliance_ops_log (action);
CREATE INDEX IF NOT EXISTS idx_t3_comp_ops_created  ON t3_compliance_ops_log (created_at);
