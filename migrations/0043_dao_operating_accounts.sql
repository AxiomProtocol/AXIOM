DO $$ BEGIN
  CREATE TYPE dao_account_status AS ENUM ('pending_review', 'approved', 'active', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "dao_account_applications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "entity_name" varchar(300) NOT NULL,
        "entity_ein" varchar(20) NOT NULL,
        "entity_address" text NOT NULL,
        "signer_name" varchar(300) NOT NULL,
        "signer_dob" date NOT NULL,
        "signer_country" varchar(3) NOT NULL,
        "signer_id_type" varchar(50) NOT NULL,
        "signer_id_number" varchar(100) NOT NULL,
        "increase_account_id" varchar(200),
        "increase_account_number" varchar(50),
        "increase_routing_number" varchar(20),
        "account_token_hash" varchar(256),
        "status" dao_account_status NOT NULL DEFAULT 'pending_review',
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
);
