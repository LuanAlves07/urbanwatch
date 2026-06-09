const homeView = document.querySelector("[data-home-view]");
const createView = document.querySelector("[data-create-view]");
const cepForm = document.querySelector("[data-cep-form]");
const alertList = document.querySelector("[data-alert-list]");
const tabButtons = document.querySelectorAll("[data-alert-tab]");
const createForm = document.querySelector("[data-create-form]");
const createTitle = document.querySelector("[data-create-title]");
const createSubmit = document.querySelector("[data-create-submit]");
const alertCep = document.querySelector("#alertCep");
const addressText = document.querySelector("[data-address-text]");
const fileInput = document.querySelector("#alertFiles");
const uploadList = document.querySelector("[data-upload-list]");
const modal = document.querySelector("[data-call-modal]");
const modalPanel = modal.querySelector(".call-modal__panel");
const genericDetail = document.querySelector("[data-generic-detail]");
const myCallDetail = document.querySelector("[data-my-call-detail]");
const chatSection = document.querySelector("[data-call-chat]");
const chatMessages = document.querySelector("[data-chat-messages]");
const chatForm = document.querySelector("[data-chat-form]");
const chatFileInput = document.querySelector("[data-chat-file]");
const chatFilePreview = document.querySelector("[data-chat-file-preview]");
const callActions = document.querySelector("[data-call-actions]");
const reviewButton = document.querySelector("[data-review-button]");
const editCallButton = document.querySelector("[data-edit-call-button]");
const voteSection = document.querySelector("[data-call-votes]");
const voteLikeButton = document.querySelector("[data-vote-like]");
const voteDislikeButton = document.querySelector("[data-vote-dislike]");
const voteLikesCount = document.querySelector("[data-vote-likes]");
const voteDislikesCount = document.querySelector("[data-vote-dislikes]");
let currentUserVote = null;
const reviewForm = document.querySelector("[data-review-form]");
const reviewRatingInput = document.querySelector("[data-review-rating]");
const reviewFileInput = document.querySelector("[data-review-file]");
const reviewFilePreview = document.querySelector("[data-review-file-preview]");
const reviewStars = document.querySelectorAll("[data-review-star]");
const reviewSummary = document.querySelector("[data-review-summary]");
const callHistory = document.querySelector("[data-call-history]");
const callAttachments = document.querySelector("[data-call-attachments]");
const createdByRow = document.querySelector("[data-created-by-row]");
const createdAtRow = document.querySelector("[data-created-at-row]");
const myCallInfo = document.querySelector(".my-call-info");

const defaultLocation = {
    latitude: -21.1775,
    longitude: -47.8103,
    address: "Ribeirao Preto, SP"
};

let currentUser = null;
let calls = [];
let activeTab = "general";
let selectedLocation = { ...defaultLocation };
let selectedCall = null;
let homeMap = null;
let createMap = null;
let createMarker = null;
let homeMarkers = [];
let userLocation = null;
let userLocationMarker = null;
let locationAccessBlocked = false;
let nearbyCallIds = new Set();
const nearbyRadiusKm = 10;
let selectedUploadFiles = [];
let selectedChatFiles = [];
let selectedReviewFile = null;
let editingCallId = null;
let uploadPreviewUrls = [];
const reviewCache = new Map();
const commentAttachmentIdsByCall = new Map();
const addressCache = new Map();
const addressStorageKey = "urbanwatch:client:addresses";
const reverseGeocodeDelay = 1100;
let reverseGeocodeQueue = Promise.resolve();
let lastReverseGeocodeAt = 0;
const allowedAttachmentTypes = ["image/png", "image/jpeg", "video/mp4"];
const maxAttachmentSize = 10 * 1024 * 1024;
const allowedReviewTypes = ["image/png", "image/jpeg"];
const maxReviewSize = 5 * 1024 * 1024;

function normalizeCep(value) {
    return value.replace(/\D/g, "").replace(/^(\d{5})(\d{0,3}).*/, (_, start, end) => end ? `${start}-${end}` : start);
}

function getCepDigits(value) {
    return value.replace(/\D/g, "");
}

function isCepOnly(value) {
    return getCepDigits(value).length === 8 && !/[a-zA-Z]/.test(value);
}

function formatDate(value) {
    if (!value) {
        return "sem atualizacao";
    }

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(value));
}

function formatFullDate(value) {
    if (!value) {
        return "sem data";
    }

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(value));
}

function formatStatus(status) {
    return String(status || "PENDENTE").replaceAll("_", " ");
}

function getAllowedStatusLabel(status) {
    const labels = {
        PENDENTE: "Pendente",
        RECEBIDO: "Recebido",
        EM_AVALIACAO: "Em avaliação",
        EM_DESLOCAMENTO: "Em deslocamento",
        EM_EXECUCAO: "Em execução",
        FINALIZADO: "Finalizado",
        PAUSADO: "Pausado"
    };

    return labels[status] || formatStatus(status);
}

function getHistoryStatusLabel(status) {
    return status ? getAllowedStatusLabel(status) : "Criado";
}

function getSlaInfo(call) {
    const inactiveStatuses = ["FINALIZADO", "PAUSADO"];

    if (inactiveStatuses.includes(call.status)) {
        return { level: "neutral", label: call.status === "FINALIZADO" ? "Encerrado" : "Pausado" };
    }

    const openedAt = new Date(call.createdAt || call.updatedAt || Date.now());
    const ageDays = Math.max(0, Math.floor((Date.now() - openedAt.getTime()) / 86400000));

    if (ageDays >= 15) {
        return { level: "red", label: "SLA vermelho" };
    }

    if (ageDays >= 10) {
        return { level: "orange", label: "SLA laranja" };
    }

    if (ageDays >= 5) {
        return { level: "yellow", label: "SLA amarelo" };
    }

    return { level: "green", label: "SLA verde" };
}

function getSlaColor(level) {
    const colors = {
        green: "#68b86b",
        yellow: "#f5c542",
        orange: "#ef8a2c",
        red: "#d93636",
        neutral: "#8b95a3"
    };

    return colors[level] || colors.neutral;
}

