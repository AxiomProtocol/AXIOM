-- Task #242: Plaid Auth + Balance integration.
--
-- Two tables:
--   cap_plaid_items     — one row per linked Plaid item (institution).
--                         Holds the application-layer envelope-encrypted
--                         Plaid access_token. Subject to the §7
--                         /item/remove revocation path: row contents are
--                         wiped within 30 days of disconnect.
--
--   cap_plaid_accounts  — one row per bank account exposed by an item.
--                         Holds ACH routing + account numbers from Plaid
--                         Auth, application-layer envelope-encrypted.
--                         Cleartext only ever held in process memory at
--                         ACH submit time (never written to payloadJson).

CREATE TABLE IF NOT EXISTS "cap_plaid_items" (
  "id"                     varchar(40)  PRIMARY KEY,
  "user_ref"               varchar(80)  NOT NULL,
  "plaid_item_id"          varchar(200) NOT NULL,
  "access_token_encrypted" text         NOT NULL,
  "institution_id"         varchar(80),
  "institution_name"       varchar(200),
  "environment"            varchar(16)  NOT NULL,
  "removed_at"             timestamp,
  "created_at"             timestamp    NOT NULL DEFAULT now(),
  "updated_at"             timestamp    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "cap_plaid_items_user_idx"
  ON "cap_plaid_items" ("user_ref", "removed_at");

CREATE UNIQUE INDEX IF NOT EXISTS "cap_plaid_items_plaid_item_uq"
  ON "cap_plaid_items" ("plaid_item_id");

CREATE TABLE IF NOT EXISTS "cap_plaid_accounts" (
  "id"                       varchar(40)  PRIMARY KEY,
  "item_id"                  varchar(40)  NOT NULL,
  "plaid_account_id"         varchar(200) NOT NULL,
  "account_name"             varchar(200),
  "mask"                     varchar(8),
  "account_type"             varchar(32),
  "account_subtype"          varchar(32),
  "routing_number_encrypted" text,
  "account_number_encrypted" text,
  "routing_mask"             varchar(8),
  "removed_at"               timestamp,
  "created_at"               timestamp    NOT NULL DEFAULT now(),
  "updated_at"               timestamp    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "cap_plaid_accounts_item_idx"
  ON "cap_plaid_accounts" ("item_id", "removed_at");

CREATE UNIQUE INDEX IF NOT EXISTS "cap_plaid_accounts_plaid_account_uq"
  ON "cap_plaid_accounts" ("plaid_account_id");
