const db = firebase.firestore();

// 🔐 Admin login and check if in Admin collection
function loginAdmin() {
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value.trim();

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(userCred => {
      const uid = userCred.user.uid;
      db.collection("Admin").doc(uid).get().then(doc => {
        if (doc.exists) {
          document.getElementById("loginSection").style.display = "none";
          document.getElementById("dashboard").style.display = "block";
          loadFlaggedReports();
          loadAnalytics();
          loadBannedUsers();
        } else {
          alert("Access denied. Not an admin.");
          firebase.auth().signOut();
        }
      });
    })
    .catch(error => alert("Login failed: " + error.message));
}

// 🚩 Load reports with flags > 0
function loadFlaggedReports() {
  const tbody = document.querySelector("#flaggedTable tbody");
  tbody.innerHTML = "";

  db.collection("Reports").get().then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();
      if (Array.isArray(data.flags) && data.flags.length > 0) {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${data.title}</td>
          <td>${data.category}</td>
          <td>${data.flags.length}</td>
          <td>${data.status}</td>
          <td>
            <button onclick="updateStatus('${doc.id}', 'In Progress')">In Progress</button>
            <button onclick="updateStatus('${doc.id}', 'Resolved')">Resolved</button>
            <button onclick="deleteReport('${doc.id}')">Delete</button>
          </td>
        `;
        tbody.appendChild(row);
      }
    });
  });
}

// ✅ Update status
function updateStatus(id, status) {
  db.collection("Reports").doc(id).update({ status }).then(() => {
    alert("Status updated.");
    loadFlaggedReports();
  });
}

// ✅ Delete report
function deleteReport(id) {
  db.collection("Reports").doc(id).delete().then(() => {
    alert("Report deleted.");
    loadFlaggedReports();
  });
}

// 📊 Analytics
function loadAnalytics() {
  db.collection("Reports").get().then(snapshot => {
    const total = snapshot.size;
    document.getElementById("totalReports").textContent = total;

    const categoryCounts = {};
    snapshot.forEach(doc => {
      const cat = doc.data().category;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const ul = document.getElementById("categoryCounts");
    ul.innerHTML = "";
    for (const [cat, count] of Object.entries(categoryCounts)) {
      const li = document.createElement("li");
      li.textContent = `${cat}: ${count}`;
      ul.appendChild(li);
    }
  });
}

// 🚫 Ban user by email
function banUser() {
  const email = document.getElementById("banUserEmail").value.trim().toLowerCase();
  if (!email) return alert("Enter a valid email address.");

  db.collection("BannedEmails").doc(email).set({ banned: true }).then(() => {
    alert("User banned successfully.");
    loadBannedUsers();
  }).catch(err => {
    console.error("Ban failed:", err);
    alert("Failed to ban user.");
  });
}

// 📋 Load banned users
function loadBannedUsers() {
  const ul = document.getElementById("bannedList");
  ul.innerHTML = "";

  db.collection("BannedEmails").get().then(snapshot => {
    snapshot.forEach(doc => {
      const li = document.createElement("li");
      li.innerHTML = `
        ${doc.id}
        <button onclick="unbanUser('${doc.id}')">Unban</button>
      `;
      ul.appendChild(li);
    });
  });
}

// 🗺️ View all reports on map
function showMap() {
  const mapContainer = document.createElement("div");
  mapContainer.id = "mapPopup";
  mapContainer.style = "position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999;background:white;";
  mapContainer.innerHTML = `
    <div style="padding:10px;">
      <label>Filter Category:</label>
      <select id="mapCategoryFilter">
        <option value="All">All</option>
        <option>Roads</option>
        <option>Lighting</option>
        <option>Water Supply</option>
        <option>Cleanliness</option>
        <option>Public Safety</option>
        <option>Obstructions</option>
      </select>
      <button onclick="document.body.removeChild(document.getElementById('mapPopup'))">❌ Close</button>
    </div>
    <div id="map" style="width:100%;height:90vh;"></div>
  `;
  document.body.appendChild(mapContainer);

  const map = L.map('map').setView([30.7333, 76.7794], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  function loadPins(category) {
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    db.collection("Reports").get().then(snapshot => {
      snapshot.forEach(doc => {
        const d = doc.data();
        if (category === "All" || d.category === category) {
          const marker = L.marker([d.lat, d.lng]).addTo(map);
          marker.bindPopup(`
            <b>${d.title}</b><br>
            ${d.description}<br>
            Category: ${d.category}<br>
            Status: ${d.status}<br>
            <img src="${d.photoBase64?.[0] || ''}" style="width:100px;height:auto;margin-top:5px;" />
          `);
        }
      });
    });
  }

  document.getElementById("mapCategoryFilter").addEventListener("change", (e) => {
    loadPins(e.target.value);
  });

  loadPins("All");
}

function unbanUser(email) {
  if (!confirm(`Are you sure you want to unban ${email}?`)) return;

  db.collection("BannedEmails").doc(email).delete()
    .then(() => {
      alert("User unbanned.");
      loadBannedUsers();
    })
    .catch(error => {
      console.error("Error unbanning user:", error);
      alert("Failed to unban user.");
    });
}
