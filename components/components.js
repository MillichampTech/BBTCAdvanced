/**
 * components.js
 * - Loads shared nav + footer into placeholders (#site-nav / #site-footer)
 * - Fixes relative links via {{BASE}} token
 * - Adds active nav highlighting (page + hash)
 *
 * Works on static hosting as long as files are served over http(s)
 * (fetch won't work from file:// in some browsers).
 */

function basePrefix() {
  const path = window.location.pathname || "/";
  let cleaned = path.replace(/^\//, "");

  // Treat "/" and "/index.html" as root
  if (!cleaned || cleaned === "index.html") return "";

  let parts = cleaned.split("/").filter(Boolean);

  // ✅ GitHub Pages project site fix:
  // URL is /REPO/... so ignore the repo segment when calculating depth
  const isGitHubPages = /github\.io$/i.test(window.location.hostname);
  if (isGitHubPages && parts.length > 1) {
    parts = parts.slice(1); // drop "REPO"
  }

  // If path ends with "/" treat as folder index
  const depth = path.endsWith("/") ? parts.length : Math.max(parts.length - 1, 0);

  return "../".repeat(depth);
}


