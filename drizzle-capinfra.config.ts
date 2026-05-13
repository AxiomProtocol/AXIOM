import type { Config } from "drizzle-kit";

export default {
  schema: ["./shared/capInfraSchema.ts"],
  out: "./drizzle-capinfra",
  dialect: "postgresql",
  strict: false,
  verbose: true,
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
