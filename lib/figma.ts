import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getAppOrigin } from "@/lib/supabase/config";

const FIGMA_AUTHORIZE = "https://www.figma.com/oauth";
const FIGMA_API = "https://api.figma.com/v1";

function config() {
  const clientId = process.env.FIGMA_CLIENT_ID;
  const clientSecret = process.env.FIGMA_CLIENT_SECRET;
  const encryptionKey = process.env.FIGMA_TOKEN_ENCRYPTION_KEY;
  const appUrl = getAppOrigin();
  if (!clientId || !clientSecret || !encryptionKey || !appUrl) return null;
  return { clientId, clientSecret, redirectUri: `${appUrl}/api/figma/callback` };
}

function keyFromSecret(secret: string) { return createHmac("sha256", "passflow-figma-token").update(secret).digest(); }

export function figmaConfigured() { return !!config(); }

export function figmaState(userId: string, nonce: string) {
  const secret = process.env.FIGMA_TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error("FIGMA_TOKEN_ENCRYPTION_KEY is not configured");
  return `${userId}.${nonce}.${createHmac("sha256", secret).update(`${userId}.${nonce}`).digest("hex")}`;
}

export function verifyFigmaState(value: string, userId: string) {
  const [stateUser, nonce, signature] = value.split(".");
  const secret = process.env.FIGMA_TOKEN_ENCRYPTION_KEY;
  if (!secret || stateUser !== userId || !nonce || !signature) return false;
  const expected = createHmac("sha256", secret).update(`${stateUser}.${nonce}`).digest("hex");
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function figmaAuthorizeUrl(state: string) {
  const current = config();
  if (!current) return null;
  const query = new URLSearchParams({ client_id: current.clientId, redirect_uri: current.redirectUri, response_type: "code", scope: "current_user:read file_content:read", state });
  return `${FIGMA_AUTHORIZE}?${query.toString()}`;
}

export function encryptFigmaToken(value: string) {
  const secret = process.env.FIGMA_TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error("FIGMA_TOKEN_ENCRYPTION_KEY is not configured");
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", keyFromSecret(secret), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptFigmaToken(value: string) {
  const secret = process.env.FIGMA_TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error("FIGMA_TOKEN_ENCRYPTION_KEY is not configured");
  const [ivRaw, tagRaw, dataRaw] = value.split(".");
  const decipher = createDecipheriv("aes-256-gcm", keyFromSecret(secret), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataRaw, "base64url")), decipher.final()]).toString("utf8");
}

export async function exchangeFigmaCode(code: string) {
  const current = config();
  if (!current) throw new Error("Figma OAuth belum dikonfigurasi di Vercel.");
  const response = await fetch("https://api.figma.com/v1/oauth/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", Authorization: `Basic ${Buffer.from(`${current.clientId}:${current.clientSecret}`).toString("base64")}` }, body: new URLSearchParams({ redirect_uri: current.redirectUri, code, grant_type: "authorization_code" }), cache: "no-store" });
  if (!response.ok) throw new Error("Figma menolak pertukaran OAuth code.");
  return response.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number; user_id_string?: string; scope?: string }>;
}

export async function refreshFigmaToken(refreshToken: string) {
  const current = config();
  if (!current) throw new Error("Figma OAuth belum dikonfigurasi.");
  const response = await fetch("https://api.figma.com/v1/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", Authorization: `Basic ${Buffer.from(`${current.clientId}:${current.clientSecret}`).toString("base64")}` },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Koneksi Figma sudah kedaluwarsa. Hubungkan ulang.");
  return response.json() as Promise<{ access_token: string; expires_in: number }>;
}

export async function figmaFetch<T>(token: string, path: string) {
  const response = await fetch(`${FIGMA_API}${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`Figma API error ${response.status}`);
  return response.json() as Promise<T>;
}

export function parseFigmaUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !["figma.com", "www.figma.com"].includes(url.hostname)) throw new Error("Gunakan URL https://www.figma.com yang valid.");
  const match = url.pathname.match(/(?:file|design|proto|board)\/([a-zA-Z0-9]+)(?:\/|$)/);
  if (!match) throw new Error("Masukkan URL file atau design Figma yang valid.");
  return { fileKey: match[1], nodeId: url.searchParams.get("node-id") };
}
