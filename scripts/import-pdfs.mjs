import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";

const sourceRoot = resolve(process.argv[2] || "");
const destinationRoot = resolve("public/books");

if (!process.argv[2] || !existsSync(sourceRoot)) {
  throw new Error("Utilisation : pnpm db:import-pdfs /chemin/vers/bibliotheque");
}

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

const authorFolders = readdirSync(sourceRoot, { withFileTypes: true }).filter(
  (entry) => entry.isDirectory(),
);

if (authorFolders.length === 0) {
  throw new Error("Aucun dossier d'auteur trouvé dans le dossier indiqué");
}

mkdirSync(destinationRoot, { recursive: true });

let imported = 0;
let skipped = 0;

for (const authorFolder of authorFolders) {
  const authorName = authorFolder.name;
  const authorId = slugify(authorName);
  const authorPath = join(sourceRoot, authorFolder.name);
  const pdfFiles = readdirSync(authorPath, { withFileTypes: true }).filter(
    (entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".pdf",
  );

  for (const pdfFile of pdfFiles) {
    const title = basename(pdfFile.name, extname(pdfFile.name)).replace(/[_-]+/g, " ");
    const outputDirectory = join(destinationRoot, authorId);
    const outputName = `${slugify(title)}.pdf`;
    const outputPath = join(outputDirectory, outputName);

    if (existsSync(outputPath)) {
      skipped += 1;
      continue;
    }

    mkdirSync(outputDirectory, { recursive: true });
    cpSync(join(authorPath, pdfFile.name), outputPath);

    imported += 1;
    console.log(`Ajouté : ${authorName} / ${title}`);
  }
}

console.log(`Terminé : ${imported} livre(s) ajouté(s), ${skipped} déjà présent(s).`);