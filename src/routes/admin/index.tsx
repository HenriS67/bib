import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { isAdmin } from "~/lib/admin-auth";

export const useAdminRedirect = routeLoader$(async ({ request, redirect: loaderRedirect }) => {
  if (!(await isAdmin(request))) throw loaderRedirect(302, "/admin/connexion");
  throw loaderRedirect(302, "/admin/auteurs");
});

export default component$(() => null);