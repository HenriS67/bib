import { $, component$, useSignal } from "@builder.io/qwik";
import {
  Form,
  routeAction$,
  routeLoader$,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { readLibrary, removeBookFolder, updateBookJson } from "~/data/library";
import { ADMIN_COOKIE, isAdmin } from "~/lib/admin-auth";

export const useBooks = routeLoader$(async ({ request, redirect, url }) => {
  if (!(await isAdmin(request))) throw redirect(302, "/admin/connexion");
  const selectedAuthorId = url.searchParams.get("author");
  if (!selectedAuthorId) throw redirect(302, "/admin/auteurs");
  const { books, authors } = await readLibrary();
  return {
    books: books.filter((book) => book.authorId === selectedAuthorId),
    authors: authors.filter((author) => author.id === selectedAuthorId),
    selectedAuthorId,
  };
});

export const useCreateBook = routeAction$(async (input, event) => {
  if (!(await isAdmin(event.request))) throw event.redirect(302, "/admin/connexion");
  const title = String(input.title || "").trim();
  const authorId = String(input.authorId || "").trim();
  if (!title || !authorId) return { invalid: true };
  const id = String(input.id || `${authorId}-${Date.now()}`);
  const origin = String(input.origin || "Monsieur Leroux").trim();
  const pages = Number(input.pages || 0);
  const pdfUrl = String(input.pdfUrl || "").trim();
  return { created: { id, title, authorId, origin, pages, pdfUrl } };
});

export const useUpdateBook = routeAction$(async (input, event) => {
  if (!(await isAdmin(event.request))) throw event.redirect(302, "/admin/connexion");
  const id = String(input.id || "").trim();
  const title = String(input.title || "").trim();
  if (!id || !title) return { invalid: true };
  await updateBookJson(id, {
    titre: title,
    origine: String(input.origin || "Monsieur Leroux").trim(),
    nombre_pages: Number(input.pages || 0),
  });
  return {
    updated: {
      id,
      title,
      origin: String(input.origin || "Monsieur Leroux").trim(),
      pages: Number(input.pages || 0),
      pdfUrl: String(input.pdfUrl || "").trim(),
    },
  };
});

export const useDeleteBook = routeAction$(async ({ id }, event) => {
  if (!(await isAdmin(event.request))) throw event.redirect(302, "/admin/connexion");
  const bookId = String(id);
  await removeBookFolder(bookId);
  return { deleted: bookId };
});

export const useLogout = routeAction$((_, event) => {
  event.cookie.delete(ADMIN_COOKIE, { path: "/" });
  throw event.redirect(303, "/admin/connexion");
});

export default component$(() => {
  const loaded = useBooks();
  const updateBook = useUpdateBook();
  const deleteBook = useDeleteBook();
  const logout = useLogout();
  const bookList = useSignal([...loaded.value.books]);
  const editingBook = useSignal<string | null>(null);
  const uploadMessage = useSignal("");
  const selectedTitles = useSignal<Record<string, string>>({});
  const setTitleFromFile = $((event: Event, authorId: string) => {
    const input = event.target as HTMLInputElement;
    const fileName = input.files?.[0]?.name;
    if (!fileName) return;
    const title = fileName
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .trim();
    selectedTitles.value = { ...selectedTitles.value, [authorId]: title };
  });
  const submitBook = $(async (event: SubmitEvent, form: HTMLFormElement, authorId: string) => {
    event.preventDefault();
    uploadMessage.value = "";
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      uploadMessage.value = "Choisissez un PDF";
      return;
    }
    const uploadData = new FormData();
    uploadData.append("kind", "book");
    uploadData.append("authorId", authorId);
    uploadData.append("file", file);
    const formData = new FormData(form);
    const title = String(formData.get("title") || "").trim();
    if (!title) {
      uploadMessage.value = "Indiquez un titre";
      return;
    }
    uploadData.append("title", title);
    uploadData.append("origin", String(formData.get("origin") || "Monsieur Leroux"));
    uploadData.append("pages", String(formData.get("pages") || 0));
    const response = await fetch("/api/admin/upload", {
      method: "POST",
      body: uploadData,
    });
    const result = await response.json();
    if (!response.ok) {
      uploadMessage.value = result.error || "Upload impossible";
      return;
    }
    const id = `${authorId}-${title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`;
    bookList.value = [
      ...bookList.value,
      {
        id,
        title,
        authorId,
        origin: String(new FormData(form).get("origin") || "Monsieur Leroux"),
        pages: Number(new FormData(form).get("pages") || 0),
        pdfUrl: result.url,
        authorName: loaded.value.authors.find((author) => author.id === authorId)?.name || "",
      },
    ];
    form.reset();
    selectedTitles.value = { ...selectedTitles.value, [authorId]: "" };
  });
  const addBook = $((event: SubmitEvent, form: HTMLFormElement, authorId: string) => {
    void submitBook(event, form, authorId);
  });
  const submitUpdate = $((event: SubmitEvent, form: HTMLFormElement) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const id = String(values.id);
    const updated = {
      id,
      title: String(values.title),
      origin: String(values.origin || "Monsieur Leroux"),
      pages: Number(values.pages || 0),
      pdfUrl: String(values.pdfUrl || ""),
      authorId: bookList.value.find((book) => book.id === id)?.authorId || "",
      authorName: bookList.value.find((book) => book.id === id)?.authorName || "",
    };
    void updateBook.submit(values);
    bookList.value = bookList.value.map((book) => book.id === id ? updated : book);
    editingBook.value = null;
  });
  const editBook = $((id: string) => {
    editingBook.value = id;
  });
  const submitDelete = $((id: string) => {
    void deleteBook.submit({ id });
    bookList.value = bookList.value.filter((book) => book.id !== id);
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
            <h1 class="font-serif text-4xl font-bold">Livres</h1>
          </div>
          <div class="flex items-center gap-4 text-sm">
            <a href="/admin/auteurs" class="underline underline-offset-4">
              Auteurs
            </a>
            <a href="/" class="underline underline-offset-4">
              Voir le site
            </a>
            <Form action={logout}>
              <button type="submit" class="cursor-pointer underline underline-offset-4">
                Déconnexion
              </button>
            </Form>
          </div>
        </header>
        <p class="mb-8 text-sm text-[#6e746d]">
          Livres de l'auteur sélectionné
        </p>
        <div class="grid gap-6">
          {loaded.value.authors.map((author) => {
            const authorBooks = bookList.value.filter(
              (book) => book.authorId === author.id,
            );
            return (
              <section
                key={author.id}
                class="border border-[#1d211d] bg-[#fbfaf6] p-5 md:p-7"
              >
                <div class="mb-6 flex items-baseline justify-between gap-4 border-b border-[#b9b5ac] pb-4">
                  <h2 class="font-serif text-2xl font-bold">{author.name}</h2>
                  <span class="text-xs uppercase tracking-widest text-[#6e746d]">
                    {authorBooks.length}
                  </span>
                </div>
                <form preventdefault:submit onSubmit$={(event, form) => addBook(event, form, author.id)} class="grid gap-3 sm:grid-cols-[44px_minmax(0,2fr)_minmax(0,1fr)_100px_auto]" enctype="multipart/form-data">
                  <input type="hidden" name="authorId" value={author.id} />
                  <label for={`pdf-${author.id}`} title="Choisir un PDF" aria-label="Choisir un PDF" class="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center border border-[#1d211d] text-xl hover:bg-[#1d211d] hover:text-white">
                    ↑
                    <input id={`pdf-${author.id}`} type="file" name="file" accept="application/pdf,.pdf" required class="sr-only" onChange$={(event) => setTitleFromFile(event, author.id)} />
                  </label>
                  <input name="title" value={selectedTitles.value[author.id] || ""} required placeholder="Titre" class="min-w-0 border border-[#1d211d] bg-transparent px-3 py-3" />
                  <input name="origin" defaultValue="Monsieur Leroux" placeholder="Origine" class="min-w-0 border border-[#1d211d] bg-transparent px-3 py-3" />
                  <input name="pages" type="number" min="0" placeholder="Pages" class="min-w-0 border border-[#1d211d] bg-transparent px-3 py-3" />
                  <button
                    type="submit"
                    title="Ajouter le livre"
                    aria-label={`Ajouter le livre de ${author.name}`}
                    class="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center bg-[#1d211d] text-2xl leading-none text-white hover:bg-[#3d493d]"
                  >
                    +
                  </button>
                </form>
                {uploadMessage.value && <p class="mt-2 text-sm text-red-800">{uploadMessage.value}</p>}
                <div class="mt-7 space-y-3 border-t border-[#b9b5ac] pt-5">
                  <div class="grid min-w-0 grid-cols-[minmax(0,2fr)_minmax(0,1fr)_80px_76px] gap-2 px-1 text-xs uppercase tracking-widest text-[#6e746d]">
                    <span>Titre</span>
                    <span>Origine</span>
                    <span>Pages</span>
                    <span class="text-center">Actions</span>
                  </div>
                  {authorBooks.map((book) => (
                    <div key={book.id} class="grid min-w-0 items-center gap-2 border-b border-[#d4d0c7] pb-4 grid-cols-[minmax(0,2fr)_minmax(0,1fr)_80px_36px_36px]">
                      {editingBook.value === book.id ? <form preventdefault:submit onSubmit$={submitUpdate} class="contents"><input type="hidden" name="id" value={book.id} /><input name="title" value={book.title} required class="min-w-0 border border-[#b9b5ac] bg-transparent px-2 py-2 font-serif" /><input name="origin" value={book.origin} class="min-w-0 border border-[#b9b5ac] bg-transparent px-2 py-2" /><input name="pages" type="number" min="0" value={book.pages} class="min-w-0 border border-[#b9b5ac] bg-transparent px-2 py-2" /><button type="submit" title="Enregistrer" aria-label={`Enregistrer ${book.title}`} class="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center border border-[#1d211d] text-lg leading-none hover:bg-[#1d211d] hover:text-white">✓</button></form> : <><span class="min-w-0 truncate font-serif">{book.title}</span><span class="min-w-0 truncate text-sm text-[#6e746d]">{book.origin}</span><span class="text-sm text-[#6e746d]">{book.pages}</span><button type="button" title="Modifier le livre" aria-label={`Modifier ${book.title}`} class="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-lg hover:bg-[#1d211d] hover:text-white" onClick$={() => editBook(book.id)}>✎</button></>}
                      <button
                        type="button"
                        title="Supprimer"
                        aria-label={`Supprimer ${book.title}`}
                        class="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center border border-red-900 text-xl leading-none text-red-900 hover:bg-red-900 hover:text-white"
                        onClick$={() => submitDelete(book.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
});

export const head: DocumentHead = { title: "Livres - Administration" };
