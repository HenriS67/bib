import type { RequestHandler } from "@builder.io/qwik-city";
import { findAuthorFolder, updateAuthorImageJson } from "~/data/library";
import { isAdmin } from "~/lib/admin-auth";
import { r2PublicUrl, uploadToR2 } from "~/lib/r2";

function safeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-|-$/g, "");
}

function redirectToAuthors(error?: string) {
  const location = new URL("/admin/auteurs", "https://bibliotheque.local");
  if (error) location.searchParams.set("photo", error);
  return new Response(null, { status: 303, headers: { Location: `${location.pathname}${location.search}` } });
}

export const onPost: RequestHandler = async ({ request, send }) => {
  if (!(await isAdmin(request))) {
    send(redirectToAuthors("non-autorise"));
    return;
  }

  const formData = await request.formData();
  const authorId = String(formData.get("authorId") || "").trim();
  const file = formData.get("file");
  const validTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!authorId || !(file instanceof File) || file.size === 0 || !validTypes.has(file.type)) {
    send(redirectToAuthors("fichier-invalide"));
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    send(redirectToAuthors("fichier-trop-volumineux"));
    return;
  }

  const authorFolder = await findAuthorFolder(authorId);
  if (!authorFolder) {
    send(redirectToAuthors("auteur-introuvable"));
    return;
  }

  const fileName = `${Date.now()}-${safeName(file.name)}`;
  const key = `biblio/${authorFolder}/${fileName}`;
  await uploadToR2(key, new Uint8Array(await file.arrayBuffer()), file.type);
  await updateAuthorImageJson(authorId, r2PublicUrl(key) || `/biblio/${authorFolder}/${fileName}`);
  send(redirectToAuthors("ok"));
};