import { mkdir, readdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { deleteR2Keys, getR2ObjectText, listR2Keys, r2PublicUrl, uploadTextToR2 } from "~/lib/r2";

const libraryRoot = join(process.cwd(), "public", "biblio");

type AuthorJson = { nom?: string; image?: string };
type BookJson = {
  titre?: string;
  auteur?: string;
  origine?: string;
  nombre_pages?: number;
  fichier_original?: string;
};

type R2Catalog = {
  authors: LibraryAuthor[];
  books: LibraryBook[];
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

function nameFromFolder(folder: string) {
  return folder.replace(/[-_]+/g, " ").trim();
}

function r2AssetUrl(url: string) {
  return url.startsWith("/biblio/") ? r2PublicUrl(url.slice(1)) || url : url;
}

async function getR2Catalog() {
  const text = await getR2ObjectText("biblio/catalog.json");
  if (!text) throw new Error("Catalogue R2 introuvable");
  return JSON.parse(text) as R2Catalog;
}

async function saveR2Catalog(catalog: R2Catalog) {
  await uploadTextToR2("biblio/catalog.json", `${JSON.stringify(catalog, null, 2)}\n`);
}

function r2KeyFromCatalogUrl(url: string) {
  if (!url.startsWith("/biblio/")) throw new Error(`URL de livre R2 invalide : ${url}`);
  return url.slice(1);
}

async function authorFolderForId(id: string) {
  const entries = await readdir(libraryRoot, { withFileTypes: true });
  return entries.find(
    (entry) => entry.isDirectory() && slugify(entry.name) === id.toLowerCase(),
  )?.name;
}

export async function findAuthorFolder(id: string) {
  try {
    return await authorFolderForId(id);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const authorJsonKeys = (await listR2Keys("biblio/")).filter((key) => key.endsWith("/author.json"));
  return authorJsonKeys
    .map((key) => key.slice("biblio/".length, -"/author.json".length))
    .find((folder) => slugify(folder) === id.toLowerCase());
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

async function readLibraryFromR2() {
  const catalogText = await getR2ObjectText("biblio/catalog.json");
  if (catalogText) {
    try {
      const catalog = JSON.parse(catalogText) as R2Catalog;
      if (Array.isArray(catalog.authors) && Array.isArray(catalog.books)) {
        return {
          authors: catalog.authors.map((author) => ({ ...author, image: r2AssetUrl(author.image) })),
          books: catalog.books.map((book) => ({ ...book, pdfUrl: r2AssetUrl(book.pdfUrl) })),
        };
      }
    } catch {
      // A missing or invalid generated catalog falls back to the PDF hierarchy.
    }
  }

  const books: LibraryBook[] = [];
  const authorsByFolder = new Map<string, LibraryAuthor>();
  const keys = await listR2Keys("biblio/");

  for (const key of keys) {
    if (!key.toLowerCase().endsWith(".pdf")) continue;
    const relativePath = key.slice("biblio/".length);
    const pathParts = relativePath.split("/");
    const authorFolder = pathParts.shift();
    const pdfName = pathParts.pop();
    if (!authorFolder || !pdfName) continue;

    const authorId = slugify(authorFolder);
    const bookFolder = pathParts.join("/") || pdfName.replace(/\.pdf$/i, "");
    const title = nameFromFolder(bookFolder.split("/").at(-1) || pdfName.replace(/\.pdf$/i, ""));
    const author = authorsByFolder.get(authorFolder) ?? {
      id: authorId,
      name: nameFromFolder(authorFolder),
      image: "/favicon.svg",
      bookCount: 0,
    };
    author.bookCount += 1;
    authorsByFolder.set(authorFolder, author);
    books.push({
      id: `${authorId}-${slugify(bookFolder)}`,
      title,
      origin: "Monsieur Leroux",
      authorId,
      pages: 0,
      pdfUrl: r2PublicUrl(key) || `/${key.split("/").map(encodeURI).join("/")}`,
      authorName: author.name,
    });
  }

  return { authors: [...authorsByFolder.values()], books };
}

export async function readLibrary() {
  let authorEntries;
  try {
    authorEntries = await readdir(libraryRoot, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return readLibraryFromR2();
    }
    throw error;
  }
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
        pdfUrl: r2PublicUrl(`biblio/${relativePath}`) || `/biblio/${encodeURI(relativePath)}`,
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
  try {
    const folder = await findBookFolder(id);
    if (!folder) return false;
    const current = (await readJson<BookJson>(join(folder, "book.json"))) || {};
    await writeFile(join(folder, "book.json"), JSON.stringify({ ...current, ...data }, null, 2) + "\n");
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const catalog = await getR2Catalog();
  const book = catalog.books.find((item) => item.id === id);
  if (!book) return false;
  const pdfKey = r2KeyFromCatalogUrl(book.pdfUrl);
  const bookJsonKey = `${pdfKey.slice(0, pdfKey.lastIndexOf("/"))}/book.json`;
  const current = JSON.parse((await getR2ObjectText(bookJsonKey)) || "{}") as BookJson;
  await uploadTextToR2(bookJsonKey, `${JSON.stringify({ ...current, ...data }, null, 2)}\n`);
  Object.assign(book, { title: data.titre, origin: data.origine || "Monsieur Leroux", pages: data.nombre_pages || 0 });
  await saveR2Catalog(catalog);
  return true;
}

export async function addBookToR2(
  authorId: string,
  authorFolder: string,
  title: string,
  origin: string,
  pages: number,
  fileName: string,
) {
  const authorJson = JSON.parse((await getR2ObjectText(`biblio/${authorFolder}/author.json`)) || "{}") as AuthorJson;
  if (!authorJson.nom) throw new Error(`Auteur R2 introuvable : ${authorId}`);
  const bookFolder = slugify(title);
  const pdfUrl = `/biblio/${authorFolder}/${bookFolder}/${fileName}`;
  const bookJson: BookJson = {
    titre: title,
    origine: origin || "Monsieur Leroux",
    nombre_pages: pages || 0,
    fichier_original: fileName,
  };
  await uploadTextToR2(`biblio/${authorFolder}/${bookFolder}/book.json`, `${JSON.stringify(bookJson, null, 2)}\n`);

  const catalog = await getR2Catalog();
  const book: LibraryBook = {
    id: `${authorId}-${bookFolder}`,
    title,
    origin: bookJson.origine || "Monsieur Leroux",
    authorId,
    pages: bookJson.nombre_pages || 0,
    pdfUrl,
    authorName: authorJson.nom,
  };
  catalog.books = [...catalog.books.filter((item) => item.id !== book.id), book];
  catalog.authors = catalog.authors.map((author) => author.id === authorId
    ? { ...author, bookCount: catalog.books.filter((item) => item.authorId === authorId).length }
    : author,
  );
  await saveR2Catalog(catalog);
  return book;
}

export async function removeBookFolder(id: string) {
  try {
    const folder = await findBookFolder(id);
    if (!folder) return false;
    await rm(folder, { recursive: true, force: true });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const catalog = await getR2Catalog();
  const book = catalog.books.find((item) => item.id === id);
  if (!book) return false;
  const pdfKey = r2KeyFromCatalogUrl(book.pdfUrl);
  const bookPrefix = `${pdfKey.slice(0, pdfKey.lastIndexOf("/"))}/`;
  await deleteR2Keys(await listR2Keys(bookPrefix));
  catalog.books = catalog.books.filter((item) => item.id !== id);
  catalog.authors = catalog.authors.map((author) => author.id === book.authorId ? { ...author, bookCount: Math.max(0, author.bookCount - 1) } : author);
  await saveR2Catalog(catalog);
  return true;
}

export async function createAuthorFolder(id: string, name: string) {
  try {
    const folder = join(libraryRoot, id);
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, "author.json"), JSON.stringify({ nom: name, image: "/favicon.svg" }, null, 2) + "\n");
    return;
  } catch (error) {
    if (!["ENOENT", "EROFS"].includes((error as NodeJS.ErrnoException).code || "")) throw error;
  }

  await uploadTextToR2(`biblio/${id}/author.json`, `${JSON.stringify({ nom: name, image: "/favicon.svg" }, null, 2)}\n`);
  const catalog = await getR2Catalog();
  catalog.authors.push({ id, name, image: "/favicon.svg", bookCount: 0 });
  await saveR2Catalog(catalog);
}

export async function updateAuthorJson(id: string, name: string) {
  const folderName = await findAuthorFolder(id);
  if (!folderName) throw new Error(`Dossier auteur introuvable : ${id}`);
  try {
    const folder = join(libraryRoot, folderName);
    const current = (await readJson<AuthorJson>(join(folder, "author.json"))) || {};
    await writeFile(join(folder, "author.json"), JSON.stringify({ ...current, nom: name }, null, 2) + "\n");
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const authorJsonKey = `biblio/${folderName}/author.json`;
  const current = JSON.parse((await getR2ObjectText(authorJsonKey)) || "{}") as AuthorJson;
  await uploadTextToR2(authorJsonKey, `${JSON.stringify({ ...current, nom: name }, null, 2)}\n`);
  const catalog = await getR2Catalog();
  catalog.authors = catalog.authors.map((author) => author.id === id ? { ...author, name } : author);
  catalog.books = catalog.books.map((book) => book.authorId === id ? { ...book, authorName: name } : book);
  await saveR2Catalog(catalog);
}

export async function updateAuthorImageJson(id: string, image: string) {
  const folderName = await findAuthorFolder(id);
  if (!folderName) throw new Error(`Dossier auteur introuvable : ${id}`);

  try {
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
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const authorJsonKey = `biblio/${folderName}/author.json`;
  const current = JSON.parse((await getR2ObjectText(authorJsonKey)) || "{}") as AuthorJson;
  await uploadTextToR2(authorJsonKey, `${JSON.stringify({ ...current, image }, null, 2)}\n`);

  const catalogText = await getR2ObjectText("biblio/catalog.json");
  if (!catalogText) return;
  const catalog = JSON.parse(catalogText) as R2Catalog;
  catalog.authors = catalog.authors.map((author) => author.id === id ? { ...author, image } : author);
  await uploadTextToR2("biblio/catalog.json", `${JSON.stringify(catalog, null, 2)}\n`);
}

export async function removeAuthorFolder(id: string) {
  const folderName = await findAuthorFolder(id);
  if (!folderName) return;
  try {
    await rm(join(libraryRoot, folderName), { recursive: true, force: true });
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  await deleteR2Keys(await listR2Keys(`biblio/${folderName}/`));
  const catalog = await getR2Catalog();
  catalog.authors = catalog.authors.filter((author) => author.id !== id);
  catalog.books = catalog.books.filter((book) => book.authorId !== id);
  await saveR2Catalog(catalog);
}
