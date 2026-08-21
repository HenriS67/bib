import { mkdir, readdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const libraryRoot = join(process.cwd(), "public", "biblio");

type AuthorJson = { nom?: string; image?: string };
type BookJson = {
  titre?: string;
  auteur?: string;
  origine?: string;
  nombre_pages?: number;
  fichier_original?: string;
};

export type LibraryAuthor = {
  id: string;
  name: string;
  image: string;
  bookCount: number;
};

export type LibraryBook = {
  id: string;
  title: string;
  origin: string;
  authorId: string;
  pages: number;
  pdfUrl: string;
  authorName: string;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function authorFolderForId(id: string) {
  const entries = await readdir(libraryRoot, { withFileTypes: true });
  return entries.find(
    (entry) => entry.isDirectory() && slugify(entry.name) === id.toLowerCase(),
  )?.name;
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

async function findBookFolders(dir: string): Promise<Array<{ dir: string; pdfName: string }>> {
  const entries = await readdir(dir, { withFileTypes: true });
  const pdf = entries.find(
    (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"),
  );
  const result: Array<{ dir: string; pdfName: string }> = [];
  if (pdf && (await readJson<BookJson>(join(dir, "book.json")))) {
    result.push({ dir, pdfName: pdf.name });
  }
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith(".")) {
      result.push(...(await findBookFolders(join(dir, entry.name))));
    }
  }
  return result;
}

export async function readLibrary() {
  const authorEntries = await readdir(libraryRoot, { withFileTypes: true });
  const authors: LibraryAuthor[] = [];
  const books: LibraryBook[] = [];

  for (const authorEntry of authorEntries) {
    if (!authorEntry.isDirectory() || authorEntry.name.startsWith(".")) continue;
    const authorId = slugify(authorEntry.name);
    const authorPath = join(libraryRoot, authorEntry.name);
    const authorJson = await readJson<AuthorJson>(join(authorPath, "author.json"));
    if (!authorJson?.nom) continue;
    const authorBooks = await findBookFolders(authorPath);
    authors.push({
      id: authorId,
      name: authorJson.nom,
      image: authorJson.image || "/favicon.svg",
      bookCount: authorBooks.length,
    });

    for (const bookFolder of authorBooks) {
      const bookJson = await readJson<BookJson>(join(bookFolder.dir, "book.json"));
      if (!bookJson?.titre) continue;
      const relativePath = relative(libraryRoot, join(bookFolder.dir, bookFolder.pdfName))
        .split("\\")
        .join("/");
      const bookId = `${authorId}-${slugify(relative(authorPath, bookFolder.dir) || bookFolder.pdfName)}`;
      books.push({
        id: bookId,
        title: bookJson.titre,
        origin: bookJson.origine || "Monsieur Leroux",
        authorId,
        pages: bookJson.nombre_pages || 0,
        pdfUrl: `/biblio/${encodeURI(relativePath)}`,
        authorName: authorJson.nom,
      });
    }
  }

  return { authors, books };
}

async function findBookFolder(id: string) {
  const authorEntries = await readdir(libraryRoot, { withFileTypes: true });
  for (const authorEntry of authorEntries) {
    if (!authorEntry.isDirectory()) continue;
    const authorId = slugify(authorEntry.name);
    const authorPath = join(libraryRoot, authorEntry.name);
    const folders = await findBookFolders(authorPath);
    for (const folder of folders) {
      const bookId = `${authorId}-${slugify(relative(authorPath, folder.dir) || folder.pdfName)}`;
      if (bookId === id) return folder.dir;
    }
  }
  return null;
}

export async function updateBookJson(id: string, data: Pick<BookJson, "titre" | "origine" | "nombre_pages">) {
  const folder = await findBookFolder(id);
  if (!folder) return false;
  const current = (await readJson<BookJson>(join(folder, "book.json"))) || {};
  await writeFile(join(folder, "book.json"), JSON.stringify({ ...current, ...data }, null, 2) + "\n");
  return true;
}

export async function removeBookFolder(id: string) {
  const folder = await findBookFolder(id);
  if (!folder) return false;
  await rm(folder, { recursive: true, force: true });
  return true;
}

export async function createAuthorFolder(id: string, name: string) {
  const folder = join(libraryRoot, id);
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, "author.json"), JSON.stringify({ nom: name, image: "/favicon.svg" }, null, 2) + "\n");
}

export async function updateAuthorJson(id: string, name: string) {
  const folderName = await authorFolderForId(id);
  if (!folderName) throw new Error(`Dossier auteur introuvable : ${id}`);
  const folder = join(libraryRoot, folderName);
  const current = (await readJson<AuthorJson>(join(folder, "author.json"))) || {};
  await writeFile(join(folder, "author.json"), JSON.stringify({ ...current, nom: name }, null, 2) + "\n");
}

export async function updateAuthorImageJson(id: string, image: string) {
  const folderName = await authorFolderForId(id);
  if (!folderName) throw new Error(`Dossier auteur introuvable : ${id}`);
  const folder = join(libraryRoot, folderName);
  const current = (await readJson<AuthorJson>(join(folder, "author.json"))) || {};
  await writeFile(join(folder, "author.json"), JSON.stringify({ ...current, image }, null, 2) + "\n");
  const previousImage = current.image;
  if (previousImage?.startsWith("/biblio/")) {
    const libraryPath = resolve(process.cwd(), "public", decodeURIComponent(previousImage.slice(1)));
    const authorRoot = resolve(folder);
    if (libraryPath.startsWith(`${authorRoot}/`)) {
      await unlink(libraryPath).catch(() => undefined);
    }
  }
}

export async function removeAuthorFolder(id: string) {
  const folderName = await authorFolderForId(id);
  if (folderName) await rm(join(libraryRoot, folderName), { recursive: true, force: true });
}
