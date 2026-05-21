ALTER TABLE "kyc_verifications"
  ADD COLUMN IF NOT EXISTS "persona_inquiry_id" varchar(100);

CREATE INDEX IF NOT EXISTS "kyc_verifications_persona_inquiry_id_idx"
  ON "kyc_verifications" ("persona_inquiry_id");
