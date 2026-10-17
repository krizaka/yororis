import { fail, requireMember } from "@/lib/http";
import { isClipPath, orazaka,OrazakaError } from "@/lib/orazaka";

/**
 * One spoken sentence of the presence, relayed from Orazaka. Only a member, only the edge's own clip addresses (a signed path,
 * valid five minutes, checked against a strict pattern — never an address the browser chose), and never stored or cached.
 */
export async function GET(req: Request) {
  const r = requireMember(req);
  if ("refusal" in r) return r.refusal;
  const path = new URL(req.url).searchParams.get("p") ?? "";
  if (!isClipPath(path)) return fail(400, "INVALID_PAYLOAD");
  const client = orazaka();
  if (!client) return fail(503, "AI_UNAVAILABLE");
  try {
    const upstream = await client.clip(path);
    if (!upstream.ok || !upstream.body) return fail(upstream.status === 404 || upstream.status === 410 ? 404 : 502, "NOT_FOUND");
    const type = upstream.headers.get("content-type") ?? "audio/wav";
    if (!/^audio\//.test(type)) return fail(502, "AI_SHAPE");
    return new Response(upstream.body, { headers: { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff" } });
  } catch (e) {
    return e instanceof OrazakaError ? fail(e.status, e.code) : fail(503, "AI_UNAVAILABLE");
  }
}
