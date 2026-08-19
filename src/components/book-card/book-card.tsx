import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import type { Book } from "~/types";

interface BookCardProps {
  book: Book;
}

export const BookCard = component$<BookCardProps>(({ book }) => {
  return (
    <Link href={`/livres/${book.id}`} class="block group">
      <div class="border-t border-gray-400 bg-transparent px-1 py-4 transition hover:bg-white md:px-3 md:py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
        <div class="flex-1 min-w-0">
          <h3 class="font-serif text-lg font-bold text-black md:text-xl">
            {book.title}
          </h3>
        </div>
        <div class="flex items-center justify-between md:justify-end gap-4 md:gap-6 flex-shrink-0">
          <span class="text-xs uppercase tracking-widest text-gray-500">{book.pages} pages</span>
          <div class="flex items-center gap-2 text-lg">
            <span title="PDF">📄</span>
            <span title="Lire" class="group-hover:translate-x-1 transition">→</span>
          </div>
        </div>
      </div>
    </Link>
  );
});
