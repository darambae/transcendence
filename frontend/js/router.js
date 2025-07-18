import { routes } from './routes.js';
import {
	actualizeIndexPage,
	getCookie,
	isUserAuthenticated,
	attachLoginListener,
} from './utils.js';
import { renderChatButtonIfAuthenticated } from './views/chat.js';
import { cleanupLocalGame } from './views/localGame.js';
import { cleanupMultiplayerGame } from './views/multiplayerGameSession.js';
// import { cleanupTournament } from './views/tournament.js';

// State management
let navigationBlocked = false;
let isNavigating = false;
let csrfTokenFetched = false;
let is404displayed = false;

// Authentication caching
const AUTH_CACHE_DURATION = 30000;
let cachedAuthStatus = null;
let authCacheTimestamp = 0;

export function resetAuthCache() {
	console.log('🔄 Authentication cache reset');
	cachedAuthStatus = null;
	authCacheTimestamp = 0;
}

export function forceAuthRefresh() {
	resetAuthCache();
	return getAuthStatus();
}

// Initialize routing
if (!location.hash) {
	const path = location.pathname;
	if (path === '/' || path === '') {
		location.replace(location.origin + location.pathname + '#home');
	} else {
		navigationBlocked = true;
		window.addEventListener('DOMContentLoaded', () => {
			document.getElementById(
				'main-content'
			).innerHTML = `<h2>404 Page not found</h2>`;
			history.replaceState(null, '', '/'); //Clean URL
			is404displayed = true;
		});
	}
}

// Single DOMContentLoaded handler
window.addEventListener('DOMContentLoaded', async () => {
	const userIsAuth = await getAuthStatus();
	attachLoginListener(userIsAuth);
	await renderChatButtonIfAuthenticated(userIsAuth);
});

// Navigation handlers
function safeNavigate() {
	if (isNavigating) return;
	isNavigating = true;

	requestAnimationFrame(async () => {
		await navigate();
		setTimeout(() => (isNavigating = false), 100);
	});
}

['hashchange', 'DOMContentLoaded'].forEach((event) => {
	window.addEventListener(event, safeNavigate);
});

// Helper for authentication status with caching
async function getAuthStatus() {
	const now = Date.now();
	if (
		cachedAuthStatus !== null &&
		now - authCacheTimestamp < AUTH_CACHE_DURATION
	) {
		return cachedAuthStatus;
	}

	cachedAuthStatus = await isUserAuthenticated();
	authCacheTimestamp = now;
	return cachedAuthStatus;
}

const titleLink = document.getElementById('home-link')
if (titleLink) {
	titleLink.addEventListener('click', () => {
		actualizeIndexPage('main-content', routes.home);
	});
}

// Main navigation function
export async function navigate() {
	if (is404displayed) {
		is404displayed = false;
		history.replaceState(null, '', '/');
		return;
	}
	if (navigationBlocked) {
		navigationBlocked = false;
		return;
	}

	// Reset any auth redirection flags
	if (window.isRedirecting) {
		window.isRedirecting = false;
	}

	// Get and normalize route
	const hash = location.hash.slice(1);
	console.log('navigating to:', hash);

	// Check CSRF only once per session
	if (!csrfTokenFetched && !getCookie('csrftoken')) {
		await fetch('/user-service/csrf/', {
			method: 'GET',
			credentials: 'include',
		});
		csrfTokenFetched = true;
	}

	// Determine route
	let routeName = hash || 'home';
	if (!hash) {
		history.replaceState(null, '', '/');
	}

	// Get auth status (uses cache if available, but force fresh check for certain routes)
	let userIsAuth;
	if (
		routeName === 'singlePlay' ||
		routeName === 'multiplayer' ||
		routeName === 'tournament'
	) {
		// Force fresh auth check for game routes to avoid stale cache after login
		cachedAuthStatus = null;
		userIsAuth = await getAuthStatus();
	} else {
		userIsAuth = await getAuthStatus();
	}

	// Update login/user display
	if (userIsAuth) {
		try {
			await actualizeIndexPage('toggle-login', routes['user']);
		} catch (error) {
			// If updating user display fails (e.g., token expired), reset auth cache
			console.warn(
				'Failed to update user display, resetting auth cache:',
				error
			);
			resetAuthCache();
			userIsAuth = false; // Update local variable to reflect actual state
		}
	}

	// Get view for the route
	let view = routes[routeName];
	if (!view) {
		document.getElementById(
			'main-content'
		).innerHTML = `<h2>404 Page not found</h2>`;
		history.replaceState(null, '', location.pathname + location.search);
		return;
	}

	// Auth protection
	if (!userIsAuth && routeName !== 'signup' && routeName !== 'home') {
		document.getElementById(
			'main-content'
		).innerHTML = `<div class='route-error-msg'>You need to be logged in to access this page.</div>`;
		history.replaceState(null, '', '/');
		return;
	} else if (userIsAuth && routeName === 'signup') {
		const mainContent = document.getElementById('main-content');
		if (mainContent) {
			mainContent.innerHTML = `<div class='route-error-msg'>You cannot access this page while logged in. Please log out first</div>`;
			history.replaceState(null, '', '/'); // clean URL
		}
		return;
	}

	// Additional safety check: if user is not authenticated, don't try to load user view
	if (!userIsAuth && view === routes['user']) {
		console.log('Preventing user view load for unauthenticated user');
		history.replaceState(null, '', '/#home');
		return;
	}

	// Render the view
	try {
		// Cleanup any active game timers before navigating to a new page
		cleanupLocalGame();
		cleanupMultiplayerGame();
		// cleanupTournament();
		await actualizeIndexPage('main-content', view);
	} catch (error) {
		console.error('Error loading template:', error);
		document.getElementById('main-content').innerHTML =
			'<h2>Unable to load the page</h2>';
	}
}

export { cachedAuthStatus, authCacheTimestamp };
