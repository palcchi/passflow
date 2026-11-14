import "server-only";

import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

const ROOT = path.resolve(process.cwd(), "public", "uploads");
const ALLOWED_BUCKETS = new Set(["profile-avatars", "event-assets", "attendee-photos"]);
const PUBLIC_BUCKETS = new Set(["profile-avatars", "event-assets"]);

function safeRelativePath(value: string) {
  const parts = value.split("/").filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === ".." || !/^[a-zA-Z0-9._-]+$/.test(part))) {
    throw new Error("invalid_storage_path");
  }
  return parts.join("/");
}

export function localPublicUrl(bucket: string, objectPath: string) {
  if (!PUBLIC_BUCKETS.has(bucket)) throw new Error("invalid_storage_bucket");
  const safePath = safeRelativePath(objectPath);
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!origin) throw new Error("app_origin_not_configured");
  return `${origin}/api/local-files/${bucket}/${safePath.split("/").map(encodeURIComponent).join("/")}`;
}

export async function saveLocalObject(bucket: string, objectPath: string, bytes: Buffer) {
  if (!ALLOWED_BUCKETS.has(bucket)) throw new Error("invalid_storage_bucket");
  const safePath = safeRelativePath(objectPath);
  const bucketRoot = path.resolve(ROOT, bucket);
  const target = path.resolve(bucketRoot, safePath);
  if (!target.startsWith(bucketRoot + path.sep)) throw new Error("invalid_storage_path");
  await mkdir(path.dirname(target), { recursive: true, mode: 0o755 });
  await writeFile(target, bytes, { flag: "wx", mode: 0o644 });
  return { path: safePath, publicUrl: PUBLIC_BUCKETS.has(bucket) ? localPublicUrl(bucket, safePath) : null };
}

export async function removeLocalObject(bucket: string, objectPath: string) {
  if (!ALLOWED_BUCKETS.has(bucket)) throw new Error("invalid_storage_bucket");
  const safePath = safeRelativePath(objectPath);
  const bucketRoot = path.resolve(ROOT, bucket);
  const target = path.resolve(bucketRoot, safePath);
  if (!target.startsWith(bucketRoot + path.sep)) throw new Error("invalid_storage_path");
  await unlink(target).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}

export function newLocalObjectName(prefix: string, extension: string) {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "file";
  const safeExtension = extension.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "bin";
  return `${safePrefix}-${Date.now()}-${randomBytes(8).toString("hex")}.${safeExtension}`;
}
