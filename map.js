// =======================================
// Dynamic Local Map + Routing Script (Version 2.4)
// Default Start = Boys Brigade Centre
// Features:
// - Use My Location
// - Custom Start Input
// - Travel Mode Dropdown
// - Reverse Route Button
// =======================================

// Detect which JSON file to load based on page name
const pageName = window.location.pathname.split("/").pop().replace(".html", "");
const dataUrl = `../json/${pageName}.json`;

let map, routingControl;
let activeMarker = null;
let routeLayerGroup = L.layerGroup();
const defaultStart = [53.7863, -2.8586]; // Boys Brigade Centre Kirkham PR4 3SS

let userStart = [...defaultStart]; // current starting point
let currentMode = "driving";
let activeDestination = null; // clicked destination

// =======================================
// Initialize Map
// =======================================
function initMap() {
  map = L.map("map").setView(defaultStart, 11);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  // Add default marker (Boys Brigade)
  L.marker(defaultStart)
    .addTo(map)
    .bindPopup("<b>Boys Brigade Centre</b><br>Kirkham PR4 3SS");

  routeLayerGroup.addTo(map);
  setupStartControls();
  loadAttractions();
}

// =======================================
// Setup Start Controls + Travel Mode Selector
// =======================================
function setupStartControls() {
  const controlBox = document.getElementById("start-controls");
  if (!controlBox) return;

  controlBox.innerHTML = `
    <div class="glass-bar d-flex flex-wrap align-items-center justify-content-center gap-2 p-2 rounded-4 shadow-sm">
      <button id="useDefaultStart" class="glass-btn">🏠 Boys Brigade</button>
      <button id="useMyLocation" class="glass-btn">🧭 My Location</button>
      <div class="d-flex align-items-center glass-input">
        <input id="customStartInput" type="text" class="form-control glass-input-field" placeholder="Enter start address...">
        <button id="useCustomStart" class="glass-btn-sm">✔</button>
      </div>
      <button id="reverseRoute" class="glass-btn danger">↔ Reverse</button>
      <div id="startStatus" class="small text-light ms-2 text-nowrap"></div>
    </div>
  `;

  const status = document.getElementById("startStatus");

  // --- Default start ---
  document.getElementById("useDefaultStart").addEventListener("click", () => {
    userStart = [...defaultStart];
    map.setView(userStart, 11);
    status.textContent = "✅ Start set to Boys Brigade Centre";
  });

  // --- My location ---
  document.getElementById("useMyLocation").addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported by this browser.");
      return;
    }
    status.textContent = "📡 Getting your location...";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userStart = [pos.coords.latitude, pos.coords.longitude];
        L.marker(userStart).addTo(map).bindPopup("Your location").openPopup();
        map.setView(userStart, 12);
        status.textContent = "✅ Using your current location";
      },
      () => (status.textContent = "❌ Unable to detect location")
    );
  });

  // --- Custom input ---
  document.getElementById("useCustomStart").addEventListener("click", async () => {
    const query = document.getElementById("customStartInput").value.trim();
    if (!query) return alert("Enter a location first.");
    status.textContent = "🔍 Searching...";
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!data.length) return (status.textContent = "❌ Not found.");
      userStart = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      L.marker(userStart).addTo(map).bindPopup("Custom start").openPopup();
      map.setView(userStart, 12);
      status.textContent = `✅ Start set to "${query}"`;
    } catch {
      status.textContent = "❌ Address lookup failed";
    }
  });

  // --- Reverse Route ---
  document.getElementById("reverseRoute").addEventListener("click", () => {
    if (!activeDestination) {
      alert("Please select a destination first.");
      return;
    }

    // Swap start and destination
    const temp = [...userStart];
    userStart = [activeDestination.lat, activeDestination.lng];
    activeDestination.lat = temp[0];
    activeDestination.lng = temp[1];
    activeDestination.name = "Reversed Route";

    if (routingControl) {
      map.removeControl(routingControl);
      routingControl = null;
    }

    status.textContent = "↔ Route reversed.";
    showRoute(activeDestination);
  });
}


// =======================================
// Load JSON Data
// =======================================
async function loadAttractions() {
  try {
    const response = await fetch(dataUrl);
    const attractions = await response.json();
    populateButtons(attractions);
  } catch (err) {
    console.error("Error loading JSON:", err);
  }
}

