const container = document.getElementById('container');
const zoneViewer = document.getElementById('zoneViewer');
let zoneFrame = document.getElementById('zoneFrame');
const searchBar = document.getElementById('searchBar');
const sortOptions = document.getElementById('sortOptions');
// https://www.jsdelivr.com/tools/purge
const zonesURL = "https://cdn.jsdelivr.net/gh/NikeGtag/data@main/games.json";
const coverURL = "https://cdn.jsdelivr.net/gh/gn-math/covers@main";
const htmlURL = "https://cdn.jsdelivr.net/gh/gn-math/html@main";
let zones = [];
let popularityData = {};
let currentZone = null; // ← ADDED: Track current zone for other functions

async function listZones() {
    try {
        const response = await fetch(zonesURL + "?t=" + Date.now());
        const json = await response.json();
        zones = json;
        await fetchPopularity();
        sortZones();
        const search = new URLSearchParams(window.location.search);
        const id = search.get('id');
        if (id) {
            const zone = zones.find(zone => zone.id + '' == id + '');
            if (zone) {
                openZone(zone);
            }
        }
    } catch (error) {
        container.innerHTML = `Error loading zones: ${error}`;
    }
}

async function fetchPopularity() {
    try {
        const response = await fetch("https://data.jsdelivr.com/v1/stats/packages/gh/gn-math/html@main/files?period=year");
        const data = await response.json();
        data.forEach(file => {
            const idMatch = file.name.match(/\/(\d+)\.html$/);
            if (idMatch) {
                const id = parseInt(idMatch[1]);
                popularityData[id] = file.hits.total;
            }
        });
    } catch (error) {
        popularityData[0] = 0;
    }
}

function sortZones() {
    const sortBy = sortOptions.value;
    if (sortBy === 'name') {
        zones.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'id') {
        zones.sort((a, b) => a.id - b.id);
    } else if (sortBy === 'popular') {
        zones.sort((a, b) => (popularityData[b.id] || 0) - (popularityData[a.id] || 0));
    }
    zones.sort((a, b) => (a.id === -1 ? -1 : b.id === -1 ? 1 : 0));
    displayZones(zones);
}

function displayZones(zones) {
    container.innerHTML = "";
    zones.forEach(file => {
        const zoneItem = document.createElement("div");
        zoneItem.className = "zone-item";
        zoneItem.onclick = () => openZone(file);
        const img = document.createElement("img");
        img.src = file.cover.replace("{COVER_URL}", coverURL).replace("{HTML_URL}", htmlURL);
        zoneItem.appendChild(img);
        const button = document.createElement("button");
        button.textContent = file.name;
        button.onclick = (event) => {
            event.stopPropagation();
            openZone(file);
        };
        zoneItem.appendChild(button);
        container.appendChild(zoneItem);
    });
    if (container.innerHTML === "") {
        container.innerHTML = "No zones found.";
    } else {
        document.getElementById("zoneCount").textContent = `Zones Loaded: ${zones.length}`;
    }
}

function filterZones() {
    const query = searchBar.value.toLowerCase();
    const filteredZones = zones.filter(zone => zone.name.toLowerCase().includes(query));
    displayZones(filteredZones);
}

function openZone(file) {
    currentZone = file; // ← FIXED: Store current zone
    
    if (file.url.startsWith("http")) {
        window.open(file.url, "_blank");
    } else {
        const url = file.url.replace("{COVER_URL}", coverURL).replace("{HTML_URL}", htmlURL);
        fetch(url + "?t=" + Date.now())
            .then(response => response.text())
            .then(html => {
                // Create iframe if it doesn't exist
                if (zoneFrame.contentDocument === null || !zoneFrame.parentNode) {
                    zoneFrame = document.createElement("iframe");
                    zoneFrame.id = "zoneFrame";
                    zoneViewer.appendChild(zoneFrame);
                }
                
                // Load the HTML content
                zoneFrame.contentDocument.open();
                zoneFrame.contentDocument.write(html);
                zoneFrame.contentDocument.close();
                
                // ← FIXED: Safe element access with null checks
                const nameEl = document.getElementById('zoneName');
                const authorEl = document.getElementById('zoneAuthor');
                
                if (nameEl) {
                    nameEl.textContent = file.name || "Untitled Game";
                }
                if (authorEl) {
                    authorEl.textContent = file.author ? "by " + file.author : "by Unknown";
                    if (file.authorLink) {
                        authorEl.href = file.authorLink;
                    } else {
                        authorEl.href = "#";
                    }
                }
                
                // Show the viewer
                zoneViewer.style.display = "block";
            })
            .catch(error => {
                console.error("Failed to load zone:", error);
                alert("Failed to load zone: " + error);
            });
    }
}

function aboutBlank() {
    if (!currentZone) {
        alert("No zone currently loaded");
        return;
    }
    // ← FIXED: Use currentZone instead of trying to find zoneId
    const url = currentZone.url.replace("{COVER_URL}", coverURL).replace("{HTML_URL}", htmlURL);
    const newWindow = window.open("about:blank", "_blank");
    fetch(url + "?t=" + Date.now())
        .then(response => response.text())
        .then(html => {
            if (newWindow) {
                newWindow.document.open();
                newWindow.document.write(html);
                newWindow.document.close();
                newWindow.document.title = currentZone.name || "Game";
            }
        })
        .catch(error => alert("Failed to open in new tab: " + error));
}

function closeZone() {
    zoneViewer.style.display = "none";
    if (zoneFrame && zoneFrame.parentNode) {
        zoneViewer.removeChild(zoneFrame);
        zoneFrame = document.createElement("iframe");
        zoneFrame.id = "zoneFrame";
        zoneFrame.style.display = "none"; // Keep it hidden but ready
        zoneViewer.appendChild(zoneFrame);
    }
}

