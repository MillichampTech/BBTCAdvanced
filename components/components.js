/**
 * components.js
 * - Loads shared nav + footer into placeholders (#site-nav / #site-footer)
 * - Fixes relative links via {{BASE}} token
 * - Adds active nav highlighting (page + hash)
 *
 * Works on static hosting as long as files are served over http(s)
 * (fetch won't work from file:// in some browsers).
 */

(function () {
  function basePrefix() {
    // Generic: compute how many folder levels deep the current page is from site root.
    // Examples:
    //   /index.html               -> ""
    //   /pages/archery.html       -> "../"
    //   /activities/water/xyz.html -> "../../"
    const path = window.location.pathname || "/";
    const cleaned = path.replace(/^\//, "");
    if (!cleaned || cleaned === "" || cleaned === "index.html") return "";

    const parts = cleaned.split("/");
    // If path ends with "/" treat as folder index
    const depth = path.endsWith("/") ? parts.length : Math.max(parts.length - 1, 0);

    return "../".repeat(depth);
  }


  async function inject(selector, url) {
    const host = document.querySelector(selector);
    if (!host) return;

    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);

    let html = await res.text();

    // Token replacement for correct relative URLs
    html = html.replaceAll("{{BASE}}", basePrefix());

    host.innerHTML = html;
  }

  function normalizePath(pathname) {
    // Treat "/" as "/index.html"
    if (!pathname || pathname === "/") return "/index.html";
    return pathname;
  }

  function setActiveNav() {
    const links = document.querySelectorAll("[data-nav]");
    if (!links.length) return;

    links.forEach((a) => a.classList.remove("active"));

    const path = normalizePath(window.location.pathname);
    const hash = window.location.hash || "";

    // Home + in-page anchors
    if (path.endsWith("/index.html") || path.endsWith("index.html")) {
      if (hash === "#about") {
        document.querySelectorAll('[data-nav="centre"]').forEach((a) => a.classList.add("active"));
        return;
      }
      if (hash === "#programs") {
        document.querySelectorAll('[data-nav="centre"]').forEach((a) => a.classList.add("active"));
        return;
      }
      document.querySelectorAll('[data-nav="home"]').forEach((a) => a.classList.add("active"));
      return;
    }

    const file = (path.split("/").pop() || "").toLowerCase();

    const centrePages = [
      "the-centre.html",
      "northwest-district.html",
      "pricing.html",
      "prices-2026.html",
      "prices-2027.html",
      "who-we-are.html",
      "values-and-mission.html",
      "organisation.html",
      "history.html",
      "how-to-support-us.html",
      "donation.html",
      "donate-items.html",
      "offer-services.html",
      "volunteer.html",
    ];

    const accommodationPages = [
      "accommodation.html",
      "centenary.html",
      "stedfast.html",
      "camping.html",
      "camp.html",
      "sportsbarn.html",
      "food.html",
    ];

    const activityPages = [
      "activities.html",
      "archery.html",
      "climbing.html",
      "caving-experience.html",
      "trim-trail.html",
      "swimming.html",
      "lazer-tag.html",
    ];

    const amenityPages = [
      "local-amenities.html",
      "local_directory.html",
      "attractions.html",
      "transport.html",
      "churches.html",
      "all_churches.html",
      "companies.html",
      "medical.html",
    ];

    if (centrePages.includes(file)) {
      document.querySelectorAll('[data-nav="centre"]').forEach((a) => a.classList.add("active"));
      return;
    }

    if (accommodationPages.includes(file)) {
      document.querySelectorAll('[data-nav="accommodation"]').forEach((a) => a.classList.add("active"));
      return;
    }

    if (activityPages.includes(file)) {
      document.querySelectorAll('[data-nav="activities"]').forEach((a) => a.classList.add("active"));
      return;
    }

    if (amenityPages.includes(file)) {
      document.querySelectorAll('[data-nav="amenities"]').forEach((a) => a.classList.add("active"));
      return;
    }

    if (file === "contact.html") {
      document.querySelectorAll('[data-nav="contact"]').forEach((a) => a.classList.add("active"));
      return;
    }
    // Fallback: highlight Home
    document.querySelectorAll('[data-nav="home"]').forEach((a) => a.classList.add("active"));
  }

  function setFooterYear() {
    const year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
  }
  function hoistSharedOverlaysToBody() {
    const ids = ["accessModal", "a11y-live", "theme-chime"];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.parentElement !== document.body) {
        document.body.appendChild(el);
      }
    });
  }

  async function boot() {
    try {
      const base = basePrefix();

      await Promise.all([
        inject("#site-nav", base + "components/nav.html"),
        inject("#site-footer", base + "components/footer.html"),
      ]);

      // ✅ Move modal + live region + chime out of header/nav stacking contexts
      hoistSharedOverlaysToBody();


      setFooterYear();
      setActiveNav();

      // ✅ Let other scripts (theme.js) know components are available
      document.dispatchEvent(new CustomEvent("components:loaded", { detail: { base } }));

      // Keep active state in sync on hash / navigation changes
      window.addEventListener("hashchange", setActiveNav);
      window.addEventListener("popstate", setActiveNav);
    } catch (e) {
      console.warn("⚠️ Component load failed:", e);
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();

