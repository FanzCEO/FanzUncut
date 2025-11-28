import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

// Load environment variables from the correct location
const envPaths = [
  resolve(process.cwd(), 'env/.env.local'),
  resolve(process.cwd(), '.env.local'),
  resolve(process.cwd(), '.env'),
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`Loaded environment from: ${envPath}`);
    break;
  }
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not found. Setting SQLite default for development.');
  process.env.DATABASE_URL = 'sqlite:./fanz_db.sqlite';
}

// Determine dialect based on DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
const isSqlite = dbUrl?.startsWith("sqlite:");
const isPostgres = dbUrl?.startsWith("postgresql:") || dbUrl?.startsWith("postgres:");

let config;

if (isSqlite) {
  config = defineConfig({
    out: "./migrations",
    schema: "./shared/schema.ts",
    dialect: "sqlite",
    dbCredentials: {
      url: dbUrl.replace("sqlite:", ""),
    },
  });
} else if (isPostgres) {
  config = defineConfig({
    out: "./migrations",
    schema: "./shared/schema.ts",
    dialect: "postgresql",
    dbCredentials: {
      url: dbUrl,
    },
  });
} else {
  throw new Error(`Unsupported database URL: ${dbUrl}`);
}

export default config;
