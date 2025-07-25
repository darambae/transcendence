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
		console.error('CSRF token not found');
		return;
	} else {
		console.log('CSRF token found: ', csrf);
	}

	try {
		submitButton.disabled = true;

		const { username, mail, firstName, lastName, password } = data;
		const cleanData = { username, mail, firstName, lastName, password };

		const response = await fetch('/user-service/signup/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': csrf,
			},
			body: JSON.stringify(cleanData),
			credentials: 'include',
		});

		let responseData = null;
		if (!response.ok) {
			responseData = await response.json();

			console.log(responseData);
		}

		if (response.ok) {
			console.log('signin form successfully submitted');
			await actualizeIndexPage('main-content', routes.signupSuccess);
			history.replaceState(null, '', '/');
			const mailDiv = document.querySelector('.signup-success .user-mail');
			const mail = cleanData.mail;
			if (mailDiv) {
				mailDiv.textContent = mail;
			}

			const loginBtn = document.getElementById('signupSuccess-login');
			if (loginBtn) {
				loginBtn.addEventListener('click', async () => {
					await actualizeIndexPage('modal-container', routes.login);
					window.location.href = '/#home';
				});
			}
		} else {
			console.log("signup form couldn't connect");
			let errorMsg;
            if (responseData.create_user && responseData.create_user.error) {
                errorMsg = responseData.create_user.error;
            } else if (responseData.error) {
                errorMsg = responseData.error;
            }

			console.log('error: ', errorMsg);

			const errorDiv = document.getElementById('passwordConfirmationError');
			if (errorMsg) {
				errorDiv.textContent = 'ERROR: ' + errorMsg.toUpperCase();
				//shaking animation
				errorDiv.classList.remove('shake');
				void errorDiv.offsetWidth;
				errorDiv.classList.add('shake');
			}

			setTimeout(() => {
				errorDiv.textContent = '';
				errorDiv.classList.remove('shake');
			}, 5000);
		}
	} catch (error) {
		console.error('connection error: ', error);
	} finally {
		submitButton.disabled = false;
	}
}

