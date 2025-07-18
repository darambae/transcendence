import { routes } from '../routes.js';
import {
	actualizeIndexPage,
	getCookie,
	loadTemplate,
	closeModal,
} from '../utils.js';
import { renderChatButtonIfAuthenticated } from './chat.js';
import { resetAuthCache } from '../router.js';

export async function showDoubleAuthForm(data) {
	const html = await loadTemplate('doubleAuth');
	const content = document.getElementById('login-form');
	if (html && content) {
		content.innerHTML = html;
	}

	const mail = data.mail;
	if (!mail) {
		throw new Error('No mail address provided for double authentication');
	}

	const mailDiv = document.querySelector('.login-form .double-auth .user-mail');
	if (mailDiv) {
		mailDiv.textContent = mail;
	}

	return mail;
}

export function setupDoubleAuthHandler(mail, username) {
	const form = document.getElementById('double-auth-form');
	if (!form || form.dataset.listenerAttached === 'true') return;

	form.dataset.listenerAttached = 'true';
	const csrf = getCookie('csrftoken');

	form.addEventListener('submit', async (e) => {
		e.preventDefault();

		const code = document.getElementById('auth-code').value;

		try {
			const response = await fetch('/auth/verifyTwofa/', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRFToken': csrf,
				},
				body: JSON.stringify({ mail, code }),
			});

			const responseData = await response.json();

			if (response.ok) {
				resetAuthCache();

				closeModal();
				await actualizeIndexPage('toggle-login', routes['user']);
				const hash = location.hash.slice(1);
				if (hash === 'signup') {
					await actualizeIndexPage('main-content', routes.home);
				}
				console.log(`User ${username} successfully connected`);
				window.loggedInUser = username;
				await renderChatButtonIfAuthenticated();
			} else {
				const errorDiv = document.querySelector('.double-auth .error-msg');
				let errorMsg = 'Authentication failed';

				if (responseData.error) {
					errorMsg =
						typeof responseData.error === 'object'
							? responseData.error.detail ||
							  responseData.error.message ||
							  JSON.stringify(responseData.error)
							: responseData.error;
				}

				if (errorDiv) {
					errorDiv.textContent = errorMsg;
					errorDiv.style.display = 'block';
				}
			}
		} catch (error) {
			console.error('2FA error: ', error);
		}
	});
}

// Handle main login form
export async function handleLoginSubmit(event) {
	event.preventDefault();

	const form = event.target;
	const submitButton = form.querySelector("button[type='submit']");
	const loadingMessage = form.querySelector('#loading-message');

	const formData = new FormData(form);
	const dataForm = Object.fromEntries(formData.entries());

	try {
		submitButton.disabled = true;
		if (loadingMessage) loadingMessage.style.display = 'inline';

		const csrf = getCookie('csrftoken');
		const response = await fetch('/auth/login/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': csrf,
			},
			credentials: 'include',
			body: JSON.stringify(dataForm),
		});

		const data = await response.json();

		if (response.ok) {
			try {
				const mail = await showDoubleAuthForm(dataForm);
				const username = data.user_name || dataForm.username || dataForm.mail;
				setupDoubleAuthHandler(mail, username);
			} catch (error) {
				console.error('Error setting up double authentication:', error);
			}
		} else {
			const errorDiv = document.querySelector('.login-form .error-msg');
			const errorMsg = data.error;
			if (errorMsg && errorDiv) {
				errorDiv.textContent = 'ERROR: ' + errorMsg.toUpperCase();
				errorDiv.classList.remove('shake');
				void errorDiv.offsetWidth;
				errorDiv.classList.add('shake');
			}
		}
	} catch (error) {
		console.error('Connection error: ', error);
	} finally {
		submitButton.disabled = false;
		if (loadingMessage) loadingMessage.style.display = 'none';
	}
}

export function loginController() {
	const modalContainer = document.getElementById('modal-container');
	const closeBtn = document.getElementById('close-login-form');

	if (closeBtn) {
		closeBtn.addEventListener('click', () => closeModal());
	}

	if (modalContainer) {
		modalContainer.addEventListener('click', (event) => {
			if (event.target.id === 'modal-container') {
				closeModal();
			}
		});
	}

	const forgotten = document.getElementById('forgotten-password');
	if (forgotten) {
		forgotten.onclick = async () =>
			await actualizeIndexPage('modal-container', routes.forgotPassword);
	}

	const form = document.getElementById('log-form');
	if (form) {
		form.addEventListener('submit', handleLoginSubmit);
	}
}