function sortCallsForClient(a, b) {
    const aFinished = isCallFinished(a);
    const bFinished = isCallFinished(b);

    if (aFinished !== bFinished) {
        return aFinished ? 1 : -1;
    }

    return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getCallFileUrl(id, download = false) {
    return `/calls/images/${encodeURIComponent(id)}/file${download ? "?download=true" : ""}`;
}

function getReviewFileUrl(id, download = false) {
    return `/calls/review/images/${encodeURIComponent(id)}/file${download ? "?download=true" : ""}`;
}

function isImageType(contentType) {
    return String(contentType || "").startsWith("image/");
}

function isVideoType(contentType) {
    return String(contentType || "").startsWith("video/");
}

function validateFile(file, options = {}) {
    const allowedTypes = options.allowedTypes || allowedAttachmentTypes;
    const maxSize = options.maxSize || maxAttachmentSize;
    const label = options.label || "arquivo";
    const allowedLabel = options.allowedLabel || "PNG, JPG ou MP4";

    if (!allowedTypes.includes(file.type)) {
        return `${file.name}: envie apenas ${allowedLabel}.`;
    }

    if (file.size > maxSize) {
        return `${file.name}: ${label} deve ter no máximo ${Math.round(maxSize / 1024 / 1024)} MB.`;
    }

    return null;
}

function filterValidFiles(files, options = {}) {
    const validFiles = [];
    const errors = [];

    files.forEach((file) => {
        const error = validateFile(file, options);

        if (error) {
            errors.push(error);
        } else {
            validFiles.push(file);
        }
    });

    if (errors.length) {
        UrbanWatchAuth.showAlert(errors.join("\n"));
    }

    return validFiles;
}

function isCityHallComment(comment) {
    const userRole = String(comment?.userRole || "").toUpperCase();
    const userName = String(comment?.userName || "").trim().toLowerCase();

    return Boolean(
        comment?.isCityHall
        || userRole === "CITY_HALL"
        || userRole === "ADMIN"
        || userName.includes("prefeitura")
        || userName.includes("admin")
        || userName.includes("administrador")
    );
}

function maskPersonName(name) {
    const safeName = String(name || "").trim();

    if (!safeName) {
        return "Cidadao";
    }

    const firstLetter = safeName.charAt(0).toUpperCase();
    return `${firstLetter}${"*".repeat(Math.max(safeName.length - 1, 3))}`;
}

function getVisibleCommentAuthor(comment) {
    if (isCityHallComment(comment)) {
        return "Prefeitura";
    }

    return maskPersonName(comment.userName);
}

function encodeCommentAttachment(file) {
    return `[anexo:${file.id}:${encodeURIComponent(file.contentType || "")}:${encodeURIComponent(file.fileName || "arquivo")}]`;
}

function parseCommentContent(content) {
    const attachments = [];
    const text = String(content || "")
        .split(/\r?\n/)
        .filter((line) => {
            const match = line.match(/^\[anexo:(\d+):([^:]*):(.*)\]$/);

            if (!match || attachments.length >= 3) {
                return true;
            }

            attachments.push({
                id: match[1],
                contentType: decodeURIComponent(match[2] || ""),
                fileName: decodeURIComponent(match[3] || "arquivo")
            });

            return false;
        })
        .join("\n")
        .trim();

    return { text, attachments };
}

function renderCommentAttachments(attachments, options = {}) {
    if (!attachments.length) {
        return "";
    }

    return `
        <div class="chat-attachments">
            ${attachments.slice(0, 3).map((attachment) => `
                <span class="chat-attachment ${isImageType(attachment.contentType) ? "chat-attachment--image" : "chat-attachment--video"}">
                    ${isImageType(attachment.contentType)
                        ? `<img src="${getCallFileUrl(attachment.id)}" alt="${escapeHtml(attachment.fileName)}" data-image-preview="${getCallFileUrl(attachment.id)}">`
                        : '<span>VID</span>'}
                </span>
            `).join("")}
        </div>
    `;
}

function openImagePreview(src, alt = "Imagem anexada") {
    document.querySelector("[data-image-lightbox]")?.remove();

    const lightbox = document.createElement("div");
    lightbox.className = "image-lightbox";
    lightbox.setAttribute("data-image-lightbox", "");
    lightbox.innerHTML = `<img src="${src}" alt="${escapeHtml(alt)}">`;
    document.body.appendChild(lightbox);
}

function revokeUploadPreviewUrls() {
    uploadPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    uploadPreviewUrls = [];
}

function describePlace(call) {
    if (call.visualAddress) {
        return call.visualAddress;
    }

    if (call.latitude && call.longitude) {
        return "Endereco sendo localizado...";
    }

    return "Endereco nao informado";
}

function hasLeaflet() {
    return Boolean(window.L);
}

function addTileLayer(map) {
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap"
    }).addTo(map);
}

function addUserLocationMarker() {
    if (!homeMap || !userLocation) {
        return;
    }

    const coords = [userLocation.latitude, userLocation.longitude];

    if (!userLocationMarker) {
        userLocationMarker = L.circleMarker(coords, {
            radius: 8,
            color: "#1073e0",
            fillColor: "#1073e0",
            fillOpacity: 0.35,
            weight: 3
        }).addTo(homeMap);
    } else {
        userLocationMarker.setLatLng(coords);
    }

    userLocationMarker.bindPopup("Voce esta aqui");
}

function requestUserLocation() {
    if (!navigator.geolocation) {
        locationAccessBlocked = true;
        renderCalls();
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            locationAccessBlocked = false;
            userLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };

            if (homeMap) {
                homeMap.setView([userLocation.latitude, userLocation.longitude], 14);
                addUserLocationMarker();
            }

            if (createMap && !createMarker) {
                createMap.setView([userLocation.latitude, userLocation.longitude], 14);
            }

            loadNearbyCalls()
                .then(() => {
                    renderCalls();
                    updateHomeMap();
                })
                .catch(() => {});
        },
        () => {
            locationAccessBlocked = true;
            renderCalls();
        },
        {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 300000
        }
    );
}

function initMaps() {
    if (!hasLeaflet()) {
        return;
    }

    if (!homeMap) {
        homeMap = L.map("homeMap").setView([defaultLocation.latitude, defaultLocation.longitude], 12);
        addTileLayer(homeMap);
    }

    if (!createMap) {
        createMap = L.map("createMap").setView([defaultLocation.latitude, defaultLocation.longitude], 13);
        addTileLayer(createMap);
    }
}

function updateCreateMap(location) {
    selectedLocation = location;

    if (!createMap) {
        return;
    }

    const coords = [location.latitude, location.longitude];
    createMap.setView(coords, 15);

    if (!createMarker) {
        createMarker = L.marker(coords).addTo(createMap);
    } else {
        createMarker.setLatLng(coords);
    }

    createMarker.bindPopup(location.address).openPopup();
}

