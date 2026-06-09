const metricsRoot = document.querySelector("[data-city-metrics]");
const callList = document.querySelector("[data-city-call-list]");
const criticalList = document.querySelector("[data-critical-list]");
const criticalInlineCount = document.querySelector("[data-critical-inline-count]");
const visibleCount = document.querySelector("[data-visible-count]");
const callDetail = document.querySelector("[data-call-detail]");
const cityModal = document.querySelector("[data-city-modal]");
const searchInput = document.querySelector("[data-call-search]");
const cityUser = document.querySelector("[data-city-user]");
const filterButtons = document.querySelectorAll("[data-filter]");
const statusFilterButtons = document.querySelectorAll("[data-status-filter]");
const refreshButton = document.querySelector("[data-city-refresh]");
const logoutButton = document.querySelector("[data-city-logout]");

const defaultLocation = {
    latitude: -21.1775,
    longitude: -47.8103
};

const statusLabels = {
    PENDENTE: "Pendente",
    RECEBIDO: "Recebido",
    EM_AVALIACAO: "Em avaliação",
    EM_DESLOCAMENTO: "Em deslocamento",
    EM_EXECUCAO: "Em execução",
    FINALIZADO: "Finalizado",
    PAUSADO: "Pausado"
};

const editableStatuses = ["PENDENTE", "RECEBIDO", "EM_AVALIACAO", "EM_DESLOCAMENTO", "EM_EXECUCAO", "FINALIZADO"];
let currentUser = null;
let calls = [];
let selectedCallId = null;
let activeFilter = "all";
let activeStatusFilter = "all";
let criticalCalls = [];
let criticalCallIds = new Set();
let criticalCallsLoaded = false;
let overviewMap = null;
let overviewMarkers = [];
let detailMap = null;
let detailMarker = null;
const reviewCache = new Map();
const callImageCache = new Map();
const reviewImageCache = new Map();
const addressCache = new Map();
const addressStorageKey = "urbanwatch:prefeitura:addresses";
const reverseGeocodeDelay = 1100;
let reverseGeocodeQueue = Promise.resolve();
let lastReverseGeocodeAt = 0;

