import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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