function updateHomeMap() {
    if (!homeMap) {
        return;
    }

    homeMarkers.forEach((marker) => marker.remove());
    homeMarkers = [];

    const callsWithCoords = getGeneralCalls().filter((call) => call.latitude && call.longitude);

    callsWithCoords.forEach((call) => {
        const slaInfo = getSlaInfo(call);
        const marker = L.circleMarker([call.latitude, call.longitude], {
            radius: 9,
            color: getSlaColor(slaInfo.level),
            fillColor: getSlaColor(slaInfo.level),
            fillOpacity: 0.62,
            weight: 3
        })
            .addTo(homeMap)
            .bindPopup(`${escapeHtml(call.title || "Alerta")}<br>${escapeHtml(slaInfo.label)}`);

        marker.on("click", () => openCallDetails(call.id));
        homeMarkers.push(marker);
    });

    addUserLocationMarker();

    if (userLocation) {
        homeMap.setView([userLocation.latitude, userLocation.longitude], 14);
    } else if (callsWithCoords.length) {
        const bounds = L.latLngBounds(callsWithCoords.map((call) => [call.latitude, call.longitude]));
        homeMap.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
    } else {
        homeMap.setView([defaultLocation.latitude, defaultLocation.longitude], 12);
    }
}

function getNearbyReferenceLocation() {
    return userLocation || defaultLocation;
}

function getGeneralCalls() {
    return calls.filter((call) => nearbyCallIds.has(String(call.id)) && !isCallFinished(call));
}

async function loadNearbyCalls() {
    const location = getNearbyReferenceLocation();
    const url = new URL("/calls/proximos", window.location.origin);
    url.searchParams.set("latitude", location.latitude);
    url.searchParams.set("longitude", location.longitude);
    url.searchParams.set("raio", nearbyRadiusKm);

    try {
        const response = await UrbanWatchAuth.authenticatedFetch(url.pathname + url.search);

        if (!response.ok) {
            throw new Error("Nearby calls failed");
        }

        nearbyCallIds = new Set((await response.json()).map((call) => String(call.id)));
    } catch (error) {
        nearbyCallIds = new Set();
    }
}

async function fetchBackendGeocode(address) {
    const url = new URL("/location/geocode", window.location.origin);
    url.searchParams.set("endereco", address);

    const response = await UrbanWatchAuth.authenticatedFetch(url.pathname + url.search);

    if (!response.ok) {
        throw new Error("Geocode failed");
    }

    return response.json();
}

async function fetchBackendReverse(latitude, longitude) {
    const url = new URL("/location/reverse", window.location.origin);
    url.searchParams.set("latitude", latitude);
    url.searchParams.set("longitude", longitude);

    const response = await UrbanWatchAuth.authenticatedFetch(url.pathname + url.search);

    if (!response.ok) {
        throw new Error("Reverse geocode failed");
    }

    return response.json();
}

function formatBackendAddress(result) {
    if (result?.endereco) {
        return result.endereco;
    }

    return [result?.bairro, result?.cidade, result?.estado, result?.pais].filter(Boolean).join(", ");
}

function getAddressKey(call) {
    if (!call?.latitude || !call?.longitude) {
        return null;
    }

    return `${Number(call.latitude).toFixed(6)},${Number(call.longitude).toFixed(6)}`;
}

function isUsableAddress(address) {
    return Boolean(address)
        && address !== "Endereco nao encontrado"
        && address !== "Endereco nao informado"
        && address !== "Endereco sendo localizado...";
}

function loadStoredAddressCache() {
    try {
        const stored = JSON.parse(localStorage.getItem(addressStorageKey) || "{}");

        Object.entries(stored).forEach(([key, value]) => {
            const address = typeof value === "string" ? value : value?.address;

            if (isUsableAddress(address)) {
                addressCache.set(key, address);
            }
        });
    } catch (error) {
        localStorage.removeItem(addressStorageKey);
    }
}

function persistStoredAddressCache(validKeys = null) {
    const stored = {};

    addressCache.forEach((address, key) => {
        if ((!validKeys || validKeys.has(key)) && isUsableAddress(address)) {
            stored[key] = {
                address,
                updatedAt: new Date().toISOString()
            };
        }
    });

    localStorage.setItem(addressStorageKey, JSON.stringify(stored));
}

function pruneStoredAddressCache() {
    const validKeys = new Set(calls.map(getAddressKey).filter(Boolean));

    Array.from(addressCache.keys()).forEach((key) => {
        if (!validKeys.has(key)) {
            addressCache.delete(key);
        }
    });

    persistStoredAddressCache(validKeys);
}

function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function enqueueReverseGeocode(task) {
    const run = reverseGeocodeQueue.catch(() => {}).then(async () => {
        const elapsed = Date.now() - lastReverseGeocodeAt;

        if (elapsed < reverseGeocodeDelay) {
            await delay(reverseGeocodeDelay - elapsed);
        }

        const result = await task();
        lastReverseGeocodeAt = Date.now();
        return result;
    });

    reverseGeocodeQueue = run.catch(() => {});
    return run;
}

function applyStoredAddressesToCalls() {
    let changed = false;

    calls.forEach((call) => {
        const key = getAddressKey(call);

        if (key && addressCache.has(key)) {
            call.visualAddress = addressCache.get(key);
            changed = true;
        }
    });

    return changed;
}

async function getCallAddress(call, options = {}) {
    if (!call.latitude || !call.longitude) {
        return "Endereco nao informado";
    }

    const key = getAddressKey(call);

    if (!options.force && addressCache.has(key)) {
        return addressCache.get(key);
    }

    try {
        const result = await enqueueReverseGeocode(() => fetchBackendReverse(call.latitude, call.longitude));
        const address = formatBackendAddress(result);

        if (!isUsableAddress(address)) {
            throw new Error("Empty address");
        }

        addressCache.set(key, address);
        persistStoredAddressCache();
        return address;
    } catch (error) {
        addressCache.delete(key);
        persistStoredAddressCache();
        return "Endereco nao encontrado";
    }
}

async function enrichCallAddresses() {
    const callsWithCoords = calls.filter((call) => call.latitude && call.longitude);

    pruneStoredAddressCache();
    applyStoredAddressesToCalls();
    renderCalls();

    for (const call of callsWithCoords) {
        if (!call.visualAddress) {
            call.visualAddress = await getCallAddress(call);
            renderCalls();
        }
    }
}

async function refreshCallAddress(callId) {
    const call = calls.find((item) => String(item.id) === String(callId));

    if (!call) {
        return;
    }

    call.visualAddress = "Endereco sendo localizado...";
    renderCalls();

    if (selectedCall && String(selectedCall.id) === String(call.id)) {
        document.querySelector("[data-my-address]").textContent = call.visualAddress;
        modal.querySelector("[data-modal-address]").textContent = call.visualAddress;
    }

    call.visualAddress = await getCallAddress(call, { force: true });
    renderCalls();

    if (selectedCall && String(selectedCall.id) === String(call.id)) {
        selectedCall.visualAddress = call.visualAddress;
        document.querySelector("[data-my-address]").textContent = call.visualAddress;
        modal.querySelector("[data-modal-address]").textContent = call.visualAddress;
    }
}

