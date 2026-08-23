import { ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import "dotenv/config";

const argumentsList = process.argv.slice(2).filter((argument) => argument !== "--");
const sourceRoot = resolve(argumentsList.find((argument) => argument !== "--dry-run") || "public/biblio");
const dryRun = argumentsList.includes("--dry-run");
const requiredVariables = ["R2_ENDPOINT", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);
if (missingVariables.length > 0) throw new Error(`Variables R2 manquantes : ${missingVariables.join(", ")}`);

const client = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function contentType(filePath) {
  switch (extname(filePath).toLowerCase()) {
    case ".pdf": return "application/pdf";
    case ".json": return "application/json; charset=utf-8";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".png": return "image/png";
    case ".webp": return "image/webp";
    default: return "application/octet-stream";
  }
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const filePath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(filePath));
    else if (entry.isFile()) files.push(filePath);
  }
  return files;
}

async function listRemoteObjects() {
  const objects = new Map();
  let continuationToken;
  do {
    const page = await client.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET,
      Prefix: "biblio/",
      ContinuationToken: continuationToken,
    }));
    for (const object of page.Contents ?? []) {
      if (object.Key) objects.set(object.Key, object.Size ?? 0);
    }
    continuationToken = page.NextContinuationToken;
  } while (continuationToken);
  return objects;
}

function readJson(filePath) {
  return readFile(filePath, "utf8").then(JSON.parse).catch(() => null);
}

async function buildCatalog() {
  const authors = [];
  const books = [];
  for (const authorEntry of await readdir(sourceRoot, { withFileTypes: true })) {
    if (!authorEntry.isDirectory() || authorEntry.name.startsWith(".")) continue;
    const authorPath = join(sourceRoot, authorEntry.name);
    const authorJson = await readJson(join(authorPath, "author.json"));
    if (!authorJson?.nom) continue;
    const authorId = slugify(authorEntry.name);
    const authorBooks = [];
    for (const bookPath of await walk(authorPath)) {
      if (bookPath.endsWith(`${sep}book.json`)) {
        const bookJson = await readJson(bookPath);
        if (!bookJson?.titre) continue;
        const folder = join(bookPath, "..");
        const entries = await readdir(folder, { withFileTypes: true });
        const pdf = entries.find((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"));
        if (!pdf) continue;
        const bookFolder = relative(authorPath, folder).split(sep).join("/");
        const pdfPath = relative(sourceRoot, join(folder, pdf.name)).split(sep).join("/");
        const book = {
          id: `${authorId}-${slugify(bookFolder || pdf.name)}`,
          title: bookJson.titre,
          origin: bookJson.origine || "Monsieur Leroux",
          authorId,
          pages: bookJson.nombre_pages || 0,
          pdfUrl: `/biblio/${pdfPath}`,
          authorName: authorJson.nom,
        };
        authorBooks.push(book);
        books.push(book);
      }
    }
    authors.push({
      id: authorId,
      name: authorJson.nom,
      image: authorJson.image || "/favicon.svg",
      bookCount: authorBooks.length,
    });
  }
  return { authors, books };
}

const files = await walk(sourceRoot);
const remoteObjects = await listRemoteObjects();
const uploads = [];
for (const filePath of files) {
  const key = `biblio/${relative(sourceRoot, filePath).split(sep).join("/")}`;
  const size = (await stat(filePath)).size;
  if (remoteObjects.get(key) !== size) uploads.push({ filePath, key, size });
}

const catalog = Buffer.from(`${JSON.stringify(await buildCatalog(), null, 2)}\n`);
if (remoteObjects.get("biblio/catalog.json") !== catalog.length) {
  uploads.push({ key: "biblio/catalog.json", size: catalog.length, body: catalog, contentType: "application/json; charset=utf-8" });
}

console.log(`${files.length} fichier(s) source, ${remoteObjects.size} objet(s) R2, ${uploads.length} objet(s) à envoyer.`);
if (dryRun) process.exit(0);

let completed = 0;
const workerCount = 4;
async function uploadNext() {
  while (uploads.length > 0) {
    const upload = uploads.shift();
    const body = upload.body ?? await readFile(upload.filePath);
    await client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: upload.key,
      Body: body,
      ContentType: upload.contentType ?? contentType(upload.filePath),
    }));
    completed += 1;
    if (completed % 25 === 0 || completed === 1) console.log(`${completed} / ${uploads.length + completed} objets envoyés`);
  }
}

await Promise.all(Array.from({ length: workerCount }, uploadNext));
console.log(`Synchronisation terminée : ${completed} objet(s) envoyé(s).`);