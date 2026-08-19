import { asc, eq, ilike, or } from "drizzle-orm";
import { db } from "./client";
import { authors, books } from "./schema";

export async function listAuthors() {
  const rows = await db
    .select({
      id: authors.id,
      name: authors.name,
      image: authors.image,
      bookCount: books.id,
    })
    .from(authors)
    .leftJoin(books, eq(books.authorId, authors.id))
    .orderBy(asc(authors.name));

  return rows.reduce<
    Array<{ id: string; name: string; image: string; bookCount: number }>
  >((result, row) => {
    const author = result.find((item) => item.id === row.id);
    if (author) {
      if (row.bookCount) author.bookCount += 1;
    } else {
      result.push({
        id: row.id,
        name: row.name,
        image: row.image,
        bookCount: row.bookCount ? 1 : 0,
      });
    }
    return result;
  }, []);
}

export async function getBook(id: string) {
  const [result] = await db
    .select({
      id: books.id,
      title: books.title,
      authorId: books.authorId,
      pages: books.pages,
      pdfUrl: books.pdfUrl,
      authorName: authors.name,
    })
    .from(books)
    .innerJoin(authors, eq(books.authorId, authors.id))
    .where(eq(books.id, id));

  return result;
}

export async function getAuthorWithBooks(id: string) {
  const [author] = await db.select().from(authors).where(eq(authors.id, id));
  if (!author) return null;

  return {
    ...author,
    books: await db
      .select()
      .from(books)
      .where(eq(books.authorId, id))
      .orderBy(asc(books.title)),
  };
}

export async function searchLibrary(query: string) {
  const term = query.trim();
  if (!term) return { authors: [], books: [] };

  const pattern = `%${term}%`;
  const matchingAuthors = await db
    .select({ id: authors.id, name: authors.name, image: authors.image })
    .from(authors)
    .where(ilike(authors.name, pattern))
    .orderBy(asc(authors.name));

  const matchingBooks = await db
    .select()
    .from(books)
    .where(or(ilike(books.title, pattern), ilike(books.pdfUrl, pattern)))
    .orderBy(asc(books.title));

  return {
    authors: await Promise.all(
      matchingAuthors.map(async (author) => ({
        ...author,
        bookCount: (await db
          .select({ id: books.id })
          .from(books)
          .where(eq(books.authorId, author.id))).length,
      })),
    ),
    books: matchingBooks,
  };
}