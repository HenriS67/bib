import { component$, useSignal } from "@builder.io/qwik";
import { useLocation, useNavigate } from "@builder.io/qwik-city";

export const SearchBar = component$(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = useSignal(
    new URLSearchParams(location.url.search).get("q") || "",
  );

  return (
    <form
      action="/recherche/"
      method="get"
      class="flex w-full items-center rounded-xl border border-black bg-white px-3"
    >
        <input
          type="text"
          name="q"
          placeholder="Rechercher auteur, titre..."
          value={query.value}
          onInput$={(e) => {
            const value = (e.target as HTMLInputElement).value;
            query.value = value;
            navigate(
              value.trim()
                ? `/recherche/?q=${encodeURIComponent(value)}`
                : "/",
            );
          }}
          class="min-w-0 flex-1 bg-transparent px-1 py-2 font-serif text-sm placeholder:text-gray-400 focus:outline-none"
        />
        <button
          type="submit"
          class="px-1 py-2 text-lg leading-none text-black transition hover:text-gray-500"
        >
          🔍
        </button>
    </form>
  );
});
