import type { Config } from "drizzle-kit";

export default {
  schema: "./shared/schema.js",
  out: "./migrations",
  dialect: "postgresql",
  strict: false,
  verbose: true,
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;