import { Pool } from "pg";

const globalForPg = globalThis as unknown as { pool?: Pool };

export const pool = globalForPg.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://company_intel:company_intel@localhost:5432/company_intel",
});

if (process.env.NODE_ENV !== "production") {
  globalForPg.pool = pool;
}