function isAdmin() {
    return String(currentUser?.role || "").toUpperCase() === "ADMIN";
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

function renderCommentAttachments(attachments) {
    if (!attachments.length) {
        return "";
    }

    return `
        <div class="city-chat-attachments">
            ${attachments.slice(0, 3).map((attachment) => `
                <span class="city-chat-attachment ${isImageType(attachment.contentType) ? "city-chat-attachment--image" : "city-chat-attachment--video"}">
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

function formatDate(value) {
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

function formatShortDate(value) {
    if (!value) {
        return "sem data";
    }

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(new Date(value));
}

function formatOpenedSummary(value) {
    if (!value) {
        return "Sem data";
    }

    const date = new Date(value);
    const today = new Date();
    const isSameDay = date.getDate() === today.getDate()
        && date.getMonth() === today.getMonth()
        && date.getFullYear() === today.getFullYear();

    return isSameDay ? "Hoje" : formatShortDate(value);
}

function getStatusLabel(status) {
    return statusLabels[status] || String(status || "PENDENTE").replaceAll("_", " ");
}

function getEditableStatuses(call) {
    if (call?.status === "PAUSADO") {
        return ["PAUSADO", ...editableStatuses];
    }

    return editableStatuses;
}

function getSlaInfo(call) {
    if (["FINALIZADO", "PAUSADO"].includes(call.status)) {
        return {
            level: "neutral",
            label: call.status === "FINALIZADO" ? "Encerrado" : "Pausado",
            days: 0
        };
    }

    const openedAt = new Date(call.createdAt || call.updatedAt || Date.now());
    const days = Math.max(0, Math.floor((Date.now() - openedAt.getTime()) / 86400000));

    if (days >= 15) {
        return { level: "red", label: "SLA vermelho", days };
    }

    if (days >= 10) {
        return { level: "orange", label: "SLA laranja", days };
    }

    if (days >= 5) {
        return { level: "yellow", label: "SLA amarelo", days };
    }

    return { level: "green", label: "SLA verde", days };
}

function getSlaColor(level) {
    const colors = {
        green: "#2ba866",
        yellow: "#f5b400",
        orange: "#ef8a2c",
        red: "#d93636",
        neutral: "#8b95a3"
    };

    return colors[level] || colors.neutral;
}

function isCritical(call) {
    return criticalCallsLoaded ? criticalCallIds.has(String(call.id)) : getSlaInfo(call).level === "red";
}

function getPriorityTag(sla) {
    if (sla.level === "red") {
        return '<span class="city-pill city-pill--critical">Crítico</span>';
    }

    if (sla.level === "orange") {
        return '<span class="city-pill city-pill--attention">Urgente</span>';
    }

    return "";
}

function countByStatus(status) {
    return calls.filter((call) => call.status === status).length;
}

function getCriticalCount() {
    return criticalCallsLoaded ? criticalCallIds.size : calls.filter((call) => getSlaInfo(call).level === "red").length;
}

function maskPersonName(name) {
    const safeName = String(name || "Cidadao").trim();
    return `${safeName.charAt(0).toUpperCase()}${"*".repeat(Math.max(safeName.length - 1, 3))}`;
}

function isAuthorityComment(comment) {
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

function getCommentAuthor(comment) {
    if ((currentUser && comment.userId === currentUser.id) || isAuthorityComment(comment)) {
        return "Prefeitura";
    }

    return maskPersonName(comment.userName);
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

function openModal() {
    cityModal.hidden = false;
}

function closeModal() {
    cityModal.hidden = true;
}

function getSelectedCall() {
    return calls.find((item) => String(item.id) === String(selectedCallId));
}

function describePlace(call) {
    if (call.visualAddress) {
        return call.visualAddress;
    }

    if (call.latitude && call.longitude) {
        return "Endereço sendo localizado...";
    }

    return "Endereço não informado";
}

function getAddressKey(call) {
    if (!call?.latitude || !call?.longitude) {
        return null;
    }

    return `${Number(call.latitude).toFixed(6)},${Number(call.longitude).toFixed(6)}`;
}

function isUsableAddress(address) {
    return Boolean(address)
        && address !== "Endereço não encontrado"
        && address !== "Endereço não informado"
        && address !== "Endereço sendo localizado...";
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

async function fetchReverseAddress(latitude, longitude) {
    const url = new URL("/location/reverse", window.location.origin);
    url.searchParams.set("latitude", latitude);
    url.searchParams.set("longitude", longitude);

    const response = await UrbanWatchAuth.authenticatedFetch(url.pathname + url.search);

    if (!response.ok) {
        throw new Error("Reverse geocode failed");
    }

    return response.json();
}

function formatReverseAddress(result) {
    if (result?.endereco) {
        return result.endereco;
    }

    return [result?.bairro, result?.cidade, result?.estado, result?.pais].filter(Boolean).join(", ");
}

async function getCallAddress(call, options = {}) {
    if (!call.latitude || !call.longitude) {
        return "Endereço não informado";
    }

    const key = getAddressKey(call);

    if (!options.force && addressCache.has(key)) {
        return addressCache.get(key);
    }

    try {
        const result = await enqueueReverseGeocode(() => fetchReverseAddress(call.latitude, call.longitude));
        const address = formatReverseAddress(result);

        if (!isUsableAddress(address)) {
            throw new Error("Empty address");
        }

        addressCache.set(key, address);
        persistStoredAddressCache();
        return address;
    } catch (error) {
        addressCache.delete(key);
        persistStoredAddressCache();
        return "Endereço não encontrado";
    }
}

async function enrichCallAddresses() {
    const callsWithCoords = calls.filter((call) => call.latitude && call.longitude);
    let usedStoredAddress = false;

    pruneStoredAddressCache();

    for (const call of callsWithCoords) {
        const key = getAddressKey(call);

        if (key && addressCache.has(key)) {
            call.visualAddress = addressCache.get(key);
            usedStoredAddress = true;
        }
    }

    if (usedStoredAddress) {
        renderCallList();

        if (selectedCallId) {
            renderDetail();
        }
    }

    for (const call of callsWithCoords) {
        if (!call.visualAddress) {
            call.visualAddress = await getCallAddress(call);
            renderCallList();

            if (String(call.id) === String(selectedCallId)) {
                renderDetail();
            }
        }
    }
}

function getFilteredCalls() {
    const search = searchInput.value.trim().toLowerCase();

    return calls.filter((call) => {
        const sla = getSlaInfo(call);
        const matchesFilter =
            activeFilter === "all" ||
            (activeFilter === "critical" && isCritical(call)) ||
            (activeFilter === "urgent" && (isCritical(call) || sla.level === "orange")) ||
            (activeFilter === "running" && call.status === "EM_EXECUCAO");

        const matchesStatus = activeStatusFilter === "all" || call.status === activeStatusFilter;
        const text = [
            call.id,
            `ALERTA-${call.id}`,
            `COD: ALERTA-${call.id}`,
            call.title,
            call.description,
            call.visualAddress,
            describePlace(call),
            call.userName,
            call.status,
            getStatusLabel(call.status),
            call.prefeituraObservation
        ].join(" ").toLowerCase();

        return matchesFilter && matchesStatus && (!search || text.includes(search));
    });
}

function getCallSortRank(call) {
    if (call.status === "FINALIZADO") {
        return 5;
    }

    if (isCritical(call)) {
        return 0;
    }

    if (call.status === "PAUSADO") {
        return 4;
    }

    const slaLevel = getSlaInfo(call).level;
    const ranks = {
        orange: 1,
        yellow: 2,
        green: 3,
        neutral: 4
    };

    return ranks[slaLevel] ?? 4;
}

function sortCallsByPriority(a, b) {
    const rankDifference = getCallSortRank(a) - getCallSortRank(b);

    if (rankDifference !== 0) {
        return rankDifference;
    }

    return new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0);
}

function renderMetrics() {
    const critical = getCriticalCount();
    const pending = countByStatus("PENDENTE");
    const running = countByStatus("EM_EXECUCAO");
    const finishedToday = calls.filter((call) => {
        if (call.status !== "FINALIZADO" || !call.updatedAt) {
            return false;
        }

        return new Date(call.updatedAt).toDateString() === new Date().toDateString();
    }).length;

    const metrics = [
        ["list.png", calls.length, "Total de chamados", "city-metric--total", "all", "all"],
        ["clock.png", pending, "Aguardando ação", "city-metric--pending", "all", "PENDENTE"],
        ["alert.png", critical, "Críticos", "city-metric--critical", "critical", "all"],
        ["gear.png", running, "Em execução", "city-metric--running", "running", "all"],
        ["check.png", finishedToday, "Finalizados hoje", "city-metric--finished", "all", "FINALIZADO"]
    ];

    metricsRoot.innerHTML = metrics.map(([icon, value, label, extraClass, filter, statusFilter]) => `
        <button type="button" class="city-metric ${extraClass} ${activeFilter === filter && activeStatusFilter === statusFilter ? "city-metric--active" : ""}" data-metric-filter="${filter}" data-metric-status="${statusFilter}">
            <span class="city-metric__icon">
                <img src="/images/icos/${escapeHtml(icon)}" alt="">
            </span>
            <span>
                <strong>${value}</strong>
                <span>${escapeHtml(label)}</span>
            </span>
        </button>
    `).join("");

    criticalInlineCount.textContent = `${critical} críticos`;
}

function renderCriticalList() {
    const visibleCriticalCalls = (criticalCalls.length ? criticalCalls : calls.filter(isCritical)).slice(0, 6);

    if (!visibleCriticalCalls.length) {
        criticalList.innerHTML = '<p class="city-empty">Nenhum chamado crítico no momento.</p>';
        return;
    }

    criticalList.innerHTML = visibleCriticalCalls.map((call) => `
        <button type="button" class="city-critical-item" data-select-call="${call.id}">
            <span class="city-critical-item__top">
                <strong>ALERTA-${call.id} - ${escapeHtml(call.title || "Chamado")}</strong>
                <span class="city-critical-item__time">${formatDate(call.updatedAt || call.createdAt).split(", ")[1] || ""}</span>
            </span>
            <span class="city-critical-item__detail">${getSlaInfo(call).days} dias em aberto</span>
        </button>
    `).join("");
}

function renderCallList() {
    const visibleCalls = getFilteredCalls()
        .slice()
        .sort(sortCallsByPriority);

    visibleCount.textContent = `${visibleCalls.length} chamado${visibleCalls.length === 1 ? "" : "s"}`;

    if (!visibleCalls.length) {
        callList.innerHTML = '<p class="city-empty">Nenhum chamado encontrado com esses filtros.</p>';
        return;
    }

    callList.innerHTML = visibleCalls.map((call) => {
        const sla = getSlaInfo(call);
        const isActive = String(call.id) === String(selectedCallId);
        return `
            <div role="button" tabindex="0" class="city-call-item city-call-item--${sla.level} ${isActive ? "city-call-item--active" : ""}" data-select-call="${call.id}">
                <span class="city-call-item__bar"></span>
                <span class="city-call-item__content">
                    <h3>${escapeHtml(call.title || "Chamado sem titulo")}</h3>
                    <p class="city-call-address">${escapeHtml(describePlace(call))}</p>
                    <p class="city-call-date city-call-age city-call-age--${sla.level}">${escapeHtml(formatOpenedSummary(call.createdAt))}</p>
                    <div class="city-call-footer">
                        <div class="city-call-meta">
                            <span class="city-pill">${escapeHtml(getStatusLabel(call.status))}</span>
                            <span class="city-pill">${escapeHtml(sla.label)}</span>
                            ${getPriorityTag(sla)}
                        </div>
                    </div>
                </span>
                <span class="city-call-side">
                    <strong class="city-call-code">COD: ALERTA-${call.id}</strong>
                    <button type="button" class="city-address-refresh" data-refresh-address="${call.id}">Atualizar endereço</button>
                </span>
            </div>
        `;
    }).join("");
}

function renderOverviewMap() {
    if (!hasLeaflet()) {
        return;
    }

    if (!overviewMap) {
        overviewMap = L.map("cityOverviewMap").setView([defaultLocation.latitude, defaultLocation.longitude], 12);
        addTileLayer(overviewMap);
    }

    overviewMarkers.forEach((marker) => marker.remove());
    overviewMarkers = [];

    const callsWithCoords = calls.filter((call) => call.latitude && call.longitude && call.status !== "FINALIZADO");

    callsWithCoords.forEach((call) => {
        const sla = getSlaInfo(call);
        const marker = L.circleMarker([call.latitude, call.longitude], {
            radius: 8,
            color: getSlaColor(sla.level),
            fillColor: getSlaColor(sla.level),
            fillOpacity: 0.64,
            weight: 3
        }).addTo(overviewMap);

        marker.bindPopup(`${escapeHtml(call.title || "Alerta")}<br>ALERTA-${call.id}`);
        marker.on("click", () => openCall(call.id));
        overviewMarkers.push(marker);
    });

    if (callsWithCoords.length) {
        const bounds = L.latLngBounds(callsWithCoords.map((call) => [call.latitude, call.longitude]));
        overviewMap.fitBounds(bounds, { padding: [22, 22], maxZoom: 14 });
    } else {
        overviewMap.setView([defaultLocation.latitude, defaultLocation.longitude], 12);
    }

    window.setTimeout(() => overviewMap.invalidateSize(), 80);
}

function renderDetailMap(call) {
    if (!hasLeaflet() || !call?.latitude || !call?.longitude) {
        return;
    }

    const mapElement = document.querySelector("#cityCallMap");

    if (!mapElement || mapElement.hidden) {
        return;
    }

    const coords = [call.latitude, call.longitude];

    if (!detailMap) {
        detailMap = L.map("cityCallMap").setView(coords, 15);
        addTileLayer(detailMap);
    } else {
        detailMap.setView(coords, 15);
    }

    if (!detailMarker) {
        detailMarker = L.marker(coords).addTo(detailMap);
    } else {
        detailMarker.setLatLng(coords);
    }

    detailMarker.bindPopup(call.title || "Chamado").openPopup();
    window.setTimeout(() => detailMap.invalidateSize(), 80);
}

function getReviewSummary(call) {
    const review = reviewCache.get(String(call.id));

    if (review) {
        return `Nota ${review.rating}/5`;
    }

    return call.status === "FINALIZADO" ? "Aguardando avaliação" : "Aguardando finalização";
}

function getReviewBlock(call) {
    const review = reviewCache.get(String(call.id));
    const reviewImages = reviewImageCache.get(String(call.id)) || [];

    if (!review) {
        return `
            <section class="city-review-card city-review-card--empty" data-city-review>
                <span>Avaliação do cidadão</span>
                <strong>${escapeHtml(getReviewSummary(call))}</strong>
                <p>A avaliação aparecerá aqui quando o cidadão enviar.</p>
            </section>
        `;
    }

    return `
        <section class="city-review-card" data-city-review>
            <span>Avaliação do cidadão</span>
            <strong>Nota ${escapeHtml(review.rating)}/5</strong>
            <p>${escapeHtml(review.comment || "Sem comentário.")}</p>
            <small>${escapeHtml(review.userName || "Cidadão")} - ${formatDate(review.createdAt)}</small>
            ${reviewImages.length ? `
                <div class="city-review-images">
                    ${reviewImages.slice(0, 3).map((image) => `
                        <span class="city-review-image ${isImageType(image.contentType) ? "city-review-image--image" : "city-review-image--video"}">
                            ${isImageType(image.contentType)
                                ? `<img src="${getReviewFileUrl(image.id)}" alt="${escapeHtml(image.fileName || "Anexo da avaliação")}" data-image-preview="${getReviewFileUrl(image.id)}">`
                                : '<span>VID</span>'}
                            ${isAdmin() ? `<button type="button" data-admin-delete-review-image="${escapeHtml(image.id)}" aria-label="Excluir anexo da avaliação">X</button>` : ""}
                        </span>
                    `).join("")}
                </div>
            ` : ""}
        </section>
    `;
}

function renderCallReview(call) {
    const summary = document.querySelector("[data-city-review-summary]");
    const reviewRoot = document.querySelector("[data-city-review]");

    if (summary) {
        summary.textContent = getReviewSummary(call);
    }

    if (reviewRoot) {
        reviewRoot.outerHTML = getReviewBlock(call);
    }

    renderAdminPanel(call);
}

function getAdminImageList(title, items, deleteAttribute) {
    if (!items.length) {
        return `
            <div class="city-admin-list">
                <h5>${escapeHtml(title)}</h5>
                <p class="city-admin-empty">Nenhum arquivo anexado.</p>
            </div>
        `;
    }

    return `
        <div class="city-admin-list">
            <h5>${escapeHtml(title)}</h5>
            ${items.map((item) => `
                <div class="city-admin-item">
                    <span title="${escapeHtml(item.fileName || "Arquivo")}">${escapeHtml(item.fileName || `Arquivo ${item.id}`)}</span>
                    <button type="button" class="city-admin-button city-admin-button--danger" ${deleteAttribute}="${escapeHtml(item.id)}">Excluir</button>
                </div>
            `).join("")}
        </div>
    `;
}

function getAdminBlock(call) {
    if (!isAdmin()) {
        return "";
    }

    const review = reviewCache.get(String(call.id));
    return `
        <section class="city-admin-panel" data-city-admin-panel>
            <h4>Administração</h4>
            <div class="city-admin-actions">
                <button type="button" class="city-admin-button city-admin-button--danger" data-admin-delete-call="${escapeHtml(call.id)}">Excluir chamado</button>
                <button type="button" class="city-admin-button city-admin-button--danger" data-admin-delete-review="${escapeHtml(review?.id || "")}" ${review ? "" : "disabled"}>Excluir avaliação</button>
            </div>
        </section>
    `;
}

function renderAdminPanel(call) {
    const adminRoot = document.querySelector("[data-city-admin-panel]");

    if (!adminRoot || !call) {
        return;
    }

    adminRoot.outerHTML = getAdminBlock(call);
}

function renderCityCallAttachments(call) {
    const root = document.querySelector("[data-city-call-attachments]");

    if (!root || !call) {
        return;
    }

    const images = callImageCache.get(String(call.id)) || [];

    root.innerHTML = `
        <h4>Anexos do chamado</h4>
        <div class="city-call-attachments__grid">
            ${images.length ? images.slice(0, 3).map((image) => `
                <span class="city-call-attachment ${isImageType(image.contentType) ? "city-call-attachment--image" : "city-call-attachment--video"}">
                    ${isImageType(image.contentType)
                        ? `<img src="${getCallFileUrl(image.id)}" alt="${escapeHtml(image.fileName || "Anexo")}" data-image-preview="${getCallFileUrl(image.id)}">`
                        : '<span>VID</span>'}
                    ${isAdmin() ? `<button type="button" data-admin-delete-call-image="${escapeHtml(image.id)}" aria-label="Excluir anexo">X</button>` : ""}
                </span>
            `).join("") : '<p class="city-empty">Nenhum anexo enviado.</p>'}
        </div>
    `;
}

async function loadAdminResources(callId) {
    const call = calls.find((item) => String(item.id) === String(callId));

    if (!call) {
        return;
    }

    try {
        const [callImagesResponse, reviewImagesResponse] = await Promise.all([
            UrbanWatchAuth.authenticatedFetch(`/calls/${callId}/images`),
            UrbanWatchAuth.authenticatedFetch(`/calls/${callId}/review/images`)
        ]);

        callImageCache.set(String(callId), callImagesResponse.ok ? await callImagesResponse.json() : []);
        reviewImageCache.set(String(callId), reviewImagesResponse.ok ? await reviewImagesResponse.json() : []);
    } catch (error) {
        callImageCache.set(String(callId), []);
        reviewImageCache.set(String(callId), []);
    }

    renderAdminPanel(call);
    renderCityCallAttachments(call);
    renderCallReview(call);
}

async function deleteReviewImages(callId) {
    const response = await UrbanWatchAuth.authenticatedFetch(`/calls/${callId}/review/images`);

    if (!response.ok) {
        return;
    }

    const images = await response.json();

    await Promise.all(
        images.map((image) => deleteRequest(`/calls/review/images/${image.id}`))
    );
}

async function loadReview(callId) {
    const call = calls.find((item) => String(item.id) === String(callId));

    if (!call) {
        return;
    }

    try {
        const response = await UrbanWatchAuth.authenticatedFetch(`/calls/${callId}/review`);

        if (response.status === 404) {
            reviewCache.delete(String(callId));
            renderCallReview(call);
            return;
        }

        if (!response.ok) {
            throw new Error("Review failed");
        }

        reviewCache.set(String(callId), await response.json());
        renderCallReview(call);
    } catch (error) {
        reviewCache.delete(String(callId));
        renderCallReview(call);
    }
}

function renderCityHistory(historyItems) {
    const historyRoot = document.querySelector("[data-city-history]");

    if (!historyRoot) {
        return;
    }

    if (!historyItems.length) {
        historyRoot.innerHTML = '<p class="city-history__empty">Nenhuma mudanca de status registrada ainda.</p>';
        return;
    }

    historyRoot.innerHTML = `
        <ol>
            ${historyItems.map((item) => `
                <li>
                    <strong>${escapeHtml(item.statusAnterior ? getStatusLabel(item.statusAnterior) : "Criado")} -> ${escapeHtml(getStatusLabel(item.statusNovo))}</strong>
                    <time>${escapeHtml(formatDate(item.dataAlteracao))}</time>
                    ${item.observacao ? `<p>${escapeHtml(item.observacao)}</p>` : ""}
                </li>
            `).join("")}
        </ol>
    `;
}

async function loadHistory(callId) {
    const historyRoot = document.querySelector("[data-city-history]");

    if (!historyRoot) {
        return;
    }

    historyRoot.innerHTML = '<p class="city-history__empty">Carregando historico...</p>';

    try {
        const response = await UrbanWatchAuth.authenticatedFetch(`/calls/${callId}/historico`);

        if (!response.ok) {
            throw new Error("History failed");
        }

        renderCityHistory(await response.json());
    } catch (error) {
        historyRoot.innerHTML = '<p class="city-history__empty">Historico indisponivel agora.</p>';
    }
}

function renderDetail() {
    const call = getSelectedCall();

    if (detailMap) {
        detailMap.remove();
        detailMap = null;
        detailMarker = null;
    }

    if (!call) {
        callDetail.innerHTML = '<p class="city-empty">Selecione um chamado para alterar status, pausar ou registrar observação.</p>';
        return;
    }

    const sla = getSlaInfo(call);
    const hasUrgencyAlert = call.urgentNotified === true;

    callDetail.innerHTML = `
        <form class="city-detail" data-detail-form>
            <header class="city-detail__header">
                <div>
                    <h3>${escapeHtml(call.title || "Chamado")}</h3>
                    <p>${escapeHtml(call.description || "Sem descrição informada.")}</p>
                    <div class="city-detail__meta">
                        <span class="city-pill">${escapeHtml(getStatusLabel(call.status))}</span>
                        <span class="city-pill">${escapeHtml(sla.label)}</span>
                        <span class="city-pill">Atualizado ${formatDate(call.updatedAt || call.createdAt)}</span>
                    </div>
                </div>
                <span class="city-detail__code">COD: ALERTA-${call.id}</span>
            </header>

            <div class="city-detail__layout">
                <section class="city-detail__main">
                    <div class="city-detail__stats">
                        <article class="city-detail__stat">
                            <span>Criado em</span>
                            <strong>${formatDate(call.createdAt)}</strong>
                        </article>
                        <article class="city-detail__stat">
                            <span>Tempo em aberto</span>
                            <strong>${sla.days ? `${sla.days} dias` : "Hoje"}</strong>
                        </article>
                        <article class="city-detail__stat">
                            <span>Aberto por</span>
                            <strong>${escapeHtml(call.userName || "Cidadão")}</strong>
                        </article>
                        <article class="city-detail__stat">
                            <span>Avaliação do cidadão</span>
                            <strong data-city-review-summary>${escapeHtml(getReviewSummary(call))}</strong>
                        </article>
                        <article class="city-detail__stat city-detail__stat--full">
                            <span>Endereço</span>
                            <strong>${escapeHtml(describePlace(call))}</strong>
                        </article>
                    </div>

                    ${getReviewBlock(call)}

                    ${getAdminBlock(call)}

                    <label class="city-detail-field">
                        <span>Alterar status</span>
                        <select name="status">
                            ${getEditableStatuses(call).map((status) => `<option value="${status}" ${status === call.status ? "selected" : ""}>${escapeHtml(getStatusLabel(status))}</option>`).join("")}
                        </select>
                    </label>

                    <label class="city-detail-field">
                        <span>Observação de status</span>
                        <textarea name="statusObservation" placeholder="Informe uma observação para o histórico"></textarea>
                    </label>

                    <label class="city-detail-field">
                        <span>Informações adicionais</span>
                        <textarea name="prefeituraObservation" placeholder="Registre informações sobre o atendimento">${escapeHtml(call.prefeituraObservation || "")}</textarea>
                    </label>

                    ${hasUrgencyAlert ? `
                        <section class="city-urgency-box">
                            <strong>Alerta de Urgência</strong>
                            <p>O cidadão notificou urgência neste chamado. Esse bloco fica preparado para a integração completa.</p>
                        </section>
                    ` : ""}

                    <details class="city-history-panel">
                        <summary>Histórico do chamado</summary>
                        <div class="city-history" data-city-history>
                            <p class="city-history__empty">Carregando histórico...</p>
                        </div>
                    </details>

                    <label class="city-detail-field">
                        <span>Justificativa da pausa</span>
                        <input name="pauseReason" type="text" placeholder="Obrigatório para pausar">
                    </label>

                    <div class="city-detail-actions">
                        <button type="button" class="city-action city-action--pause" data-pause-call>Pausar chamado</button>
                        <button type="button" class="city-action city-action--cancel" data-city-modal-close>Cancelar</button>
                        <button type="submit" class="city-save-button">Salvar alteracoes</button>
                    </div>
                </section>

                <aside class="city-detail__side">
                    <button type="button" class="city-map-toggle" data-toggle-call-map>Ver no mapa</button>
                    <div id="cityCallMap" class="city-call-map" hidden></div>
                    <section class="city-chat">
                        <h4>Comentários do chamado</h4>
                        <div class="city-chat__messages" data-city-chat-messages>
                            <p class="city-empty">Carregando mensagens...</p>
                        </div>
                        <div class="city-chat__form">
                            <input type="text" maxlength="280" data-city-chat-input placeholder="Responder como Prefeitura">
                            <button type="button" data-city-chat-send aria-label="Enviar">&rsaquo;</button>
                        </div>
                    </section>
                    <section class="city-call-attachments" data-city-call-attachments>
                        <h4>Anexos do chamado</h4>
                        <p class="city-empty">Carregando anexos...</p>
                    </section>
                </aside>
            </div>
        </form>
    `;

    const observationFields = callDetail.querySelectorAll('[name="prefeituraObservation"]');
    observationFields.forEach((field, index) => {
        if (index < observationFields.length - 1) {
            field.closest(".city-detail-field")?.remove();
        }
    });
}

function renderComments(comments) {
    const messages = document.querySelector("[data-city-chat-messages]");

    if (!messages) {
        return;
    }

    if (!comments.length) {
        messages.innerHTML = '<p class="city-empty">Nenhuma mensagem enviada ainda.</p>';
        return;
    }

    messages.innerHTML = comments
        .slice()
        .reverse()
        .map((comment) => {
            const isMine = currentUser && comment.userId === currentUser.id;
            const isAuthority = isAuthorityComment(comment);
            const parsed = parseCommentContent(comment.content);
            return `
                <article class="city-chat__message ${isMine || isAuthority ? "city-chat__message--mine" : ""} ${isAdmin() ? "city-chat__message--admin-control" : ""}">
                    ${isAdmin() ? `<button type="button" class="city-chat__delete" data-admin-delete-comment="${escapeHtml(comment.id)}" aria-label="Excluir comentario">X</button>` : ""}
                    <strong>${escapeHtml(getCommentAuthor(comment))} - ${formatDate(comment.createdAt)}</strong>
                    ${parsed.text ? `<p>${escapeHtml(parsed.text)}</p>` : ""}
                    ${renderCommentAttachments(parsed.attachments)}
                </article>
            `;
        })
        .join("");

    messages.scrollTop = messages.scrollHeight;
}

async function loadComments(callId) {
    const messages = document.querySelector("[data-city-chat-messages]");

    if (messages) {
        messages.innerHTML = '<p class="city-empty">Carregando mensagens...</p>';
    }

    try {
        const response = await UrbanWatchAuth.authenticatedFetch(`/calls/${callId}/comments`);

        if (!response.ok) {
            throw new Error("Comments failed");
        }

        renderComments(await response.json());
    } catch (error) {
        if (messages) {
            messages.innerHTML = '<p class="city-empty">Mensagens indisponíveis agora.</p>';
        }
    }
}

async function sendComment() {
    const input = document.querySelector("[data-city-chat-input]");
    const call = getSelectedCall();
    const content = input?.value.trim();

    if (!call || !content) {
        return;
    }

    try {
        const response = await UrbanWatchAuth.authenticatedFetch(`/calls/${call.id}/comments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            throw new Error("Comment failed");
        }

        input.value = "";
        await loadComments(call.id);
    } catch (error) {
        UrbanWatchAuth.showAlert("Nao foi possivel enviar a mensagem agora.");
    }
}

function renderAll() {
    renderMetrics();
    renderCriticalList();
    renderCallList();
    renderDetail();
    renderOverviewMap();
}

async function openCall(callId) {
    selectedCallId = callId;

    try {
        await refreshCallById(callId);
        await loadCriticalCalls();
    } catch (error) {
        // Mantem os dados da lista se o refresh pontual falhar.
    }

    renderCallList();
    renderDetail();
    openModal();
    await Promise.all([
        loadComments(callId),
        loadReview(callId),
        loadHistory(callId),
        loadAdminResources(callId)
    ]);
}

async function refreshCallAddress(callId) {
    const call = calls.find((item) => String(item.id) === String(callId));

    if (!call) {
        return;
    }

    call.visualAddress = "Endereço sendo localizado...";
    renderCallList();

    if (String(call.id) === String(selectedCallId)) {
        renderDetail();
    }

    call.visualAddress = await getCallAddress(call, { force: true });
    renderCallList();

    if (String(call.id) === String(selectedCallId)) {
        renderDetail();
    }
}

async function requireCityHall() {
    const user = await UrbanWatchAuth.loadCurrentUser();

    if (!user) {
        window.location.href = "/login";
        return null;
    }

    if (!["CITY_HALL", "ADMIN"].includes(user.role)) {
        UrbanWatchAuth.showAlert("Acesso permitido apenas para contas da prefeitura.");
        window.setTimeout(() => {
            window.location.href = "/";
        }, 900);
        return null;
    }

    currentUser = user;
    cityUser.textContent = `Olá, ${user.name || "Prefeitura"}!`;
    return user;
}

async function loadCalls() {
    callList.innerHTML = '<p class="city-empty">Carregando chamados...</p>';

    try {
        const response = await UrbanWatchAuth.authenticatedFetch("/calls");

        if (!response.ok) {
            throw new Error("Calls failed");
        }

        calls = await response.json();
        pruneStoredAddressCache();
        await updateStoredSlaLevels();
        await loadCriticalCalls();

        if (!selectedCallId && calls.length) {
            selectedCallId = calls[0].id;
        }

        renderAll();
        enrichCallAddresses();
    } catch (error) {
        callList.innerHTML = '<p class="city-empty">Nao foi possivel carregar os chamados agora.</p>';
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

    return updatedCall;
}

async function refreshSelectedCall() {
    if (!selectedCallId) {
        return null;
    }

    const updatedCall = await refreshCallById(selectedCallId);
    await loadCriticalCalls();
    renderAll();
    return updatedCall;
}

async function updateStoredSlaLevels() {
    const activeCalls = calls.filter((call) => call.id && call.status !== "FINALIZADO");

    await Promise.allSettled(
        activeCalls.map((call) => patchEmpty(`/calls/${call.id}/sla`))
    );
}

async function patchJson(url, body) {
    const response = await UrbanWatchAuth.authenticatedFetch(url, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error("Request failed");
    }

    return response.json();
}

async function patchEmpty(url) {
    const response = await UrbanWatchAuth.authenticatedFetch(url, {
        method: "PATCH"
    });

    if (!response.ok) {
        throw new Error("Request failed");
    }

    return response.json();
}

async function deleteRequest(url) {
    const response = await UrbanWatchAuth.authenticatedFetch(url, {
        method: "DELETE"
    });

    if (!response.ok) {
        throw new Error("Delete failed");
    }
}

async function loadCriticalCalls() {
    try {
        const response = await UrbanWatchAuth.authenticatedFetch("/calls/criticos");

        if (!response.ok) {
            throw new Error("Critical calls failed");
        }

        criticalCalls = (await response.json()).filter((call) => !["FINALIZADO", "PAUSADO"].includes(call.status));
        criticalCallsLoaded = true;
    } catch (error) {
        criticalCalls = calls.filter((call) => !["FINALIZADO", "PAUSADO"].includes(call.status) && getSlaInfo(call).level === "red");
        criticalCallsLoaded = false;
    }

    criticalCallIds = new Set(criticalCalls.map((call) => String(call.id)));
}

async function deleteCallComments(callId) {
    const response = await UrbanWatchAuth.authenticatedFetch(`/calls/${callId}/comments`);

    if (!response.ok) {
        throw new Error("Comments cleanup failed");
    }

    const comments = await response.json();

    await Promise.all(
        comments.map((comment) => deleteRequest(`/calls/comments/${comment.id}`))
    );
}

async function saveObservation(form) {
    await patchJson(`/calls/${selectedCallId}/prefeitura`, {
        observacao: form.elements.prefeituraObservation.value.trim()
    });
}

async function saveStatus(form) {
    const currentCall = getSelectedCall();
    const nextStatus = form.elements.status.value;
    const statusObservation = form.elements.statusObservation.value.trim();

    if (currentCall?.status === "PAUSADO" && nextStatus !== "PAUSADO") {
        await patchEmpty(`/calls/${selectedCallId}/retomar`);

        if (nextStatus !== "EM_AVALIACAO") {
            await patchJson(`/calls/${selectedCallId}/status`, {
                status: nextStatus,
                observacao: statusObservation
            });
        }
    } else {
        await patchJson(`/calls/${selectedCallId}/status`, {
            status: nextStatus,
            observacao: statusObservation
        });
    }

    await saveObservation(form);
    UrbanWatchAuth.showAlert("Alteracoes salvas com sucesso.");
    await refreshSelectedCall();
    await Promise.all([
        loadComments(selectedCallId),
        loadReview(selectedCallId),
        loadHistory(selectedCallId),
        loadAdminResources(selectedCallId)
    ]);
}

async function pauseCall(form) {
    const motivo = form.elements.pauseReason.value.trim();

    if (!motivo) {
        UrbanWatchAuth.showAlert("Informe uma justificativa para pausar o chamado.");
        return;
    }

    await patchJson(`/calls/${selectedCallId}/pausar`, { motivo });
    UrbanWatchAuth.showAlert("Chamado pausado com sucesso.");
    await refreshSelectedCall();
    await Promise.all([
        loadComments(selectedCallId),
        loadReview(selectedCallId),
        loadHistory(selectedCallId),
        loadAdminResources(selectedCallId)
    ]);
}

filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        activeFilter = button.dataset.filter;
        filterButtons.forEach((item) => item.classList.toggle("city-filter--active", item === button));
        statusFilterButtons.forEach((item) => item.classList.toggle("city-status-filter--active", item.dataset.statusFilter === activeStatusFilter));
        renderMetrics();
        renderCallList();
    });
});

statusFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        activeStatusFilter = button.dataset.statusFilter;
        statusFilterButtons.forEach((item) => item.classList.toggle("city-status-filter--active", item === button));
        renderMetrics();
        renderCallList();
    });
});

searchInput.addEventListener("input", renderCallList);

document.addEventListener("click", async (event) => {
    const previewImage = event.target.closest("[data-image-preview]");

    if (previewImage) {
        openImagePreview(previewImage.dataset.imagePreview || previewImage.src, previewImage.alt);
        return;
    }

    if (event.target.matches("[data-image-lightbox]")) {
        event.target.remove();
        return;
    }

    const metricButton = event.target.closest("[data-metric-filter]");

    if (metricButton) {
        activeFilter = metricButton.dataset.metricFilter || "all";
        activeStatusFilter = metricButton.dataset.metricStatus || "all";
        filterButtons.forEach((item) => item.classList.toggle("city-filter--active", item.dataset.filter === activeFilter));
        statusFilterButtons.forEach((item) => item.classList.toggle("city-status-filter--active", item.dataset.statusFilter === activeStatusFilter));
        renderMetrics();
        renderCallList();
        return;
    }

    const deleteCallButton = event.target.closest("[data-admin-delete-call]");

    if (deleteCallButton && isAdmin()) {
        event.preventDefault();

        if (!window.confirm("Excluir este chamado definitivamente?")) {
            return;
        }

        try {
            const callId = deleteCallButton.dataset.adminDeleteCall;
            await deleteCallComments(callId);
            await deleteRequest(`/calls/${callId}`);
            selectedCallId = null;
            closeModal();
            UrbanWatchAuth.showAlert("Chamado excluido com sucesso.");
            await loadCalls();
        } catch (error) {
            UrbanWatchAuth.showAlert("Nao foi possivel excluir o chamado agora.");
        }

        return;
    }

    const deleteReviewButton = event.target.closest("[data-admin-delete-review]");

    if (deleteReviewButton && isAdmin() && deleteReviewButton.dataset.adminDeleteReview) {
        event.preventDefault();

        if (!window.confirm("Excluir a avaliacao deste chamado?")) {
            return;
        }

        try {
            await deleteReviewImages(selectedCallId);
            await deleteRequest(`/calls/reviews/${deleteReviewButton.dataset.adminDeleteReview}`);
            reviewCache.delete(String(selectedCallId));
            reviewImageCache.delete(String(selectedCallId));
            UrbanWatchAuth.showAlert("Avaliacao excluida com sucesso.");
            await loadReview(selectedCallId);
            await loadAdminResources(selectedCallId);
        } catch (error) {
            UrbanWatchAuth.showAlert("Nao foi possivel excluir a avaliacao agora.");
        }

        return;
    }

    const deleteCallImageButton = event.target.closest("[data-admin-delete-call-image]");

    if (deleteCallImageButton && isAdmin()) {
        event.preventDefault();

        if (!window.confirm("Excluir este anexo do chamado?")) {
            return;
        }

        try {
            await deleteRequest(`/calls/images/${deleteCallImageButton.dataset.adminDeleteCallImage}`);
            UrbanWatchAuth.showAlert("Anexo excluido com sucesso.");
            await loadAdminResources(selectedCallId);
        } catch (error) {
            UrbanWatchAuth.showAlert("Nao foi possivel excluir o anexo agora.");
        }

        return;
    }

    const deleteReviewImageButton = event.target.closest("[data-admin-delete-review-image]");

    if (deleteReviewImageButton && isAdmin()) {
        event.preventDefault();

        if (!window.confirm("Excluir este anexo da avaliacao?")) {
            return;
        }

        try {
            await deleteRequest(`/calls/review/images/${deleteReviewImageButton.dataset.adminDeleteReviewImage}`);
            UrbanWatchAuth.showAlert("Anexo excluido com sucesso.");
            await loadAdminResources(selectedCallId);
        } catch (error) {
            UrbanWatchAuth.showAlert("Nao foi possivel excluir o anexo agora.");
        }

        return;
    }

    const deleteCommentButton = event.target.closest("[data-admin-delete-comment]");

    if (deleteCommentButton && isAdmin()) {
        event.preventDefault();

        if (!window.confirm("Excluir este comentario?")) {
            return;
        }

        try {
            await deleteRequest(`/calls/comments/${deleteCommentButton.dataset.adminDeleteComment}`);
            UrbanWatchAuth.showAlert("Comentario excluido com sucesso.");
            await loadComments(selectedCallId);
        } catch (error) {
            UrbanWatchAuth.showAlert("Nao foi possivel excluir o comentario agora.");
        }

        return;
    }

    const refreshAddressButton = event.target.closest("[data-refresh-address]");

    if (refreshAddressButton) {
        event.stopPropagation();
        await refreshCallAddress(refreshAddressButton.dataset.refreshAddress);
        return;
    }

    const selectButton = event.target.closest("[data-select-call]");

    if (selectButton) {
        await openCall(selectButton.dataset.selectCall);
        return;
    }

    if (event.target.closest("[data-city-modal-close]")) {
        closeModal();
        return;
    }

    const form = event.target.closest("[data-detail-form]");

    try {
        if (event.target.closest("[data-pause-call]") && form) {
            await pauseCall(form);
        }

        if (event.target.closest("[data-toggle-call-map]")) {
            const mapElement = document.querySelector("#cityCallMap");
            const call = getSelectedCall();

            if (mapElement) {
                mapElement.hidden = !mapElement.hidden;
                if (!mapElement.hidden) {
                    renderDetailMap(call);
                }
            }
        }

        if (event.target.closest("[data-city-chat-send]")) {
            await sendComment();
        }
    } catch (error) {
        UrbanWatchAuth.showAlert("Nao foi possivel concluir a acao agora.");
    }
});

document.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-detail-form]");

    if (!form) {
        return;
    }

    event.preventDefault();

    try {
        await saveStatus(form);
    } catch (error) {
        UrbanWatchAuth.showAlert("Nao foi possivel atualizar o status agora.");
    }
});

document.addEventListener("keydown", async (event) => {
    if (event.key === "Escape" && !cityModal.hidden) {
        closeModal();
    }

    if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-select-call]")) {
        event.preventDefault();
        await openCall(event.target.dataset.selectCall);
    }

    if (event.key === "Enter" && event.target.matches("[data-city-chat-input]")) {
        event.preventDefault();
        await sendComment();
    }
});

refreshButton.addEventListener("click", loadCalls);
logoutButton.addEventListener("click", UrbanWatchAuth.logout);

document.addEventListener("DOMContentLoaded", async () => {
    loadStoredAddressCache();
    const user = await requireCityHall();

    if (user) {
        await loadCalls();
    }
});
