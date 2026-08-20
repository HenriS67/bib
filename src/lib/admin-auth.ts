import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "~/db/client";
import { adminUsers } from "~/db/schema";

export const ADMIN_COOKIE = "bibliotheque_admin";
export const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: !import.meta.env.DEV,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

function tokenFor(user: string) {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "development-secret";
  return createHmac("sha256", secret).update(user).digest("hex");
}

export function adminToken(user: string) {
  return tokenFor(user);
}

export async function isAdmin(request: Request) {
  const cookieValue = request.headers.get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE}=`))
    ?.slice(ADMIN_COOKIE.length + 1);

  if (!cookieValue) return false;
  const [username, token] = cookieValue.split(".");
  if (!username || !token) return false;
  const [user] = await db
    .select({ username: adminUsers.username, active: adminUsers.active })
    .from(adminUsers)
    .where(eq(adminUsers.username, username));
  if (!user?.active) return false;
  const expectedToken = tokenFor(user.username);
  const actual = Buffer.from(cookieValue);
  const expected = Buffer.from(`${user.username}.${expectedToken}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