async function lookupBrazilianCep(cepDigits) {
    const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`, {
        headers: {
            "Accept": "application/json"
        }
    });

    if (!response.ok) {
        throw new Error("ViaCEP failed");
    }

    const data = await response.json();

    if (data.erro) {
        throw new Error("CEP not found");
    }

    const address = [data.logradouro, data.bairro, data.localidade, data.uf, data.cep]
        .filter(Boolean)
        .join(", ");

    return {
        query: address,
        displayAddress: address,
        postcode: data.cep || normalizeCep(cepDigits)
    };
}

async function geocodeLocation(queryText) {
    const rawQuery = queryText.trim();

    if (!rawQuery) {
        return { ...defaultLocation };
    }

    const cepDigits = getCepDigits(rawQuery);
    let cepLookup = null;
    let searchAddress = rawQuery;

    if (isCepOnly(rawQuery)) {
        try {
            cepLookup = await lookupBrazilianCep(cepDigits);
            searchAddress = cepLookup.query;
        } catch (error) {
            searchAddress = `${normalizeCep(cepDigits)}, Brasil`;
        }
    }

    const queryAddress = searchAddress.toLowerCase().includes("brasil") ? searchAddress : `${searchAddress}, Brasil`;
    const result = await fetchBackendGeocode(queryAddress);

    if (!result?.latitude || !result?.longitude) {
        throw new Error("Location not found");
    }

    return {
        latitude: Number(result.latitude),
        longitude: Number(result.longitude),
        address: cepLookup?.displayAddress || result.endereco || rawQuery,
        postcode: cepLookup?.postcode || (isCepOnly(rawQuery) ? normalizeCep(cepDigits) : "")
    };
}

function setCreateMode(enabled) {
    homeView.hidden = enabled;
    createView.hidden = !enabled;

    if (enabled && createMap) {
        window.setTimeout(() => {
            createMap.invalidateSize();
            updateCreateMap(selectedLocation);
        }, 80);
    }
}

function setFormMode(mode) {
    const isEditing = mode === "edit";
    createTitle.textContent = isEditing ? "Editar alerta" : "Criar novo alerta";
    createSubmit.innerHTML = `${isEditing ? "SALVAR ALTERACOES" : "CRIAR ALERTA"} <span>&rsaquo;</span>`;
}

async function requireUser() {
    const user = await UrbanWatchAuth.loadCurrentUser();

    if (!user) {
        window.location.href = "/login";
        return null;
    }

    currentUser = user;
    return user;
}

function setActiveTab(nextTab) {
    activeTab = nextTab;
    tabButtons.forEach((button) => {
        button.classList.toggle("alert-tab--active", button.dataset.alertTab === nextTab);
    });
    renderCalls();
}

function renderCallCard(call) {
    return `
        <div role="button" tabindex="0" class="alert-card alert-card--sla-${getSlaInfo(call).level}" data-call-id="${call.id}">
            <span class="alert-card__body">
                <span class="alert-card__meta">
                    <span>${escapeHtml(getAllowedStatusLabel(call.status))} | ${escapeHtml(describePlace(call))}</span>
                    <span>Atualizado ${formatDate(call.updatedAt || call.createdAt)}</span>
                </span>
                <span class="alert-card__title">${escapeHtml(call.title)}</span>
                <span class="alert-card__sla">${escapeHtml(getSlaInfo(call).label)}</span>
            </span>
            <span class="alert-card__tools">
                <button type="button" class="alert-card__refresh" data-refresh-address="${call.id}" title="Atualizar endereço" aria-label="Atualizar endereço">
                    <img src="../images/icos/refresh.svg" alt="">
                </button>
                <span class="alert-card__icon" aria-hidden="true">
                    <img src="../images/icos/search.png" alt="">
                </span>
            </span>
        </div>
    `;
}

function renderCallSection(title, sectionCalls) {
    if (!sectionCalls.length) {
        return "";
    }

    return `
        <section class="alert-section">
            <h3>${escapeHtml(title)}</h3>
            ${sectionCalls.map(renderCallCard).join("")}
        </section>
    `;
}

function getLocationAccessWarning() {
    if (!locationAccessBlocked) {
        return "";
    }

    return '<p class="alert-location-warning">Permita o acesso a localização para ver alertas próximos</p>';
}

function renderCalls() {
    if (activeTab === "mine" && currentUser) {
        const mineCalls = calls.filter((call) => call.userId === currentUser.id);

        if (!mineCalls.length) {
            alertList.innerHTML = '<p class="alert-empty">Voce ainda nao criou alertas.</p>';
            return;
        }

        const openCalls = mineCalls
            .filter((call) => !isCallFinished(call))
            .sort(sortCallsForClient);
        const pendingReview = mineCalls
            .filter((call) => isCallFinished(call) && !reviewCache.get(String(call.id)))
            .sort(sortCallsForClient);
        const reviewed = mineCalls
            .filter((call) => isCallFinished(call) && reviewCache.get(String(call.id)))
            .sort(sortCallsForClient);

        alertList.innerHTML = [
            renderCallSection("Em aberto", openCalls),
            renderCallSection("A avaliar", pendingReview),
            renderCallSection("Finalizados", reviewed)
        ].join("") || '<p class="alert-empty">Nenhum alerta encontrado.</p>';
        return;
    }

    const visibleCalls = getGeneralCalls();
    const locationWarning = getLocationAccessWarning();

    if (!visibleCalls.length) {
        alertList.innerHTML = `${locationWarning}<p class="alert-empty">Nenhum alerta encontrado.</p>`;
        return;
    }

    alertList.innerHTML = locationWarning + visibleCalls
        .slice()
        .sort(sortCallsForClient)
        .map(renderCallCard)
        .join("");
}

async function loadCalls() {
    try {
        const response = await UrbanWatchAuth.authenticatedFetch("/calls");

        if (!response.ok) {
            alertList.innerHTML = '<p class="alert-empty">Nao foi possivel carregar os alertas agora.</p>';
            return;
        }

        calls = await response.json();
        pruneStoredAddressCache();
        applyStoredAddressesToCalls();
        await loadNearbyCalls();
        await preloadFinishedReviews();
        renderCalls();
        updateHomeMap();
        enrichCallAddresses();
    } catch (error) {
        alertList.innerHTML = '<p class="alert-empty">Não foi possível carregar os alertas agora.</p>';
    }
}

async function resolveLocation(queryText) {
    if (!queryText) {
        selectedLocation = { ...defaultLocation };
        addressText.textContent = "Endereco nao informado";
        alertCep.value = "";
        updateCreateMap(selectedLocation);
        return;
    }

    try {
        selectedLocation = await geocodeLocation(queryText);
    } catch (error) {
        selectedLocation = {
            ...defaultLocation,
            address: queryText,
            postcode: isCepOnly(queryText) ? normalizeCep(queryText) : ""
        };
        UrbanWatchAuth.showAlert("Nao encontramos esse endereco com precisao. Confira o texto informado.");
    }

    addressText.textContent = selectedLocation.address;
    alertCep.value = selectedLocation.postcode || "";
    updateCreateMap(selectedLocation);
}

async function openCreateView(locationQuery) {
    const user = await requireUser();

    if (!user) {
        return;
    }

    editingCallId = null;
    selectedUploadFiles = [];
    revokeUploadPreviewUrls();
    fileInput.value = "";
    uploadList.innerHTML = "";
    createForm.reset();
    setFormMode("create");
    setCreateMode(true);
    await resolveLocation(locationQuery || "");
}

async function openEditView(call) {
    const user = await requireUser();

    if (!user || !call || call.userId !== user.id) {
        UrbanWatchAuth.showAlert("Voce so pode editar os seus proprios alertas.");
        return;
    }

    if (!["PENDENTE", "RECEBIDO"].includes(call.status)) {
        UrbanWatchAuth.showAlert("Este alerta nao pode mais ser editado.");
        return;
    }

    editingCallId = call.id;
    selectedUploadFiles = [];
    revokeUploadPreviewUrls();
    fileInput.value = "";
    uploadList.innerHTML = "";
    createForm.reset();
    setFormMode("edit");

    document.querySelector("#alertTitle").value = call.title || "";
    document.querySelector("#alertDescription").value = call.description || "";

    selectedLocation = {
        latitude: call.latitude || defaultLocation.latitude,
        longitude: call.longitude || defaultLocation.longitude,
        address: call.visualAddress || describePlace(call),
        postcode: ""
    };

    addressText.textContent = selectedLocation.address;
    alertCep.value = "";
    modal.hidden = true;
    setCreateMode(true);
    updateCreateMap(selectedLocation);
}

function renderUploadList() {
    revokeUploadPreviewUrls();

    uploadList.innerHTML = selectedUploadFiles
        .slice(0, 4)
        .map((file, index) => {
            const isImage = isImageType(file.type);
            const previewUrl = isImage ? URL.createObjectURL(file) : "";
            if (previewUrl) {
                uploadPreviewUrls.push(previewUrl);
            }
            return `
            <span class="upload-chip">
                <button type="button" class="upload-chip__remove" data-remove-upload="${index}" aria-label="Remover ${escapeHtml(file.name)}">X</button>
                <span class="upload-chip__preview">
                    ${isImage ? `<img src="${previewUrl}" alt="${escapeHtml(file.name)}">` : "<span>VID</span>"}
                </span>
                ${escapeHtml(file.name)}
            </span>
        `;
        })
        .join("");
}

async function uploadFiles(callId) {
    for (const file of selectedUploadFiles) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await UrbanWatchAuth.authenticatedFetch(`/calls/${callId}/images`, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error("Call image upload failed");
        }
    }
}

async function submitAlert(event) {
    event.preventDefault();
    const user = await requireUser();

    if (!user) {
        return;
    }

    const title = document.querySelector("#alertTitle").value.trim();
    const description = document.querySelector("#alertDescription").value.trim();

    if (!title || !description) {
        UrbanWatchAuth.showAlert("Preencha o título e as observações do alerta.");
        return;
    }

    const originalLabel = createSubmit ? createSubmit.innerHTML : "";
    if (createSubmit) {
        createSubmit.disabled = true;
        createSubmit.textContent = editingCallId ? "Salvando..." : "Enviando...";
    }

    try {
        const isEditing = Boolean(editingCallId);
        const response = await UrbanWatchAuth.authenticatedFetch(isEditing ? `/calls/${editingCallId}` : "/calls", {
            method: isEditing ? "PUT" : "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title,
                description,
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude
            })
        });

        if (!response.ok) {
            throw new Error(isEditing ? "Update call failed" : "Create call failed");
        }

        const savedCall = await response.json();

        if (selectedUploadFiles.length) {
            await uploadFiles(savedCall.id);
        }

        await loadCalls();
        setCreateMode(false);
        setActiveTab("mine");
        history.replaceState(null, "", "/");
        createForm.reset();
        editingCallId = null;
        selectedUploadFiles = [];
        revokeUploadPreviewUrls();
        uploadList.innerHTML = "";
        setFormMode("create");
    } catch (error) {
        UrbanWatchAuth.showAlert(editingCallId ? "Não foi possível salvar as alterações agora." : "Não foi possível criar o alerta agora.");
    } finally {
        if (createSubmit) {
            createSubmit.disabled = false;
            createSubmit.innerHTML = originalLabel;
        }
    }
}

function shouldShowChat(call) {
    return Boolean(currentUser);
}

function isCallFinished(call) {
    return call.status === "FINALIZADO";
}

function canEditCall(call) {
    return Boolean(
        currentUser
        && call
        && call.userId === currentUser.id
        && ["PENDENTE", "RECEBIDO"].includes(call.status)
    );
}

function renderComments(comments) {
    if (!comments.length) {
        chatMessages.innerHTML = '<p class="alert-empty">Nenhuma mensagem enviada ainda.</p>';
        return;
    }

    chatMessages.innerHTML = comments
        .slice()
        .reverse()
        .map((comment) => {
            const isMine = currentUser && comment.userId === currentUser.id;
            const isCityHall = isCityHallComment(comment);
            const parsed = parseCommentContent(comment.content);
            return `
                <article class="chat-message ${isMine ? "chat-message--mine" : "chat-message--other"} ${isCityHall ? "chat-message--city-hall" : ""}">
                    <strong>${escapeHtml(getVisibleCommentAuthor(comment))} - ${formatDate(comment.createdAt)}</strong>
                    ${parsed.text ? `<p>${escapeHtml(parsed.text)}</p>` : ""}
                    ${renderCommentAttachments(parsed.attachments)}
                </article>
            `;
        })
        .join("");

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderCallHistory(historyItems) {
    if (!callHistory) {
        return;
    }

    if (!historyItems.length) {
        callHistory.hidden = false;
        callHistory.innerHTML = `
            <h3>Historico do chamado</h3>
            <p class="call-history__empty">Nenhuma mudanca de status registrada ainda.</p>
        `;
        return;
    }

    callHistory.hidden = false;
    callHistory.innerHTML = `
        <h3>Historico do chamado</h3>
        <ol>
            ${historyItems.map((item) => `
                <li>
                    <strong>${escapeHtml(getHistoryStatusLabel(item.statusAnterior))} -> ${escapeHtml(getHistoryStatusLabel(item.statusNovo))}</strong>
                    <time>${escapeHtml(formatFullDate(item.dataAlteracao))}</time>
                    ${item.observacao ? `<p>${escapeHtml(item.observacao)}</p>` : ""}
                </li>
            `).join("")}
        </ol>
    `;
}

async function loadCallHistory(callId) {
    if (!callHistory) {
        return;
    }

    callHistory.hidden = false;
    callHistory.innerHTML = `
        <h3>Historico do chamado</h3>
        <p class="call-history__empty">Carregando historico...</p>
    `;

    try {
        const response = await UrbanWatchAuth.authenticatedFetch(`/calls/${callId}/historico`);

        if (!response.ok) {
            throw new Error("History failed");
        }

        renderCallHistory(await response.json());
    } catch (error) {
        callHistory.innerHTML = `
            <h3>Historico do chamado</h3>
            <p class="call-history__empty">Historico indisponivel agora.</p>
        `;
    }
}

function setReviewRating(rating) {
    reviewRatingInput.value = String(rating);
    reviewStars.forEach((button) => {
        button.classList.toggle("review-star--active", Number(button.dataset.reviewStar) === Number(rating));
    });
}

function renderReviewSummary(call) {
    const review = reviewCache.get(String(call.id));

    if (!review || !reviewSummary) {
        if (reviewSummary) {
            reviewSummary.hidden = true;
            reviewSummary.innerHTML = "";
        }
        return;
    }

    reviewSummary.hidden = false;
    reviewSummary.innerHTML = `
        <span>Avaliação do cidadão</span>
        <strong>Nota ${escapeHtml(review.rating)}/5</strong>
        <p>${escapeHtml(review.comment || "Sem comentário.")}</p>
        <small>${escapeHtml(review.userName || "Cidadão")} - ${formatDate(review.createdAt)}</small>
    `;
}

function syncCallActionsVisibility() {
    if (!callActions) {
        return;
    }

    const hasVisibleAction = [reviewButton, editCallButton].some((button) => button && !button.hidden);
    callActions.hidden = !hasVisibleAction;
}

function updateReviewState(call) {
    const review = reviewCache.get(String(call.id));
    const hasReview = Boolean(review);

    if (hasReview) {
        resetReviewForm();
        if (reviewButton) {
            reviewButton.hidden = true;
        }
        if (editCallButton) {
            editCallButton.hidden = true;
        }
    }

    syncCallActionsVisibility();
    renderReviewSummary(call);
}

async function loadReview(callId) {
    const call = calls.find((item) => String(item.id) === String(callId)) || selectedCall;

    if (!call) {
        return;
    }

    try {
        const response = await UrbanWatchAuth.authenticatedFetch(`/calls/${callId}/review`);

        if (response.status === 404) {
            reviewCache.set(String(callId), null);
            updateReviewState(call);
            return;
        }

        if (!response.ok) {
            throw new Error("Review failed");
        }

        reviewCache.set(String(callId), await response.json());
        updateReviewState(call);
    } catch (error) {
        reviewCache.set(String(callId), null);
        updateReviewState(call);
    }
}

async function preloadFinishedReviews() {
    if (!currentUser) {
        return;
    }

    const finishedMine = calls.filter((call) => (
        call.userId === currentUser.id
        && isCallFinished(call)
        && !reviewCache.has(String(call.id))
    ));

    await Promise.all(finishedMine.map(async (call) => {
        try {
            const response = await UrbanWatchAuth.authenticatedFetch(`/calls/${call.id}/review`);

            if (response.ok) {
                reviewCache.set(String(call.id), await response.json());
                return;
            }
        } catch (error) {
            // Mantem o chamado em "A avaliar" quando a avaliacao nao estiver acessivel.
        }

        reviewCache.set(String(call.id), null);
    }));
}

function resetReviewForm() {
    reviewForm.hidden = true;
    reviewForm.reset();
    selectedReviewFile = null;
    reviewFileInput.value = "";
    reviewFilePreview.hidden = true;
    reviewFilePreview.textContent = "";
    setReviewRating(5);
}

async function uploadReviewFile(callId) {
    if (!selectedReviewFile) {
        return;
    }

    const formData = new FormData();
    formData.append("file", selectedReviewFile);

    const response = await UrbanWatchAuth.authenticatedFetch(`/calls/${callId}/review/images`, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        throw new Error("Review image upload failed");
    }
}

function renderChatFilePreview() {
    if (!selectedChatFiles.length) {
        chatFilePreview.hidden = true;
        chatFilePreview.innerHTML = "";
        return;
    }

    chatFilePreview.hidden = false;
    chatFilePreview.innerHTML = `
        ${selectedChatFiles.map((file, index) => `
            <span class="chat-file-chip">
                <span>${escapeHtml(file.name)}</span>
                <button type="button" data-remove-chat-file="${index}" aria-label="Remover anexo">X</button>
            </span>
        `).join("")}
    `;
}

async function uploadChatFiles(callId) {
    if (!selectedChatFiles.length) {
        return [];
    }

    const uploadedFiles = [];

    for (const file of selectedChatFiles.slice(0, 3)) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await UrbanWatchAuth.authenticatedFetch(`/calls/${callId}/images`, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error("Chat file upload failed");
        }

        uploadedFiles.push(await response.json());
    }

    return uploadedFiles;
}

function renderFileTiles(files, options = {}) {
    if (!files.length) {
        return '<p class="modal-image-item">Nenhum anexo enviado.</p>';
    }

    return files.slice(0, options.limit || files.length).map((file) => `
        <span class="modal-file-tile ${isImageType(file.contentType) ? "modal-file-tile--image" : "modal-file-tile--video"}">
            ${isImageType(file.contentType)
                ? `<img src="${getCallFileUrl(file.id)}" alt="${escapeHtml(file.fileName || "Anexo")}" data-image-preview="${getCallFileUrl(file.id)}">`
                : '<span>VID</span>'}
        </span>
    `).join("");
}

async function loadCallImages(callId, target, options = {}) {
    if (!target) {
        return;
    }

    target.innerHTML = '<p class="modal-image-item">Carregando anexos...</p>';

    try {
        const response = await UrbanWatchAuth.authenticatedFetch(`/calls/${callId}/images`);

        if (!response.ok) {
            throw new Error("Images failed");
        }

        const commentAttachmentIds = commentAttachmentIdsByCall.get(String(callId)) || new Set();
        const files = (await response.json())
            .filter((file) => !options.excludeCommentAttachments || !commentAttachmentIds.has(String(file.id)));
        const title = options.title ? `<h3>${escapeHtml(options.title)}</h3>` : "";
        target.hidden = false;
        target.innerHTML = `${title}<div class="call-attachments__grid">${renderFileTiles(files, options)}</div>`;
    } catch (error) {
        target.hidden = false;
        target.innerHTML = '<p class="modal-image-item">Anexos indisponiveis agora.</p>';
    }
}

async function refreshCallById(callId) {
    const response = await UrbanWatchAuth.authenticatedFetch(`/calls/${callId}`);

    if (!response.ok) {
        throw new Error("Call refresh failed");
    }

    const updatedCall = await response.json();
    const index = calls.findIndex((call) => String(call.id) === String(callId));

    if (index >= 0) {
        calls[index] = {
            ...calls[index],
            ...updatedCall,
            visualAddress: calls[index].visualAddress
        };
    } else {
        calls.push(updatedCall);
    }

    return calls.find((call) => String(call.id) === String(callId)) || updatedCall;
}

async function loadComments(callId) {
    chatMessages.innerHTML = '<p class="alert-empty">Carregando mensagens...</p>';

    try {
        const response = await UrbanWatchAuth.authenticatedFetch(`/calls/${callId}/comments`);

        if (!response.ok) {
            throw new Error("Comments failed");
        }

        const comments = await response.json();
        const attachmentIds = new Set();

        comments.forEach((comment) => {
            parseCommentContent(comment.content).attachments.forEach((attachment) => {
                attachmentIds.add(String(attachment.id));
            });
        });

        commentAttachmentIdsByCall.set(String(callId), attachmentIds);
        renderComments(comments);
    } catch (error) {
        chatMessages.innerHTML = '<p class="alert-empty">Mensagens indisponiveis agora.</p>';
    }
}

async function openCallDetails(callId) {
    let call = calls.find((item) => String(item.id) === String(callId));

    if (!call) {
        return;
    }

    try {
        call = await refreshCallById(callId);
    } catch (error) {
        // Mantem os dados do card se a atualizacao pontual falhar.
    }

    selectedCall = call;
    const showChat = shouldShowChat(call);
    modalPanel.classList.toggle("call-modal__panel--mine", showChat);
    genericDetail.hidden = showChat;
    myCallDetail.hidden = !showChat;
    modal.hidden = false;

    if (showChat) {
        const isOwner = Boolean(currentUser && call.userId === currentUser.id);
        document.querySelector("[data-my-title]").textContent = call.title;
        document.querySelector("[data-my-status]").textContent = getAllowedStatusLabel(call.status);
        document.querySelector("[data-my-updated]").textContent = `Atualizado ${formatFullDate(call.updatedAt || call.createdAt)}`;
        document.querySelector("[data-my-address]").textContent = describePlace(call);
        document.querySelector("[data-my-code]").textContent = `Cod: ALERTA-${call.id}`;
        document.querySelector("[data-my-user]").textContent = call.userName || "Cidadao";
        document.querySelector("[data-my-created]").textContent = formatFullDate(call.createdAt);
        if (createdByRow) {
            createdByRow.hidden = activeTab === "general" || !isOwner;
        }
        if (createdAtRow) {
            createdAtRow.classList.toggle("my-call-info__row--only", activeTab === "general" || !isOwner);
        }
        if (myCallInfo) {
            myCallInfo.classList.toggle("my-call-info--compact", activeTab === "general" || !isOwner);
        }
        const editable = canEditCall(call);
        reviewButton.hidden = !isOwner;
        reviewButton.disabled = !isOwner || !isCallFinished(call);
        reviewButton.classList.toggle("call-action--review-ready", isOwner && isCallFinished(call));
        reviewButton.title = isCallFinished(call) ? "Avaliar chamado" : "Disponivel apos o encerramento do chamado";
        editCallButton.hidden = !isOwner;
        editCallButton.disabled = !editable;
        editCallButton.title = editable ? "Editar alerta" : "Disponivel apenas em Pendente ou Recebido";
        resetReviewForm();
        updateReviewState(call);
        selectedChatFiles = [];
        if (chatFileInput) {
            chatFileInput.value = "";
        }
        renderChatFilePreview();
        await loadComments(call.id);
        await Promise.all([
            loadReview(call.id),
            loadCallImages(call.id, callAttachments, { title: "Anexos do chamado", limit: 3, excludeCommentAttachments: true }),
            loadCallHistory(call.id)
        ]);
    } else {
        modal.querySelector("[data-modal-status]").textContent = `${getAllowedStatusLabel(call.status)} | ${call.userName || "Cidadao"}`;
        modal.querySelector("[data-modal-title]").textContent = call.title;
        modal.querySelector("[data-modal-description]").textContent = call.description;
        modal.querySelector("[data-modal-address]").textContent = describePlace(call);
        modal.querySelector("[data-modal-updated]").textContent = formatDate(call.updatedAt || call.createdAt);
        loadCallImages(call.id, modal.querySelector("[data-modal-images]"), { download: false });
        loadVotes(call.id);
    }

    if (call.latitude && call.longitude && !call.visualAddress) {
        call.visualAddress = await getCallAddress(call);
        if (showChat) {
            document.querySelector("[data-my-address]").textContent = call.visualAddress;
        } else {
            modal.querySelector("[data-modal-address]").textContent = call.visualAddress;
        }
        renderCalls();
    }
}

cepForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await openCreateView(new FormData(cepForm).get("location"));
});

alertCep.addEventListener("input", (event) => {
    event.target.value = normalizeCep(event.target.value);
});

alertCep.addEventListener("blur", () => resolveLocation(alertCep.value));

fileInput.addEventListener("change", () => {
    selectedUploadFiles = filterValidFiles(Array.from(fileInput.files || []), {
        allowedTypes: allowedAttachmentTypes,
        maxSize: maxAttachmentSize,
        label: "anexo",
        allowedLabel: "PNG, JPG ou MP4"
    }).slice(0, 4);
    renderUploadList();
});

uploadList.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-upload]");

    if (!removeButton) {
        return;
    }

    selectedUploadFiles.splice(Number(removeButton.dataset.removeUpload), 1);
    fileInput.value = "";
    renderUploadList();
});

document.addEventListener("click", (event) => {
    const previewImage = event.target.closest("[data-image-preview]");

    if (previewImage) {
        openImagePreview(previewImage.dataset.imagePreview || previewImage.src, previewImage.alt);
        return;
    }

    if (event.target.matches("[data-image-lightbox]")) {
        event.target.remove();
    }
});

createForm.addEventListener("submit", submitAlert);

chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!selectedCall) {
        return;
    }

    const input = chatForm.elements.content;
    const content = input.value.trim();

    if (!content && !selectedChatFiles.length) {
        return;
    }

    try {
        const uploadedFiles = await uploadChatFiles(selectedCall.id);
        const message = content || "Arquivo anexado";
        const attachmentMarkers = uploadedFiles.map(encodeCommentAttachment).join("\n");
        const response = await UrbanWatchAuth.authenticatedFetch(`/calls/${selectedCall.id}/comments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ content: attachmentMarkers ? `${message}\n${attachmentMarkers}` : message })
        });

        if (!response.ok) {
            throw new Error("Comment failed");
        }

        input.value = "";
        selectedChatFiles = [];
        chatFileInput.value = "";
        renderChatFilePreview();
        await loadComments(selectedCall.id);
        await loadCallImages(selectedCall.id, callAttachments, { title: "Anexos do chamado", limit: 3, excludeCommentAttachments: true });
    } catch (error) {
        UrbanWatchAuth.showAlert("Nao foi possivel enviar a mensagem agora.");
    }
});

