const container = document.getElementById('container');
const zoneViewer = document.getElementById('zoneViewer');
let zoneFrame = null; // We'll create it properly
const searchBar = document.getElementById('searchBar');
const sortOptions = document.getElementById('sortOptions');

const zonesURL = "https://cdn.jsdelivr.net/gh/NikeGtag/data@main/games.json";
const coverURL = "https://cdn.jsdelivr.net/gh/gn-math/covers@main";
const htmlURL = "https://cdn.jsdelivr.net/gh/gn-math/html@main";

let zones = [];
let popularityData = {};
let currentZone = null;

// Force modal into layout on page load so elements are never null
document.addEventListener("DOMContentLoaded", () => {
    zoneViewer.style.display = "none"; // triggers reflow → #zoneName & #zoneAuthor exist
});

async function listZones() {
    try {
        const response = await fetch(zonesURL + "?t=" + Date.now());
        const json = await response.json();
        zones = json;
        await fetchPopularity();
        sortZones();

        // Auto-open game if ?id= is in URL
        const params = new URLSearchParams(location.search);
        const id = params.get('id');
        if (id) {
            const zone = zones.find(z => z.id + '' === id + '');
            if (zone) openZone(zone);
        }
    } catch (err) {
        container.innerHTML = `Error loading games: ${err}`;
    }
}

async function fetchPopularity() {
    try {
        const res = await fetch("https://data.jsdelivr.com/v1/stats/packages/gh/gn-math/html@main/files?period=year");
        const data = await res.json();
        data.forEach(file => {
            const match = file.name.match(/\/(\d+)\.html$/);
            if (match) popularityData[parseInt(match[1])] = file.hits.total;
        });
    } catch (e) { /* ignore */ }
}

function sortZones() {
    const by = sortOptions.value;
    if (by === 'name') zones.sort((a, b) => a.name.localeCompare(b.name));
    else if (by === 'id') zones.sort((a, b) => a.id - b.id);
    else if (by === 'popular') zones.sort((a, b) => (popularityData[b.id] || 0) - (popularityData[a.id] || 0));

    // Pinned zones (id = -1) always on top
    zones.sort((a, b) => (a.id === -1 ? -1 : b.id === -1 ? 1 : 0));

    displayZones(zones);
}

function displayZones(list) {
    container.innerHTML = "";
    list.forEach(zone => {
        const div = document.createElement("div");
        div.className = "zone-item";
        div.onclick = () => openZone(zone);

        const img = document.createElement("img");
        img.src = zone.cover.replace("{COVER_URL}", coverURL).replace("{HTML_URL}", htmlURL);
        img.loading = "lazy";
        div.appendChild(img);

        const btn = document.createElement("button");
        btn.textContent = zone.name;
        btn.onclick = e => { e.stopPropagation(); openZone(zone); };
        div.appendChild(btn);

        container.appendChild(div);
    });

    document.getElementById("zoneCount").textContent =
        list.length ? `Zones Loaded: ${list.length}` : "No zones found";
}

function filterZones() {
    const q = searchBar.value.toLowerCase();
    const filtered = zones.filter(z => z.name.toLowerCase().includes(q));
    displayZones(filtered);
}

// MAIN FIX — BULLETPROOF openZone
function openZone(file) {
    currentZone = file;

    if (file.url.startsWith("http")) {
        window.open(file.url, "_blank");
        return;
    }

    // Force modal visible for 1 frame so elements exist
    zoneViewer.style.display = "block";

    const url = file.url.replace("{COVER_URL}", coverURL).replace("{HTML_URL}", htmlURL);

    fetch(url + "?t=" + Date.now())
        .then(r => {
            if (!r.ok) throw new Error("Not found");
            return r.text();
        })
        .then(html => {
            // Create/recreate iframe cleanly
            if (zoneFrame && zoneFrame.parentNode) zoneFrame.remove();
            zoneFrame = document.createElement("iframe");
            zoneFrame.id = "zoneFrame";
            zoneViewer.appendChild(zoneFrame);

            zoneFrame.contentDocument.open();
            zoneFrame.contentDocument.write(html);
            zoneFrame.contentDocument.close();

            // These will NEVER be null now
            document.getElementById("zoneName").textContent = file.name || "Untitled Game";

            const authorEl = document.getElementById("zoneAuthor");
            authorEl.textContent = file.author ? "by " + file.author : "by Unknown";
            authorEl.href = file.authorLink || "#";

            zoneViewer.scrollTop = 0;
        })
        .catch(err => {
            alert("Failed to load game: " + err);
            closeZone();
        });
}

