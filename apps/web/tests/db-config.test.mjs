// The pool's TLS rules: verified against the cluster's CA, never `rejectUnauthorized: false`; a CA stored on one line with `\n` escapes
// (how the family's secrets are kept) is read as a PEM.
import assert from "node:assert/strict";
import test from "node:test";

const { dbConfigured, poolConfig } = await import("../lib/db.ts");

const REMOTE = "postgres://u:p@db.example.test:25060/yororis_db?sslmode=require";

test("a CA on one line with \\n escapes becomes a multi-line PEM", () => {
  const cfg = poolConfig({ DATABASE_URL: REMOTE, DATABASE_CA_CERT: "-----BEGIN CERTIFICATE-----\\nAAAA\\n-----END CERTIFICATE-----" });
  assert.equal(cfg.ssl.ca, "-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----");
  assert.equal(cfg.ssl.rejectUnauthorized, true);
});

test("a remote database is always verified; sslmode is not left in the URL; only a local one skips TLS", () => {
  assert.equal(poolConfig({ DATABASE_URL: REMOTE }).ssl.rejectUnauthorized, true);
  assert.ok(!poolConfig({ DATABASE_URL: REMOTE }).connectionString.includes("sslmode"));
  assert.equal(poolConfig({ DATABASE_URL: "postgres://u:p@127.0.0.1:5432/x" }).ssl, false);
});

test("no URL: not configured, and the pool refuses to start", () => {
  assert.equal(dbConfigured({}), false);
  assert.throws(() => poolConfig({}), /not set/);
});
