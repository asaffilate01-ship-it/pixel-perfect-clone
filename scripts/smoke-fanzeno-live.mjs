/**
 * Checks the public Fanzeno site from a GitHub-hosted runner.
 * This is a non-destructive smoke test, not a substitute for authenticated
 * multiplayer tests or for publishing the Lovable project.
 */
import fs from "node:fs";
import process from "node:process";

const base = (process.env.FANZENO_LIVE_URL || "https://amerfangame.lovable.app").replace(/\/$/, "");
const requiredMarker = "2026-10-16-q15-multiplayer-hardened";
const routes = ["/", "/arcade", "/arcade/higher-lower", "/arcade/crossword", "/upgrade"];
const results = [];
for (const path of routes) {
  const url = `${base}${path}`;
  try {
    const started = Date.now();
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { Accept: "text/html", "User-Agent": "Fanzeno-Release-Smoke/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
    const html = (await response.text()).slice(0, 250_000);
    results.push({
      path,
      status: response.status,
      ok: response.ok,
      duration_ms: Date.now() - started,
      has_fanzeno_brand: /Fanzeno/i.test(html),
      has_release_marker: html.includes(requiredMarker),
      final_url: response.url,
    });
  } catch (error) {
    results.push({ path, ok: false, error: String(error instanceof Error ? error.message : error) });
  }
}

const reachable = results.every((item) => item.ok && item.has_fanzeno_brand);
const currentRelease = results.some((item) => item.has_release_marker);
const summary = {
  checked_at: new Date().toISOString(),
  target: base,
  required_release: requiredMarker,
  reachable,
  current_release_published: currentRelease,
  endpoints: results,
};
console.log(JSON.stringify(summary, null, 2));
fs.writeFileSync("fanzeno-live-smoke.json", JSON.stringify(summary, null, 2) + "\n");
if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = [
    "### Fanzeno published-site smoke check",
    `Target: \`${base}\``,
    `Required release: \`${requiredMarker}\``,
    `Status: **${!reachable ? "SITE UNVERIFIED" : currentRelease ? "NEW RELEASE VISIBLE" : "SITE REACHABLE, OLD RELEASE"}**`,
    "",
    "| Route | HTTP | Fanzeno brand | Release marker |",
    "|---|---:|---|---|",
    ...results.map((item) =>
      `| \`${item.path}\` | ${item.status ?? "error"} | ${item.has_fanzeno_brand ? "yes" : "no"} | ${item.has_release_marker ? "yes" : "no"} |`),
    "",
    "This check does not deploy, publish, access private accounts or validate authenticated multiplayer.",
  ];
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
}
if (process.env.ENFORCE_LIVE === "true" && (!reachable || !currentRelease)) process.exitCode = 1;
