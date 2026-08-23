import { $, component$, useSignal } from "@builder.io/qwik";
import {
  routeLoader$,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { readLibrary } from "~/data/library";
import { isAdmin } from "~/lib/admin-auth";

export const useAuthors = routeLoader$(async ({ request, redirect }) => {
  if (!(await isAdmin(request))) throw redirect(302, "/admin/connexion");
  const { authors: authorList } = await readLibrary();
  return authorList;
});

export default component$(() => {
  const loaded = useAuthors();
  const authorMessage = useSignal("");
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
  const logout = $(async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.assign("/admin/connexion");
  });
  const createAuthor = $(async (form: HTMLFormElement) => {
    const name = String(new FormData(form).get("name") || "").trim();
    if (!name) return;
    const response = await fetch("/api/admin/authors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const result = await response.json().catch(() => ({})) as { author?: { id: string; name: string; image: string; bookCount: number }; error?: string };
    if (!response.ok || !result.author) {
      authorMessage.value = result.error || "Ajout impossible";
      return;
    }
    authorList.value = [...authorList.value, result.author];
    authorNames.value = { ...authorNames.value, [result.author.id]: result.author.name };
    authorMessage.value = "Auteur ajoute";
    form.reset();
  });
  const saveAuthor = $(async (form: HTMLFormElement) => {
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
    const response = await fetch("/api/admin/authors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      authorMessage.value = result.error || "Modification impossible";
      return;
    }
    authorNames.value = { ...authorNames.value, [id]: name };
    authorList.value = authorList.value.map((author) =>
      author.id === id ? { ...author, name } : author,
    );
    editingAuthor.value = null;
    authorMessage.value = "Auteur modifie";
  });
  const submitDelete = $(async (id: string) => {
    const author = authorList.value.find((item) => item.id === id);
    if (
      !author ||
      !window.confirm(
        `Supprimer ${author.name} et tous ses livres ?\n\nCette action supprimera aussi son dossier biblio.`,
      )
    ) {
      return;
    }
    const response = await fetch("/api/admin/authors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      authorMessage.value = result.error || "Suppression impossible";
      return;
    }
    authorList.value = authorList.value.filter((author) => author.id !== id);
    authorMessage.value = "Auteur supprime";
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
            <button type="button" class="cursor-pointer underline underline-offset-4" onClick$={logout}>Déconnexion</button>
          </div>
        </header>
        <section class="mb-10 border border-[#1d211d] bg-[#fbfaf6] p-5 md:p-7">
          <form preventdefault:submit onSubmit$={(_, form) => createAuthor(form)} class="flex max-w-xl items-center gap-3">
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
          </form>
          {authorMessage.value && <p class="mt-3 text-sm text-red-800">{authorMessage.value}</p>}
        </section>
        <section class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {authorList.value.map((author) => (
            <article
              key={author.id}
              class="border border-[#1d211d] bg-[#fbfaf6] p-3"
            >
              <div class="flex items-center gap-3">
                <form action="/api/admin/author-photo" method="post" enctype="multipart/form-data" class="group relative block h-14 w-11 shrink-0 cursor-pointer overflow-hidden" title={`Changer l'image de ${author.name}`}>
                  <input type="hidden" name="authorId" value={author.id} />
                  <label class="block h-full cursor-pointer" aria-label={`Changer l'image de ${author.name}`}>
                    <img src={author.image} alt={`Portrait de ${author.name}`} width="44" height="56" class="h-full w-full object-cover transition group-hover:opacity-60" />
                    <span class="absolute inset-0 flex items-center justify-center bg-black/0 text-lg leading-none text-white opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100">↻</span>
                    <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required class="sr-only" data-author-photo />
                  </label>
                </form>
                {editingAuthor.value === author.id ? (
                  <form
                    preventdefault:submit
                    onSubmit$={(_, form) => saveAuthor(form)}
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
      <script dangerouslySetInnerHTML={`document.addEventListener("change", (event) => { const input = event.target; if (input instanceof HTMLInputElement && input.matches("input[data-author-photo]") && input.files?.length) input.form?.requestSubmit(); });`} />
    </main>
  );
});

export const head: DocumentHead = { title: "Auteurs - Administration" };
