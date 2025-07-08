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
	} else {
		content.innerHTML = '<h2>404 Page not found</h2>';
		return;
	}
	
	if (view.isModal) {
		content.style.display = 'block';
	}

	if (typeof view.controller === 'function') {
		try {
			// This will work for both async and regular functions
			await Promise.resolve(view.controller());
		} catch (error) {
			console.error(`Error executing controller for ${view.template}:`, error);
		}
	}
}

export async function closeModal() {
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
		credentials: 'include',
	});
	if (response.ok) {
		if (response.online)
			console.log("online : ", response.online);
		return true;
	} else {
		let errorMsg = `Status: ${response.status}`;
        try {
            const data = await response.json();
            if (data && data.error) {
                errorMsg = data.error + " (status " + response.status + ")";
            }
        } catch (e) {
            // ignore JSON parse error
        }
		console.log("is auth error : ", errorMsg);
		return false;
	}
}

export function attachLoginListener(userIsAuth = null) {
	const toggleLogin = document.querySelector('.login-link');
	if (!toggleLogin) return; // Exit early if element doesn't exist

	if (userIsAuth === null) {
		// Only check authentication if status wasn't provided
		isUserAuthenticated().then((isAuth) => {
			console.log('Login listener - authenticated:', isAuth);
			setupLoginClick(toggleLogin, isAuth);
		});
	} else {
		// Use the provided authentication status directly
		console.log('Login listener - using provided auth status:', userIsAuth);
		setupLoginClick(toggleLogin, userIsAuth);
	}
}

// Helper function to keep code DRY
function setupLoginClick(toggleLogin, isAuth) {
	toggleLogin.addEventListener('click',async () => {
		if (isAuth === false) {
			await actualizeIndexPage('modal-container', routes.login);
		} else {
			console.log('User is already authenticated, not showing login modal');
		}
	});
}

// export async function fetchWithRefresh(url, options = {}) {

// 	let response = await fetch(url, options);

// 	if (response.status === 401) {
// 		const refreshResponse = await fetch('auth/refresh-token/', {
// 			method: 'GET',
// 			credentials: 'include',
// 			headers: {
// 				'Content-Type': 'application/json',
// 			},
// 		});
// 		if (refreshResponse.ok) {
// 			response = await fetch(url, options);
// 		} else {
// 			window.location.href = '/#home';
// 		}
// 	} else if (response.status === 413) {
// 		return new Response(
// 			JSON.stringify({
// 				status: 'error',
// 				message: 'The image file is too large',
// 			}),
// 			{ status: 413 }
// 		);
// 	}
// 	return response;
// }
const requestCache = new Map();         // Stores cached responses
const inFlightRequests = new Map();     // Tracks pending requests
let refreshPromise = null;              // Holds the single refresh token operation

export async function fetchWithRefresh(url, options = {}) {
	const cacheKey = `${url}-${JSON.stringify(options.body || {})}`;

	// Return cached response if available and recent (within 5 seconds)
	const cached = requestCache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < 5000) {
		return cached.response.clone();
	}

	// Reuse in-flight request if one exists for this URL
	if (inFlightRequests.has(cacheKey)) {
		return inFlightRequests.get(cacheKey);
	}

	const fetchPromise = (async () => {
		let response = await fetch(url, options);
		// Clone the response immediately to preserve its body
		let responseToReturn = response.clone();
		// Handle authentication and refresh logic
		if (response.status === 401) {
			// Use a single shared refresh promise
			if (!refreshPromise) {
				refreshPromise = fetch('auth/refresh-token/', {
					method: 'GET',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
				});
			}

			const refreshResponse = await refreshPromise;
			refreshPromise = null; // Reset for next time

			if (refreshResponse.ok) {
				response = await fetch(url, options);
				// Update our clone with the fresh response
				responseToReturn = response.clone();
			} else {
				window.location.href = '/#home';
			}
		} else if (response.status === 413) {
			// Handle "Request Entity Too Large" errors
			return new Response(
				JSON.stringify({
					status: 'error',
					message: 'The image file is too large',
				}),
				{ status: 413 }
			);
		}

		// Cache successful responses
		if (response.ok) {
			requestCache.set(cacheKey, {
				response: response.clone(),
				timestamp: Date.now(),
			});
		}

		// Return the cloned response to ensure the body can be read multiple times
		return responseToReturn;
	})();

	// Track in-flight request
	inFlightRequests.set(cacheKey, fetchPromise);

	try {
		return await fetchPromise;
	} finally {
		// Remove from in-flight tracking when done
		inFlightRequests.delete(cacheKey);
	}
}