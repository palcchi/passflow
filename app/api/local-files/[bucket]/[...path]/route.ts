import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const ROOT = path.resolve(process.cwd(), "public", "uploads");
const BUCKETS = new Set(["profile-avatars", "event-assets"]);
const TYPES: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  svg: "image/svg+xml", gif: "image/gif",
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ bucket: string; path: string[] }> },
) {
  const { bucket, path: segments } = await context.params;
  if (!BUCKETS.has(bucket) || !Array.isArray(segments) || !segments.length ||
      segments.some((part) => part === "." || part === ".." || !/^[a-zA-Z0-9._-]+$/.test(part))) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const bucketRoot = path.resolve(ROOT, bucket);
  const filePath = path.resolve(bucketRoot, ...segments);
  if (!filePath.startsWith(bucketRoot + path.sep)) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const data = await readFile(filePath);
    const extension = path.extname(filePath).slice(1).toLowerCase();
    return new NextResponse(data, {
      headers: {
        "Content-Type": TYPES[extension] ?? "application/octet-stream",
        "Content-Length": String(data.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
}
