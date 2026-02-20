-- Migration: 0003_idempotency_keys
-- Description: Add idempotency_keys table for request deduplication

DROP TABLE IF EXISTS idempotency_keys CASCADE;

CREATE TABLE idempotency_keys (
    id SERIAL PRIMARY KEY,
    idempotency_key VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    request_id VARCHAR(64),
    response_code INTEGER NOT NULL,
    response_body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(idempotency_key, endpoint, method)
);

CREATE INDEX idx_idempotency_keys_lookup
ON idempotency_keys(idempotency_key, endpoint, method);

CREATE INDEX idx_idempotency_keys_expires
ON idempotency_keys(expires_at);
