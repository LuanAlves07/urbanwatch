const UrbanWatchAuth = (() => {
    const TOKEN_COOKIE = "token";
    const ALERT_DURATION = 10000;
    let currentUser = null;
    let alertTimer = null;

    function getCookie(name) {
        return document.cookie
            .split("; ")
            .find((cookie) => cookie.startsWith(`${name}=`))
            ?.split("=")
            .slice(1)
            .join("=");
    }

    function getToken() {
        const token = getCookie(TOKEN_COOKIE);
        return token ? decodeURIComponent(token) : null;
    }

    function setToken(token) {
        document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=86400; SameSite=Strict`;
    }

    function clearToken() {
        document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Strict`;
    }

    async function authenticatedFetch(url, options = {}) {
        const token = getToken();
        const headers = new Headers(options.headers || {});

        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        return fetch(url, {
            ...options,
            headers
        });
    }

    function getFirstName(name) {
        return name?.trim().split(/\s+/)[0] || "usuario";
    }

    function updateNavbar(user) {
        const navbar = document.querySelector(".navbar");
        const loginLink = document.querySelector("[data-auth-link]");
        const loginText = document.querySelector("[data-auth-text]");
        const panelLink = document.querySelector("[data-panel-link]");

        if (!navbar || !loginLink || !loginText) {
            return;
        }

        if (!user) {
            currentUser = null;
            loginLink.href = "/login";
            loginText.textContent = "LOGIN/REGISTRO";
            loginLink.classList.remove("navbar__link--logged");
            navbar.classList.remove("navbar--authenticated");
            if (panelLink) {
                panelLink.hidden = true;
            }
            panelLink?.classList.remove("navbar__link--panel-visible");
            return;
        }

        currentUser = user;
        loginLink.href = "/account";
        loginText.textContent = `Olá, ${getFirstName(user.name)}!`;
        loginLink.classList.add("navbar__link--logged");
        navbar.classList.add("navbar--authenticated");
        if (panelLink) {
            panelLink.hidden = !["CITY_HALL", "ADMIN"].includes(String(user.role || "").toUpperCase());
        }
        panelLink?.classList.toggle("navbar__link--panel-visible", ["CITY_HALL", "ADMIN"].includes(String(user.role || "").toUpperCase()));
    }

    async function loadCurrentUser() {
        if (!getToken()) {
            updateNavbar(null);
            return null;
        }

        try {
            const response = await authenticatedFetch("/users/me");

            if (!response.ok) {
                clearToken();
                updateNavbar(null);
                return null;
            }

            const user = await response.json();
            updateNavbar(user);
            return user;
        } catch (error) {
            updateNavbar(null);
            return null;
        }
    }

    function logout() {
        clearToken();
        updateNavbar(null);
        window.location.href = "/login";
    }

    function closeAlert() {
        const alert = document.querySelector("[data-auth-alert]");

        if (!alert) {
            return;
        }

        window.clearTimeout(alertTimer);
        alert.classList.add("auth-alert--closing");
        alert.addEventListener("animationend", () => alert.remove(), { once: true });
    }

    function showAlert(message) {
        document.querySelector("[data-auth-alert]")?.remove();
        window.clearTimeout(alertTimer);

        const alert = document.createElement("div");
        alert.className = "auth-alert";
        alert.setAttribute("data-auth-alert", "");
        alert.innerHTML = `
            <div class="auth-alert__content">
                <p>${message}</p>
                <button type="button" class="auth-alert__close" aria-label="Fechar alerta">X</button>
            </div>
            <div class="auth-alert__progress"></div>
        `;

        document.body.appendChild(alert);
        alert.querySelector(".auth-alert__close").addEventListener("click", closeAlert);
        alertTimer = window.setTimeout(closeAlert, ALERT_DURATION);
    }

    function setupMenu() {
        const menu = document.querySelector("[data-menu]");
        const button = document.querySelector("[data-menu-button]");
        const logoutButton = document.querySelector("[data-menu-logout]");
        const accountLink = document.querySelector("[data-menu-account]");

        if (!menu || !button) {
            return;
        }

        button.addEventListener("click", (event) => {
            event.preventDefault();
            const isOpen = menu.classList.toggle("navbar__menu--open");
            button.setAttribute("aria-expanded", String(isOpen));
        });

        document.addEventListener("click", (event) => {
            if (!menu.contains(event.target)) {
                menu.classList.remove("navbar__menu--open");
                button.setAttribute("aria-expanded", "false");
            }
        });

        logoutButton?.addEventListener("click", logout);

        accountLink?.addEventListener("click", (event) => {
            event.preventDefault();
            if (currentUser) {
                window.location.href = "/account";
            }
        });
    }

    return {
        authenticatedFetch,
        clearToken,
        getToken,
        loadCurrentUser,
        logout,
        showAlert,
        setupMenu,
        setToken
    };
})();

document.addEventListener("DOMContentLoaded", () => {
    UrbanWatchAuth.setupMenu();
    UrbanWatchAuth.loadCurrentUser();
});