function downloadZone() {
    if (!currentZone) {
        alert("No zone currently loaded");
        return;
    }
    // ← FIXED: Use currentZone instead of trying to find zoneId
    const url = currentZone.url.replace("{HTML_URL}", htmlURL) + "?t=" + Date.now();
    fetch(url)
        .then(res => res.text())
        .then(text => {
            const blob = new Blob([text], {
                type: "text/html;charset=utf-8" // ← FIXED: Use HTML type
            });
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = (currentZone.name || "game") + ".html";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
        })
        .catch(error => alert("Failed to download: " + error));
}

function fullscreenZone() {
    if (!zoneFrame) return;
    if (zoneFrame.requestFullscreen) {
        zoneFrame.requestFullscreen();
    } else if (zoneFrame.mozRequestFullScreen) {
        zoneFrame.mozRequestFullScreen();
    } else if (zoneFrame.webkitRequestFullscreen) {
        zoneFrame.webkitRequestFullscreen();
    } else if (zoneFrame.msRequestFullscreen) {
        zoneFrame.msRequestFullscreen();
    }
}

function saveData() {
    let data = JSON.stringify(localStorage) + "\n\n|\n\n" + document.cookie;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([data], {
        type: "text/plain"
    }));
    link.download = `${Date.now()}.data`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function loadData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const content = e.target.result;
        const [localStorageData, cookieData] = content.split("\n\n|\n\n");
        try {
            const parsedData = JSON.parse(localStorageData);
            for (let key in parsedData) {
                localStorage.setItem(key, parsedData[key]);
            }
        } catch (error) {
            console.error("Failed to parse localStorage data:", error);
        }
        if (cookieData) {
            const cookies = cookieData.split("; ");
            cookies.forEach(cookie => {
                document.cookie = cookie;
            });
        }
        alert("Data loaded successfully");
    };
    reader.readAsText(file);
}

function darkMode() {
    document.body.classList.toggle("dark-mode");
}

function cloakIcon(url) {
    const link = document.querySelector("link[rel~='icon']");
    if ((url + "").trim().length === 0) {
        link.href = "favicon.png";
    } else {
        link.href = url;
    }
}

function cloakName(string) {
    if ((string + "").trim().length === 0) {
        document.title = "homework bro bro";
        return;
    }
    document.title = string;
}

function tabCloak() {
    closePopup();
    document.getElementById('popupTitle').textContent = "Tab Cloak";
    const popupBody = document.getElementById('popupBody');
    popupBody.innerHTML = `
        <label for="tab-cloak-title" style="font-weight: bold;">Set Tab Title:</label><br>
        <input type="text" id="tab-cloak-title" placeholder="Enter new tab name..." oninput="cloakName(this.value)">
        <br><br><br><br>
        <label for="tab-cloak-icon" style="font-weight: bold;">Set Tab Icon:</label><br>
        <input type="text" id="tab-cloak-icon" placeholder="Enter new tab icon URL..." oninput="cloakIcon(this.value)">
        <br><br><br>
    `;
    popupBody.contentEditable = false;
    document.getElementById('popupOverlay').style.display = "flex";
}

const settings = document.getElementById('settings');
settings.addEventListener('click', () => {
    document.getElementById('popupTitle').textContent = "Settings";
    const popupBody = document.getElementById('popupBody');
    popupBody.innerHTML = `
        <button id="settings-button" onclick="darkMode()">Toggle Dark Mode</button>
        <br><br>
        <button id="settings-button" onclick="tabCloak()">Tab Cloak</button>
        <br><br>
        <button id="settings-button" onclick="loadPrivacy()">Privacy Policy</button>
    `;
    popupBody.contentEditable = false;
    document.getElementById('popupOverlay').style.display = "flex";
});

function showContact() {
    document.getElementById('popupTitle').textContent = "Contact";
    const popupBody = document.getElementById('popupBody');
    popupBody.innerHTML = `<p>Discord: <a href="https://discord.gg/NAFw4ykZ7n" target="_blank">https://discord.gg/NAFw4ykZ7n</a></p>`;
    popupBody.contentEditable = false;
    document.getElementById('popupOverlay').style.display = "flex";
}

function loadPrivacy() {
    document.getElementById('popupTitle').textContent = "Privacy Policy";
    const popupBody = document.getElementById('popupBody');
    popupBody.innerHTML = `
        <div style="max-height: 60vh; overflow-y: auto;">
            <h2>PRIVACY POLICY</h2>
            <p>Last updated April 17, 2025</p>
            <p>This Privacy Notice for homework bro bro ("we," "us," or "our"), describes how and why we might access, collect, store, use, and/or share ("process") your personal information when you use our services ("Services"), including when you:</p>
            <ul>
                <li>Visit our website</li>
                <li>Engage with us in other related ways, including any sales, marketing, or events</li>
            </ul>
            <p><strong>We do NOT collect IP addresses, personal data, or track users.</strong> This site is 100% anonymous.</p>
            <p><strong>What personal information do we process?</strong> None. We only use Google Analytics for basic site performance (anonymized) and Adsense for monetization.</p>
            <p><strong>Questions?</strong> Contact us at <a href="https://discord.gg/NAFw4ykZ7n" target="_blank">https://discord.gg/NAFw4ykZ7n</a>.</p>
        </div>
    `;
    popupBody.contentEditable = false;
    document.getElementById('popupOverlay').style.display = "flex";
}

function closePopup() {
    document.getElementById('popupOverlay').style.display = "none";
}

// Close popup when clicking overlay
document.getElementById('popupOverlay').addEventListener('click', function(e) {
    if (e.target === this) closePopup();
});

// Initialize everything
listZones();
