import type { Config } from "drizzle-kit";

export default {
<<<<<<< HEAD
  schema: "./shared/schema.ts",
=======
  schema: "./shared/schema.js",
>>>>>>> a71dd51e2ca25c5fb2013ac140a4390f21404a26
  out: "./migrations",
  dialect: "postgresql",
  strict: false,
  verbose: true,
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;