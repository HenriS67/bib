import { $, component$, type QRL, useSignal } from "@builder.io/qwik";

interface SortControlProps {
  onSortChange$: QRL<(ascending: boolean) => void>;
}

export const SortControl = component$<SortControlProps>(({ onSortChange$ }) => {
  const isAscending = useSignal(true);

  const toggleSort = $(() => {
    isAscending.value = !isAscending.value;
    void onSortChange$(isAscending.value);
  });

  return (
    <div class="flex items-center pb-2">
      <button
        onClick$={toggleSort}
        class="font-serif text-sm leading-none text-black hover:text-gray-500"
      >
        {isAscending.value ? "A → Z" : "Z → A"}
      </button>
    </div>
  );
});