chatFileInput?.addEventListener("change", () => {
    selectedChatFiles = filterValidFiles(Array.from(chatFileInput.files || []), {
        allowedTypes: allowedAttachmentTypes,
        maxSize: maxAttachmentSize,
        label: "anexo",
        allowedLabel: "PNG, JPG ou MP4"
    }).slice(0, 3);

    if (!selectedChatFiles.length) {
        chatFileInput.value = "";
    }

    renderChatFilePreview();
});

chatFilePreview?.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-chat-file]");

    if (!removeButton) {
        return;
    }

    selectedChatFiles.splice(Number(removeButton.dataset.removeChatFile), 1);
    chatFileInput.value = "";
    renderChatFilePreview();
});

tabButtons.forEach((button) => {
    button.addEventListener("click", async () => {
        if (button.dataset.alertTab === "mine" && !currentUser) {
            UrbanWatchAuth.showAlert("Faca login para ver os seus alertas.");
            window.setTimeout(() => {
                window.location.href = "/login";
            }, 800);
            return;
        }

        setActiveTab(button.dataset.alertTab);
    });
});

alertList.addEventListener("click", (event) => {
    const refreshButton = event.target.closest("[data-refresh-address]");

    if (refreshButton) {
        event.stopPropagation();
        refreshCallAddress(refreshButton.dataset.refreshAddress)
            .catch(() => UrbanWatchAuth.showAlert("Nao foi possivel atualizar o endereco agora."));
        return;
    }

    const card = event.target.closest("[data-call-id]");

    if (card) {
        openCallDetails(card.dataset.callId);
    }
});

