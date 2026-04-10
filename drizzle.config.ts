import type { Config } from "drizzle-kit";

export default {
  schema: ["./shared/schema.ts", "./shared/propertySchema.ts", "./shared/realEstateSchema.ts", "./shared/secondarySchema.ts", "./shared/increaseParticipantSchema.ts", "./shared/axauSchema.ts", "./shared/treasurySchema.ts", "./shared/allocationPolicySchema.ts", "./shared/expansionSchema.ts", "./shared/stellarSchema.ts", "./shared/payrollSchema.ts"],
  out: "./migrations",
  dialect: "postgresql",
  strict: false,
  verbose: true,
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;