export function signupController() {
	const loginForm = document.getElementById('login-form');
	const modalContainer = document.getElementById('modal-container');

	//close the login form window
	if (loginForm) {
		modalContainer.style.display = 'none';
		loginForm.classList.remove('active');
	}

	//password check
	const passwordInput = document.getElementById('inputPassword');
	const ruleUppercase = document.getElementById('rule-uppercase');
	const ruleNumber = document.getElementById('rule-number');
	const ruleSpecialChar = document.getElementById('rule-special-char');
	const invalidSpan = document.getElementById('passwordConfirmationError');

	function resetError() {
		if (invalidSpan) {
			invalidSpan.textContent = '';
			invalidSpan.style.display = 'none';
			invalidSpan.classList.remove('shake');
		}

		const passwordConfirmationError = document.getElementById('passwordConfirmationError');
        if (passwordConfirmationError) {
            passwordConfirmationError.textContent = '';
            passwordConfirmationError.style.display = 'none';
            passwordConfirmationError.classList.remove('shake');
        }
	}

	function displayErrors(element, messages) {
		console.log('Validation errors:', messages);
		if (!element) return;

		element.textContent = messages.join('\n');
		element.style.display = 'block';
		element.classList.remove('shake');
		void element.offsetWidth;
		element.classList.add('shake');
	}

	function validateMaxLength(inputElement, maxLength, fieldName) {
		if (!inputElement) return;

		inputElement.addEventListener('input', () => {
			const value = inputElement.value;

			if (value.length > maxLength) {
				inputElement.style.borderColor = 'red';
				inputElement.title = `${fieldName} cannot exceed ${maxLength} characters`;
			} else {
				inputElement.style.borderColor = '';
				inputElement.title = '';
			}

			resetError();
		});
	}

	const passwordConfirmationInput = document.getElementById(
		'password-confirmation'
	);
	const passwordConfirmationError = document.getElementById(
		'passwordConfirmationError'
	);

	// Get input elements
	const usernameInput =
		document.getElementById('inputUsername') ||
		document.querySelector("input[name='username']");

	const firstNameInput =
		document.getElementById('inputFirstName') ||
		document.querySelector("input[name='firstName']");

	const lastNameInput =
		document.getElementById('inputLastName') ||
		document.querySelector("input[name='lastName']");

	// Add custom validation for username (includes whitespace check)
	if (usernameInput) {
		usernameInput.addEventListener('input', () => {
			const value = usernameInput.value;

			// Check for whitespace first
			if (/\s/.test(value)) {
				usernameInput.style.borderColor = 'red';
				usernameInput.title = 'Username cannot contain spaces or whitespace';
			} else {
				// Then use the length validation
				if (value.length > 15) {
					usernameInput.style.borderColor = 'red';
					usernameInput.title = 'Username cannot exceed 15 characters';
				} else {
					usernameInput.style.borderColor = '';
					usernameInput.title = '';
				}
			}
			resetError();
		});
	}

	// Apply length validation to first name and last name
	validateMaxLength(firstNameInput, 15, 'First name');
	validateMaxLength(lastNameInput, 15, 'Last name');

	passwordInput.addEventListener('input', () => {
		const value = passwordInput.value;

		const hasUppercase = /[A-Z]/.test(value);
		const hasNumber = /\d/.test(value);
		const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

		ruleUppercase.className = hasUppercase ? 'valid' : 'invalid';
		ruleNumber.className = hasNumber ? 'valid' : 'invalid';
		ruleSpecialChar.className = hasSpecialChar ? 'valid' : 'invalid';

		resetError();
	});

	// Utility function to validate field length on form submission
	function validateFieldLength(
		value,
		fieldName,
		maxLength,
		errMsg,
		inputErrRef
	) {
		if (value && value.length > maxLength) {
			errMsg.push(`${fieldName} cannot exceed ${maxLength} characters.`);
			inputErrRef.inputErr = true;
		}
		return inputErrRef.inputErr;
	}

	const form = document.querySelector('#signup-form form');
	if (form) {
		form.addEventListener('submit', (event) => {
			event.preventDefault();
			const inputErrRef = { inputErr: false }; // Using an object to pass by reference
			let errMsg = [];
			if (invalidSpan) {
				// Get input values
				const usernameInput =
					document.getElementById('inputUsername') ||
					document.querySelector("input[name='username']");
				const usernameValue = usernameInput ? usernameInput.value : '';

				const firstNameInput =
					document.getElementById('inputFirstName') ||
					document.querySelector("input[name='firstName']");
				const firstNameValue = firstNameInput ? firstNameInput.value : '';

				const lastNameInput =
					document.getElementById('inputLastName') ||
					document.querySelector("input[name='lastName']");
				const lastNameValue = lastNameInput ? lastNameInput.value : '';

				// Username validation (whitespace check + length check)
				if (/\s/.test(usernameValue)) {
					errMsg.push(
						'Username cannot contain spaces or whitespace characters.'
					);
					inputErrRef.inputErr = true;
				} else {
					validateFieldLength(
						usernameValue,
						'Username',
						15,
						errMsg,
						inputErrRef
					);
				}

				// First name and last name validation
				validateFieldLength(
					firstNameValue,
					'First name',
					15,
					errMsg,
					inputErrRef
				);
				validateFieldLength(
					lastNameValue,
					'Last name',
					15,
					errMsg,
					inputErrRef
				);

				// Password validation
				const value = passwordInput.value;
				const hasUppercase = /[A-Z]/.test(value);
				const hasNumber = /\d/.test(value);
				const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

				passwordConfirmationError.style.display = 'block';
				if (!hasUppercase || !hasNumber || !hasSpecialChar) {
					errMsg.push(
						'Password must contain at least one uppercase letter, one number, and one special character.'
					);
					inputErrRef.inputErr = true;
				} else if (passwordConfirmationInput.value !== passwordInput.value) {
					errMsg.push('Passwords do not match.');
					inputErrRef.inputErr = true;
				}

				// Display validation errors if any
				if (inputErrRef.inputErr) {
					displayErrors(invalidSpan, errMsg);
					return;
				}
			}
			handleSignupSubmit(event);
		});
	}
}
