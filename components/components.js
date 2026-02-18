/**
 * components.js
 * - Loads shared nav + footer into placeholders (#site-nav / #site-footer)
 * - Fixes relative links via {{BASE}} token
 * - Adds basic active-link highlighting
 *
 * Works on static hosting over http(s).
 */

function basePrefix() {
  const path = window.location.pathname || "/";
  const cleaned = path.replace(/^\//, "");

  // "/" and "/index.html" should be root
  if (!cleaned || cleaned === "index.html") return "";

  let parts = cleaned.split("/").filter(Boolean);

  // GitHub Pages project sites are /REPO/... so ignore the repo segment for depth
  const isGitHubPages = /github\.io$/i.test(window.location.hostname);
  if (isGitHubPages && parts.length > 1) {
    parts = parts.slice(1);
  }

  // If path ends with "/" treat as folder index
  const depth = path.endsWith("/") ? parts.length : Math.max(parts.length - 1, 0);

  return "../".repeat(depth);
}

async function inject(selector, url, base) {
  const host = document.querySelector(selector);
  if (!host) return;

  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    let html = await res.text();

    // Replace {{BASE}} tokens inside components
    html = html.replaceAll("{{BASE}}", base);

    host.innerHTML = html;
  } catch (err) {
    // Fail loud so you see it in console
    console.error(`[components] Failed to load ${url}`, err);
  }
}

function setActiveNav(base) {
  const path = window.location.pathname || "/";
  const page = path.split("/").filter(Boolean).pop() || "index.html";

  const nav = document.querySelector("#site-nav");
  if (!nav) return;

  const links = Array.from(nav.querySelectorAll("a[href]"));

  links.forEach(a => {
    const href = a.getAttribute("href") || "";
    // Normalise: strip base + query + hash
    const cleaned = href.replace(base, "").split("?")[0].split("#")[0];

    // Match exact page filename (index.html, terms.html, etc.)
    const isActive = cleaned === page || (page === "" && cleaned === "index.html");
    a.classList.toggle("is-active", isActive);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const base = basePrefix();

  // Load components (these paths must exist at site root)
  await inject("#site-nav", `${base}components/nav.html`, base);
  await inject("#site-footer", `${base}components/footer.html`, base);

  setActiveNav(base);
});




