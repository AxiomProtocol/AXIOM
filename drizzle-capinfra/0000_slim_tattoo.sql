CREATE TYPE "public"."cap_action_type" AS ENUM('MINT', 'REDEEM', 'TRANSFER', 'BUY', 'SELL', 'STAKE', 'UNSTAKE', 'CUSTODY_MOVE', 'BORROW');--> statement-breakpoint
CREATE TYPE "public"."cap_asset_subtype" AS ENUM('GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM', 'TREASURY_BILL', 'MONEY_MARKET', 'REIT', 'COMMERCIAL', 'RESIDENTIAL', 'NONE');--> statement-breakpoint
CREATE TYPE "public"."cap_asset_type" AS ENUM('STABLE_ASSET', 'PHYSICAL_METAL', 'REAL_ESTATE', 'CREDIT', 'CARBON', 'EQUITY', 'TREASURY_BILL', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."cap_claim_status" AS ENUM('VALID', 'EXPIRED', 'REVOKED', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."cap_claim_type" AS ENUM('KYC_VERIFIED', 'ACCREDITED_INVESTOR', 'JURISDICTION_ALLOWED', 'AML_CLEARED', 'SANCTIONS_CLEARED', 'INSTITUTIONAL', 'PROFESSIONAL_INVESTOR');--> statement-breakpoint
CREATE TYPE "public"."cap_collateral_class" AS ENUM('GREEN', 'YELLOW', 'RED');--> statement-breakpoint
CREATE TYPE "public"."cap_custody_model" AS ENUM('ALLOCATED_PHYSICAL', 'ISSUER_CUSTODY', 'SEGREGATED_CUSTODY', 'OMNIBUS_CUSTODY', 'ON_CHAIN_NATIVE');--> statement-breakpoint
CREATE TYPE "public"."cap_entity_type" AS ENUM('NATURAL_PERSON', 'LEGAL_ENTITY', 'INSTITUTION', 'INTERNAL_TREASURY');--> statement-breakpoint
CREATE TYPE "public"."cap_exposure_class" AS ENUM('UNRESTRICTED', 'RESTRICTED', 'ACCREDITED', 'INSTITUTIONAL');--> statement-breakpoint
CREATE TYPE "public"."cap_price_type" AS ENUM('SPOT', 'NAV', 'INDICATIVE', 'MARK_TO_MODEL', 'MID', 'BID', 'ASK');--> statement-breakpoint
CREATE TYPE "public"."cap_record_status" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."cap_redemption_type" AS ENUM('PHYSICAL_DELIVERY', 'CASH', 'IN_KIND', 'NONE');--> statement-breakpoint
CREATE TYPE "public"."cap_route_type" AS ENUM('DIRECT', 'INTERMEDIATED', 'ATOMIC_SWAP', 'CCTP');--> statement-breakpoint
CREATE TYPE "public"."cap_settlement_status" AS ENUM('PENDING', 'AUTHORIZED', 'EXECUTING', 'SETTLED', 'FAILED', 'CANCELLED', 'PENDING_OPERATOR_APPROVAL', 'SUBMITTED');--> statement-breakpoint
CREATE TYPE "public"."cap_settlement_type" AS ENUM('INTERNAL', 'EVM', 'STELLAR', 'ACH', 'WIRE', 'SWIFT');--> statement-breakpoint
CREATE TYPE "public"."cap_severity_level" AS ENUM('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TABLE "cap_adapters" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"kind" varchar(60) NOT NULL,
	"config_json" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_admin_actions" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"action_type" varchar(80) NOT NULL,
	"subject_type" varchar(60) NOT NULL,
	"subject_id" varchar(80) NOT NULL,
	"primary_actor" varchar(80) NOT NULL,
	"secondary_actor" varchar(80),
	"reason_code" varchar(100) NOT NULL,
	"payload_json" jsonb,
	"correlation_id" varchar(80),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_asset_markets" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"asset_id" varchar(40) NOT NULL,
	"venue" varchar(100) NOT NULL,
	"pair" varchar(40) NOT NULL,
	"route_type" "cap_route_type" DEFAULT 'DIRECT' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_assets" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"symbol" varchar(32) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"asset_type" "cap_asset_type" NOT NULL,
	"asset_subtype" "cap_asset_subtype" DEFAULT 'NONE' NOT NULL,
	"custody_model" "cap_custody_model" NOT NULL,
	"redemption_type" "cap_redemption_type" DEFAULT 'NONE' NOT NULL,
	"settlement_type" "cap_settlement_type" NOT NULL,
	"chain" varchar(32),
	"chain_id" integer,
	"contract_address" varchar(80),
	"decimals" integer DEFAULT 18 NOT NULL,
	"issuer" varchar(200),
	"base_policy_json" jsonb,
	"exposure_class" "cap_exposure_class" DEFAULT 'RESTRICTED' NOT NULL,
	"status" "cap_record_status" DEFAULT 'ACTIVE' NOT NULL,
	"collateral_class" "cap_collateral_class" DEFAULT 'RED' NOT NULL,
	"collateral_classification_rationale" text,
	"metadata_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_audit_events" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"aggregate_type" varchar(60) NOT NULL,
	"aggregate_id" varchar(80) NOT NULL,
	"user_id" varchar(40),
	"asset_id" varchar(40),
	"instruction_id" varchar(40),
	"payload_json" jsonb,
	"correlation_id" varchar(80),
	"actor" varchar(80),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_bridge_allowlist_proposal_comments" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"proposal_id" varchar(40) NOT NULL,
	"commenter" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_bridge_allowlist_proposals" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"asset_symbol" varchar(32) NOT NULL,
	"bridge_provenance" text NOT NULL,
	"validity_adapter_address" varchar(80),
	"per_asset_cap" numeric(30, 10),
	"comment_window_ends_at" timestamp NOT NULL,
	"status" varchar(32) NOT NULL,
	"yes_votes" integer DEFAULT 0 NOT NULL,
	"no_votes" integer DEFAULT 0 NOT NULL,
	"created_by" varchar(40),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"executed_at" timestamp,
	"executed_tx_hash" varchar(80),
	"metadata_json" jsonb
);
--> statement-breakpoint
CREATE TABLE "cap_card_deposit_webhook_events" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"stripe_event_id" varchar(200) NOT NULL,
	"event_type" varchar(80) NOT NULL,
	"deposit_id" varchar(40),
	"payload_json" jsonb,
	"stripe_account_id" varchar(64),
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_card_deposits" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"user_id" varchar(40),
	"intent" varchar(32) NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" varchar(8) DEFAULT 'usd' NOT NULL,
	"stripe_session_id" varchar(200),
	"stripe_payment_intent_id" varchar(200),
	"stripe_payout_id" varchar(200),
	"increase_transfer_id" varchar(200),
	"mint_tx_hash" varchar(80),
	"status" varchar(32) NOT NULL,
	"target_wallet_address" varchar(80),
	"buyer_email" varchar(200),
	"idempotency_key" varchar(200) NOT NULL,
	"metadata_json" jsonb,
	"error_reason" text,
	"stripe_account_id" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_claims" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"claim_type" "cap_claim_type" NOT NULL,
	"status" "cap_claim_status" DEFAULT 'VALID' NOT NULL,
	"issuer" varchar(200) NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"evidence_uri" text,
	"evidence_hash" varchar(128),
	"payload_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_counterparties" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"legal_name" varchar(255) NOT NULL,
	"category" varchar(80) NOT NULL,
	"jurisdiction" varchar(8),
	"status" "cap_record_status" DEFAULT 'ACTIVE' NOT NULL,
	"metadata_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_documents" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"owner_type" varchar(40) NOT NULL,
	"owner_id" varchar(80) NOT NULL,
	"document_type" varchar(60) NOT NULL,
	"uri" text NOT NULL,
	"content_hash" varchar(128),
	"mime_type" varchar(100),
	"uploaded_by" varchar(80),
	"metadata_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_identity_profiles" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"legal_name" varchar(255),
	"date_of_birth" varchar(10),
	"country_of_residence" varchar(8),
	"country_of_citizenship" varchar(8),
	"tax_id_hash" varchar(128),
	"risk_rating" varchar(20),
	"exposure_class" "cap_exposure_class" DEFAULT 'UNRESTRICTED' NOT NULL,
	"cached_at" timestamp DEFAULT now() NOT NULL,
	"source_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_loss_coverage_claim_events" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"claim_id" varchar(40) NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"actor" varchar(200),
	"from_status" varchar(32),
	"to_status" varchar(32),
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_loss_coverage_claims" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"claimant_wallet" varchar(80) NOT NULL,
	"contact_email" varchar(200),
	"position_ref" text,
	"tx_hashes_json" jsonb,
	"description" text NOT NULL,
	"amount_requested_cents" integer NOT NULL,
	"eligibility_category" varchar(64) NOT NULL,
	"status" varchar(32) NOT NULL,
	"reviewer_notes" text,
	"evidence_urls_json" jsonb,
	"decided_at" timestamp,
	"decided_by" varchar(200),
	"paid_amount_cents" integer,
	"paid_tx_hash" varchar(80),
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_notifications" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"user_id" varchar(40),
	"channel" varchar(20) NOT NULL,
	"topic" varchar(100) NOT NULL,
	"severity" "cap_severity_level" DEFAULT 'INFO' NOT NULL,
	"subject" varchar(240) NOT NULL,
	"body_json" jsonb,
	"correlation_id" varchar(80),
	"related_event_id" varchar(40),
	"read_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_plaid_accounts" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"item_id" varchar(40) NOT NULL,
	"plaid_account_id" varchar(200) NOT NULL,
	"account_name" varchar(200),
	"mask" varchar(8),
	"account_type" varchar(32),
	"account_subtype" varchar(32),
	"routing_number_encrypted" text,
	"account_number_encrypted" text,
	"routing_mask" varchar(8),
	"removed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_plaid_items" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"user_ref" varchar(80) NOT NULL,
	"plaid_item_id" varchar(200) NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"institution_id" varchar(80),
	"institution_name" varchar(200),
	"environment" varchar(16) NOT NULL,
	"removed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_policy_decisions" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"asset_id" varchar(40) NOT NULL,
	"action_type" "cap_action_type" NOT NULL,
	"amount" numeric(30, 10),
	"jurisdiction" varchar(8),
	"product_context" varchar(100),
	"allowed" boolean NOT NULL,
	"reason_code" varchar(100) NOT NULL,
	"policy_version" varchar(40) NOT NULL,
	"required_claims_json" jsonb,
	"warnings_json" jsonb,
	"limits_json" jsonb,
	"idempotency_key" varchar(200) NOT NULL,
	"input_hash" varchar(128) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_positions" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"asset_id" varchar(40) NOT NULL,
	"wallet_id" varchar(40),
	"quantity" numeric(30, 10) DEFAULT '0' NOT NULL,
	"average_cost" numeric(30, 10),
	"current_value_usd" numeric(30, 10),
	"status" "cap_record_status" DEFAULT 'ACTIVE' NOT NULL,
	"metadata_json" jsonb,
	"as_of" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_price_snapshots" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"asset_id" varchar(40) NOT NULL,
	"price_type" "cap_price_type" NOT NULL,
	"source" varchar(100) NOT NULL,
	"quote_currency" varchar(16) DEFAULT 'USD' NOT NULL,
	"price" numeric(30, 10) NOT NULL,
	"confidence" numeric(5, 2),
	"stale_sec" integer,
	"observed_at" timestamp NOT NULL,
	"ingested_at" timestamp DEFAULT now() NOT NULL,
	"payload_json" jsonb
);
--> statement-breakpoint
CREATE TABLE "cap_reconciliation_drift" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"run_id" varchar(40) NOT NULL,
	"adapter_key" varchar(60) NOT NULL,
	"kind" varchar(40) NOT NULL,
	"severity" varchar(30) NOT NULL,
	"external_ref" varchar(200),
	"instruction_id" varchar(40),
	"detail_json" jsonb,
	"remediation" varchar(30) DEFAULT 'NONE' NOT NULL,
	"remediation_ref" varchar(80),
	"remediation_failure_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_reconciliation_runs" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"adapter_key" varchar(60) NOT NULL,
	"window_since" timestamp NOT NULL,
	"window_until" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'QUEUED' NOT NULL,
	"compared_count" integer DEFAULT 0 NOT NULL,
	"drift_count" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"triggered_by" varchar(80) NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_reserve_config" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"mode" varchar(32) NOT NULL,
	"config_json" jsonb,
	"version" varchar(40) NOT NULL,
	"effective_at" timestamp DEFAULT now() NOT NULL,
	"superseded_at" timestamp,
	"primary_actor" varchar(80) NOT NULL,
	"secondary_actor" varchar(80) NOT NULL,
	"reason_code" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_reserve_holdings" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"asset_id" varchar(40) NOT NULL,
	"source" varchar(32) NOT NULL,
	"direction" varchar(8) NOT NULL,
	"amount" numeric(30, 10) NOT NULL,
	"reference_id" varchar(200),
	"attestation_ref" varchar(200),
	"reason_code" varchar(100) NOT NULL,
	"idempotency_key" varchar(200) NOT NULL,
	"actor" varchar(80) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_reserve_holdings_snapshot_lines" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"snapshot_id" varchar(40) NOT NULL,
	"asset_id" varchar(40) NOT NULL,
	"attestation_ref" varchar(200),
	"line_index" integer NOT NULL,
	"gross" numeric(30, 10) NOT NULL,
	"encumbered" numeric(30, 10) DEFAULT '0' NOT NULL,
	"available" numeric(30, 10) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_reserve_holdings_snapshots" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"as_of" timestamp NOT NULL,
	"mode" varchar(32) NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"line_count" integer NOT NULL,
	"sources_json" jsonb,
	"created_by" varchar(80) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_reserve_snapshots" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"asset_id" varchar(40) NOT NULL,
	"reserve_value_usd" numeric(30, 10) NOT NULL,
	"liability_value_usd" numeric(30, 10) NOT NULL,
	"coverage_ratio" numeric(20, 8),
	"warning_level" "cap_severity_level" DEFAULT 'INFO' NOT NULL,
	"notes" text,
	"payload_json" jsonb,
	"observed_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_risk_decisions" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"user_id" varchar(40),
	"asset_id" varchar(40),
	"instruction_id" varchar(40),
	"decision" varchar(40) NOT NULL,
	"severity" "cap_severity_level" DEFAULT 'INFO' NOT NULL,
	"reason_code" varchar(100) NOT NULL,
	"policy_version" varchar(40) NOT NULL,
	"payload_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_risk_policies" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"version" varchar(40) NOT NULL,
	"scope_json" jsonb NOT NULL,
	"scope_hash" varchar(64),
	"rules_json" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"effective_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_settlement_instructions" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"asset_id" varchar(40) NOT NULL,
	"action_type" "cap_action_type" NOT NULL,
	"route_type" "cap_route_type" DEFAULT 'DIRECT' NOT NULL,
	"settlement_type" "cap_settlement_type" NOT NULL,
	"amount" numeric(30, 10) NOT NULL,
	"quote_currency" varchar(16) DEFAULT 'USD' NOT NULL,
	"counterparty_id" varchar(40),
	"adapter_id" varchar(40),
	"external_ref" varchar(200),
	"idempotency_key" varchar(200) NOT NULL,
	"status" "cap_settlement_status" DEFAULT 'PENDING' NOT NULL,
	"policy_decision_id" varchar(40),
	"payload_json" jsonb,
	"authorized_at" timestamp,
	"settled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_users" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"external_id" varchar(200),
	"entity_type" "cap_entity_type" DEFAULT 'NATURAL_PERSON' NOT NULL,
	"primary_email" varchar(320),
	"jurisdiction" varchar(8),
	"status" "cap_record_status" DEFAULT 'ACTIVE' NOT NULL,
	"metadata_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_wallets" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"user_id" varchar(40) NOT NULL,
	"chain" varchar(32) NOT NULL,
	"chain_id" integer,
	"address" varchar(80) NOT NULL,
	"label" varchar(120),
	"is_primary" boolean DEFAULT false NOT NULL,
	"status" "cap_record_status" DEFAULT 'ACTIVE' NOT NULL,
	"verified_at" timestamp,
	"metadata_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cap_webhook_events" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"adapter_key" varchar(60) NOT NULL,
	"external_event_id" varchar(200),
	"raw_payload_json" jsonb,
	"raw_headers_json" jsonb,
	"signature_verified" boolean DEFAULT false NOT NULL,
	"status" varchar(32) DEFAULT 'RECEIVED' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"settlement_instruction_id" varchar(40),
	"received_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"reclassified_by" varchar(80),
	"reclassified_at" timestamp,
	"reclassification_reason" varchar(200)
);
--> statement-breakpoint
ALTER TABLE "cap_asset_markets" ADD CONSTRAINT "cap_asset_markets_asset_id_cap_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."cap_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cap_claims" ADD CONSTRAINT "cap_claims_user_id_cap_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."cap_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cap_identity_profiles" ADD CONSTRAINT "cap_identity_profiles_user_id_cap_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."cap_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cap_policy_decisions" ADD CONSTRAINT "cap_policy_decisions_user_id_cap_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."cap_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cap_policy_decisions" ADD CONSTRAINT "cap_policy_decisions_asset_id_cap_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."cap_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cap_positions" ADD CONSTRAINT "cap_positions_user_id_cap_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."cap_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cap_positions" ADD CONSTRAINT "cap_positions_asset_id_cap_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."cap_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cap_positions" ADD CONSTRAINT "cap_positions_wallet_id_cap_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."cap_wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cap_price_snapshots" ADD CONSTRAINT "cap_price_snapshots_asset_id_cap_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."cap_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cap_reconciliation_drift" ADD CONSTRAINT "cap_reconciliation_drift_run_id_cap_reconciliation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."cap_reconciliation_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cap_reserve_holdings" ADD CONSTRAINT "cap_reserve_holdings_asset_id_cap_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."cap_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cap_reserve_holdings_snapshot_lines" ADD CONSTRAINT "cap_reserve_holdings_snapshot_lines_snapshot_id_cap_reserve_holdings_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."cap_reserve_holdings_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cap_reserve_snapshots" ADD CONSTRAINT "cap_reserve_snapshots_asset_id_cap_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."cap_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cap_risk_decisions" ADD CONSTRAINT "cap_risk_decisions_user_id_cap_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."cap_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cap_risk_decisions" ADD CONSTRAINT "cap_risk_decisions_asset_id_cap_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."cap_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cap_settlement_instructions" ADD CONSTRAINT "cap_settlement_instructions_user_id_cap_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."cap_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cap_settlement_instructions" ADD CONSTRAINT "cap_settlement_instructions_asset_id_cap_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."cap_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cap_wallets" ADD CONSTRAINT "cap_wallets_user_id_cap_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."cap_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cap_adapters_name_uq" ON "cap_adapters" USING btree ("name");--> statement-breakpoint
CREATE INDEX "cap_adapters_kind_idx" ON "cap_adapters" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "cap_admin_actions_type_idx" ON "cap_admin_actions" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "cap_admin_actions_subject_idx" ON "cap_admin_actions" USING btree ("subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "cap_admin_actions_created_idx" ON "cap_admin_actions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cap_asset_markets_asset_venue_pair_uq" ON "cap_asset_markets" USING btree ("asset_id","venue","pair");--> statement-breakpoint
CREATE INDEX "cap_asset_markets_asset_idx" ON "cap_asset_markets" USING btree ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cap_assets_symbol_uq" ON "cap_assets" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "cap_assets_type_status_idx" ON "cap_assets" USING btree ("asset_type","status");--> statement-breakpoint
CREATE INDEX "cap_assets_contract_idx" ON "cap_assets" USING btree ("contract_address");--> statement-breakpoint
CREATE INDEX "cap_assets_collateral_class_idx" ON "cap_assets" USING btree ("collateral_class");--> statement-breakpoint
CREATE INDEX "cap_audit_events_type_created_idx" ON "cap_audit_events" USING btree ("event_type","created_at");--> statement-breakpoint
CREATE INDEX "cap_audit_events_agg_idx" ON "cap_audit_events" USING btree ("aggregate_type","aggregate_id");--> statement-breakpoint
CREATE INDEX "cap_audit_events_user_idx" ON "cap_audit_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cap_audit_events_asset_idx" ON "cap_audit_events" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "cap_audit_events_instruction_idx" ON "cap_audit_events" USING btree ("instruction_id");--> statement-breakpoint
CREATE INDEX "cap_audit_events_correlation_idx" ON "cap_audit_events" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "cap_audit_events_created_idx" ON "cap_audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cap_bridge_allowlist_comments_proposal_idx" ON "cap_bridge_allowlist_proposal_comments" USING btree ("proposal_id","created_at");--> statement-breakpoint
CREATE INDEX "cap_bridge_allowlist_status_idx" ON "cap_bridge_allowlist_proposals" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "cap_bridge_allowlist_symbol_idx" ON "cap_bridge_allowlist_proposals" USING btree ("asset_symbol");--> statement-breakpoint
CREATE UNIQUE INDEX "cap_card_deposit_webhook_events_stripe_event_uq" ON "cap_card_deposit_webhook_events" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE INDEX "cap_card_deposit_webhook_events_deposit_idx" ON "cap_card_deposit_webhook_events" USING btree ("deposit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cap_card_deposits_idem_uq" ON "cap_card_deposits" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "cap_card_deposits_session_uq" ON "cap_card_deposits" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE INDEX "cap_card_deposits_status_idx" ON "cap_card_deposits" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "cap_card_deposits_intent_idx" ON "cap_card_deposits" USING btree ("intent","created_at");--> statement-breakpoint
CREATE INDEX "cap_claims_user_type_idx" ON "cap_claims" USING btree ("user_id","claim_type");--> statement-breakpoint
CREATE INDEX "cap_claims_status_idx" ON "cap_claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cap_claims_expires_idx" ON "cap_claims" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "cap_counterparties_name_idx" ON "cap_counterparties" USING btree ("legal_name");--> statement-breakpoint
CREATE INDEX "cap_counterparties_category_idx" ON "cap_counterparties" USING btree ("category");--> statement-breakpoint
CREATE INDEX "cap_documents_owner_idx" ON "cap_documents" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE INDEX "cap_documents_type_idx" ON "cap_documents" USING btree ("document_type");--> statement-breakpoint
CREATE UNIQUE INDEX "cap_identity_profiles_user_uq" ON "cap_identity_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cap_identity_profiles_exposure_idx" ON "cap_identity_profiles" USING btree ("exposure_class");--> statement-breakpoint
CREATE INDEX "cap_lcc_events_claim_idx" ON "cap_loss_coverage_claim_events" USING btree ("claim_id","created_at");--> statement-breakpoint
CREATE INDEX "cap_lcc_status_idx" ON "cap_loss_coverage_claims" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "cap_lcc_wallet_idx" ON "cap_loss_coverage_claims" USING btree ("claimant_wallet");--> statement-breakpoint
CREATE INDEX "cap_notifications_user_unread_idx" ON "cap_notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "cap_notifications_topic_created_idx" ON "cap_notifications" USING btree ("topic","created_at");--> statement-breakpoint
CREATE INDEX "cap_notifications_correlation_idx" ON "cap_notifications" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "cap_plaid_accounts_item_idx" ON "cap_plaid_accounts" USING btree ("item_id","removed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cap_plaid_accounts_plaid_account_uq" ON "cap_plaid_accounts" USING btree ("plaid_account_id");--> statement-breakpoint
CREATE INDEX "cap_plaid_items_user_idx" ON "cap_plaid_items" USING btree ("user_ref","removed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cap_plaid_items_plaid_item_uq" ON "cap_plaid_items" USING btree ("plaid_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cap_policy_decisions_idem_uq" ON "cap_policy_decisions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "cap_policy_decisions_user_asset_idx" ON "cap_policy_decisions" USING btree ("user_id","asset_id");--> statement-breakpoint
CREATE INDEX "cap_policy_decisions_created_idx" ON "cap_policy_decisions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cap_positions_user_asset_wallet_uq" ON "cap_positions" USING btree ("user_id","asset_id","wallet_id");--> statement-breakpoint
CREATE INDEX "cap_positions_user_status_idx" ON "cap_positions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "cap_positions_asset_idx" ON "cap_positions" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "cap_price_snapshots_asset_type_obs_idx" ON "cap_price_snapshots" USING btree ("asset_id","price_type","observed_at");--> statement-breakpoint
CREATE INDEX "cap_price_snapshots_source_idx" ON "cap_price_snapshots" USING btree ("source");--> statement-breakpoint
CREATE INDEX "cap_reconciliation_drift_run_idx" ON "cap_reconciliation_drift" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "cap_reconciliation_drift_adapter_severity_idx" ON "cap_reconciliation_drift" USING btree ("adapter_key","severity","created_at");--> statement-breakpoint
CREATE INDEX "cap_reconciliation_runs_adapter_started_idx" ON "cap_reconciliation_runs" USING btree ("adapter_key","started_at");--> statement-breakpoint
CREATE INDEX "cap_reserve_config_effective_idx" ON "cap_reserve_config" USING btree ("effective_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cap_reserve_config_version_uq" ON "cap_reserve_config" USING btree ("version");--> statement-breakpoint
CREATE UNIQUE INDEX "cap_reserve_holdings_idem_uq" ON "cap_reserve_holdings" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "cap_reserve_holdings_asset_idx" ON "cap_reserve_holdings" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "cap_reserve_holdings_created_idx" ON "cap_reserve_holdings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cap_reserve_holdings_snap_lines_snap_idx" ON "cap_reserve_holdings_snapshot_lines" USING btree ("snapshot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cap_reserve_holdings_snap_lines_snap_line_uq" ON "cap_reserve_holdings_snapshot_lines" USING btree ("snapshot_id","line_index");--> statement-breakpoint
CREATE INDEX "cap_reserve_holdings_snapshots_as_of_idx" ON "cap_reserve_holdings_snapshots" USING btree ("as_of");--> statement-breakpoint
CREATE INDEX "cap_reserve_holdings_snapshots_checksum_idx" ON "cap_reserve_holdings_snapshots" USING btree ("checksum");--> statement-breakpoint
CREATE INDEX "cap_reserve_snapshots_asset_obs_idx" ON "cap_reserve_snapshots" USING btree ("asset_id","observed_at");--> statement-breakpoint
CREATE INDEX "cap_reserve_snapshots_warning_idx" ON "cap_reserve_snapshots" USING btree ("warning_level");--> statement-breakpoint
CREATE INDEX "cap_risk_decisions_user_idx" ON "cap_risk_decisions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cap_risk_decisions_asset_idx" ON "cap_risk_decisions" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "cap_risk_decisions_severity_idx" ON "cap_risk_decisions" USING btree ("severity");--> statement-breakpoint
CREATE UNIQUE INDEX "cap_risk_policies_name_version_uq" ON "cap_risk_policies" USING btree ("name","version");--> statement-breakpoint
CREATE INDEX "cap_risk_policies_active_idx" ON "cap_risk_policies" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "cap_risk_policies_active_scope_uq" ON "cap_risk_policies" USING btree ("scope_hash") WHERE "cap_risk_policies"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "cap_settlement_instructions_idem_uq" ON "cap_settlement_instructions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "cap_settlement_instructions_user_status_idx" ON "cap_settlement_instructions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "cap_settlement_instructions_asset_status_idx" ON "cap_settlement_instructions" USING btree ("asset_id","status");--> statement-breakpoint
CREATE INDEX "cap_settlement_instructions_external_ref_idx" ON "cap_settlement_instructions" USING btree ("external_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "cap_users_external_uq" ON "cap_users" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "cap_users_email_idx" ON "cap_users" USING btree ("primary_email");--> statement-breakpoint
CREATE INDEX "cap_users_status_idx" ON "cap_users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cap_wallets_user_idx" ON "cap_wallets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cap_wallets_address_idx" ON "cap_wallets" USING btree ("address");--> statement-breakpoint
CREATE UNIQUE INDEX "cap_wallets_chain_address_uq" ON "cap_wallets" USING btree ("chain","address");--> statement-breakpoint
CREATE INDEX "cap_webhook_events_adapter_status_idx" ON "cap_webhook_events" USING btree ("adapter_key","status");--> statement-breakpoint
CREATE INDEX "cap_webhook_events_received_idx" ON "cap_webhook_events" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "cap_webhook_events_external_idx" ON "cap_webhook_events" USING btree ("adapter_key","external_event_id");