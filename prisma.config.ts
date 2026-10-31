// prisma.config.ts — Prisma 7 configuration
// Connection URL is passed via environment variables through this config file.
// For Supabase/Neon, swap the adapter import below as needed.
import { defineConfig } from "prisma/config";
import "dotenv/config";

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
