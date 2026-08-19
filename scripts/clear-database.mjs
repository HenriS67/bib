import "dotenv/config";
import postgres from "postgres";

if (process.argv[2] !== "--yes") {
  console.error("Cette commande supprime tous les auteurs et tous les livres.");
  console.error("Pour confirmer : pnpm db:clear --yes");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL est requis dans le fichier .env");
}

const sql = postgres(databaseUrl, { prepare: false });

try {
  await sql`TRUNCATE TABLE books, authors RESTART IDENTITY CASCADE`;
  console.log("Base vidée : tous les livres et auteurs ont été supprimés.");
} finally {
  await sql.end();
}