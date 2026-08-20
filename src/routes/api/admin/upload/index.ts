import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { RequestHandler } from "@builder.io/qwik-city";
import { updateAuthorImageJson } from "~/data/library";
import { isAdmin } from "~/lib/admin-auth";

function safeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-|-$/g, "");
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function sendJson(send: (response: Response) => unknown, status: number, data: object) {
  send(new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  }));
}

export const onPost: RequestHandler = async ({ request, send }) => {
  if (!(await isAdmin(request))) {
    sendJson(send, 401, { error: "Non autorise" });
    return;
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const isAuthorImage = formData.get("kind") === "author";
  const authorId = String(formData.get("authorId") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const origin = String(formData.get("origin") || "Monsieur Leroux").trim();
  const pages = Number(formData.get("pages") || 0);

  if (!(file instanceof File) || file.size === 0) {
    sendJson(send, 400, { error: "Fichier manquant" });
    return;
  }

  const extension = file.name.toLowerCase().split(".").pop();
  const expectedExtension = isAuthorImage ? undefined : "pdf";
  const validPhotoExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
  const validPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (
    (expectedExtension && (extension !== expectedExtension || file.type !== "application/pdf")) ||
    (!expectedExtension && (!extension || !validPhotoExtensions.has(extension) || !validPhotoTypes.has(file.type)))
  ) {
    sendJson(send, 400, { error: isAuthorImage ? "La photo doit etre au format JPG, PNG ou WebP" : "Le fichier doit etre un PDF" });
    return;
  }
  if (file.size > 100 * 1024 * 1024) {
    sendJson(send, 413, { error: "Fichier trop volumineux" });
    return;
  }

  const fileName = `${Date.now()}-${safeName(file.name)}`;
  let directory = join(process.cwd(), "public", "books");
  let publicUrl = `/books/${fileName}`;

  if (isAuthorImage && authorId) {
    const authorFolders = await readdir(join(process.cwd(), "public", "biblio"), { withFileTypes: true });
    const authorFolder = authorFolders.find((entry) => entry.isDirectory() && slugify(entry.name) === authorId);
    if (!authorFolder) {
      sendJson(send, 404, { error: "Dossier biblio de l'auteur introuvable" });
      return;
    }
    directory = join(process.cwd(), "public", "biblio", authorFolder.name);
    publicUrl = `/biblio/${encodeURI(authorFolder.name)}/${encodeURI(fileName)}`;
  } else if (isAuthorImage) {
    directory = join(process.cwd(), "public", "authors");
    publicUrl = `/authors/${fileName}`;
  } else if (authorId && title) {
    const authorFolders = await readdir(join(process.cwd(), "public", "biblio"), { withFileTypes: true });
    const authorFolder = authorFolders.find((entry) => entry.isDirectory() && slugify(entry.name) === authorId);
    if (!authorFolder) {
      sendJson(send, 404, { error: "Dossier biblio de l'auteur introuvable" });
      return;
    }
    const bookFolder = slugify(title);
    directory = join(process.cwd(), "public", "biblio", authorFolder.name, bookFolder);
    publicUrl = `/biblio/${encodeURI(authorFolder.name)}/${encodeURI(bookFolder)}/${encodeURI(fileName)}`;
  }
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, fileName), Buffer.from(await file.arrayBuffer()));

  if (!isAuthorImage && authorId && title) {
    await writeFile(join(directory, "book.json"), JSON.stringify({
      titre: title,
      origine: origin,
      nombre_pages: pages,
      fichier_original: fileName,
    }, null, 2) + "\n");
  }

  if (isAuthorImage && authorId) {
    await updateAuthorImageJson(authorId, publicUrl);
  }

  sendJson(send, 200, { url: publicUrl });
};
