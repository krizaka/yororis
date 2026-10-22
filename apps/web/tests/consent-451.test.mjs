// When a pack's consent version moves, the service account's installation answers 451 until its consent is posted again (yororis#99):
// the client re-POSTs the installation at the version it knows, then retries the turn once. Never more than once.
import assert from "node:assert/strict";
import test from "node:test";

process.env.AUTH_SESSION_SECRET = "t".repeat(40);
process.env.AUTH_DEMO_PASSWORD = "a-demo-password-1";

const { createOrazakaClient, OrazakaError } = await import("../lib/orazaka.ts");
const sse = (events) => events.map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`).join("");

function edge(refusals) {
  const seen = [];
  let left = refusals;
  const fake = async (url, init) => {
    const u = String(url);
    seen.push({ url: u, method: init.method ?? "GET", body: init.body });
    if (u.endsWith("/api/v1/studios/installations")) return Response.json([{ id: "inst-1", studioKey: "guided-journaling" }]);
    if (u.includes("/installations?")) return Response.json({ id: "inst-1" }, { status: 200 });
    if (u.endsWith("/api/v1/voice/turns") && left > 0) {
      left -= 1;
      return new Response("consent", { status: 451 });
    }
    return new Response(sse([["sentence", { index: 0, text: "Hello." }]]), { headers: { "content-type": "text/event-stream" } });
  };
  return { seen, client: createOrazakaClient({ baseUrl: "https://ai.example.test", apiKey: "key-for-tests", consent: "2.1", region: "CA-QC", fetch: fake }) };
}
const posts = (seen) => seen.filter((s) => s.method === "POST" && s.url.includes("/installations?"));
const turns = (seen) => seen.filter((s) => s.url.endsWith("/api/v1/voice/turns"));

test("a 451 re-posts the installation consent at the current version and retries the turn once", async () => {
  const { seen, client } = edge(1);
  const t = await client.turn({ conversationId: "c", text: "hi", locale: "fr-CA" });
  assert.equal(t.sentences[0].text, "Hello.");
  assert.equal(turns(seen).length, 2, "the turn is retried once");
  assert.equal(posts(seen).length, 1);
  assert.deepEqual(JSON.parse(posts(seen)[0].body), { config: {}, consentVersion: "2.1", ageAttested: true, region: "CA-QC" });
});

test("a second 451 is the consent refusal: one retry, no loop", async () => {
  const { seen, client } = edge(5);
  await assert.rejects(client.turn({ conversationId: "c", text: "hi", locale: "fr-CA" }), (e) => e instanceof OrazakaError && e.code === "CONSENT");
  assert.equal(turns(seen).length, 2);
  assert.equal(posts(seen).length, 1);
});

test("without a 451 nothing is re-posted", async () => {
  const { seen, client } = edge(0);
  await client.turn({ conversationId: "c", text: "hi", locale: "fr-CA" });
  assert.equal(turns(seen).length, 1);
  assert.equal(posts(seen).length, 0);
});
