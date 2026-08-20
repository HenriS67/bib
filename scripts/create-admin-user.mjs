import "dotenv/config";
import postgres from "postgres";
import { randomBytes, scryptSync } from "node:crypto";

const username = process.env.ADMIN_USER;
const password = process.env.ADMIN_PASSWORD;

if (!username || !password) {
  throw new Error("ADMIN_USER et ADMIN_PASSWORD sont requis dans .env");
}

function hashPassword(value) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(value, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
try {
  await sql`
    INSERT INTO admin_users (id, username, password_hash, active)
    VALUES (${username}, ${username}, ${hashPassword(password)}, true)
    ON CONFLICT (username) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      active = true
  `;
  console.log(`Utilisateur admin prêt : ${username}`);
} finally {
  await sql.end();
}
