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
let selectedUploadFiles = [];
let selectedChatFile = null;
let editingCallId = null;
const addressCache = new Map();

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

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
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
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
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
        },
        () => {},
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

    const callsWithCoords = calls.filter((call) => call.latitude && call.longitude);

    callsWithCoords.forEach((call) => {
        const marker = L.marker([call.latitude, call.longitude])
            .addTo(homeMap)
            .bindPopup(escapeHtml(call.title || "Alerta"));

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

async function fetchNominatim(params) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("countrycodes", "br");

    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            url.searchParams.set(key, value);
        }
    });

    const response = await fetch(url, {
        headers: {
            "Accept": "application/json",
            "Accept-Language": "pt-BR"
        }
    });

    if (!response.ok) {
        throw new Error("Nominatim failed");
    }

    return response.json();
}

async function fetchNominatimReverse(latitude, longitude) {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("lat", latitude);
    url.searchParams.set("lon", longitude);

    const response = await fetch(url, {
        headers: {
            "Accept": "application/json",
            "Accept-Language": "pt-BR"
        }
    });

    if (!response.ok) {
        throw new Error("Reverse geocode failed");
    }

    return response.json();
}

function formatNominatimAddress(result, fallback) {
    const address = result.address || {};
    const parts = [
        address.road,
        address.house_number,
        address.suburb || address.neighbourhood,
        address.city || address.town || address.village || address.municipality,
        address.state,
        address.postcode
    ].filter(Boolean);

    return parts.length ? parts.join(", ") : result.display_name || fallback;
}

async function getCallAddress(call) {
    if (!call.latitude || !call.longitude) {
        return "Endereco nao informado";
    }

    const key = `${call.latitude},${call.longitude}`;

    if (addressCache.has(key)) {
        return addressCache.get(key);
    }

    try {
        const result = await fetchNominatimReverse(call.latitude, call.longitude);
        const address = formatNominatimAddress(result, "Endereco nao encontrado");
        addressCache.set(key, address);
        return address;
    } catch (error) {
        return "Endereco nao encontrado";
    }
}

