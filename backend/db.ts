import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Auto-migrate: Add full_name column to users table if it doesn't exist
// This ensures the database schema matches our code without needing to run drizzle-kit manually
pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name text;').catch(err => {
  console.log("Auto-migration note:", err.message);
});
