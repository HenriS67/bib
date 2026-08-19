import { $, component$, useSignal } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { Header } from "~/components/header/header";
import { AuthorCard } from "~/components/author-card/author-card";
import { SortControl } from "~/components/sort-control/sort-control";
import { listAuthors } from "~/db/queries";

export const useAuthors = routeLoader$(async () => listAuthors());

export default component$(() => {
  const loadedAuthors = useAuthors();
  const authors = useSignal([...loadedAuthors.value]);

  const handleSort = $((ascending: boolean) => {
    authors.value = [...authors.value].sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return ascending ? comparison : -comparison;
    });
  });

  return (
    <>
      <Header />

      <main class="min-h-screen bg-white">
        <div class="mx-auto max-w-[520px] px-5 py-7 md:py-8">
          <div class="mb-4 flex items-end justify-between gap-4">
            <div>
              <p class="hidden">Catalogue</p>
              <h2 class="sr-only">Auteurs</h2>
            </div>
            <span class="pb-1 font-serif text-sm text-gray-500">{authors.value.length} noms</span>
          </div>
          {/* Sort control */}
          <div class="mb-2 flex items-center gap-4">
            <SortControl onSortChange$={handleSort} />
          </div>

          {/* Authors list - vertical stack with gaps */}
          <div class="space-y-3">
            {authors.value.map((author) => (
              <AuthorCard key={author.id} author={author} />
            ))}
          </div>
        </div>
      </main>
    </>
  );
});

export const head: DocumentHead = {
  title: "Bibliothèque",
  meta: [
    {
      name: "description",
      content: "Une bibliothèque numérique classique et minimaliste",
    },
  ],
};
