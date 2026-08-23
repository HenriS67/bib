import type { RequestHandler } from "@builder.io/qwik-city";
import { ADMIN_COOKIE } from "~/lib/admin-auth";

export const onPost: RequestHandler = async ({ cookie, send }) => {
  cookie.delete(ADMIN_COOKIE, { path: "/" });
  send(new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  }));
};