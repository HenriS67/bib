import "dotenv/config";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import postgres from "postgres";

const sourceRoot = join(process.cwd(), process.argv[2] || "public/biblio");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL est requis dans le fichier .env");
}

if (!existsSync(sourceRoot)) {
  throw new Error(`Dossier introuvable : ${sourceRoot}`);
}

const sql = postgres(databaseUrl, { prepare: false });

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function pageCount(filePath) {
  try {
    const output = execFileSync("pdfinfo", [filePath], { encoding: "utf8" });
    const match = output.match(/^Pages:\s+(\d+)/m);
    return match ? Number(match[1]) : 0;
  } catch {
    return 0;
  }
}

function isJunk(name) {
  return name.startsWith(".");
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

// Cherche récursivement tous les dossiers contenant book.json + un PDF.
function findBookFolders(dir, results = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const pdfEntries = entries.filter(
    (entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".pdf",
  );
  const bookJsonPath = join(dir, "book.json");

  if (pdfEntries.length > 0 && existsSync(bookJsonPath)) {
    results.push({ dir, pdfEntries });
  }

  for (const entry of entries) {
    if (entry.isDirectory() && !isJunk(entry.name)) {
      findBookFolders(join(dir, entry.name), results);
    }
  }

  return results;
}

const authorFolders = readdirSync(sourceRoot, { withFileTypes: true }).filter(
  (entry) => entry.isDirectory() && !isJunk(entry.name),
);

if (authorFolders.length === 0) {
  throw new Error("Aucun dossier d'auteur trouvé dans le dossier indiqué");
}

console.log("Vidage de la base de données...");
await sql`TRUNCATE TABLE books, authors RESTART IDENTITY CASCADE`;

let importedAuthors = 0;
let importedBooks = 0;
let skippedBooks = 0;
const usedBookIds = new Set();

for (const authorFolder of authorFolders) {
  const authorPath = join(sourceRoot, authorFolder.name);
  const authorInfo = readJson(join(authorPath, "author.json"));

  if (!authorInfo?.nom) {
    console.warn(`Ignoré (author.json manquant/invalide) : ${authorFolder.name}`);
    continue;
  }

  const authorId = slugify(authorFolder.name);
  const authorName = authorInfo.nom;

  await sql`
    INSERT INTO authors (id)
    VALUES (${authorId})
  `;
  importedAuthors += 1;

  const bookFolders = findBookFolders(authorPath);

  for (const { dir: bookDir, pdfEntries } of bookFolders) {
    const bookInfo = readJson(join(bookDir, "book.json"));

    if (!bookInfo?.titre) {
      console.warn(`Ignoré (book.json manquant/invalide) : ${bookDir}`);
      skippedBooks += 1;
      continue;
    }

    const pdfEntry =
      pdfEntries.find((entry) => entry.name === bookInfo.fichier_original) ??
      pdfEntries[0];
    const pdfPath = join(bookDir, pdfEntry.name);
    let bookId = `${authorId}-${slugify(relative(authorPath, bookDir) || pdfEntry.name)}`;
    let suffix = 2;
    while (usedBookIds.has(bookId)) {
      bookId = `${authorId}-${slugify(relative(authorPath, bookDir) || pdfEntry.name)}-${suffix}`;
      suffix += 1;
    }
    usedBookIds.add(bookId);
    // encodeURI (et non encodeURIComponent) laisse la virgule intacte, ce que le serveur statique de Vite exige.
    await sql`
      INSERT INTO books (id, author_id)
      VALUES (${bookId}, ${authorId})
    `;
    importedBooks += 1;
  }

  console.log(`Auteur importé : ${authorName} (${bookFolders.length} livre(s))`);
}

await sql.end();
console.log(
  `Terminé : ${importedAuthors} auteur(s) et ${importedBooks} livre(s) importé(s), ${skippedBooks} ignoré(s).`,
);
