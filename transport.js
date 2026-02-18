// transport.js — stable, site-matching UX (null-safe)
(() => {
  const CENTRE = { name: "BBNW Activity Centre", lat: 53.7865897, lng: -2.8591008 };

  const MODE_DATA = {
    train: {
      title: "Train travel",
      badge: "Train",
      icon: "fa-train",
      intro: "Use Trainline or National Rail to plan your journey, then use a local taxi for the final leg.",
      origins: [
        { label: "Kirkham & Wesham Station", lat: 53.7869181, lng: -2.8833981 },
        { label: "Preston Railway Station", lat: 53.7555764, lng: -2.7065186 }
      ],
      showPlanners: true,
      showTaxis: true
    },
    plane: {
      title: "Flying in",
      badge: "Plane",
      icon: "fa-plane",
      intro: "Select an airport to preview the driving route to the Centre.",
      origins: [
        { label: "Manchester Airport (MAN)", lat: 53.3553569, lng: -2.2771620 },
        { label: "Liverpool John Lennon Airport (LPL)", lat: 53.3351164, lng: -2.8523459 }
      ],
      showPlanners: false,
      showTaxis: true
    },
    boat: {
      title: "Ferry & ports",
      badge: "Ferry",
      icon: "fa-ferry",
      intro: "For groups arriving from Ireland or mainland Europe, select a port to preview onward travel.",
      origins: [
        { label: "Port of Liverpool (Ireland routes)", lat: 53.4047297, lng: -2.9969977 },
        { label: "Loch Ryan Port (Stranraer) (Ireland routes)", lat: 54.9812368, lng: -5.03203 },
        { label: "Port of Dover (Europe routes)", lat: 51.126967, lng: 1.333365 }
      ],
      showPlanners: false,
      showTaxis: true
    },
    motorway: {
      title: "Road & coach",
      badge: "Road",
      icon: "fa-car",
      intro: "Use the route preview below for planning. Coaches travel by road too — check access and turning on arrival.",
      origins: [
        { label: "M55 Junction 3 (Kirkham/Wesham)", lat: 53.806512, lng: -2.888761 },
        { label: "M55 Junction 2 (A582)", lat: 53.800208, lng: -2.776306 },
        { label: "M6 Junction 32 (Preston)", lat: 53.803546, lng: -2.694536 }
      ],
      showPlanners: false,
      showTaxis: false
    },
    taxi: {
      title: "Local taxis",
      badge: "Taxi",
      icon: "fa-taxi",
      intro: "Select a local taxi firm below to view contact details.",
      origins: [],
      showPlanners: false,
      showTaxis: true
    }
  };

  const TAXIS = [
    { name: "Whiteside Taxis", area: "Fylde Coast (Kirkham/Wesham coverage)", phone: "+44 1253 711611", website: "https://www.whitesidetaxis.co.uk/", note: "Good all-round option for station pickups and group travel (check vehicle size when booking)." },
    { name: "Warton Village Taxis", area: "Warton / Kirkham area", phone: "+44 1772 633111", website: "https://www.facebook.com/wartonvillagetaxiservice/", note: "Local firm — useful for nearby pickups." },
    { name: "Kirkham Macs Taxis", area: "Kirkham", phone: "+44 1772 685658", website: "https://www.facebook.com/KirkhamMacsTaxis/", note: "Local option — call during advertised hours for bookings." },
    { name: "Drive VIP Cars", area: "Preston", phone: "+44 1772 556655", website: "https://www.drivevipcars.co.uk/", note: "Preston-based, useful for Preston Station pickups and longer journeys." },
    { name: "All Preston Taxis", area: "Preston", phone: "+44 1772 367660", website: "https://www.allprestontaxis.co.uk/", note: "Handy for Preston pickups." }
  ];

  const byId = (id) => document.getElementById(id);

  let map = null;
  let routingControl = null;
  let pendingOrigin = null;
  let lastRoute = { origin: null, route: null };

  // taxi block docking (so taxi doesn’t feel disconnected)
  let taxiHomeParent = null;
  let taxiHomeNext = null;
let leftHomeHTML = null;

  function init() {
    const mapEl = byId("transportMap");
    if (!mapEl) return;

    // remember original taxi placement
    const taxiBlock = byId("taxiBlock");
    if (taxiBlock) {
      taxiHomeParent = taxiBlock.parentNode;
      taxiHomeNext = taxiBlock.nextSibling;
    }
    const leftPanel = byId("leftPanel");
if (leftPanel) leftHomeHTML = leftPanel.innerHTML;


    // Mode buttons
    document.querySelectorAll(".mode-card").forEach((btn) => {
      btn.addEventListener("click", () => setMode(btn.dataset.mode));
      btn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          btn.click();
        }
      });
    });

    // Clear
    byId("btnClear")?.addEventListener("click", () => clearRoute(true));

    // Copy route
    byId("btnCopyRoute")?.addEventListener("click", () => copyRouteSteps());

    // Taxi list
    renderTaxiList();

    // Start mode (remembered)
    let startMode = "motorway";
    try { startMode = localStorage.getItem("bbnw_transport_mode") || "motorway"; } catch (e) {}
    setMode(startMode);

    // Map init
    if (!window.L) return;
    if (!L.Routing || !L.Routing.control) return;

    map = L.map(mapEl, { scrollWheelZoom: false }).setView([CENTRE.lat, CENTRE.lng], 9);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    L.marker([CENTRE.lat, CENTRE.lng]).addTo(map).bindPopup(CENTRE.name);

    if (pendingOrigin) {
      const o = pendingOrigin;
      pendingOrigin = null;
      showRoute(o);
    }
  }

  function setMode(mode) {
    try { localStorage.setItem("bbnw_transport_mode", mode); } catch (e) {}

    const m = MODE_DATA[mode] || MODE_DATA.motorway;

    document.querySelectorAll(".mode-card").forEach((b) => {
      const active = b.dataset.mode === mode;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });

    byId("leftTitle") && (byId("leftTitle").textContent = m.title);

    const badge = byId("modeBadge");
    if (badge) badge.innerHTML = `<i class="fa-solid ${m.icon}" aria-hidden="true"></i> ${m.badge}`;

    byId("leftIntro") && (byId("leftIntro").textContent = m.intro);

    const planner = byId("plannerLinks");
    if (planner) planner.hidden = !m.showPlanners;

    const taxiBlock = byId("taxiBlock");
    if (taxiBlock) taxiBlock.hidden = !m.showTaxis;

    // Taxi mode layout: dock taxi block into main row, hide map + route column cleanly
    // Taxi mode layout: put taxi block into the LEFT panel, hide map + route column
const leftCol  = byId("leftCol");
const leftPanel = byId("leftPanel");
const mapCard  = byId("mapCard");
const routeCol = byId("routeCol");

if (mode === "taxi") {
  // hide map + route details
  if (mapCard) mapCard.hidden = true;
  if (routeCol) routeCol.style.display = "none";

  // make left column full width
  if (leftCol) {
    leftCol.classList.remove("col-lg-3");
    leftCol.classList.add("col-lg-12");
  }

  // clear route UI
  clearRoute(true);

  // replace left panel content with taxi block
  const taxiBlock = byId("taxiBlock");
  if (leftPanel && taxiBlock) {
    // restore original left markup if needed (safety)
    if (leftHomeHTML && leftPanel.innerHTML !== leftHomeHTML) {
      leftPanel.innerHTML = leftHomeHTML;
    }

    // now overwrite left panel with taxi panel
    leftPanel.innerHTML = "";
    leftPanel.appendChild(taxiBlock);
    taxiBlock.hidden = false;
  }

  // hide planners row if you want it clean
  const planner = byId("plannerLinks");
  if (planner) planner.hidden = true;

  return;
} else {
  // restore map + route details
  if (mapCard) mapCard.hidden = false;
  if (routeCol) routeCol.style.display = "";

  // restore left col width
  if (leftCol) {
    leftCol.classList.remove("col-lg-12");
    leftCol.classList.add("col-lg-3");
  }

  // restore left panel original HTML
  if (leftPanel && leftHomeHTML) {
    leftPanel.innerHTML = leftHomeHTML;
  }

  // restore taxi block to its original parent in helpers area
  const taxiBlock = byId("taxiBlock");
  if (taxiBlock && taxiHomeParent) {
    if (taxiHomeNext) taxiHomeParent.insertBefore(taxiBlock, taxiHomeNext);
    else taxiHomeParent.appendChild(taxiBlock);
  }

  // restore planners visibility based on mode setting (below)
}


    // Origins
    const wrap = byId("originButtons");
    if (!wrap) return;

    wrap.innerHTML = "";
    m.origins.forEach((o, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "route-btn" + (idx === 0 ? " is-active" : "");
      btn.textContent = o.label;

      btn.addEventListener("click", () => {
        wrap.querySelectorAll(".route-btn").forEach((x) => x.classList.remove("is-active"));
        btn.classList.add("is-active");
        showRoute(o);
      });

      wrap.appendChild(btn);
    });

    wrap.querySelector(".route-btn")?.click();
  }

  function showRoute(origin) {
    if (!map) {
      pendingOrigin = origin;
      return;
    }

    const routePanel = byId("routePanel");
    if (routePanel) routePanel.innerHTML = '<div class="small-muted">Calculating route…</div>';

    byId("routeSummary") && (byId("routeSummary").textContent = `Calculating route from: ${origin.label}…`);
    byId("routeMeta") && (byId("routeMeta").textContent = "—");

    lastRoute.origin = origin;
    lastRoute.route = null;
    disableRouteMapsBtn();

    if (routingControl) {
      try { map.removeControl(routingControl); } catch (e) {}
      routingControl = null;
    }

    routingControl = L.Routing.control({
      waypoints: [L.latLng(origin.lat, origin.lng), L.latLng(CENTRE.lat, CENTRE.lng)],
      router: L.Routing.osrmv1({ serviceUrl: "https://router.project-osrm.org/route/v1", profile: "car" }),
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      createMarker: () => null,
      show: false
    })
      .on("routesfound", (e) => {
        const r = e.routes?.[0];
        if (!r) return;

        const km = (r.summary.totalDistance / 1000).toFixed(1);
        const mins = Math.round(r.summary.totalTime / 60);

        byId("routeSummary") && (byId("routeSummary").textContent = `${origin.label} → Centre • ${km} km • ~${mins} min (estimate)`);
        byId("routeMeta") && (byId("routeMeta").textContent = `${km} km • ~${mins} min`);

        lastRoute.route = r;
        renderSteps(r);      // ALL steps
        enableRouteMapsBtn(origin);
      })
      .on("routingerror", (err) => {
        console.error("Routing error:", err);
        byId("routeSummary") && (byId("routeSummary").textContent = "Unable to calculate route.");
        byId("routeMeta") && (byId("routeMeta").textContent = "—");
        if (routePanel) routePanel.innerHTML = '<div class="text-danger small">Unable to calculate route.</div>';
        disableRouteMapsBtn();
      })
      .addTo(map);

    try { routingControl.getContainer().style.display = "none"; } catch (e) {}
  }

  function renderSteps(route) {
    const routePanel = byId("routePanel");
    if (!routePanel) return;

    const inst = route.instructions || [];
    if (!inst.length) {
      routePanel.innerHTML = "<div class='small-muted'>No detailed steps available.</div>";
      return;
    }

    const ol = document.createElement("ol");
    ol.className = "route-steps";

    inst.forEach((it) => {
      const li = document.createElement("li");
      li.textContent = it.text || it.name || "Continue";
      ol.appendChild(li);
    });

    routePanel.innerHTML = "";
    routePanel.appendChild(ol);
  }

  function enableRouteMapsBtn(origin) {
    const btn = byId("btnOpenRouteMaps");
    if (!btn) return;

    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin.lat + "," + origin.lng)}&destination=${encodeURIComponent(CENTRE.lat + "," + CENTRE.lng)}&travelmode=driving`;

    btn.href = url;
    btn.setAttribute("aria-disabled", "false");
    btn.style.pointerEvents = "";
    btn.style.opacity = "";
  }

  function disableRouteMapsBtn() {
    const btn = byId("btnOpenRouteMaps");
    if (!btn) return;
    btn.href = "#";
    btn.setAttribute("aria-disabled", "true");
    btn.style.pointerEvents = "none";
    btn.style.opacity = ".6";
  }

  function clearRoute(clearText) {
    if (routingControl) {
      try { map.removeControl(routingControl); } catch (e) {}
      routingControl = null;
    }
    disableRouteMapsBtn();

    if (clearText) {
      byId("routeSummary") && (byId("routeSummary").textContent = "—");
      byId("routeMeta") && (byId("routeMeta").textContent = "—");
      byId("routePanel") && (byId("routePanel").innerHTML = "<div class='small-muted'>—</div>");
    }
  }

  async function copyRouteSteps() {
    const steps = Array.from(document.querySelectorAll(".route-steps li"))
      .map(li => li.textContent.trim())
      .filter(Boolean)
      .join("\n");

    if (!steps) return;

    try {
      await navigator.clipboard.writeText(steps);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = steps;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  }

  function renderTaxiList() {
    const wrap = byId("taxiList");
    if (!wrap) return;

    wrap.innerHTML = "";
    TAXIS.forEach((t, idx) => {
      const div = document.createElement("div");
      div.className = "taxi-item";
      div.tabIndex = 0;
      div.dataset.idx = String(idx);
      div.innerHTML = `<div class="name">${escapeHtml(t.name)}</div><div class="meta">${escapeHtml(t.area)}</div>`;

      div.addEventListener("click", () => selectTaxi(idx));
      div.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectTaxi(idx);
        }
      });

      wrap.appendChild(div);
    });

    const details = byId("taxiDetails");
    if (details) details.hidden = true;
  }

  function selectTaxi(idx) {
    const t = TAXIS[idx];
    if (!t) return;

    document.querySelectorAll(".taxi-item").forEach((el) => {
      el.classList.toggle("is-active", Number(el.dataset.idx) === idx);
    });

    const card = byId("taxiDetails");
    if (card) card.hidden = false;

    byId("taxiName") && (byId("taxiName").textContent = t.name);
    byId("taxiArea") && (byId("taxiArea").textContent = t.area);

    const call = byId("taxiCall");
    if (call) {
      call.href = `tel:${t.phone.replace(/\s+/g, "")}`;
      call.textContent = `Call ${t.phone.replace("+44", "0")}`;
    }

    const site = byId("taxiSite");
    if (site) site.href = t.website;

    byId("taxiNote") && (byId("taxiNote").textContent = t.note || "");
    byId("taxiDetails")?.scrollIntoView({ behavior: "smooth", block: "nearest" });

  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (s) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[s]));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

