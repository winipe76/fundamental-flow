import { env } from "cloudflare:workers";
import { normalizeTicker } from "@/lib/buy-candidate-contract";

export const dynamic = "force-dynamic";
type RuntimeEnv = { DB?: D1Database };
const runtime = env as unknown as RuntimeEnv;

export async function GET(request: Request) {
  if (!runtime.DB) return Response.json({ status: "database_unavailable", classifications: [] }, { status: 503 });
  try {
    const value = new URL(request.url).searchParams.get("ticker");
    const ticker = value ? normalizeTicker(value) : null;
    const query = ticker
      ? runtime.DB.prepare("SELECT * FROM fundamental_classifications WHERE ticker=?").bind(ticker)
      : runtime.DB.prepare("SELECT * FROM fundamental_classifications ORDER BY updated_at DESC, ticker");
    const result = await query.all();
    return Response.json({ status: "connected", classifications: result.results }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ status: "invalid_request", error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}

