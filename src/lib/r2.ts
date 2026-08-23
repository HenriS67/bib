import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function getR2Client() {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("Configuration R2 incomplete");
  }

  return new S3Client({
    endpoint,
    region: "auto",
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function r2PublicUrl(key: string) {
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "");
  return publicUrl ? `${publicUrl}/${key.split("/").map(encodeURIComponent).join("/")}` : null;
}

export async function uploadToR2(key: string, body: Uint8Array, contentType: string) {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET manquant");

  await getR2Client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

export async function uploadTextToR2(key: string, text: string) {
  await uploadToR2(key, new TextEncoder().encode(text), "application/json; charset=utf-8");
}

export async function listR2Keys(prefix: string) {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET manquant");

  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const page = await getR2Client().send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));
    keys.push(...(page.Contents ?? []).flatMap((object) => object.Key ? [object.Key] : []));
    continuationToken = page.NextContinuationToken;
  } while (continuationToken);

  return keys;
}

export async function getR2ObjectText(key: string) {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET manquant");

  try {
    const response = await getR2Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return response.Body?.transformToString() ?? null;
  } catch (error) {
    if ((error as { name?: string }).name === "NoSuchKey") return null;
    throw error;
  }
}

export async function deleteR2Keys(keys: string[]) {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET manquant");

  await Promise.all(keys.map((key) => getR2Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))));
}