import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import type { Author } from "~/types";

interface AuthorCardProps {
  author: Author;
}

export const AuthorCard = component$<AuthorCardProps>(({ author }) => {
  return (
    <Link href={`/auteurs/${author.id}`} class="block group">
      <div class="flex flex-col gap-4 rounded-lg border border-black bg-white px-4 py-3 transition hover:bg-gray-100 md:flex-row md:items-center md:gap-5 md:px-5 md:py-2">
        {/* Image - top on mobile, left on desktop */}
        <div class="flex justify-center md:justify-start flex-shrink-0">
          <div class="overflow-hidden bg-gray-200">
            <img
              src={author.image}
              alt={author.name}
              class="h-20 w-16 object-cover grayscale transition group-hover:grayscale-0 md:h-24 md:w-16"
            />
          </div>
        </div>

        {/* Text content */}
        <div class="flex flex-1 flex-col justify-start text-center md:text-left">
          <h3 class="mb-1 font-serif text-xl font-bold text-black md:text-2xl">
            {author.name}
          </h3>
          <p class="text-xs uppercase tracking-widest text-gray-500">
            {author.bookCount} {author.bookCount > 1 ? "œuvres" : "œuvre"}
          </p>
        </div>
      </div>
    </Link>
  );
});
