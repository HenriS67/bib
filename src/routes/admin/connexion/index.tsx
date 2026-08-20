import { component$ } from "@builder.io/qwik";
import { Form, routeAction$, type DocumentHead } from "@builder.io/qwik-city";
import { ADMIN_COOKIE, ADMIN_COOKIE_OPTIONS, adminToken } from "~/lib/admin-auth";
import { eq } from "drizzle-orm";
import { db } from "~/db/client";
import { adminUsers } from "~/db/schema";
import { verifyPassword } from "~/lib/passwords";

export const useLogin = routeAction$(async (credentials, event) => {
  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.username, String(credentials.user || "")));
  if (user?.active && verifyPassword(String(credentials.password || ""), user.passwordHash)) {
    event.cookie.set(ADMIN_COOKIE, `${user.username}.${adminToken(user.username)}`, ADMIN_COOKIE_OPTIONS);
    throw event.redirect(303, "/admin");
  }
  return { invalid: true };
});

export default component$(() => {
  const login = useLogin();
  return (
    <main class="flex min-h-screen items-center justify-center bg-[#f4f1ea] px-5 text-[#1d211d]">
      <div class="w-full max-w-md border border-[#1d211d] bg-[#fbfaf6] p-7 md:p-10">
        <p class="mb-3 text-xs uppercase tracking-[0.25em] text-[#6e746d]">Espace privé</p>
        <h1 class="mb-8 font-serif text-4xl font-bold">Administration</h1>
        <Form action={login} class="space-y-5">
          <label class="block text-sm"><span class="mb-2 block text-xs uppercase tracking-widest text-[#6e746d]">Identifiant</span><input name="user" required class="w-full border border-[#1d211d] bg-transparent px-3 py-3 outline-none focus:bg-white" /></label>
          <label class="block text-sm"><span class="mb-2 block text-xs uppercase tracking-widest text-[#6e746d]">Mot de passe</span><input name="password" type="password" required class="w-full border border-[#1d211d] bg-transparent px-3 py-3 outline-none focus:bg-white" /></label>
          <button type="submit" class="w-full cursor-pointer bg-[#1d211d] px-4 py-3 text-sm uppercase tracking-widest text-white hover:bg-[#3d493d]">Se connecter</button>
        </Form>
        {login.value?.invalid && <p class="mt-5 text-sm text-red-800">Identifiant ou mot de passe incorrect.</p>}
        <a href="/" class="mt-6 inline-block text-sm underline underline-offset-4">Retour à la bibliothèque</a>
      </div>
    </main>
  );
});

export const head: DocumentHead = { title: "Connexion admin - Bibliothèque" };