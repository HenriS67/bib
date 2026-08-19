import { $, component$, useSignal } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { Header } from "~/components/header/header";
import { BackButton } from "~/components/back-button/back-button";
import { BookCard } from "~/components/book-card/book-card";
import { SortControl } from "~/components/sort-control/sort-control";
import { getAuthorWithBooks } from "~/db/queries";

export const useAuthor = routeLoader$(async ({ params }) =>
  getAuthorWithBooks(params.id),
);

export default component$(() => {
  const author = useAuthor();
  const authorData = author.value;
  const books = useSignal([...(authorData?.books ?? [])]);

  if (!authorData) {
    return (
      <>
        <Header />
        <main class="min-h-screen bg-white">
          <div class="mx-auto max-w-4xl px-4 py-8">
            <BackButton />
            <p class="text-center text-gray-600">Auteur non trouvé</p>
          </div>
        </main>
      </>
    );
  }

  const handleSort = $((ascending: boolean) => {
    books.value = [...books.value].sort((a, b) => {
      const comparison = a.title.localeCompare(b.title);
      return ascending ? comparison : -comparison;
    });
  });

  return (
    <>
      <Header />

      <main class="min-h-screen bg-white">
        <div class="mx-auto max-w-4xl px-4 py-6 md:py-8">
          <div class="mb-8 flex flex-col items-start gap-4">
            <BackButton />
            
            {/* Author info - compact header */}
            <div class="flex items-start gap-4 md:gap-6 w-full">
              <div class="overflow-hidden rounded-xl flex-shrink-0">
                <img
                  src={authorData.image}
                  alt={authorData.name}
                  class="h-24 w-24 md:h-28 md:w-28 object-cover"
                />
              </div>
              <div class="flex-1 pt-1">
                <h1 class="font-serif text-xl md:text-2xl font-bold text-black">
                  {authorData.name}
                </h1>
                <p class="text-sm text-gray-600">
                  {books.value.length} {books.value.length > 1 ? "œuvres" : "œuvre"}
                </p>
              </div>
            </div>
          </div>

          {/* Sort control */}
          <div class="mb-6">
            <SortControl onSortChange$={handleSort} />
          </div>

          {/* Books list */}
          <div class="space-y-4">
            {books.value.length > 0 ? (
              books.value.map((book) => <BookCard key={book.id} book={book} />)
            ) : (
              <p class="text-center text-gray-600">Aucun livre trouvé</p>
            )}
          </div>
        </div>
      </main>
    </>
  );
});

export const head: DocumentHead = ({ url }) => {
  const pathParts = url.pathname.split("/").filter(Boolean);
  return {
    title: pathParts[1] ? "Auteur - Bibliothèque" : "Auteur non trouvé",
    meta: [
      {
        name: "description",
        content: "Œuvres d’un auteur de la bibliothèque",
      },
    ],
  };
};
