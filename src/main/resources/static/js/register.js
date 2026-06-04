const registerForm = document.querySelector(".register-form");
const elPassword = document.querySelector("#password");
const elConfirmPassword = document.querySelector("#confirmPassword");

const errorTextPass = document.querySelector(".error-text")

function markPasswordError(message) {
    elPassword.classList.add("input-error");
    elConfirmPassword.classList.add("input-error");
    errorTextPass.textContent = `*${message}*`;
    errorTextPass.classList.remove("hidden");
}

function clearPasswordError() {
    elPassword.classList.remove("input-error");
    elConfirmPassword.classList.remove("input-error");
}

elConfirmPassword.addEventListener('input', (e)=>{
    if(e.target.value !== elPassword.value){
        elConfirmPassword.classList.add('input-error')
        errorTextPass.textContent = '*As senhas nao correspondem*'
        errorTextPass.classList.remove('hidden')
    } else {
        clearPasswordError()
        errorTextPass.classList.add('hidden')
    }
})

elPassword.addEventListener('input', (e)=>{
    if(e.target.value !== elConfirmPassword.value){
        elConfirmPassword.classList.add('input-error')
        errorTextPass.textContent = '*As senhas nao correspondem*'
        errorTextPass.classList.remove('hidden')
    } else {
        clearPasswordError()
        errorTextPass.classList.add('hidden')
    }
})

registerForm.addEventListener("submit", async (e) =>{
    e.preventDefault();

    const name = document.querySelector("#name").value
    const email = document.querySelector("#email").value
    const password = elPassword.value
    clearPasswordError();

    if (password.length < 6) {
        markPasswordError("Senha invalida. Use pelo menos 6 caracteres.");
        return;
    }

    if (elPassword.value === elConfirmPassword.value){
        try{
            const response = await fetch("/auth/register", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({name, email, password})
            })
            if (response.ok){
                const data = await response.json();

                UrbanWatchAuth.setToken(data.token);
                await UrbanWatchAuth.loadCurrentUser();

                console.log("Success!")
                window.location.href = "/";
            } else {
                const errorData = await response.json().catch(() => null);
                markPasswordError(errorData?.message || "Nao foi possivel registrar. Verifique a senha e os dados informados.");
                console.error("Auth Error > Register failed", errorData);
            }
        } catch (e){
            markPasswordError("Nao foi possivel registrar agora. Tente novamente em instantes.");
            console.error("AuthError > ", e)
        }
    } else {
        markPasswordError("As senhas nao correspondem.");
    }

})