function closeZone() {
    zoneViewer.style.display = "none";
    if (zoneFrame && zoneFrame.parentNode) {
        zoneFrame.remove();
        zoneFrame = null;
    }
    currentZone = null;
}

function fullscreenZone() {
    if (!zoneFrame) return;
    const el = zoneFrame;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
}

function aboutBlank() {
    if (!currentZone) return alert("No game open");
    const url = currentZone.url.replace("{COVER_URL}", coverURL).replace("{HTML_URL}", htmlURL);
    const win = window.open("about:blank", "_blank");
    fetch(url + "?t=" + Date.now())
        .then(r => r.text())
        .then(html => {
            if (win) {
                win.document.open();
                win.document.write(html);
                win.document.close();
                win.document.title = currentZone.name || "Game";
            }
        });
}

function downloadZone() {
    if (!currentZone) return alert("No game open");
    const url = currentZone.url.replace("{HTML_URL}", htmlURL) + "?t=" + Date.now();
    fetch(url)
        .then(r => r.text())
        .then(text => {
            const blob = new Blob([text], { type: "text/html" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = (currentZone.name || "game").replace(/[^a-z0-9]/gi, '_') + ".html";
            a.click();
            URL.revokeObjectURL(a.href);
        });
}

// Settings & UI
function darkMode() {
    document.body.classList.toggle("dark-mode");
}

function cloakName(str) {
    document.title = str.trim() || "homework bro bro";
}

function cloakIcon(url) {
    const link = document.querySelector("link[rel='icon']") || document.createElement("link");
    link.rel = "icon";
    link.href = url.trim() || "favicon.png";
    document.head.appendChild(link);
}

function tabCloak() {
    closePopup();
    document.getElementById("popupTitle").textContent = "Tab Cloak";
    document.getElementById("popupBody").innerHTML = `
        <label>Title:</label><br>
        <input type="text" placeholder="New tab title..." oninput="cloakName(this.value)"><br><br>
        <label>Icon URL:</label><br>
        <input type="text" placeholder="https://example.com/icon.png" oninput="cloakIcon(this.value)">
    `;
    document.getElementById("popupOverlay").style.display = "flex";
}

function showContact() {
    document.getElementById("popupTitle").textContent = "Contact";
    document.getElementById("popupBody").innerHTML = `
        <p>Discord: <a href="https://discord.gg/NAFw4ykZ7n" target="_blank">discord.gg/NAFw4ykZ7n</a></p>
    `;
    document.getElementById("popupOverlay").style.display = "flex";
}

function closePopup() {
    document.getElementById("popupOverlay").style.display = "none";
}

// Settings button
document.getElementById("settings").addEventListener("click", () => {
    document.getElementById("popupTitle").textContent = "Settings";
    document.getElementById("popupBody").innerHTML = `
        <button onclick="darkMode()">Toggle Dark Mode</button><br><br>
        <button onclick="tabCloak()">Tab Cloak</button><br><br>
        <button onclick="showContact()">Contact</button>
    `;
    document.getElementById("popupOverlay").style.display = "flex";
});

// Close popup when clicking overlay
document.getElementById("popupOverlay").addEventListener("click", e => {
    if (e.target === document.getElementById("popupOverlay")) closePopup();
});

// Start everything
listZones();
