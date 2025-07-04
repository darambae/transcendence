import { routes } from "../routes.js";
import { actualizeIndexPage, closeModal, getCookie } from "../utils.js";

async function sendTemporaryPassword(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const userMail = Object.fromEntries(formData.entries());

    try {
        const csrf = getCookie('csrftoken');
        const response = await fetch('auth/forgotPassword/', {
            method: 'PATCH',
            headers: {
                "Content-Type": "application/json",
                'X-CSRFToken': csrf,
            },
            body: JSON.stringify({mail: userMail.mail})
        });

        if(response.ok) {
			document.getElementById('forgot-password-form').classList.remove('d-block');
			document.getElementById('forgot-password-form').classList.add('d-none');
			document.getElementById('forgot-password-success').classList.remove('d-none');
			document.getElementById('forgot-password-success').classList.add('d-block');

			const mailSpan = document.querySelector('.forgot-password-mail');
			if (mailSpan) {
				mailSpan.textContent = userMail.mail;
			}

			const closeBtn = document.getElementById("close-forgot-password-success");
			if (closeBtn) {
				closeBtn.addEventListener("click", () => {
					closeModal();
				});
			}

            const loginBtn = document.getElementById('login-forgot-password');
            if (loginBtn) {
                loginBtn.addEventListener('click', () => {
                    actualizeIndexPage('modal-container', routes.login);
                });
            }
        } else {
            const respData = await response.json();
            const errorMsg = respData.error;
            if (errorMsg) {
                const errorDiv = document.getElementById('mail-error-msg');
                if (errorDiv) {
                    errorDiv.textContent = "error: " + errorMsg;
                    errorDiv.classList.remove("shake");
                    void errorDiv.offsetWidth;
                    errorDiv.classList.add("shake");
                }
            }
        }
    } catch (error) {
        console.log("connection error : ", error);
    }
}

export function forgotPasswordController() {
    const mailForNewPassword = document.getElementById('mail-for-new-password');
    if (mailForNewPassword) {
        mailForNewPassword.addEventListener('submit', sendTemporaryPassword);
    }
    const closeBtn = document.getElementById("close-forgot-password-form");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            closeModal();
        });
    }
}