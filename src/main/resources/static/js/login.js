const loginForm = document.querySelector(".login-form");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const loginSubmit = loginForm.querySelector("button[type='submit']");

function clearLoginError() {
    emailInput.classList.remove("input-error");
    passwordInput.classList.remove("input-error");
}

function showLoginError() {
    emailInput.classList.add("input-error");
    passwordInput.classList.add("input-error");
    UrbanWatchAuth.showAlert("E-mail ou senha incorretos. Confira os dados e tente novamente.");
}

emailInput.addEventListener("input", clearLoginError);
passwordInput.addEventListener("input", clearLoginError);

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    clearLoginError();

    const email = emailInput.value;
    const password = passwordInput.value;

    const originalLabel = loginSubmit.textContent;
    loginSubmit.disabled = true;
    loginSubmit.textContent = "Entrando...";

    try {
        const response = await fetch("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const data = await response.json();

            UrbanWatchAuth.setToken(data.token);
            const user = await UrbanWatchAuth.loadCurrentUser();

            window.location.href = ["CITY_HALL", "ADMIN"].includes(user?.role) ? "/prefeitura" : "/";
            return;
        }

        showLoginError();
    } catch (error) {
        showLoginError();
    } finally {
        loginSubmit.disabled = false;
        loginSubmit.textContent = originalLabel;
    }
});
