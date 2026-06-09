const accountName = document.querySelector("[data-account-name]");
const accountEmail = document.querySelector("[data-account-email]");
const toggleEmailButton = document.querySelector("[data-toggle-email]");
const logoutButton = document.querySelector("[data-account-logout]");

let currentUser = null;
let isEmailVisible = false;

function maskEmail(email) {
    const [localPart = "", domain = ""] = String(email || "").split("@");
    const firstLetter = localPart.charAt(0);
    return domain ? `${firstLetter}${"*".repeat(Math.max(localPart.length - 1, 4))}@${domain}` : firstLetter;
}

function renderAccount() {
    if (!currentUser) {
        return;
    }

    accountName.textContent = currentUser.name || "Usuario";
    accountEmail.textContent = isEmailVisible ? currentUser.email : maskEmail(currentUser.email);
    toggleEmailButton.textContent = isEmailVisible ? "Ocultar" : "Visualizar";
}

document.addEventListener("DOMContentLoaded", async () => {
    currentUser = await UrbanWatchAuth.loadCurrentUser();

    if (!currentUser) {
        window.location.href = "/login";
        return;
    }

    renderAccount();
});

toggleEmailButton.addEventListener("click", () => {
    isEmailVisible = !isEmailVisible;
    renderAccount();
});

logoutButton.addEventListener("click", () => {
    UrbanWatchAuth.logout();
});
