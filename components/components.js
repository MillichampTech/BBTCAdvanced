/**
 * components.js
 * - Loads shared nav + footer into placeholders (#site-nav / #site-footer)
 * - Replaces {{BASE}} tokens inside injected HTML
 */

function siteRoot() {
  // e.g. "/BBTCAdvanced/pages/terms.html" -> "/BBTCAdvanced/"
  const parts = window.location.pathname.split("/").filter(Boolean);

  // If hosted at domain root (no repo), return "/"
  if (parts.length === 0) return "/";

  // If github pages project site OR you're serving from /BBTCAdvanced/ locally
  // then the first segment is the project folder
  const isProjectHost =
    /github\.io$/i.test(window.location.hostname) ||
    (parts[0] && parts[0].toLowerCase() === "bbtcadvanced");

  return isProjectHost ? `/${parts[0]}/` : "/";
}

const ROOT = siteRoot();

async function inject(selector, url) {
  const host = document.querySelector(selector);
  if (!host) return;

  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    let html = await res.text();

    // Replace {{BASE}} with ROOT (site root, not relative ../)
    html = html.replaceAll("{{BASE}}", ROOT);
    host.innerHTML = html;
  } catch (err) {
    console.error(`[components] Failed to load ${url}`, err);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("[components] ROOT =", ROOT);

  await inject("#site-nav", `${ROOT}components/nav.html`);
  await inject("#site-footer", `${ROOT}components/footer.html`);
});




