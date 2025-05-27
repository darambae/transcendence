import { actualizeIndexPage } from '../utils.js'

export async function handleSignupSubmit(event) {
	function getCookie(name) {
		let cookieValue = null;
		if (document.cookie && document.cookie !== '') {
			const cookies = document.cookie.split(';');
			for (let i = 0; i < cookies.length; i++) {
				const cookie = cookies[i].trim();
				if (cookie.substring(0, name.length + 1) === (name + '=')) {
					cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
					break;
				}
			}
		}
		return cookieValue;
	}
	event.preventDefault();
	console.log("here in signup form handling function");

	const form = event.target;
	const submitButton = form.querySelector("button[type='submit']");

	const formData = new FormData(form);
	const data = Object.fromEntries(formData.entries());

	console.log(data);
	const csrf = getCookie('csrftoken');
	if (!csrf) {
		console.error("CSRF token not found");
		return;
	} else { 
		console.log("CSRF token found: ", csrf);
	}

	try {
		submitButton.disabled = true;
		
		const response = await fetch('user-service/signup/', {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				'X-CSRFToken': getCookie('csrftoken'),
			},
			body: JSON.stringify(data)
		})

		// const text = await response.text();
		// try {
		// 	const result = JSON.parse(text);
		// 	console.log(result);
		// } catch (e) {
		// 	console.error("Réponse non JSON :", text);
		// }

		if (response.ok) {
			console.log("signin form successfully submitted");
			actualizeIndexPage('main-content', signupSucess);
		} else {
			console.log("signup form couldn't connect")
			//signup form error handling (already existing, password etc..)
		}
	} catch (error) {
		console.error("connection error: ", error);
	} finally {
		submitButton.disabled = false;
	}
}

export function signupController() {
	const loginForm = document.getElementById("login-form");
	const modalContainer = document.getElementById("modal-container");

	//close the login form window
	if (loginForm) {
		modalContainer.style.display = "none";
		loginForm.classList.remove("active");
	}

	//password check
	const passwordInput = document.getElementById("inputPassword");
	const ruleUppercase = document.getElementById("rule-uppercase");
	const ruleNumber = document.getElementById("rule-number");
	const ruleSpecialChar = document.getElementById("rule-special-char");

	passwordInput.addEventListener('input', () => {
		const value = passwordInput.value;

		const hasUppercase = /[A-Z]/.test(value);
		const hasNumber = /\d/.test(value);
		const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

		ruleUppercase.className = hasUppercase ? 'valid' : 'invalid';
		ruleNumber.className = hasNumber ? 'valid' : 'invalid';
		ruleSpecialChar.className = hasSpecialChar ? 'valid' : 'invalid';
	});

	//password confirmation check
	const passwordConfirmationInput = document.getElementById("password-confirmation");
	const passwordConfirmationCheck = document.getElementById("passwordConfirmationCheck");

	passwordConfirmationInput.addEventListener('input', () => {
		if (passwordConfirmationInput.value !== passwordInput.value) {
			passwordConfirmationCheck.style.display = "block";
		} else {
			passwordConfirmationCheck.style.display = "none";
		}
	});

	passwordInput.addEventListener('input', () => {
		if (passwordConfirmationInput.value !== passwordInput.value) {
			passwordConfirmationCheck.style.display = "block";
		} else {
			passwordConfirmationCheck.style.display = "none";
		}
	});

	const form = document.querySelector("#signup-form form");
	if (form) {
		console.log("here 1");
		form.addEventListener("submit", handleSignupSubmit);
	}
}