alertList.addEventListener("keydown", (event) => {
    if ((event.key !== "Enter" && event.key !== " ") || !event.target.matches("[data-call-id]")) {
        return;
    }

    event.preventDefault();
    openCallDetails(event.target.dataset.callId);
});

modal.querySelector("[data-modal-close]").addEventListener("click", () => {
    modal.hidden = true;
});

modal.addEventListener("click", (event) => {
    if (event.target === modal) {
        modal.hidden = true;
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
        modal.hidden = true;
    }
});

function renderVotes(summary) {
    if (!voteSection) {
        return;
    }
    currentUserVote = summary && typeof summary.userVote === "boolean" ? summary.userVote : null;
    voteLikesCount.textContent = summary ? summary.likes : 0;
    voteDislikesCount.textContent = summary ? summary.dislikes : 0;
    const liked = currentUserVote === true;
    const disliked = currentUserVote === false;
    voteLikeButton.classList.toggle("vote-btn--active", liked);
    voteLikeButton.setAttribute("aria-pressed", String(liked));
    voteDislikeButton.classList.toggle("vote-btn--active", disliked);
    voteDislikeButton.setAttribute("aria-pressed", String(disliked));
    voteSection.hidden = false;
}

async function loadVotes(callId) {
    if (!voteSection) {
        return;
    }
    try {
        const response = await UrbanWatchAuth.authenticatedFetch(`/calls/${callId}/votes`);
        if (!response.ok) {
            throw new Error("Falha ao carregar votos");
        }
        renderVotes(await response.json());
    } catch (error) {
        voteSection.hidden = true;
    }
}

