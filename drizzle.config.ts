import type { Config } from "drizzle-kit";

export default {
  schema: ["./shared/schema.ts", "./shared/propertySchema.ts", "./shared/realEstateSchema.ts"],
  out: "./migrations",
  dialect: "postgresql",
  strict: false,
  verbose: true,
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;