import type { Author, Book } from "~/types";

// SVG placeholder images for authors
const placeholderImage = (name: string) => `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f0f0f0' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' font-size='16' fill='%23333' text-anchor='middle' dominant-baseline='middle' font-family='serif'%3E${encodeURIComponent(name)}%3C/text%3E%3C/svg%3E`;

export const mockAuthors: Author[] = [
  {
    id: "thomas-aquinas",
    name: "Saint Thomas d'Aquin",
    image: placeholderImage("Thomas d'Aquin"),
    bookCount: 6,
  },
  {
    id: "monseigneur-lefebvre",
    name: "Monseigneur Lefebvre",
    image: placeholderImage("Lefebvre"),
    bookCount: 4,
  },
  {
    id: "aristotle",
    name: "Aristote",
    image: placeholderImage("Aristote"),
    bookCount: 5,
  },
  {
    id: "plato",
    name: "Platon",
    image: placeholderImage("Platon"),
    bookCount: 3,
  },
  {
    id: "augustine",
    name: "Saint Augustin",
    image: placeholderImage("Augustin"),
    bookCount: 7,
  },
];

export const mockBooks: Book[] = [
  {
    id: "summa-theologiae",
    title: "Summa Theologiae",
    authorId: "thomas-aquinas",
    pages: 450,
    pdfUrl: "/books/summa-theologiae.pdf",
  },
  {
    id: "summa-contra-gentiles",
    title: "Summa Contra Gentiles",
    authorId: "thomas-aquinas",
    pages: 380,
    pdfUrl: "/books/summa-contra-gentiles.pdf",
  },
  {
    id: "commentary-sentences",
    title: "Commentary on the Sentences",
    authorId: "thomas-aquinas",
    pages: 520,
    pdfUrl: "/books/commentary-sentences.pdf",
  },
  {
    id: "lectures-aristotle",
    title: "Lectures on Aristotle",
    authorId: "thomas-aquinas",
    pages: 280,
    pdfUrl: "/books/lectures-aristotle.pdf",
  },
  {
    id: "disputed-questions",
    title: "Disputed Questions",
    authorId: "thomas-aquinas",
    pages: 340,
    pdfUrl: "/books/disputed-questions.pdf",
  },
  {
    id: "treatise-virtue",
    title: "Treatise on Virtue",
    authorId: "thomas-aquinas",
    pages: 260,
    pdfUrl: "/books/treatise-virtue.pdf",
  },
  {
    id: "ils-lont-decouronné",
    title: "Ils l'ont découronné",
    authorId: "monseigneur-lefebvre",
    pages: 40,
    pdfUrl: "/books/ils-lont-decouronné.pdf",
  },
  {
    id: "retraite-1",
    title: "Retraite",
    authorId: "monseigneur-lefebvre",
    pages: 40,
    pdfUrl: "/books/retraite-1.pdf",
  },
  {
    id: "retraite-2",
    title: "Retraite (Volume II)",
    authorId: "monseigneur-lefebvre",
    pages: 40,
    pdfUrl: "/books/retraite-2.pdf",
  },
  {
    id: "retraite-3",
    title: "Retraite (Volume III)",
    authorId: "monseigneur-lefebvre",
    pages: 40,
    pdfUrl: "/books/retraite-3.pdf",
  },
  {
    id: "metaphysics",
    title: "Métaphysique",
    authorId: "aristotle",
    pages: 350,
    pdfUrl: "/books/metaphysics.pdf",
  },
  {
    id: "nicomachean-ethics",
    title: "Éthique à Nicomaque",
    authorId: "aristotle",
    pages: 300,
    pdfUrl: "/books/nicomachean-ethics.pdf",
  },
  {
    id: "politics",
    title: "Politique",
    authorId: "aristotle",
    pages: 280,
    pdfUrl: "/books/politics.pdf",
  },
  {
    id: "logic",
    title: "Logique",
    authorId: "aristotle",
    pages: 220,
    pdfUrl: "/books/logic.pdf",
  },
  {
    id: "physics",
    title: "Physique",
    authorId: "aristotle",
    pages: 310,
    pdfUrl: "/books/physics.pdf",
  },
];

/**
 * Search through authors and books
 */
export function searchLibrary(query: string): {
  authors: Author[];
  books: Book[];
} {
  const lowerQuery = query.toLowerCase().trim();

  if (!lowerQuery) {
    return { authors: [], books: [] };
  }

  const authors = mockAuthors.filter((author) =>
    author.name.toLowerCase().includes(lowerQuery)
  );

  const books = mockBooks.filter((book) =>
    book.title.toLowerCase().includes(lowerQuery)
  );

  return { authors, books };
}

/**
 * Get author by ID
 */
export function getAuthorById(id: string): Author | undefined {
  return mockAuthors.find((author) => author.id === id);
}

/**
 * Get book by ID
 */
export function getBookById(id: string): Book | undefined {
  return mockBooks.find((book) => book.id === id);
}

/**
 * Get books by author ID
 */
export function getBooksByAuthorId(authorId: string): Book[] {
  return mockBooks.filter((book) => book.authorId === authorId);
}
