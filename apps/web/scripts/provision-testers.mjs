// The operator's door for the invited testers' accounts (AGENTS.md, « invited testers only »): there is no sign-up in the app, so an
// operator creates each account here, from a machine that holds DATABASE_URL (and DATABASE_CA_CERT). Passwords are generated,
// stored as hashes, and written ONLY to the private file given with --out (mode 600); they are never printed.
//
//   DATABASE_URL=… AUTH_SESSION_SECRET=… node --import tsx scripts/provision-testers.mjs \
//     --out ~/Documents/krizaka/inbox/non_prive/yororis-testeurs.md --url https://www.yororis.com \
//     "Eric:eric@yororis-testeurs.example:MEMBER:fr" "Mira:mira@…:MEMBER:en" "Camille:camille@…:ADMIN:fr"
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const out = flag("out");
const url = flag("url") ?? "https://www.yororis.com";
const specs = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--") && a.includes(":"));
if (!out || !specs.length) {
  console.error('usage: provision-testers.mjs --out <private file> [--url <address>] "Name:email:ROLE:locale" …');
  process.exit(2);
}

const { migrate } = await import("../lib/migrations.ts");
const { endPool } = await import("../lib/db.ts");
const { accountByEmail, generatePassword, provisionAccount } = await import("../lib/accounts.ts");

await migrate();
const rows = [];
for (const spec of specs) {
  const [name, email, role = "MEMBER", locale = "en"] = spec.split(":");
  if (await accountByEmail(email)) {
    console.log(`exists: ${email} (password unchanged)`);
    continue;
  }
  const password = generatePassword();
  await provisionAccount({ name, email, password, role: role === "ADMIN" ? "ADMIN" : "MEMBER", locale: locale === "fr" ? "fr" : "en" });
  rows.push({ email, password, role, name });
  console.log(`created: ${email} (${role})`);
}

const HEADER = "| Name | E-mail | Password | Role | URL |\n| --- | --- | --- | --- | --- |\n";
const previous = existsSync(out) ? readFileSync(out, "utf8") : `# Yororis testers (private, never committed)\n\n${HEADER}`;
const lines = rows.map((r) => `| ${r.name} | ${r.email} | ${r.password} | ${r.role} | ${url} |`).join("\n");
writeFileSync(out, `${previous.trimEnd()}${lines ? `\n${lines}` : ""}\n`, { mode: 0o600 });
chmodSync(out, 0o600);
await endPool();
