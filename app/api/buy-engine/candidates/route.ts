import { env } from "cloudflare:workers";
import { buildCandidateSnapshot, CandidateSnapshotError } from "@/lib/fundamental-candidate";

export const dynamic = "force-dynamic";
type RuntimeEnv = { DB?: D1Database; BUY_ENGINE_API_URL?: string; BUY_ENGINE_SYNC_TOKEN?: string };
const runtime = env as unknown as RuntimeEnv;
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

async function snapshotFromRequest(request: Request) {
  const url = new URL(request.url);
  if (request.method === "GET") return buildCandidateSnapshot(runtime.DB!, url.searchParams.get("ticker"));
  const body = await request.json() as Record<string, unknown>;
  return buildCandidateSnapshot(runtime.DB!, body.ticker);
}

export async function GET(request: Request) {
  if (!runtime.BUY_ENGINE_API_URL || !runtime.BUY_ENGINE_SYNC_TOKEN) return json({ status: "integration_not_configured", added: false }, 503);
  try {
    const ticker = new URL(request.url).searchParams.get("ticker") ?? "";
    const response = await fetch(`${runtime.BUY_ENGINE_API_URL.replace(/\/$/, "")}/api/candidates/sync?ticker=${encodeURIComponent(ticker)}`, {
      headers: { "Authorization": `Bearer ${runtime.BUY_ENGINE_SYNC_TOKEN}` }, cache: "no-store", signal: AbortSignal.timeout(12_000),
    });
    const result = await response.json() as Record<string, unknown>;
    if (!response.ok) return json(result, response.status);
    return json({ status: "connected", ticker, added: result.added === true });
  } catch (error) {
    return json({ status: "status_unavailable", added: false, error: error instanceof Error ? error.message : "Status unavailable" }, 502);
  }
}

export async function POST(request: Request) {
  if (!runtime.DB) return json({ status: "database_unavailable" }, 503);
  if (!runtime.BUY_ENGINE_API_URL || !runtime.BUY_ENGINE_SYNC_TOKEN) {
    return json({ status: "integration_not_configured", error: "Buy Engine connection is not configured" }, 503);
  }
  try {
    const snapshot = await snapshotFromRequest(request);
    const response = await fetch(`${runtime.BUY_ENGINE_API_URL.replace(/\/$/, "")}/api/candidates/sync`, {
      method: "POST", headers: { "Authorization": `Bearer ${runtime.BUY_ENGINE_SYNC_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(snapshot), signal: AbortSignal.timeout(12_000),
    });
    const result = await response.json() as Record<string, unknown>;
    if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Buy Engine rejected the candidate");
    return json({ status: result.status ?? "added", ticker: snapshot.ticker, candidate: result.candidate ?? null });
  } catch (error) {
    if (error instanceof CandidateSnapshotError) return json({ status: "snapshot_unavailable", error: error.message }, error.status);
    return json({ status: "transfer_failed", error: error instanceof Error ? error.message : "Transfer failed" }, 502);
  }
}

export async function DELETE(request: Request) {
  if (!runtime.BUY_ENGINE_API_URL || !runtime.BUY_ENGINE_SYNC_TOKEN) return json({ status: "integration_not_configured", error: "Buy Engine connection is not configured" }, 503);
  try {
    const body = await request.json() as Record<string, unknown>;
    const response = await fetch(`${runtime.BUY_ENGINE_API_URL.replace(/\/$/, "")}/api/candidates/sync`, {
      method: "DELETE", headers: { "Authorization": `Bearer ${runtime.BUY_ENGINE_SYNC_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: body.ticker }), signal: AbortSignal.timeout(12_000),
    });
    const result = await response.json() as Record<string, unknown>;
    if (!response.ok) return json(result, response.status);
    return json({ status: result.status ?? "removed", ticker: body.ticker, candidate: result.candidate ?? null });
  } catch (error) {
    return json({ status: "remove_failed", error: error instanceof Error ? error.message : "Remove failed" }, 502);
  }
}
