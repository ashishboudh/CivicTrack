const db = firebase.firestore();
const auth = firebase.auth();

let allReports = [];
let currentUser = null;
let currentLat = null;
let currentLng = null;
let currentPage = 1;
const perPage = 6;
let isFirstLoad = true;

auth.onAuthStateChanged(user => {
  currentUser = user;
  const nameEl = document.getElementById("usernameDisplay");
  if (user) {
    nameEl.innerHTML = `👤 ${user.displayName || 'You'}`;
    nameEl.onclick = () => window.location.href = "profile.html";
  } else {
    nameEl.textContent = "Guest";
    nameEl.onclick = null;
  }
  document.getElementById("loginBtn").style.display = user ? "none" : "inline-block";
});

// Get user location
navigator.geolocation.getCurrentPosition(
  pos => {
    currentLat = pos.coords.latitude;
    currentLng = pos.coords.longitude;
    console.log("Current location:", currentLat, currentLng);
    loadReports();
  },
  err => {
    console.warn("Geolocation denied. Using default (Chandigarh).");
    currentLat = 30.7333;
    currentLng = 76.7794;
    loadReports();
  }
);

async function loadReports() {
  try {
    const snapshot = await db.collection("Reports").orderBy("createdAt", "desc").get();
    allReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log("Reports loaded:", allReports.length);
    applyFilters();
  } catch (err) {
    console.error("Error fetching reports:", err);
  }
}

document.getElementById("applyFilters").addEventListener("click", () => {
  currentPage = 1;
  applyFilters();
});

async function applyFilters() {
  const category = document.getElementById("filterCategory").value;
  const status = document.getElementById("filterStatus").value;
  const distance = parseFloat(document.getElementById("filterDistance").value);
  const search = document.getElementById("searchBox").value.toLowerCase();
  const locationText = document.getElementById("locationInput").value.trim();

  if (isFirstLoad && currentLat !== null && currentLng !== null) {
    isFirstLoad = false;
    document.getElementById("filterDistance").value = "5";
  }

  let filterLat = currentLat;
  let filterLng = currentLng;

  if (locationText) {
    const result = await geocodeAddress(locationText);
    if (result) {
      filterLat = result.lat;
      filterLng = result.lng;
    } else {
      alert("Location not found. Showing based on current location.");
    }
  }

  const filtered = allReports.filter(r => {
    const matchCategory = !category || r.category === category;
    const matchStatus = !status || r.status === status;
    const matchSearch = !search || r.title.toLowerCase().includes(search);
    const d = haversine(r.lat, r.lng, filterLat, filterLng);
    const matchDistance = d <= distance;
    return matchCategory && matchStatus && matchSearch && matchDistance;
  });

  renderReports(filtered);
}

function renderReports(reports) {
  const grid = document.getElementById("issueGrid");
  const pagination = document.getElementById("pagination");
  grid.innerHTML = "";
  pagination.innerHTML = "";

  const totalPages = Math.ceil(reports.length / perPage);
  const paginated = reports.slice((currentPage - 1) * perPage, currentPage * perPage);

  for (const r of paginated) {
    const img = r.photoBase64?.[0] || 'https://via.placeholder.com/250x150';
    const card = document.createElement("div");
    card.className = "issue-card";
    card.innerHTML = `
      <a href="report_details.html?id=${r.id}" class="report-link">
        <img src="${img}" alt="Issue Image" />
        <div class="info">
          <div class="tags">
            <span class="tag">${r.category}</span>
            <span class="status ${r.status.toLowerCase().replace(" ", "-")}">${r.status}</span>
          </div>
          <h3>${r.title}</h3>
          <p>${r.description.slice(0, 60)}...</p>
          <small>📍 ${r.lat.toFixed(2)}, ${r.lng.toFixed(2)}</small>
        </div>
      </a>
    `;
    grid.appendChild(card);
  }

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("span");
    btn.className = "page" + (i === currentPage ? " active" : "");
    btn.textContent = i;
    btn.onclick = () => {
      currentPage = i;
      renderReports(reports);
    };
    pagination.appendChild(btn);
  }
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function toRad(deg) { return deg * Math.PI / 180; }

async function geocodeAddress(address) {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
  const data = await response.json();
  if (data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon)
    };
  }
  return null;
}
