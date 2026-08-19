import { $, component$ } from "@builder.io/qwik";
import { useNavigate } from "@builder.io/qwik-city";

export const BackButton = component$(() => {
  const navigate = useNavigate();

  const goBack = $(() => navigate(-1));

  return (
    <button
      onClick$={goBack}
      class="mb-6 inline-flex items-center gap-2 border border-black bg-white px-4 py-2 font-serif font-bold text-black hover:bg-gray-50"
    >
      ← Retour
    </button>
  );
});
