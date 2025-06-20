import { routes } from "../routes.js";
import { actualizeIndexPage, getCookie, loadTemplate, closeModal } from "../utils.js";

async function double_authenticate(data) {
	const html = await loadTemplate('double_auth');
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
			const response = await fetch("auth/invits/verifyTwofa/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					'X-CSRFToken': csrf,
				},
				body: JSON.stringify({ mail, code })
			});

			const responseData = await response.json();

			if (response.ok) {
				resolve(true);
				let	accessToken = responseData.access; //Token to put in the authorization header of request trying to access protected roads
				let	refreshToken = responseData.refresh; // Token to get a new acccess token if needed without having to reconnect		


				console.log(accessToken)
				console.log(refreshToken)


				sessionStorage.setItem('accessToken', responseData.access);
				sessionStorage.setItem('refreshToken', responseData.refresh);
			} else {
				const errorDiv = document.querySelector('.double-auth .error-msg');
				if (errorDiv) {
					const errorMsg = responseData.error;
					errorDiv.textContent = errorMsg;
					errorDiv.style.display = "block";
				}
				reject(new Error("invalid code"));
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
		const response = await fetch("/auth/invits/login/", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				'X-CSRFToken': csrf,
			},
			body: JSON.stringify(dataForm)
		});

		const data = await response.json();
		console.log("response data: ", data);
		if (response.ok) {
			try {
				await double_authenticate(dataForm)
				//tokens returned in the JWT to communicate with protected roads
				//let	accessToken = data.access; //Token to put in the authorization header of request trying to access protected roads
				//let	refreshToken = data.refreshToken; // Token to get a new acccess token if needed without having to reconnect		

				//localStorage.setItem('accessToken', accessToken);
				//localStorage.setItem('refreshToken', refreshToken);

				closeModal();
				actualizeIndexPage('toggle-login', routes['user']);
				console.log("User successfully connected");
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
		console.error("Connection error: ");
	} finally {
		submitButton.disabled = false;
		if (loadingMessage)
			loadingMessage.style.display = "none";
	}
}



export function invitController() {
	const modalContainer = document.getElementById("modal-container");
	const closeBtn = document.getElementById("close-login-form");

	closeBtn.addEventListener("click", (event) => {
		closeModal();
	});

	modalContainer.addEventListener("click", (event) => {
		if(event.target.id === "modal-container") {
			closeModal();
		}
	});

	const form = document.getElementById("log-form");
	if (form) {
	  form.addEventListener("submit", handleLoginSubmit);
	}
}