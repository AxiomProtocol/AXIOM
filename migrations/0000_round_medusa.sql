CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "savings_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_number" varchar(20),
	"user_id" integer,
	"wallet_address" varchar(42) NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"apy" numeric NOT NULL,
	"principal" numeric,
	"balance" numeric NOT NULL,
	"accrued_interest" numeric DEFAULT '0' NOT NULL,
	"term_months" integer,
	"maturity_date" timestamp,
	"early_withdrawal_penalty_rate" numeric,
	"last_accrued_at" timestamp,
	"metadata" jsonb,
	"opened_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "savings_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"savings_account_id" integer NOT NULL,
	"tx_type" text NOT NULL,
	"amount" numeric NOT NULL,
	"balance_after" numeric NOT NULL,
	"tx_hash" varchar(66),
	"source" varchar(20),
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "savings_account_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"savings_account_id" integer NOT NULL,
	"round_up_enabled" boolean DEFAULT false NOT NULL,
	"auto_transfer_enabled" boolean DEFAULT false NOT NULL,
	"auto_transfer_amount" numeric,
	"auto_transfer_day" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "savings_account_settings_savings_account_id_unique" UNIQUE("savings_account_id")
);
--> statement-breakpoint
CREATE TABLE "checking_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"wallet_address" varchar(42) NOT NULL,
	"account_number" varchar(20) NOT NULL,
	"routing_number" varchar(9) DEFAULT '021000021',
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"ledger_balance" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"available_balance" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"overdraft_enabled" boolean DEFAULT false NOT NULL,
	"overdraft_limit" numeric(15, 2) DEFAULT '0.00',
	"daily_spend_cap" numeric(15, 2),
	"limits" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "checking_accounts_account_number_unique" UNIQUE("account_number")
);
--> statement-breakpoint
CREATE TABLE "checking_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"transaction_type" varchar(30) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'SWF',
	"description" text,
	"merchant_name" varchar(255),
	"mcc" varchar(4),
	"reference_id" varchar(100),
	"status" varchar(20) DEFAULT 'posted' NOT NULL,
	"balance_after" numeric(15, 2) NOT NULL,
	"initiated_by" varchar(42),
	"related_transfer_id" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"posted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_account_type" varchar(20) NOT NULL,
	"from_account_id" integer NOT NULL,
	"to_account_type" varchar(20) NOT NULL,
	"to_account_id" integer NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'SWF',
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"idempotency_key" varchar(100),
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"settled_at" timestamp,
	CONSTRAINT "transfers_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "payees" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"wallet_address" varchar(42) NOT NULL,
	"name" varchar(255) NOT NULL,
	"payee_type" varchar(20) NOT NULL,
	"ach_routing" varchar(9),
	"ach_account" varchar(20),
	"wallet_payee_address" varchar(42),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"wallet_address" varchar(42) NOT NULL,
	"from_account_type" varchar(20) NOT NULL,
	"from_account_id" integer NOT NULL,
	"to_payee_id" integer,
	"amount" numeric(15, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'SWF',
	"frequency" varchar(50) NOT NULL,
	"next_run_at" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "investment_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"wallet_address" varchar(42) NOT NULL,
	"account_type" varchar(20) NOT NULL,
	"account_number" varchar(20) NOT NULL,
	"base_currency" varchar(10) DEFAULT 'USD',
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "investment_accounts_account_number_unique" UNIQUE("account_number")
);
--> statement-breakpoint
CREATE TABLE "instruments" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"name" text NOT NULL,
	"type" varchar(20) NOT NULL,
	"exchange" varchar(50),
	"tick_size" numeric(10, 6),
	"lot_size" numeric(10, 2),
	"quote_source" varchar(50),
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "instruments_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "options_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"instrument_id" integer NOT NULL,
	"underlying_id" integer NOT NULL,
	"expiration_date" timestamp NOT NULL,
	"strike_price" numeric(15, 2) NOT NULL,
	"option_right" varchar(4) NOT NULL,
	"multiplier" integer DEFAULT 100,
	"style" varchar(10) DEFAULT 'american',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bonds_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"instrument_id" integer NOT NULL,
	"issuer" varchar(255) NOT NULL,
	"coupon_rate" numeric(6, 4),
	"maturity_date" timestamp NOT NULL,
	"face_value" numeric(15, 2),
	"rating" varchar(10),
	"duration" numeric(10, 4),
	"convexity" numeric(10, 4),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bonds_metadata_instrument_id_unique" UNIQUE("instrument_id")
);
--> statement-breakpoint
CREATE TABLE "reits_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"instrument_id" integer NOT NULL,
	"payout_frequency" varchar(20),
	"drip_available" boolean DEFAULT true,
	"documents" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reits_metadata_instrument_id_unique" UNIQUE("instrument_id")
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"instrument_id" integer NOT NULL,
	"quantity" numeric(20, 8) NOT NULL,
	"avg_cost" numeric(15, 6),
	"realized_pnl" numeric(15, 2) DEFAULT '0',
	"unrealized_pnl" numeric(15, 2) DEFAULT '0',
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"instrument_id" integer NOT NULL,
	"side" varchar(4) NOT NULL,
	"order_type" varchar(20) NOT NULL,
	"quantity" numeric(20, 8) NOT NULL,
	"limit_price" numeric(15, 6),
	"stop_price" numeric(15, 6),
	"tif" varchar(10) DEFAULT 'GTC',
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"filled_qty" numeric(20, 8) DEFAULT '0',
	"avg_fill_price" numeric(15, 6),
	"created_by" varchar(42) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"fill_qty" numeric(20, 8) NOT NULL,
	"fill_price" numeric(15, 6) NOT NULL,
	"fees" numeric(15, 6) DEFAULT '0',
	"venue" varchar(50),
	"tx_hash" varchar(66),
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"type" varchar(30) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"instrument_id" integer,
	"ref_id" varchar(100),
	"description" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dividends_distributions" (
	"id" serial PRIMARY KEY NOT NULL,
	"instrument_id" integer NOT NULL,
	"amount_per_share" numeric(15, 6) NOT NULL,
	"ex_date" timestamp NOT NULL,
	"pay_date" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'scheduled',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"snapshot_date" timestamp NOT NULL,
	"nav" numeric(15, 2) NOT NULL,
	"contributions" numeric(15, 2) DEFAULT '0',
	"withdrawals" numeric(15, 2) DEFAULT '0',
	"return_amount" numeric(15, 2),
	"return_percent" numeric(8, 4),
	"volatility" numeric(8, 4),
	"sharpe_ratio" numeric(8, 4),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_data_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"instrument_id" integer NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"bid" numeric(15, 6),
	"ask" numeric(15, 6),
	"last" numeric(15, 6),
	"volume" numeric(20, 2),
	"open_interest" numeric(20, 2),
	"implied_volatility" numeric(8, 4)
);
--> statement-breakpoint
CREATE TABLE "user_investing_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"auto_invest" jsonb,
	"risk_profile" varchar(20),
	"tax_lot_method" varchar(20) DEFAULT 'FIFO',
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_investing_settings_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
CREATE TABLE "admin_controls" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "admin_controls_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "compliance_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"wallet_address" varchar(42),
	"event" varchar(100) NOT NULL,
	"ip_address" varchar(45),
	"details" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by_admin_id" uuid
);
--> statement-breakpoint
CREATE TABLE "admin_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_type" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"amount" numeric(20, 6),
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text NOT NULL,
	"approval_reason" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"approved_by" uuid,
	"approved_at" timestamp,
	"executed_by" uuid,
	"executed_at" timestamp,
	"rejected_by" uuid,
	"rejected_at" timestamp,
	"cancelled_by" uuid,
	"cancelled_at" timestamp,
	"request_id" text NOT NULL,
	"unique_key" text NOT NULL,
	"execution_result" jsonb,
	CONSTRAINT "admin_proposals_unique_key_unique" UNIQUE("unique_key")
);
--> statement-breakpoint
CREATE TABLE "admin_proposal_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"actor_role" text NOT NULL,
	"request_id" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"event_payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"actor_role" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"request_id" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"before_state" jsonb,
	"after_state" jsonb,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_state_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payout_id" text NOT NULL,
	"from_status" text NOT NULL,
	"to_status" text NOT NULL,
	"changed_by" uuid NOT NULL,
	"proposal_id" uuid,
	"reason" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_reversals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_transaction_id" text NOT NULL,
	"reversal_transaction_id" text NOT NULL,
	"created_by" uuid NOT NULL,
	"proposal_id" uuid,
	"reason" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "user_roles_role_idx" ON "user_roles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "admin_proposals_status_idx" ON "admin_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "admin_proposals_action_type_idx" ON "admin_proposals" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "admin_proposals_created_by_idx" ON "admin_proposals" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "admin_proposals_target_idx" ON "admin_proposals" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "admin_proposal_events_proposal_id_idx" ON "admin_proposal_events" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX "admin_proposal_events_event_type_idx" ON "admin_proposal_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "admin_audit_log_actor_idx" ON "admin_audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "admin_audit_log_action_idx" ON "admin_audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "admin_audit_log_target_idx" ON "admin_audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "admin_audit_log_created_at_idx" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payout_state_history_payout_id_idx" ON "payout_state_history" USING btree ("payout_id");--> statement-breakpoint
CREATE INDEX "transaction_reversals_original_tx_idx" ON "transaction_reversals" USING btree ("original_transaction_id");