// =======================================
// Create Location Buttons
// =======================================
function populateButtons(attractions) {
  const buttonContainer = document.getElementById("church-buttons");
  buttonContainer.innerHTML = "";

  if (!attractions || attractions.length === 0) {
    buttonContainer.innerHTML = "<p class='text-muted text-center'>No locations found.</p>";
    return;
  }

  attractions.forEach((item) => {
    const btn = document.createElement("button");
    btn.className = "btn btn-glass church-btn";
    btn.textContent = item.name;

    btn.addEventListener("click", () => {
      document.querySelectorAll(".church-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const mapSection = document.getElementById("map-section");
      const offset = -350;
      const y = mapSection.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: "smooth" });

      showAttractionInfo(item);
      showRoute(item);
    });

    const col = document.createElement("div");
    col.className = "col";
    col.appendChild(btn);
    buttonContainer.appendChild(col);
  });
}

// =======================================
// Show Attraction Info
// =======================================
function showAttractionInfo(item) {
  const infoBox = document.getElementById("attractionInfoBox");
  infoBox.classList.remove("visible");
  infoBox.classList.add("fade-box");

  infoBox.innerHTML = `
    <h5>${item.name}</h5>
    <p><strong>Type:</strong> ${item.type || "—"}</p>
    <p><strong>Address:</strong> ${item.address || "—"}</p>
    <p><strong>Phone:</strong> ${item.phone || "—"}</p>
    <p><strong>Website:</strong> <a href="${item.website || "#"}" target="_blank">${item.website || "N/A"}</a></p>
    <p>${item.description || ""}</p>
  `;

  setTimeout(() => infoBox.classList.add("visible"), 50);
}

// =======================================
// Routing Logic (OSRM Public API)
// =======================================
function showRoute(item) {
  const routeBox = document.getElementById("routeInfoBox");
  if (!routeBox) return;

  // Always keep it visible
  routeBox.classList.add("visible");
  routeBox.classList.remove("fade-box");
  routeBox.innerHTML = `<p class="text-muted text-center mb-0">Calculating ${currentMode} route...</p>`;

  if (routingControl) {
    try { map.removeControl(routingControl); } catch (e) {}
  }

  activeDestination = { lat: item.lat, lng: item.lng, name: item.name };

  const profile = {
    driving: "car",
    cycling: "bike",
    walking: "foot"
  }[currentMode] || "car";

  routingControl = L.Routing.control({
    waypoints: [
      L.latLng(userStart[0], userStart[1]),
      L.latLng(item.lat, item.lng)
    ],
    router: L.Routing.osrmv1({
      serviceUrl: 'https://router.project-osrm.org/route/v1',
      profile: profile
    }),
    routeWhileDragging: false,
    addWaypoints: false,
    draggableWaypoints: false,
    fitSelectedRoutes: true,
    lineOptions: {
      styles: [{ color: '#28a745', weight: 5, opacity: 0.9 }]
    },
    createMarker: (i, wp) => L.marker(wp.latLng).bindPopup(i === 0 ? "Start" : item.name),
    show: false
  })
  .on("routesfound", function (e) {
    const route = e.routes[0];
    const distance = (route.summary.totalDistance / 1000).toFixed(1);
    const time = Math.round(route.summary.totalTime / 60);

    // ✅ Force visible again after routing
    routeBox.classList.add("visible");
    routeBox.classList.remove("fade-box");

    routeBox.innerHTML = `
      <h5 class="fw-bold mb-2">Route to ${item.name}</h5>
      <p><strong>Mode:</strong> ${currentMode}</p>
      <p><strong>Distance:</strong> ${distance} km</p>
      <p><strong>Estimated Time:</strong> ${time} min</p>
      <hr>
      <div class="small text-muted">Turn-by-turn directions:</div>
      <ol class="small ps-3" id="routeSteps"></ol>
    `;

    const stepsList = document.getElementById("routeSteps");
    const instructions = route.instructions || [];

    if (instructions.length === 0) {
      stepsList.innerHTML = "<li>No detailed steps available.</li>";
    } else {
      instructions.forEach((inst) => {
        const li = document.createElement("li");
        li.textContent = inst.text || inst.name || "Continue";
        stepsList.appendChild(li);
      });
    }
  })
  .on("routingerror", function (err) {
    console.error("Routing error:", err);
    // ✅ Keep the box visible and show message
    routeBox.classList.add("visible");
    routeBox.classList.remove("fade-box");
    routeBox.innerHTML = `<p class="text-danger text-center">Unable to calculate route. Please check connection or try again.</p>`;
  })
  .addTo(map);

  try {
    routingControl.getContainer().style.display = "none";
  } catch (e) {}
}



// =======================================
// Back to Top
// =======================================
const backToTopBtn = document.getElementById("backToTopBtn");
window.addEventListener("scroll", () => {
  backToTopBtn.classList.toggle("d-none", window.scrollY < 300);
});
backToTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// =======================================
// Init
// =======================================
document.addEventListener("DOMContentLoaded", initMap);
