import { env } from "cloudflare:workers";
import { buildCandidateSnapshot, CandidateSnapshotError } from "@/lib/fundamental-candidate";
import { createCandidateTransferToken } from "@/lib/candidate-transfer-token";

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
  if (!runtime.DB) return json({ status: "database_unavailable" }, 503);
  try {
    return json({ status: "ready", snapshot: await snapshotFromRequest(request) });
  } catch (error) {
    if (error instanceof CandidateSnapshotError) return json({ status: "snapshot_unavailable", error: error.message }, error.status);
    return json({ status: "invalid_request", error: error instanceof Error ? error.message : "Invalid request" }, 400);
  }
}

export async function POST(request: Request) {
  if (!runtime.DB) return json({ status: "database_unavailable" }, 503);
  if (!runtime.BUY_ENGINE_API_URL || !runtime.BUY_ENGINE_SYNC_TOKEN) {
    return json({ status: "integration_not_configured", error: "Buy Engine connection is not configured" }, 503);
  }
  try {
    const snapshot = await snapshotFromRequest(request);
    const token = await createCandidateTransferToken(snapshot, runtime.BUY_ENGINE_SYNC_TOKEN);
    const importUrl = `${runtime.BUY_ENGINE_API_URL.replace(/\/$/, "")}/api/candidates/import?token=${encodeURIComponent(token)}`;
    return json({ status: "transfer_ready", ticker: snapshot.ticker, importUrl });
  } catch (error) {
    if (error instanceof CandidateSnapshotError) return json({ status: "snapshot_unavailable", error: error.message }, error.status);
    return json({ status: "transfer_failed", error: error instanceof Error ? error.message : "Transfer failed" }, 502);
  }
}
