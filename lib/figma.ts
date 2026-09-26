import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { createServerSupabaseClient } from "@/lib/supabase/server";

const FIGMA_API = "https://api.figma.com";
const FIGMA_OAUTH = "https://www.figma.com/oauth";
export const FIGMA_SCOPES = ["current_user:read", "file_content:read", "file_metadata:read"] as const;

type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

type FigmaTokenResponse = {
  user_id_string?: string;
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
};

export type FigmaProfile = {
  id: string;
  handle: string;
  img_url?: string;
  email?: string;
};

export type ParsedFigmaUrl = {
  fileKey: string;
  nodeId: string | null;
  canonicalUrl: string;
};

export type FigmaDesignSnapshot = {
  fileName: string;
  version: string | null;
  previewUrl: string | null;
  canonicalUrl: string;
};

export function getFigmaConfig() {
  const clientId = process.env.FIGMA_CLIENT_ID?.trim();
  const clientSecret = process.env.FIGMA_CLIENT_SECRET?.trim();
  const encryptionSecret = process.env.FIGMA_TOKEN_ENCRYPTION_KEY?.trim();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://passflow.my.id").replace(/\/$/, "");

  if (!clientId || !clientSecret || !encryptionSecret) return null;
  return {
    clientId,
    clientSecret,
    encryptionSecret,
    redirectUri: `${appUrl}/api/figma/callback`,
  };
}

function encryptionKey() {
  const config = getFigmaConfig();
  if (!config) throw new Error("Figma integration is not configured.");
  return createHash("sha256").update(config.encryptionSecret).digest();
}

export function encryptFigmaSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptFigmaSecret(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("Invalid encrypted Figma token.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function createFigmaPkce() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function createFigmaState() {
  return randomBytes(24).toString("base64url");
}

export function buildFigmaAuthorizationUrl(state: string, challenge: string) {
  const config = getFigmaConfig();
  if (!config) throw new Error("Figma integration is not configured.");
  const url = new URL(FIGMA_OAUTH);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", FIGMA_SCOPES.join(","));
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

function basicAuth() {
  const config = getFigmaConfig();
  if (!config) throw new Error("Figma integration is not configured.");
  return `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`;
}

export async function exchangeFigmaCode(code: string, verifier: string) {
  const config = getFigmaConfig();
  if (!config) throw new Error("Figma integration is not configured.");

  const body = new URLSearchParams({
    redirect_uri: config.redirectUri,
    code,
    grant_type: "authorization_code",
    code_verifier: verifier,
  });

  const response = await fetch(`${FIGMA_API}/v1/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Figma authorization could not be completed.");
  return (await response.json()) as FigmaTokenResponse;
}

async function refreshFigmaToken(refreshToken: string) {
  const body = new URLSearchParams({ refresh_token: refreshToken });
  const response = await fetch(`${FIGMA_API}/v1/oauth/refresh`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Figma session could not be refreshed.");
  return (await response.json()) as FigmaTokenResponse;
}

export async function figmaApi<T>(path: string, accessToken: string) {
  const response = await fetch(`${FIGMA_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Figma API error ${response.status}${message ? `: ${message.slice(0, 180)}` : ""}`);
  }
  return (await response.json()) as T;
}

export async function getFigmaProfile(accessToken: string) {
  return figmaApi<FigmaProfile>("/v1/me", accessToken);
}

export async function getFigmaAccessToken(
  supabase: ServerSupabaseClient,
  userId: string,
) {
  const { data: connection, error } = await supabase
    .from("figma_connections")
    .select("access_token_encrypted, refresh_token_encrypted, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !connection) throw new Error("Connect your Figma account first.");

  const expiresAt = new Date(connection.expires_at).getTime();
  if (expiresAt > Date.now() + 5 * 60 * 1000) {
    return decryptFigmaSecret(connection.access_token_encrypted);
  }

  const refreshToken = decryptFigmaSecret(connection.refresh_token_encrypted);
  const refreshed = await refreshFigmaToken(refreshToken);
  const nextExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  const { error: updateError } = await supabase
    .from("figma_connections")
    .update({
      access_token_encrypted: encryptFigmaSecret(refreshed.access_token),
      expires_at: nextExpiry,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) throw new Error("Figma session refresh could not be saved.");
  return refreshed.access_token;
}

export function parseFigmaUrl(input: string): ParsedFigmaUrl {
  const url = new URL(input.trim());
  if (!["figma.com", "www.figma.com"].includes(url.hostname)) {
    throw new Error("Use a figma.com file or design URL.");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const typeIndex = segments.findIndex((segment) =>
    ["design", "file", "proto", "board"].includes(segment),
  );
  const fileKey = typeIndex >= 0 ? segments[typeIndex + 1] : undefined;
  if (!fileKey || !/^[A-Za-z0-9_-]+$/.test(fileKey)) {
    throw new Error("Figma file key was not found in the URL.");
  }

  const rawNodeId = url.searchParams.get("node-id");
  const nodeId = rawNodeId ? rawNodeId.replace(/-/g, ":") : null;
  return {
    fileKey,
    nodeId,
    canonicalUrl: `https://www.figma.com/design/${fileKey}`,
  };
}

export async function fetchFigmaDesignSnapshot(
  accessToken: string,
  parsed: ParsedFigmaUrl,
): Promise<FigmaDesignSnapshot> {
  const meta = await figmaApi<{
    file: {
      name: string;
      version?: string;
      thumbnail_url?: string;
      url?: string;
    };
  }>(`/v1/files/${encodeURIComponent(parsed.fileKey)}/meta`, accessToken);

  let previewUrl = meta.file.thumbnail_url ?? null;

  if (parsed.nodeId) {
    const params = new URLSearchParams({
      ids: parsed.nodeId,
      format: "png",
      scale: "1",
    });
    const rendered = await figmaApi<{ images?: Record<string, string | null> }>(
      `/v1/images/${encodeURIComponent(parsed.fileKey)}?${params.toString()}`,
      accessToken,
    );
    previewUrl = rendered.images?.[parsed.nodeId] ?? previewUrl;
  }

  return {
    fileName: meta.file.name,
    version: meta.file.version ?? null,
    previewUrl,
    canonicalUrl: meta.file.url ?? parsed.canonicalUrl,
  };
}
