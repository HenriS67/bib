import { $, component$, useSignal } from "@builder.io/qwik";
import {
  Form,
  routeAction$,
  routeLoader$,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { readLibrary, createAuthorFolder, removeAuthorFolder, updateAuthorJson } from "~/data/library";
import { ADMIN_COOKIE, isAdmin } from "~/lib/admin-auth";

export const useAuthors = routeLoader$(async ({ request, redirect }) => {
  if (!(await isAdmin(request))) throw redirect(302, "/admin/connexion");
  const { authors: authorList } = await readLibrary();
  return authorList;
});

export const useCreateAuthor = routeAction$(async (input, event) => {
  if (!(await isAdmin(event.request))) throw event.redirect(302, "/admin/connexion");
  const name = String(input.name || "").trim();
  if (!name) return { invalid: true };
  const { authors: authorList } = await readLibrary();
  const [existingAuthor] = authorList.filter((author) => author.name === name);
  if (existingAuthor) return { duplicate: true };
  const id = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const [existingId] = authorList.filter((author) => author.id === id);
  if (existingId) return { duplicate: true };
  await createAuthorFolder(id, name);
  return { created: { id, name, image: "/favicon.svg", bookCount: 0 } };
});

export const useUpdateAuthor = routeAction$(async (input, event) => {
  if (!(await isAdmin(event.request))) throw event.redirect(302, "/admin/connexion");
  const id = String(input.id || "").trim();
  const name = String(input.name || "").trim();
  if (!id || !name) return { invalid: true };
  const { authors: authorList } = await readLibrary();
  const [existingAuthor] = authorList.filter((author) => author.name === name);
  if (existingAuthor && existingAuthor.id !== id) return { duplicate: true };
  await updateAuthorJson(id, name);
  return { updated: { id, name } };
});

export const useDeleteAuthor = routeAction$(async ({ id }, event) => {
  if (!(await isAdmin(event.request))) throw event.redirect(302, "/admin/connexion");
  const authorId = String(id || "").trim();
  if (!authorId) return { invalid: true };
  await removeAuthorFolder(authorId);
  return { deleted: authorId };
});

export const useLogout = routeAction$((_, event) => {
  event.cookie.delete(ADMIN_COOKIE, { path: "/" });
  throw event.redirect(303, "/admin/connexion");
});

export default component$(() => {
  const loaded = useAuthors();
  const createAuthor = useCreateAuthor();
  const updateAuthor = useUpdateAuthor();
  const deleteAuthor = useDeleteAuthor();
  const logout = useLogout();
  const authorImages = useSignal<Record<string, string>>({});
  const uploadMessage = useSignal("");
  const replaceAuthorImage = $(async (event: Event, authorId: string) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("kind", "author");
    form.append("authorId", authorId);
    form.append("file", file);
    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: form,
      });
      const result = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        uploadMessage.value = result.error || `Upload impossible (${response.status})`;
        return;
      }
      authorImages.value = { ...authorImages.value, [authorId]: result.url };
      uploadMessage.value = "Image de l'auteur mise à jour";
    } catch (error) {
      console.error("Erreur changement image auteur:", error);
      uploadMessage.value = "Le serveur est inaccessible pendant l'upload";
    }
    input.value = "";
  });
  const authorList = useSignal([...loaded.value]);
  const editingAuthor = useSignal<string | null>(null);
  const authorNames = useSignal<Record<string, string>>(
    Object.fromEntries(
      authorList.value.map((author) => [author.id, author.name]),
    ),
  );
  const editAuthor = $((id: string) => {
    editingAuthor.value = id;
  });
  const saveAuthor = $((event: SubmitEvent, form: HTMLFormElement) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const id = String(values.id);
    const name = String(values.name || "").trim();
    if (!name) return;
    const duplicate = authorList.value.some(
      (author) => author.id !== id && author.name === name,
    );
    if (duplicate) {
      window.alert("Cet auteur existe déjà.");
      return;
    }
    void updateAuthor.submit({ id, name });
    authorNames.value = { ...authorNames.value, [id]: name };
    authorList.value = authorList.value.map((author) =>
      author.id === id ? { ...author, name } : author,
    );
    editingAuthor.value = null;
  });
  const submitDelete = $((id: string) => {
    const author = authorList.value.find((item) => item.id === id);
    if (
      !author ||
      !window.confirm(
        `Supprimer ${author.name} et tous ses livres ?\n\nCette action supprimera aussi son dossier biblio.`,
      )
    ) {
      return;
    }
    void deleteAuthor.submit({ id });
    authorList.value = authorList.value.filter((author) => author.id !== id);
  });

  return (
    <main
      data-admin
      class="admin-shell min-h-screen bg-[#f4f1ea] px-5 py-8 text-[#1d211d] md:px-10"
    >
      <div class="mx-auto w-full max-w-[1800px]">
        <header class="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-[#1d211d] pb-5">
          <div>
            <p class="mb-2 text-xs uppercase tracking-[0.25em] text-[#6e746d]">
              Administration
            </p>
            <h1 class="font-serif text-4xl font-bold">Auteurs</h1>
          </div>
          <div class="flex items-center gap-4 text-sm">
            <a href="/" class="underline underline-offset-4">
              Voir le site
            </a>
            <Form action={logout}>
              <button
                type="submit"
                class="cursor-pointer underline underline-offset-4"
              >
                Déconnexion
              </button>
            </Form>
          </div>
        </header>
        <section class="mb-10 border border-[#1d211d] bg-[#fbfaf6] p-5 md:p-7">
          <Form action={createAuthor} class="flex max-w-xl items-center gap-3">
            <input
              name="name"
              required
              placeholder="Ajouter un auteur"
              class="min-w-0 flex-1 border border-[#1d211d] bg-transparent px-3 py-3"
            />
            <button
              type="submit"
              title="Ajouter l'auteur"
              aria-label="Ajouter l'auteur"
              class="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center bg-[#1d211d] text-2xl leading-none text-white hover:bg-[#3d493d]"
            >
              +
            </button>
          </Form>
          {createAuthor.value?.invalid && (
            <p class="mt-3 text-sm text-red-800">
              Le nom de l'auteur est obligatoire.
            </p>
          )}
          {createAuthor.value?.duplicate && (
            <p class="mt-3 text-sm text-red-800">
              Cet auteur existe déjà.
            </p>
          )}
        </section>
        <section class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {authorList.value.map((author) => (
            <article
              key={author.id}
              class="border border-[#1d211d] bg-[#fbfaf6] p-3"
            >
              <div class="flex items-center gap-3">
                <label
                  class="group relative block h-14 w-11 shrink-0 cursor-pointer overflow-hidden"
                  title="Changer l'image"
                  aria-label={`Changer l'image de ${author.name}`}
                >
                  <img
                    src={authorImages.value[author.id] || author.image}
                    alt={`Portrait de ${author.name}`}
                    width="44"
                    height="56"
                    class="h-14 w-11 object-cover transition group-hover:opacity-60"
                  />
                  <span class="absolute inset-0 flex items-center justify-center bg-black/0 text-2xl leading-none text-white opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100">
                    ↻
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    class="sr-only"
                    onChange$={(event) => replaceAuthorImage(event, author.id)}
                  />
                </label>
                {editingAuthor.value === author.id ? (
                  <form
                    preventdefault:submit
                    onSubmit$={saveAuthor}
                    class="flex min-w-0 flex-1 items-center gap-2"
                  >
                    <input type="hidden" name="id" value={author.id} />
                    <input
                      name="name"
                      value={authorNames.value[author.id] || author.name}
                      required
                      aria-label={`Nom de ${author.name}`}
                      class="min-w-0 flex-1 border border-[#1d211d] bg-transparent px-2 py-1 font-serif text-lg"
                    />
                    <button
                      type="submit"
                      title="Enregistrer le nom"
                      aria-label="Enregistrer le nom"
                      class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center border border-[#1d211d]"
                    >
                      ✓
                    </button>
                  </form>
                ) : (
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1">
                      <h2 class="truncate font-serif text-lg font-bold">
                        {author.name}
                      </h2>
                      <button
                        type="button"
                        title="Modifier le nom"
                        aria-label={`Modifier le nom de ${author.name}`}
                        class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center text-base hover:bg-[#1d211d] hover:text-white"
                        onClick$={() => editAuthor(author.id)}
                      >
                        ✎
                      </button>
                    </div>
                    <p class="text-[10px] uppercase tracking-widest text-[#6e746d]">
                      {author.bookCount} {author.bookCount > 1 ? "livres" : "livre"}
                    </p>
                  </div>
                )}
                <a
                  href={`/admin/livres?author=${author.id}`}
                  title="Gérer ses livres"
                  aria-label={`Gérer les livres de ${author.name}`}
                  class="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-lg leading-none text-[#1d211d] hover:bg-[#1d211d] hover:text-white"
                >
                  📚
                </a>
                <button
                  type="button"
                  title={`Supprimer ${author.name} et ses livres`}
                  aria-label={`Supprimer ${author.name} et ses livres`}
                  class="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center border border-red-900 text-xl leading-none text-red-900 hover:bg-red-900 hover:text-white"
                  onClick$={() => submitDelete(author.id)}
                >
                  ×
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
});

export const head: DocumentHead = { title: "Auteurs - Administration" };
