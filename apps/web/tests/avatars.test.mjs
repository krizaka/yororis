// The member's picture: one of Krizaka UI's default avatars (a silhouette or the brand gradient, six tones), through Avatar and
// defaultAvatar; nothing uploaded, nothing stored but a key.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const { AVATAR_KEYS, avatarOf, isAvatarKey } = await import("../lib/avatars.ts");

test("twelve choices: person and plain, in six tones; anything else is not a key", () => {
  assert.equal(AVATAR_KEYS.length, 12);
  assert.ok(AVATAR_KEYS.every((k) => /^(person|plain)-[1-6]$/.test(k)));
  for (const bad of ["person-7", "plain-0", "https://evil.example/x.png", "", null, 3]) assert.equal(isAvatarKey(bad), false, String(bad));
});

test("avatarOf: the choice when there is one, else the tone the member's id gives; always the Yororis brand", () => {
  assert.deepEqual(avatarOf({ id: "a", avatar: "plain-4" }), { brand: "yororis", kind: "plain", tone: 4 });
  assert.deepEqual(avatarOf({ id: "a", avatar: null }), { brand: "yororis", seed: "a" });
  assert.deepEqual(avatarOf({ id: "a", avatar: "not-a-key" }), { brand: "yororis", seed: "a" });
});

test("the picker and the shell draw it with @krizaka/ui's Avatar and defaultAvatar, never an <img> of their own", () => {
  for (const f of ["components/console/AvatarPicker.tsx", "components/console/ConsoleShell.tsx"]) {
    const src = readFileSync(f, "utf8");
    assert.match(src, /from "@krizaka\/ui\/avatar"/, f);
    assert.match(src, /defaultAvatar=\{avatarOf\(/, f);
    assert.ok(!/<img\b/.test(src), f);
  }
});
