import { component$ } from "@builder.io/qwik";

interface PdfViewerProps {
  src: string;
}

export const PdfViewer = component$<PdfViewerProps>(({ src }) => {
  return (
    <iframe
      src={src}
      title="Lecture du PDF"
      class="h-[75vh] min-h-[520px] w-full rounded border border-black"
    />
  );
});
