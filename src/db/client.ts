import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;
let database: Database | undefined;

function getDatabase() {
  if (database) return database;

  const databaseUrl = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED is required to use the PostgreSQL data layer");
  }

  const client = postgres(databaseUrl, {
    max: 5,
    prepare: false,
  });
  database = drizzle(client, { schema });
  return database;
}

export const db = new Proxy({} as Database, {
  get(_target, property) {
    return Reflect.get(getDatabase(), property);
  },
});