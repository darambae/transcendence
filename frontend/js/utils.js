import { resetAuthCache } from './router.js';
import { routes } from './routes.js';

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
			await Promise.resolve(view.controller());
		} catch (error) {
			console.error(`Error executing controller for ${view.template}:`, error);
		}
	}
}

export async function closeModal() {
	const loginForm = document.getElementById('login-form');
	const modalContainer = document.getElementById('modal-container');

	modalContainer.style.display = 'none';
	modalContainer.innerHTML = '';
	if (loginForm) {
		loginForm.classList.remove('active');
	}
}

//csrf token getter
export function getCookie(name) {
	let cookieValue = null;
	if (document.cookie && document.cookie !== '') {
		const cookies = document.cookie.split(';');
		for (let i = 0; i < cookies.length; i++) {
			const cookie = cookies[i].trim();
			if (cookie.substring(0, name.length + 1) === name + '=') {
				cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
				break;
			}
		}
	}
	return cookieValue;
}

export async function isUserAuthenticated() {
	const response = await fetchWithRefresh('/user-service/infoUser/', {
		method: 'GET',
		credentials: 'include',
	});
	if (response.ok) {
		if (response.online) console.log('online : ', response.online);
		return true;
	} else {
		let errorMsg = `Status: ${response.status}`;
		try {
			const data = await response.json();
			if (data && data.error) {
				errorMsg = data.error + ' (status ' + response.status + ')';
			}
		} catch (e) {
			// ignore JSON parse error
		}
		console.log('is auth error : ', errorMsg);
		return false;
	}
}

export function attachLoginListener(userIsAuth = null) {
	const toggleLogin = document.querySelector('.login-link');
	if (!toggleLogin) return;

	if (userIsAuth === null) {
		isUserAuthenticated().then((isAuth) => {
			console.log('Login listener - authenticated:', isAuth);
			setupLoginClick(toggleLogin, isAuth);
		});
	} else {
		console.log('Login listener - using provided auth status:', userIsAuth);
		setupLoginClick(toggleLogin, userIsAuth);
	}
}

function setupLoginClick(toggleLogin, isAuth) {
	toggleLogin.addEventListener('click', async () => {
		if (isAuth === false) {
			await actualizeIndexPage('modal-container', routes['login']);
		} else {
			console.log('User is already authenticated, not showing login modal');
		}
	});
}

export async function getBlockedStatus(targetUserId) {
	try {
		const timestamp = Date.now();
		const random = Math.random();
		const response = await fetchWithRefresh(
			`/chat/${targetUserId}/blockedStatus/?t=${timestamp}&r=${random}`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'no-cache, no-store, must-revalidate',
					Pragma: 'no-cache',
					Expires: '0',
				},
				credentials: 'include',
			}
		);
		if (!response.ok) {
			const errorData = await response.json();
			console.error(
				'error loading blocked status',
				errorData.message || 'unknown error'
			);
			alert(
				'error loading blocked status' + (errorData.message || 'unknown error')
			);
			return null;
		}
		const data = await response.json();
		let blockedStatus = data.blockedStatus || data;
		console.log('Extracted blockedStatus:', blockedStatus);
		return blockedStatus;
	} catch (error) {
		console.error('Network error loading blocked status :', error);
		alert('network error: could not load blocked status');
		return null;
	}
}

export async function fetchWithRefreshNoCash(url, options = {}) {
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
	} else if (response.status === 413) {
		return new Response(
			JSON.stringify({
				status: 'error',
				message: 'The image file is too large',
			}),
			{ status: 413 }
		);
	}
	return response;
}

const requestCache = new Map();
const inFlightRequests = new Map();
let refreshPromise = null;

// Authentication state management
let isRedirecting = false;

// Clear authentication state and redirect to home
function clearAuthAndRedirect() {
	if (isRedirecting) return;
	isRedirecting = true;
	window.isRedirecting = true;

	console.log('Clearing authentication state and redirecting to home');

	// Clear any cached authentication status using the proper function
	resetAuthCache();

	// Clear tokens from cookies if possible
	document.cookie =
		'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
	document.cookie =
		'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

	setTimeout(() => {
		console.log('redirecting to home');
		window.location.href = '/#home';
	}, 100);
}

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
		let responseToReturn = response.clone();

		if (response.status === 401) {
			if (!refreshPromise) {
				refreshPromise = fetch('/auth/refresh-token/', {
					method: 'GET',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
				});
			}

			const refreshResponse = await refreshPromise;
			refreshPromise = null;

			if (refreshResponse.ok) {
				response = await fetch(url, options);
				responseToReturn = response.clone();
			} else {
				console.log('Refresh token expired or invalid');

				// For logout requests, allow the logout to complete locally
				if (url.includes('logout')) {
					clearAuthAndRedirect();
					return new Response(
						JSON.stringify({
							message: 'User logged out successfully (tokens expired)',
							status: 'success',
						}),
						{ status: 200 }
					);
				} else {
					// For other requests, clear auth and redirect
					clearAuthAndRedirect();
					return new Response(
						JSON.stringify({
							error: 'Authentication failed - tokens expired',
							status: 'auth_failed',
						}),
						{ status: 401 }
					);
				}
			}
		} else if (response.status === 413) {
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

		return responseToReturn;
	})();

	inFlightRequests.set(cacheKey, fetchPromise);

	try {
		return await fetchPromise;
	} finally {
		inFlightRequests.delete(cacheKey);
	}
}
