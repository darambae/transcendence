import { actualizeIndexPage, getCookie } from '../utils.js';
import { routes } from '../routes.js';

export async function handleSignupSubmit(event) {
	
	event.preventDefault();

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
		
		const { username, mail, firstName, lastName, password } = data;
		const cleanData = { username, mail, firstName, lastName, password };
		
		const response = await fetch('user-service/signup/', {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				'X-CSRFToken': csrf,
			},
			body: JSON.stringify(cleanData),
			credentials: 'include'
		})

		let responseData = null; 
		if (!response.ok) {
			responseData = await response.json();
		}
		
		if (response.ok) {
			console.log("signin form successfully submitted");
			await actualizeIndexPage('main-content', routes.signupSuccess);
			const mailDiv = document.querySelector('.signup-success .user-mail');
			const mail = cleanData.mail;
			if (mailDiv){
				mailDiv.textContent = mail;
			}
		} else {
			console.log("signup form couldn't connect")
			const errorMsg = responseData.error;

			const errorDiv = document.querySelector('.signup-form .error-msg');
			if (errorMsg) {
				errorDiv.textContent = "ERROR: " + errorMsg.toUpperCase();
				//shaking animation
				errorDiv.classList.remove("shake");
        		void errorDiv.offsetWidth;
        		errorDiv.classList.add("shake");
			}
			
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
		form.addEventListener("submit", (event) => {
			if (passwordConfirmationInput.value !== passwordInput.value) {
				event.preventDefault();
				passwordConfirmationCheck.style.display = "block";
				//shaking animation
				passwordConfirmationCheck.classList.remove("shake");
        		void passwordConfirmationCheck.offsetWidth;
        		passwordConfirmationCheck.classList.add("shake");
            	return;
			}
		handleSignupSubmit(event);
	});
	}
}