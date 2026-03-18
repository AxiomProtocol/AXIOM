DO $$ BEGIN
    CREATE TYPE contract_domain AS ENUM ('field_intelligence', 'real_estate');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE contract_entity_type AS ENUM ('inspection_session', 'property', 'deal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE contract_status AS ENUM (
        'draft',
        'intake',
        'under_review',
        'approved',
        'in_execution',
        'completed',
        'blocked',
        'rejected',
        'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE contract_actor_type AS ENUM ('admin', 'operator', 'system', 'investor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE contract_event_type AS ENUM (
        'status_changed',
        'approval_requested',
        'approval_granted',
        'approval_rejected',
        'comment_added',
        'assignment_changed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS contract_entities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id varchar(255),
    domain contract_domain NOT NULL,
    entity_type contract_entity_type NOT NULL,
    title varchar(255) NOT NULL,
    owner_org_id varchar(255),
    operator_id varchar(255),
    current_status contract_status NOT NULL DEFAULT 'draft',
    current_substatus varchar(120),
    current_status_reason_code varchar(100),
    version integer NOT NULL DEFAULT 1,
    meta jsonb,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_entities_domain_entity_idx
    ON contract_entities (domain, entity_type);
CREATE INDEX IF NOT EXISTS contract_entities_status_idx
    ON contract_entities (current_status);
CREATE INDEX IF NOT EXISTS contract_entities_external_idx
    ON contract_entities (external_id);

CREATE TABLE IF NOT EXISTS contract_adapter_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_entity_id uuid NOT NULL REFERENCES contract_entities(id),
    native_table varchar(120) NOT NULL,
    native_entity_id varchar(255) NOT NULL,
    native_status varchar(120),
    meta jsonb,
    created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_adapter_links_contract_entity_idx
    ON contract_adapter_links (contract_entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS contract_adapter_links_native_lookup_idx
    ON contract_adapter_links (native_table, native_entity_id);

CREATE TABLE IF NOT EXISTS contract_status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_entity_id uuid NOT NULL REFERENCES contract_entities(id),
    status contract_status NOT NULL,
    substatus varchar(120),
    status_reason_code varchar(100),
    changed_by_actor_id varchar(255) NOT NULL,
    changed_by_actor_type contract_actor_type NOT NULL,
    changed_by_display_name varchar(255),
    changed_by_wallet varchar(255),
    request_id varchar(255) NOT NULL,
    idempotency_key varchar(255) NOT NULL,
    correlation_id varchar(255) NOT NULL,
    details jsonb,
    created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_status_history_entity_created_idx
    ON contract_status_history (contract_entity_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS contract_status_history_idempotency_idx
    ON contract_status_history (contract_entity_id, idempotency_key);

CREATE TABLE IF NOT EXISTS contract_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_entity_id uuid NOT NULL REFERENCES contract_entities(id),
    event_id uuid NOT NULL DEFAULT gen_random_uuid(),
    event_type contract_event_type NOT NULL,
    payload jsonb NOT NULL,
    correlation_id varchar(255) NOT NULL,
    occurred_at timestamp NOT NULL DEFAULT now(),
    created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_events_entity_occurred_idx
    ON contract_events (contract_entity_id, occurred_at);
CREATE UNIQUE INDEX IF NOT EXISTS contract_events_event_id_idx
    ON contract_events (event_id);

CREATE TABLE IF NOT EXISTS contract_event_outbox (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL,
    contract_entity_id uuid NOT NULL REFERENCES contract_entities(id),
    event_type contract_event_type NOT NULL,
    payload jsonb NOT NULL,
    publish_attempts integer NOT NULL DEFAULT 0,
    last_error text,
    published_at timestamp,
    created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_event_outbox_unpublished_idx
    ON contract_event_outbox (published_at, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS contract_event_outbox_event_id_idx
    ON contract_event_outbox (event_id);

CREATE TABLE IF NOT EXISTS contract_financial_payloads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_entity_id uuid NOT NULL REFERENCES contract_entities(id),
    payload_type varchar(80) NOT NULL,
    payload_version integer NOT NULL DEFAULT 1,
    payload jsonb NOT NULL,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_financial_payloads_entity_payload_idx
    ON contract_financial_payloads (contract_entity_id, payload_type);
