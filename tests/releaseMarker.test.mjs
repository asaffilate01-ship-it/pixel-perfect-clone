import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  extractFanzenoReleaseMarker,
  isExpectedReleaseOnAllRoutes,
} from "../scripts/release-marker.mjs";

test("release marker is read from this exact checked-out app source", () => {
  const source = fs.readFileSync(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");
  assert.equal(extractFanzenoReleaseMarker(source), "2026-10-31-q16-verified-room-spectators");
});

test("missing marker fails closed instead of accepting an older site", () => {
  assert.throws(() => extractFanzenoReleaseMarker("export const Route = {}"), /Missing Fanzeno release/);
});

test("a release is verified only when every required public route has the new marker", () => {
  const current = { ok: true, has_fanzeno_brand: true, has_release_marker: true };
  const old = { ok: true, has_fanzeno_brand: true, has_release_marker: false };
  assert.equal(isExpectedReleaseOnAllRoutes([current, current]), true);
  assert.equal(isExpectedReleaseOnAllRoutes([current, old]), false);
  assert.equal(isExpectedReleaseOnAllRoutes([current, { ...current, ok: false }]), false);
  assert.equal(isExpectedReleaseOnAllRoutes([]), false);
});
