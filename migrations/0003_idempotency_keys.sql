-- Migration: 0003_idempotency_keys
-- Description: Add idempotency_keys table for request deduplication

CREATE TABLE IF NOT EXISTS idempotency_keys (
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
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_lookup 
ON idempotency_keys(idempotency_key, endpoint, method);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires 
ON idempotency_keys(expires_at);
--> statement-breakpoint
COMMENT ON TABLE idempotency_keys IS 'Stores idempotency keys for request deduplication';
--> statement-breakpoint
COMMENT ON COLUMN idempotency_keys.idempotency_key IS 'Client-provided idempotency key';
--> statement-breakpoint
COMMENT ON COLUMN idempotency_keys.endpoint IS 'API endpoint path';
--> statement-breakpoint
COMMENT ON COLUMN idempotency_keys.method IS 'HTTP method (POST, PUT, etc)';
--> statement-breakpoint
COMMENT ON COLUMN idempotency_keys.request_id IS 'Internal request ID for tracing';
--> statement-breakpoint
COMMENT ON COLUMN idempotency_keys.response_code IS 'Cached HTTP response code';
--> statement-breakpoint
COMMENT ON COLUMN idempotency_keys.response_body IS 'Cached JSON response body';
--> statement-breakpoint
COMMENT ON COLUMN idempotency_keys.expires_at IS 'When this cached response expires';
