import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to use the PostgreSQL data layer");
}

const client = postgres(databaseUrl, {
  max: 5,
  prepare: false,
});

export const db = drizzle(client, { schema });