async function submitVote(value) {
    if (!selectedCall) {
        return;
    }
    if (!currentUser) {
        UrbanWatchAuth.showAlert("Faca login para curtir ou descurtir um chamado.");
        return;
    }
    const remove = currentUserVote === value;
    try {
        const response = await UrbanWatchAuth.authenticatedFetch(`/calls/${selectedCall.id}/votes`, {
            method: remove ? "DELETE" : "POST",
            headers: remove ? undefined : { "Content-Type": "application/json" },
            body: remove ? undefined : JSON.stringify({ value })
        });
        if (!response.ok) {
            throw new Error("Falha ao votar");
        }
        renderVotes(await response.json());
    } catch (error) {
        UrbanWatchAuth.showAlert("Nao foi possivel registrar seu voto agora.");
    }
}

voteLikeButton?.addEventListener("click", () => submitVote(true));
voteDislikeButton?.addEventListener("click", () => submitVote(false));

reviewButton.addEventListener("click", () => {
    if (!selectedCall || !isCallFinished(selectedCall)) {
        UrbanWatchAuth.showAlert("A avaliacao fica disponivel apenas apos o encerramento do chamado.");
        return;
    }

    reviewForm.hidden = !reviewForm.hidden;
});

editCallButton?.addEventListener("click", () => {
    if (!selectedCall || editCallButton.disabled) {
        return;
    }

    openEditView(selectedCall);
});

