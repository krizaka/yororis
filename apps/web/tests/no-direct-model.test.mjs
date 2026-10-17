// All AI goes through Orazaka (the wellbeing pack): nothing in the app reaches a model, a provider or an AI SDK on its own.
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const files = () => execSync("git ls-files --cached --others --exclude-standard . ':!tests' ':!package-lock.json'", { encoding: "utf8" }).split("\n").filter((f) => /\.(ts|tsx|mjs|json|js)$/.test(f));
const PROVIDERS = /ollama|openai|anthropic|api\.mistral|groq\.com|generativelanguage|huggingface|replicate\.com|cohere|elevenlabs|11434|@ai-sdk|\blangchain|\bllama/i;

test("no provider, model server or AI SDK is named in the app", () => {
  for (const f of files()) assert.ok(!PROVIDERS.test(readFileSync(f, "utf8")), `${PROVIDERS.exec(readFileSync(f, "utf8"))?.[0]} in ${f}`);
});

test("the app depends on no AI package", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  assert.deepEqual(names.filter((n) => /^(openai|@anthropic-ai|ai|@ai-sdk|ollama|langchain|@google\/generative-ai|@mistralai)/.test(n)), []);
});

test("the voice turn is called from one place only: lib/orazaka.ts, which is the edge's client", () => {
  const users = files().filter((f) => /voice\/turns/.test(readFileSync(f, "utf8")) && !f.endsWith(".json"));
  assert.deepEqual(users, ["lib/orazaka.ts"]);
});

test("the edge's address and key come from the environment, never from the source", () => {
  const src = readFileSync("lib/orazaka.ts", "utf8");
  assert.ok(!/https?:\/\/(?!ai\.example)/.test(src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")), "an address is written in lib/orazaka.ts");
  assert.match(readFileSync("lib/env.ts", "utf8"), /AI_API_URL[\s\S]*AI_API_KEY/);
});
