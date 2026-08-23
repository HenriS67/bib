import type { RequestHandler } from "@builder.io/qwik-city";
import { createAuthorFolder, readLibrary, removeAuthorFolder, updateAuthorJson } from "~/data/library";
import { isAdmin } from "~/lib/admin-auth";

function sendJson(send: (response: Response) => unknown, status: number, data: object) {
  send(new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  }));
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function requestData(request: Request) {
  return await request.json().catch(() => ({})) as Record<string, unknown>;
}

export const onPost: RequestHandler = async ({ request, send }) => {
  if (!(await isAdmin(request))) {
    sendJson(send, 401, { error: "Non autorise" });
    return;
  }

  const name = String((await requestData(request)).name || "").trim();
  if (!name) {
    sendJson(send, 400, { error: "Le nom de l'auteur est obligatoire" });
    return;
  }
  const { authors } = await readLibrary();
  const id = slugify(name);
  if (authors.some((author) => author.name === name || author.id === id)) {
    sendJson(send, 409, { error: "Cet auteur existe deja" });
    return;
  }

  await createAuthorFolder(id, name);
  sendJson(send, 201, { author: { id, name, image: "/favicon.svg", bookCount: 0 } });
};

export const onPatch: RequestHandler = async ({ request, send }) => {
  if (!(await isAdmin(request))) {
    sendJson(send, 401, { error: "Non autorise" });
    return;
  }

  const data = await requestData(request);
  const id = String(data.id || "").trim();
  const name = String(data.name || "").trim();
  if (!id || !name) {
    sendJson(send, 400, { error: "Identifiant ou nom manquant" });
    return;
  }
  const { authors } = await readLibrary();
  if (authors.some((author) => author.name === name && author.id !== id)) {
    sendJson(send, 409, { error: "Cet auteur existe deja" });
    return;
  }

  await updateAuthorJson(id, name);
  sendJson(send, 200, { author: { id, name } });
};

export const onDelete: RequestHandler = async ({ request, send }) => {
  if (!(await isAdmin(request))) {
    sendJson(send, 401, { error: "Non autorise" });
    return;
  }

  const id = String((await requestData(request)).id || "").trim();
  if (!id) {
    sendJson(send, 400, { error: "Identifiant auteur manquant" });
    return;
  }

  await removeAuthorFolder(id);
  sendJson(send, 200, { deleted: id });
};