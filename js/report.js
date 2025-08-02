const db = firebase.firestore();
const auth = firebase.auth();

let reportLat = 30.7333;
let reportLng = 76.7794;

document.addEventListener("DOMContentLoaded", () => {
  const locationDisplay = document.getElementById("locationDisplay");

  // Initialize Map
  const map = L.map('map').setView([reportLat, reportLng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  let marker = L.marker([reportLat, reportLng]).addTo(map);

  // Auto-location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      reportLat = pos.coords.latitude;
      reportLng = pos.coords.longitude;
      map.setView([reportLat, reportLng], 14);
      marker.setLatLng([reportLat, reportLng]);
      updateLocationDisplay();
    });
  }

  // Manual location selection
  map.on('click', function (e) {
    reportLat = e.latlng.lat;
    reportLng = e.latlng.lng;
    marker.setLatLng([reportLat, reportLng]);
    updateLocationDisplay();
  });

  function updateLocationDisplay() {
    locationDisplay.innerText = `${reportLat.toFixed(5)}, ${reportLng.toFixed(5)}`;
  }
});


function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

document.getElementById("reportForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const category = document.getElementById("category").value;
  const files = document.getElementById("photos").files;

  const user = auth.currentUser;
  if (!user) {
    alert("User not authenticated.");
    return;
  }

  if (files.length === 0 || files.length > 3) {
    alert("Please upload 1 to 3 images.");
    return;
  }

  const base64Images = [];
  for (const file of files) {
    const base64 = await toBase64(file);
    base64Images.push(base64);
  }

  await db.collection("Reports").add({
    title,
    description,
    category,
    photoBase64: base64Images,  // Now an array
    status: "Reported",
    lat: reportLat,
    lng: reportLng,
    createdBy: user.uid,
    createdByName: user.displayName || null,
    createdByEmail: user.email || null,
    flags: ["flagged"],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  alert("Issue submitted successfully!");
  document.getElementById("reportForm").reset();
});
