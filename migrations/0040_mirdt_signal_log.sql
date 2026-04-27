CREATE TABLE IF NOT EXISTS "mirdt_signal_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "event_type" varchar(50) NOT NULL,
  "dimension" varchar(100),
  "grade" varchar(10) NOT NULL,
  "key_metric" text,
  "thesis" text,
  "prs_score" numeric(5, 2),
  "checksum" varchar(64) NOT NULL,
  "prev_checksum" varchar(64)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mirdt_signal_log_created_at_idx" ON "mirdt_signal_log" ("created_at");
