import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { SearchBar } from "~/components/search-bar/search-bar";

export const Header = component$(() => {
  return (
    <header class="fixed inset-x-0 top-0 z-50 border-b border-gray-300 bg-white">
      <div class="mx-auto max-w-[520px] px-5 py-5 md:py-8">
        <div class="flex items-center gap-5 md:gap-7">
          {/* Logo and title - left side */}
          <Link href="/" class="shrink-0 text-center">
            <img
              src="/logo-ange.png"
              alt=""
              class="mx-auto mb-1 h-16 w-16 object-contain md:h-20 md:w-20"
            />
            <h1 class="font-serif text-xl font-bold tracking-tight text-black md:text-2xl">
              Bibliothèque
            </h1>
          </Link>

          {/* Search bar - right side */}
          <div class="min-w-0 flex-1">
            <SearchBar />
          </div>
        </div>
      </div>
    </header>
  );
});
