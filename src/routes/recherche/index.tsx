import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead, useLocation } from "@builder.io/qwik-city";
import { Header } from "~/components/header/header";
import { BackButton } from "~/components/back-button/back-button";
import { AuthorCard } from "~/components/author-card/author-card";
import { BookCard } from "~/components/book-card/book-card";
import { searchLibrary } from "~/db/queries";

export const useSearchResults = routeLoader$(async ({ url }) =>
  searchLibrary(url.searchParams.get("q") || ""),
);

export default component$(() => {
  const location = useLocation();
  const query = new URLSearchParams(location.url.search).get("q") || "";
  const results = useSearchResults();

  return (
    <>
      <Header />

      <main class="min-h-screen bg-white">
        <div class="mx-auto max-w-4xl px-4 py-8">
          <BackButton />

          <div class="mb-8">
            <h1 class="font-serif text-3xl font-bold text-black">
              Résultats de recherche
            </h1>
            <p class="mt-2 text-gray-600">
              {query ? `Pour : "${query}"` : "Aucun terme de recherche"}
            </p>
          </div>

          {/* Authors results */}
          {results.value.authors.length > 0 && (
            <section class="mb-12">
              <h2 class="mb-6 font-serif text-2xl font-bold text-black">
                Auteurs ({results.value.authors.length})
              </h2>
              <div class="space-y-4">
                {results.value.authors.map((author) => (
                  <AuthorCard key={author.id} author={author} />
                ))}
              </div>
            </section>
          )}

          {/* Books results */}
          {results.value.books.length > 0 && (
            <section class="mb-12">
              <h2 class="mb-6 font-serif text-2xl font-bold text-black">
                Livres ({results.value.books.length})
              </h2>
              <div class="space-y-4">
                {results.value.books.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            </section>
          )}

          {/* No results */}
          {results.value.authors.length === 0 && results.value.books.length === 0 && (
            <div class="text-center">
              <p class="text-lg text-gray-600">
                Aucun résultat trouvé
                {query ? ` pour "${query}"` : ""}
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
});

export const head: DocumentHead = () => {
  // Return static head for search page
  return {
    title: "Recherche - Bibliothèque",
    meta: [
      {
        name: "description",
        content: "Rechercher dans la bibliothèque",
      },
    ],
  };
};
