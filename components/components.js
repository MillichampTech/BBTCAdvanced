/**
 * components.js
 * - Loads shared nav + footer into placeholders (#site-nav / #site-footer)
 * - Replaces {{BASE}} tokens inside injected HTML
 */

function basePrefix() {
  const path = window.location.pathname || "/";
  const cleaned = path.replace(/^\//, "");

  if (!cleaned || cleaned === "index.html") return "";

  let parts = cleaned.split("/").filter(Boolean);

  // GitHub Pages project sites are /REPO/... so ignore repo segment for depth
  const isGitHubPages = /github\.io$/i.test(window.location.hostname);
  if (isGitHubPages && parts.length > 1) parts = parts.slice(1);

  const depth = path.endsWith("/") ? parts.length : Math.max(parts.length - 1, 0);
  return "../".repeat(depth);
}

// ✅ GLOBAL base (so nothing can ever say "base is not defined")
const BASE = basePrefix();

async function inject(selector, url) {
  const host = document.querySelector(selector);
  if (!host) return;

  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    let html = await res.text();
    html = html.replaceAll("{{BASE}}", BASE);
    host.innerHTML = html;
  } catch (err) {
    console.error(`[components] Failed to load ${url}`, err);
  }
}

function setActiveNav() {
  const nav = document.querySelector("#site-nav");
  if (!nav) return;

  const path = window.location.pathname || "/";
  const page = path.split("/").filter(Boolean).pop() || "index.html";

  nav.querySelectorAll("a[href]").forEach(a => {
    const href = a.getAttribute("href") || "";
    const cleaned = href.replace(BASE, "").split("?")[0].split("#")[0];
    a.classList.toggle("is-active", cleaned === page);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  // Helpful debug (remove later if you want)
  console.log("[components] BASE =", BASE);

  await inject("#site-nav", `${BASE}components/nav.html`);
  await inject("#site-footer", `${BASE}components/footer.html`);

  setActiveNav();
});





