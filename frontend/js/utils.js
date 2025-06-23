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

	content.innerHTML = html;
	if (view.isModal) {
		content.style.display = 'block';
	}

	if (typeof view.controller === 'function') {
		view.controller();
	}
}

export async function closeModal() {
	const loginForm = document.getElementById("login-form");
	const modalContainer = document.getElementById("modal-container")

	modalContainer.style.display = "none";
	loginForm.classList.remove("active");
	window.location = "#home";
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
	const response = await fetch('user-service/infoUser/', {
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