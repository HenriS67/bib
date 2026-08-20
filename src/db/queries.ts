import { readLibrary } from "~/data/library";

export async function listAuthors() {
  const { authors } = await readLibrary();
  return authors.sort((left, right) => left.name.localeCompare(right.name));
}

export async function getBook(id: string) {
  const { books } = await readLibrary();
  return books.find((book) => book.id === id);
}

export async function getAuthorWithBooks(id: string) {
  const { authors, books } = await readLibrary();
  const author = authors.find((item) => item.id === id);
  if (!author) return null;

  return {
    ...author,
    books: books
      .filter((book) => book.authorId === id)
      .sort((left, right) => left.title.localeCompare(right.title)),
  };
}

export async function searchLibrary(query: string) {
  const term = query.trim().toLocaleLowerCase();
  if (!term) return { authors: [], books: [] };

  const { authors, books } = await readLibrary();
  const matchingAuthors = authors
    .filter((author) => author.name.toLocaleLowerCase().includes(term))
    .sort((left, right) => left.name.localeCompare(right.name));
  const matchingBooks = books
    .filter(
      (book) =>
        book.title.toLocaleLowerCase().includes(term) ||
        book.pdfUrl.toLocaleLowerCase().includes(term),
    )
    .sort((left, right) => left.title.localeCompare(right.title));

  return { authors: matchingAuthors, books: matchingBooks };
}