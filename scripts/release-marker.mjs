/**
 * Read the release marker from the source being checked, rather than a
 * hardcoded historic date that can accidentally pass for the wrong build.
 * Kept in plain JavaScript so the Node 22 release probe needs no bundler.
 */
export function extractFanzenoReleaseMarker(source) {
  const match = source.match(/name:\s*["']fanzeno-release["']\s*,\s*content:\s*["']([a-zA-Z0-9_.-]+)["']/);
  if (!match?.[1]) {
    throw new Error("Missing Fanzeno release meta tag in src/routes/__root.tsx");
  }
  return match[1];
}

/** All public routes must render the expected application shell. */
export function isExpectedReleaseOnAllRoutes(results) {
  return results.length > 0 && results.every(
    (item) => item.ok && item.has_fanzeno_brand && item.has_release_marker,
  );
}
