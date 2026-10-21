// 100 % stateless (#97): no mood scale, no summary, no « what I keep », no notebook, no export. What is said lives in memory only while a
// moment lasts and is dropped when it ends; nothing emotional or conversational is persisted, described or taken away.
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const files = execSync("git ls-files --cached --others --exclude-standard app components lib messages scripts", { encoding: "utf8" }).split("\n").filter(Boolean);
const NEVER = /moodBefore|moodAfter|MoodPick|keepAsk|keepYes|keepNo|keepTitle|keptTitle|keepEmpty|kpiKept|keptShare|takeAlong|whatHelped|smallStep|dropAll|notebook|summaries|\/api\/moment\/(keep|forget)/i;

test("no route, page or component of the kept/mood/summary flows exists", () => {
  for (const f of files) assert.ok(!/(^|\/)(keep|forget)(\/|\.)|mood|summary|notebook/i.test(f), f);
});

test("no source or message speaks of a mood score, a summary, what is kept, a notebook or a therapist", () => {
  const offenders = files.filter((f) => /\.(ts|tsx|json|mjs)$/.test(f)).filter((f) => NEVER.test(readFileSync(f, "utf8")));
  assert.deepEqual(offenders, []);
});

test("the moment holds no whole-conversation log and no closing window: only the last exchanges, while it lasts", async () => {
  const m = await import("../lib/moments.ts");
  const moment = m.begin({ memberId: "a", presence: "lea", language: "fr" }, { minutes: 25, perDay: 5, perWeek: 20 });
  m.remember(moment, "bonjour", "salut");
  assert.ok(!("log" in moment) && !("endedAt" in moment));
  assert.equal(moment.recent.length, 2);
  m.finish(moment);
  assert.deepEqual(moment.recent, []);
  assert.equal(m.findMoment(moment.id, "a"), undefined);
  assert.ok(!("close" in m) && !("turnsOf" in m) && !("CLOSING_MS" in m));
});

test("ending a moment always forgets it: the end route takes no `keep` and answers no `canKeep`", () => {
  const src = readFileSync("app/api/moment/end/route.ts", "utf8");
  assert.ok(!/keep|canKeep|close\(/.test(src));
  assert.match(src, /finish\(moment\)/);
});

test("the Orazaka client has no `keep` run and no mood input", () => {
  assert.ok(!/\bkeep\(|moodBefore|Kept\b|readKept|KeepInput|-summary/.test(readFileSync("lib/orazaka.ts", "utf8")));
});

test("the account page has no consent placeholder and no notebook export", () => {
  const src = readFileSync("components/console/AccountView.tsx", "utf8");
  assert.ok(!/notebook|ConsentSection/i.test(src));
  assert.ok(!/id="consent"|id="notebook"/.test(src));
});
