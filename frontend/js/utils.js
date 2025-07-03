import { routes } from "./routes.js";

export async function loadTemplate(viewName) {
	const response = await fetch(`templates/${viewName}.html`);
	if (!response.ok) {
	  throw new Error(`Unable to load template ${viewName}`);
	}
	return await response.text();
}

export async function actualizeIndexPage(elementId, view) {
	const content = document.getElementById(elementId);
	const html = await loadTemplate(view.template);

	if (html) {
		content.innerHTML = html;
	}
	if (view.isModal) {
		content.style.display = 'block';
	}

	if (typeof view.controller === 'function') {
		view.controller();
	}
}

export async function closeModal(loc = "#home") {
	const loginForm = document.getElementById("login-form");
	const modalContainer = document.getElementById("modal-container")

	modalContainer.style.display = "none";
	modalContainer.innerHTML = "";
	if (loginForm) {
		loginForm.classList.remove("active");
	}
	//window.location = "#home";
}


//csrf token getter
export function getCookie(name) {
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

export async function isUserAuthenticated() {
	const response = await fetchWithRefresh('user-service/infoUser/', {
		method: 'GET',
		credentials: 'include'
	});
	if (response.ok) {
		if (response.online)
			console.log("online : ", response.online);
		return true;
	} else {
		console.log("is auth error : ", response.error, response.status);
		return false;
	}
}

export function attachLoginListener() {
	const toggleLogin = document.querySelector('.login-link');
	if (toggleLogin) {
		toggleLogin.addEventListener('click', async (event) => {
			let userIsAuth = await isUserAuthenticated();
			console.log(" is user auth : ", userIsAuth);
			if (userIsAuth == false) {
				actualizeIndexPage('modal-container', routes.login);
			}
		});
	}
}

export async function fetchWithRefresh(url, options = {}) {

	let response = await fetch(url, options);

	if (response.status === 401) {
		const refreshResponse = await fetch('auth/refresh-token/', {
			method: 'GET',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
			},
		});
		if (refreshResponse.ok) {
			response = await fetch(url, options);
		} else {
			window.location.href = '/#home';
		}
	}

	return response;
}