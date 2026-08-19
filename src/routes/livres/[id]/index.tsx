import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { Header } from "~/components/header/header";
import { BackButton } from "~/components/back-button/back-button";
import { PdfViewer } from "~/components/pdf-viewer/pdf-viewer";
import { getBook } from "~/db/queries";

export const useBook = routeLoader$(async ({ params }) => getBook(params.id));

export default component$(() => {
  const book = useBook();
  const bookData = book.value;

  if (!bookData) {
    return (
      <>
        <Header />
        <main class="min-h-screen bg-white">
          <div class="mx-auto max-w-4xl px-4 py-8">
            <BackButton />
            <p class="text-center text-gray-600">Livre non trouvé</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />

      <main class="min-h-screen bg-white">
        <div class="mx-auto max-w-4xl px-4 py-8">
          <BackButton />

          {/* Book header */}
          <div class="mb-8 border-b border-gray-200 pb-6">
            <p class="text-sm text-gray-600">{bookData.authorName}</p>
            <h1 class="font-serif text-4xl font-bold text-black">
              {bookData.title}
            </h1>
            <div class="mt-4 flex items-center gap-4 text-sm text-gray-600">
              <span>📄 PDF</span>
              <span>{bookData.pages} pages</span>
            </div>
          </div>

          {/* PDF Viewer */}
          <div class="mx-auto w-full">
            <PdfViewer src={bookData.pdfUrl} />
          </div>

          {/* Additional info */}
          <div class="mt-8 border-t border-gray-200 pt-6 text-center text-sm text-gray-600">
            <p>
              Lecture du livre "{bookData.title}" par {bookData.authorName}
            </p>
          </div>
        </div>
      </main>
    </>
  );
});

export const head: DocumentHead = ({ url }) => {
  const pathParts = url.pathname.split("/").filter(Boolean);
  return {
    title: pathParts[1] ? "Livre - Bibliothèque" : "Livre non trouvé",
    meta: [
      {
        name: "description",
        content: "Lire un livre de la bibliothèque numérique",
      },
    ],
  };
};
