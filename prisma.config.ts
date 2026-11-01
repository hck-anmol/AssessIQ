// prisma.config.ts — Prisma 7 configuration
import { defineConfig } from "prisma/config";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// In Next.js, environment variables are typically stored in .env.local
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}
dotenv.config(); // fallback to .env if present

export default defineConfig({
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
});
