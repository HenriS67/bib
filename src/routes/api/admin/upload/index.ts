import type { RequestHandler } from "@builder.io/qwik-city";
import { addBookToR2, findAuthorFolder, updateAuthorImageJson } from "~/data/library";
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
  let publicUrl = "";
  let r2Key = "";

  if (isAuthorImage && authorId) {
    const authorFolder = await findAuthorFolder(authorId);
    if (!authorFolder) {
      sendJson(send, 404, { error: "Dossier biblio de l'auteur introuvable" });
      return;
    }
    r2Key = `biblio/${authorFolder}/${fileName}`;
  } else if (isAuthorImage) {
    sendJson(send, 400, { error: "Auteur manquant" });
    return;
  } else if (authorId && title) {
    const authorFolder = await findAuthorFolder(authorId);
    if (!authorFolder) {
      sendJson(send, 404, { error: "Dossier biblio de l'auteur introuvable" });
      return;
    }
    const bookFolder = slugify(title);
    r2Key = `biblio/${authorFolder}/${bookFolder}/${fileName}`;
  }

  const fileBytes = new Uint8Array(await file.arrayBuffer());
  if (!r2Key) {
    sendJson(send, 400, { error: "Informations du livre manquantes" });
    return;
  }
  await uploadToR2(r2Key, fileBytes, isAuthorImage ? file.type : "application/pdf");
  publicUrl = r2PublicUrl(r2Key) || `/biblio/${r2Key.slice("biblio/".length).split("/").map(encodeURI).join("/")}`;

  if (isAuthorImage && authorId) {
    await updateAuthorImageJson(authorId, publicUrl);
  } else if (authorId && title) {
    const authorFolder = await findAuthorFolder(authorId);
    if (!authorFolder) throw new Error(`Dossier auteur introuvable : ${authorId}`);
    await addBookToR2(authorId, authorFolder, title, origin, pages, fileName);
  }

  sendJson(send, 200, { url: publicUrl });
};