async function enrichCallAddresses() {
    const callsWithCoords = calls.filter((call) => call.latitude && call.longitude);

    for (const call of callsWithCoords) {
        if (!call.visualAddress) {
            call.visualAddress = await getCallAddress(call);
            renderCalls();
        }
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
    let data = [];
    let cepLookup = null;

    if (isCepOnly(rawQuery)) {
        try {
            cepLookup = await lookupBrazilianCep(cepDigits);
            data = await fetchNominatim({
                q: `${cepLookup.query}, Brasil`
            });
        } catch (error) {
            data = await fetchNominatim({
                postalcode: cepDigits,
                country: "Brasil"
            });
        }
    }

    if (!data.length) {
        data = await fetchNominatim({
            q: `${rawQuery}, Brasil`
        });
    }

    if (!data.length) {
        throw new Error("Location not found");
    }

    const result = data[0];
    const resultAddress = result.address || {};

    return {
        latitude: Number(result.lat),
        longitude: Number(result.lon),
        address: cepLookup?.displayAddress || formatNominatimAddress(result, rawQuery),
        postcode: cepLookup?.postcode || resultAddress.postcode || (isCepOnly(rawQuery) ? normalizeCep(cepDigits) : "")
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

function renderCalls() {
    const visibleCalls = activeTab === "mine" && currentUser
        ? calls.filter((call) => call.userId === currentUser.id)
        : calls;

    if (!visibleCalls.length) {
        alertList.innerHTML = `<p class="alert-empty">${activeTab === "mine" ? "Voce ainda nao criou alertas." : "Nenhum alerta encontrado."}</p>`;
        return;
    }

    alertList.innerHTML = visibleCalls
        .slice()
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
        .map((call) => `
            <button type="button" class="alert-card" data-call-id="${call.id}">
                <span class="alert-card__body">
                    <span class="alert-card__meta">
                        <span>${escapeHtml(formatStatus(call.status))} | ${escapeHtml(describePlace(call))}</span>
                        <span>Atualizado ${formatDate(call.updatedAt || call.createdAt)}</span>
                    </span>
                    <span class="alert-card__title">${escapeHtml(call.title)}</span>
                </span>
                <div class="alert-card__icon">
                    <img src="../images/icos/search.png"></img>
                </div>
            </button>
        `)
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
        renderCalls();
        updateHomeMap();
        enrichCallAddresses();
    } catch (error) {
        console.error("CallsError > ", error);
        alertList.innerHTML = '<p class="alert-empty">Nao foi possivel carregar os alertas agora.</p>';
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

    editingCallId = call.id;
    selectedUploadFiles = [];
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
    uploadList.innerHTML = selectedUploadFiles
        .slice(0, 4)
        .map((file, index) => `
            <span class="upload-chip">
                <button type="button" class="upload-chip__remove" data-remove-upload="${index}" aria-label="Remover ${escapeHtml(file.name)}">X</button>
                ${escapeHtml(file.name)}
            </span>
        `)
        .join("");
}

async function uploadFiles(callId) {
    for (const file of selectedUploadFiles) {
        const formData = new FormData();
        formData.append("file", file);
        await UrbanWatchAuth.authenticatedFetch(`/calls/${callId}/images`, {
            method: "POST",
            body: formData
        });
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
        UrbanWatchAuth.showAlert("Preencha o titulo e as observacoes do alerta.");
        return;
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
        uploadList.innerHTML = "";
        setFormMode("create");
    } catch (error) {
        console.error("CreateCallError > ", error);
        UrbanWatchAuth.showAlert(editingCallId ? "Nao foi possivel salvar as alteracoes agora." : "Nao foi possivel criar o alerta agora.");
    }
}

function shouldShowChat(call) {
    return Boolean(currentUser && activeTab === "mine" && call.userId === currentUser.id);
}

function isCallFinished(call) {
    return call.status === "FINALIZADO";
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
            return `
                <article class="chat-message ${isMine ? "" : "chat-message--other"}">
                    <strong>${escapeHtml(comment.userName || "Usuario")} - ${formatDate(comment.createdAt)}</strong>
                    <p>${escapeHtml(comment.content)}</p>
                </article>
            `;
        })
        .join("");
}

function renderChatFilePreview() {
    if (!selectedChatFile) {
        chatFilePreview.hidden = true;
        chatFilePreview.innerHTML = "";
        return;
    }

    chatFilePreview.hidden = false;
    chatFilePreview.innerHTML = `
        <span>${escapeHtml(selectedChatFile.name)}</span>
        <button type="button" data-remove-chat-file aria-label="Remover anexo">X</button>
    `;
}

async function uploadChatFile(callId) {
    if (!selectedChatFile) {
        return null;
    }

    const formData = new FormData();
    formData.append("file", selectedChatFile);

    const response = await UrbanWatchAuth.authenticatedFetch(`/calls/${callId}/images`, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        throw new Error("Chat file upload failed");
    }

    return response.json();
}

async function loadComments(callId) {
    chatMessages.innerHTML = '<p class="alert-empty">Carregando mensagens...</p>';

    try {
        const response = await UrbanWatchAuth.authenticatedFetch(`/calls/${callId}/comments`);

        if (!response.ok) {
            throw new Error("Comments failed");
        }

        renderComments(await response.json());
    } catch (error) {
        chatMessages.innerHTML = '<p class="alert-empty">Mensagens indisponiveis agora.</p>';
    }
}

async function openCallDetails(callId) {
    const call = calls.find((item) => String(item.id) === String(callId));

    if (!call) {
        return;
    }

    selectedCall = call;
    const showChat = shouldShowChat(call);
    modalPanel.classList.toggle("call-modal__panel--mine", showChat);
    genericDetail.hidden = showChat;
    myCallDetail.hidden = !showChat;
    modal.hidden = false;

    if (showChat) {
        document.querySelector("[data-my-title]").textContent = call.title;
        document.querySelector("[data-my-status]").textContent = formatStatus(call.status);
        document.querySelector("[data-my-updated]").textContent = `Atualizado ${formatFullDate(call.updatedAt || call.createdAt)}`;
        document.querySelector("[data-my-address]").textContent = describePlace(call);
        document.querySelector("[data-my-code]").textContent = `Cod: ALERTA-${call.id}`;
        document.querySelector("[data-my-user]").textContent = call.userName || "Cidadao";
        document.querySelector("[data-my-created]").textContent = formatFullDate(call.createdAt);
        reviewButton.disabled = !isCallFinished(call);
        reviewButton.title = isCallFinished(call) ? "Avaliar chamado" : "Disponivel apos o encerramento do chamado";
        editCallButton.disabled = isCallFinished(call);
        editCallButton.title = isCallFinished(call) ? "Alerta ja encerrado" : "Editar alerta";
        selectedChatFile = null;
        if (chatFileInput) {
            chatFileInput.value = "";
        }
        renderChatFilePreview();
        await loadComments(call.id);
    } else {
        modal.querySelector("[data-modal-status]").textContent = `${formatStatus(call.status)} | ${call.userName || "Cidadao"}`;
        modal.querySelector("[data-modal-title]").textContent = call.title;
        modal.querySelector("[data-modal-description]").textContent = call.description;
        modal.querySelector("[data-modal-address]").textContent = describePlace(call);
        modal.querySelector("[data-modal-updated]").textContent = formatDate(call.updatedAt || call.createdAt);
        modal.querySelector("[data-modal-images]").innerHTML = '<p class="modal-image-item">Anexos serao exibidos quando o download de imagens estiver disponivel.</p>';
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
    selectedUploadFiles = Array.from(fileInput.files || []).slice(0, 4);
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

createForm.addEventListener("submit", submitAlert);

chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!selectedCall) {
        return;
    }

    const input = chatForm.elements.content;
    const content = input.value.trim();

    if (!content && !selectedChatFile) {
        return;
    }

    try {
        const uploadedFile = await uploadChatFile(selectedCall.id);
        const message = content || `Arquivo anexado: ${uploadedFile.fileName}`;
        const response = await UrbanWatchAuth.authenticatedFetch(`/calls/${selectedCall.id}/comments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ content: uploadedFile ? `${message}\nAnexo enviado: ${uploadedFile.fileName}` : message })
        });

        if (!response.ok) {
            throw new Error("Comment failed");
        }

        input.value = "";
        selectedChatFile = null;
        chatFileInput.value = "";
        renderChatFilePreview();
        await loadComments(selectedCall.id);
    } catch (error) {
        UrbanWatchAuth.showAlert("Nao foi possivel enviar a mensagem agora.");
    }
});

chatFileInput?.addEventListener("change", () => {
    selectedChatFile = chatFileInput.files?.[0] || null;
    renderChatFilePreview();
});

chatFilePreview?.addEventListener("click", (event) => {
    if (!event.target.closest("[data-remove-chat-file]")) {
        return;
    }

    selectedChatFile = null;
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
    const card = event.target.closest("[data-call-id]");

    if (card) {
        openCallDetails(card.dataset.callId);
    }
});

modal.querySelector("[data-modal-close]").addEventListener("click", () => {
    modal.hidden = true;
});

reviewButton.addEventListener("click", () => {
    if (!selectedCall || !isCallFinished(selectedCall)) {
        UrbanWatchAuth.showAlert("A avaliacao fica disponivel apenas apos o encerramento do chamado.");
        return;
    }

    UrbanWatchAuth.showAlert("Fluxo de avaliacao ainda nao foi conectado nesta tela.");
});

editCallButton?.addEventListener("click", () => {
    if (!selectedCall || editCallButton.disabled) {
        return;
    }

    openEditView(selectedCall);
});

document.addEventListener("DOMContentLoaded", async () => {
    initMaps();
    requestUserLocation();
    currentUser = await UrbanWatchAuth.loadCurrentUser();
    await loadCalls();

    const params = new URLSearchParams(window.location.search);
    if (params.get("novoAlerta") === "1") {
        await openCreateView(params.get("location") || params.get("cep") || "");
    }
});