reviewStars.forEach((button) => {
    button.addEventListener("click", () => {
        setReviewRating(Number(button.dataset.reviewStar));
    });
});

reviewFileInput?.addEventListener("change", () => {
    const [file] = filterValidFiles(Array.from(reviewFileInput.files || []), {
        allowedTypes: allowedReviewTypes,
        maxSize: maxReviewSize,
        label: "imagem da avaliação",
        allowedLabel: "PNG ou JPG"
    });
    selectedReviewFile = file || null;

    if (!selectedReviewFile) {
        reviewFileInput.value = "";
    }

    reviewFilePreview.hidden = !selectedReviewFile;
    reviewFilePreview.textContent = selectedReviewFile ? selectedReviewFile.name : "";
});

reviewForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!selectedCall || !isCallFinished(selectedCall)) {
        UrbanWatchAuth.showAlert("A avaliacao fica disponivel apenas apos o encerramento do chamado.");
        return;
    }

    const formData = new FormData(reviewForm);
    const comment = String(formData.get("comment") || "").trim();

    try {
        const response = await UrbanWatchAuth.authenticatedFetch(`/calls/${selectedCall.id}/review`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                rating: Number(reviewRatingInput.value),
                comment
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || "Review failed");
        }

        const review = await response.json();
        await uploadReviewFile(selectedCall.id);
        reviewCache.set(String(selectedCall.id), review);
        resetReviewForm();
        updateReviewState(selectedCall);
        renderCalls();
        UrbanWatchAuth.showAlert("Avaliacao enviada com sucesso.");
    } catch (error) {
        UrbanWatchAuth.showAlert(error.message || "Nao foi possivel enviar a avaliacao agora.");
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    loadStoredAddressCache();
    initMaps();
    requestUserLocation();
    currentUser = await UrbanWatchAuth.loadCurrentUser();
    await loadCalls();

    const params = new URLSearchParams(window.location.search);
    if (params.get("novoAlerta") === "1") {
        await openCreateView(params.get("location") || params.get("cep") || "");
    }
});
