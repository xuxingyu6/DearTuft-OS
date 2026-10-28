import { sessionSecret } from "@/lib/env";

export const LOCAL_COOKIE = "dt_local_session";

function bytesToB64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmac(body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return bytesToB64Url(new Uint8Array(signature));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function signSession(sub: string): Promise<string> {
  const body = bytesToB64Url(new TextEncoder().encode(JSON.stringify({ sub, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })));
  return `${body}.${await hmac(body)}`;
}

export async function readSession(token: string | undefined | null): Promise<{ sub: string } | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await hmac(body);
  if (!safeEqual(sig, expected)) return null;
  try {
    const json = JSON.parse(new TextDecoder().decode(b64UrlToBytes(body))) as { sub?: unknown; exp?: unknown };
    if (typeof json.sub !== "string" || typeof json.exp !== "number") return null;
    if (json.exp < Date.now()) return null;
    return { sub: json.sub };
  } catch {
    return null;
  }
}
