import { env } from "cloudflare:workers";
import { buildCandidateSnapshot, CandidateSnapshotError } from "@/lib/fundamental-candidate";
import { createCandidateTransferToken, type CandidateTransferAction } from "@/lib/candidate-transfer-token";

export const dynamic = "force-dynamic";
type RuntimeEnv = { DB?: D1Database; BUY_ENGINE_API_URL?: string; BUY_ENGINE_SYNC_TOKEN?: string };
const runtime = env as unknown as RuntimeEnv;
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

async function snapshotFromRequest(request: Request) {
  const body = await request.json() as Record<string, unknown>;
  return buildCandidateSnapshot(runtime.DB!, body.ticker);
}

export async function GET(request: Request) {
  const ticker = new URL(request.url).searchParams.get("ticker") ?? "";
  return json({ status: "browser_transfer", ticker });
}

async function transfer(request: Request, action: CandidateTransferAction) {
  if (!runtime.DB) return json({ status: "database_unavailable" }, 503);
  if (!runtime.BUY_ENGINE_API_URL || !runtime.BUY_ENGINE_SYNC_TOKEN) {
    return json({ status: "integration_not_configured", error: "Buy Engine connection is not configured" }, 503);
  }
  try {
    const snapshot = await snapshotFromRequest(request);
    const requestUrl = new URL(request.url);
    const returnUrl = `${requestUrl.origin}/?view=company-detail&ticker=${encodeURIComponent(snapshot.ticker)}`;
    const token = await createCandidateTransferToken(snapshot, runtime.BUY_ENGINE_SYNC_TOKEN, action, returnUrl);
    const target = `${runtime.BUY_ENGINE_API_URL.replace(/\/$/, "")}/api/candidates/import?token=${encodeURIComponent(token)}`;
    return json({ status: "transfer_ready", ticker: snapshot.ticker, redirectUrl: target });
  } catch (error) {
    if (error instanceof CandidateSnapshotError) return json({ status: "snapshot_unavailable", error: error.message }, error.status);
    return json({ status: "transfer_failed", error: error instanceof Error ? error.message : "Transfer failed" }, 502);
  }
}

export async function POST(request: Request) {
  return transfer(request, "add");
}

export async function DELETE(request: Request) {
  return transfer(request, "remove");
}

