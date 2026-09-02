import type { FundamentalCandidateSnapshot } from "@/lib/buy-candidate-contract";

const TOKEN_TTL_MS = 5 * 60 * 1000;

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function encryptionKey(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt"]);
}

export type CandidateTransferAction = "add" | "remove";

export async function createCandidateTransferToken(snapshot: FundamentalCandidateSnapshot, secret: string, action: CandidateTransferAction, returnUrl: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = new TextEncoder().encode(JSON.stringify({
    snapshot,
    action,
    return_url: returnUrl,
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  }));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(secret), payload));
  const combined = new Uint8Array(iv.length + encrypted.length);
  combined.set(iv);
  combined.set(encrypted, iv.length);
  return bytesToBase64Url(combined);
}

