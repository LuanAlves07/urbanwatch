const loginForm = document.querySelector(".login-form");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");

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
            await UrbanWatchAuth.loadCurrentUser();

            console.log("Success!");
            window.location.href = "/";
        } else {
            showLoginError();
            console.error("Auth Error > Invalid email or password");
        }
    } catch (error) {
        showLoginError();
        console.error("AuthError > ", error);
    }
});
