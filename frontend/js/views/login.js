
import { routes } from "../routes.js";
import { actualizeIndexPage, getCookie, loadTemplate, closeModal } from "../utils.js";
import { renderChatButtonIfAuthenticated } from "./chat.js";

async function double_authenticate(data) {
	const html = await loadTemplate('doubleAuth');
	const content = document.getElementById("login-form");
	if (html) {
		content.innerHTML = html;
	}
	const mail = data.mail;
	if (!mail) {
		throw new Error("No mail address provided for double authentication");
	}
	const mailDiv = document.querySelector('.login-form .double-auth .user-mail');
	if (mailDiv) {
		mailDiv.textContent = mail;
	}
	
	return new Promise((resolve, reject) => {
		const form = document.getElementById('double-auth-form');
		const csrf = getCookie('csrftoken');
		console.log("csrf:", csrf);
		form.addEventListener("submit", async (e) => {
			e.preventDefault();

			const code = document.getElementById('auth-code').value;
			console.log("mail + code: ", code, mail);
			const response = await fetch("auth/verifyTwofa/", {
				method: "POST",
				credentials: 'include',
				headers: {
					"Content-Type": "application/json",
					'X-CSRFToken': csrf,
				},
				body: JSON.stringify({ mail, code })
			});

			const responseData = await response.json();

			if (response.ok) {
				resolve(true);
			} else {
				const errorDiv = document.querySelector('.double-auth .error-msg');
				if (errorDiv) {
					let errorMsg = 'Authentication failed';

					if (responseData.error) {
						// If error is an object with nested properties
						if (typeof responseData.error === 'object') {
							// Try to extract meaningful message or stringify it nicely
							errorMsg =
								responseData.error.detail ||
								responseData.error.message ||
								JSON.stringify(responseData.error);
						} else {
							// If error is just a string
							errorMsg = responseData.error;
						}
					}

					errorDiv.textContent = errorMsg;
					errorDiv.style.display = 'block';
				}
				reject(new Error('invalid code'));
			}
		});
	});
}

export async function handleLoginSubmit(event) {

	event.preventDefault();
	
	const form = event.target;
	const submitButton = form.querySelector("button[type='submit']");
	const loadingMessage = form.querySelector("#loading-message");

	const formData = new FormData(form);
	const dataForm = Object.fromEntries(formData.entries());

	try {
		submitButton.disabled = true;
		if (loadingMessage) 
			loadingMessage.style.display = "inline";
		
		const csrf = getCookie('csrftoken');
		console.log("csrf: ", csrf);
		const response = await fetch("/auth/login/", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				'X-CSRFToken': csrf,
			},
			credentials: 'include',
			body: JSON.stringify(dataForm)
		});

		const data = await response.json();
		console.log("response data: ", data);
		if (response.ok) {
			try {
				await double_authenticate(dataForm);
				closeModal();
				actualizeIndexPage('toggle-login', routes['user']);
				const hash = location.hash.slice(1);
				if (hash === 'signup') {
					actualizeIndexPage('main-content', routes.home);
				}
				const username = data.user_name || dataForm.username || dataForm.mail; // fallback if needed
				console.log(`User ${username} successfully connected`);
				window.loggedInUser = username;
				await renderChatButtonIfAuthenticated();
				// After successful login, initialize chat system
				// if (!window.chatInitialized) {
				// 	console.log('Login successful, initializing chat system.');
					
				// 	loadChatUI(chatController(username));
				// 	window.chatInitialized = true;
				// }
				//
			} catch (error) {
				console.log("Double auth error: ", error);
			}
		} else {
			console.log("Couldn't connect");
			//Error handling (wrong password, mail address not known, etc...)
			const errorDiv = document.querySelector('.login-form .error-msg');
			const errorMsg = data.error;
			if (errorMsg) {
				errorDiv.textContent = "ERROR: " + errorMsg.toUpperCase();
				//shaking animation
				errorDiv.classList.remove("shake");
				void errorDiv.offsetWidth;
				errorDiv.classList.add("shake");
			}
		}
	} catch (error) {
		console.error("Connection error: ", error);
	} finally {
		submitButton.disabled = false;
		if (loadingMessage)
			loadingMessage.style.display = "none";
	}
}


export function loginController() {
	const modalContainer = document.getElementById("modal-container");
	const closeBtn = document.getElementById("close-login-form");

	closeBtn.addEventListener("click", () => {
		closeModal();
	});

	modalContainer.addEventListener("click", (event) => {
		if(event.target.id === "modal-container") {
			closeModal();
		}
	});

	document.getElementById('forgotten-password').onclick = async function(event) {
		actualizeIndexPage('modal-container', routes.forgotPassword);
	}

	const form = document.getElementById("log-form");
	if (form) {
	  form.addEventListener("submit", handleLoginSubmit);
	}
}