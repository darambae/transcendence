
// import { routes } from './routes.js';
// import { actualizeIndexPage, getCookie, isUserAuthenticated, attachLoginListener, fetchWithRefresh } from './utils.js';
// import { renderChatButtonIfAuthenticated } from './views/chat.js';

// let navigationBlocked = false;

// if (!location.hash) {
// 	const path = location.pathname;
// 	if (path === '/' || path === '') {
// 		location.replace(location.origin + location.pathname + '#home');
// 	} else {
// 		navigationBlocked = true;
// 		window.addEventListener('DOMContentLoaded', () => {
// 			const mainContent = document.getElementById('main-content');
// 			if (mainContent) {
// 				mainContent.innerHTML = `<h2>404 Page not found</h2>`;
// 			}
// 			history.replaceState(null, '', '/');
// 		});
// 	}
// }


// // window.addEventListener('DOMContentLoaded', renderChatButtonIfAuthenticated);
// window.addEventListener('DOMContentLoaded', async () => {
// 	const userIsAuth = await isUserAuthenticated();
// 	attachLoginListener(userIsAuth);
// 	await renderChatButtonIfAuthenticated(userIsAuth);
// });

// window.addEventListener('hashchange', navigate);
// window.addEventListener('DOMContentLoaded', navigate);
// // let isNavigating = false;

// // // Wrap the navigate function to prevent duplicate calls
// // function safeNavigate() {
// // 	if (isNavigating) return;

// // 	isNavigating = true;

// // 	// Use requestAnimationFrame to ensure we're outside the event loop
// // 	requestAnimationFrame(async () => {
// // 		await navigate();

// // 		// Reset the flag after navigation completes
// // 		// Add a small delay to prevent rapid re-triggers
// // 		setTimeout(() => {
// // 			isNavigating = false;
// // 		}, 100);
// // 	});
// // }

// // // Add the event listeners using the wrapped function
// // ['hashchange', 'DOMContentLoaded'].forEach((event) => {
// // 	window.addEventListener(event, safeNavigate);
// // });

// export async function navigate() {
// 	if (navigationBlocked) {
// 		navigationBlocked = false;
// 		return;
// 	}

// 	const hash = location.hash.slice(1);
// 	console.log('navigating to: ', hash);

// 	//check if csrf present
// 	const csrf = getCookie('csrftoken');
// 	if (!csrf) {
// 		fetch('user-service/csrf/', {
// 			method: 'GET',
// 			credentials: 'include',
// 		});
// 	}
// 	console.log("csrf home: ", csrf);

// //-----------------------------
	
// 	let routeName = hash;
// 	let param = null;
	
// 	if (!hash || hash === '') {
// 		routeName = 'home';
// 		history.replaceState(null, '', '/'); // clean URL
// 	}

// 	/* if (hash.includes('/')) {
// 		[routeName, param] = hash.split('/');
// 	} */
	
// 	let view;
// 	let userIsAuth = await isUserAuthenticated();
// 	console.log('is User Auth : ', userIsAuth);
// 	if (userIsAuth) {
// 		actualizeIndexPage('toggle-login', routes['user']);
// 	}
// 	/* if (typeof routes[routeName] === 'function') {
// 		view = routes[routeName](param);
// 	} else  */
// 	if (routes[routeName]) {
// 		view = routes[routeName];
// 	} else {
// 		const mainContent = document.getElementById('main-content');
// 		if (mainContent) {
// 			mainContent.innerHTML = `<h2>404 Page not found</h2>`;
// 		}
// 		history.replaceState(null, '', location.pathname + location.search);
// 		return;
// 	}
// 	//-----------------------------

// 	console.log("routeName:", routeName, "view:", view);
	
// 	//check if user is trying to access a page forbidden if not authenticated
// 	if (!userIsAuth && routeName !== 'signup' && routeName !== 'home') {
// 		const mainContent = document.getElementById('main-content');
// 		if (mainContent) {
// 			mainContent.innerHTML = `<div class='route-error-msg'>You need to be logged in to access this page.</div>`;
// 			history.replaceState(null, '', '/'); // clean URL
// 		}
// 		return;
// 	}

// //-------------------------------
// try {
// 	actualizeIndexPage('main-content', view);
// } catch (error) {
// 	console.error('Error loading template ', error);
// 	const content = document.getElementById("main-content");
// 	content.innerHTML = '<h2> Unable to load the page </h2>';
// }
// //-------------------------------
// }


import { routes } from './routes.js';
import {
	actualizeIndexPage,
	getCookie,
	isUserAuthenticated,
	attachLoginListener,
} from './utils.js';
import { renderChatButtonIfAuthenticated } from './views/chat.js';

// State management
let navigationBlocked = false;
let isNavigating = false;
let csrfTokenFetched = false;

// Authentication caching
const AUTH_CACHE_DURATION = 30000;
let cachedAuthStatus = null;
let authCacheTimestamp = 0;

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

// Main navigation function
export async function navigate() {
	if (navigationBlocked) {
		navigationBlocked = false;
		return;
	}

	// Get and normalize route
	const hash = location.hash.slice(1);
	console.log('navigating to:', hash);

	// Check CSRF only once per session
	if (!csrfTokenFetched && !getCookie('csrftoken')) {
		await fetch('user-service/csrf/', {
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

	// Get auth status (uses cache if available)
	let userIsAuth = await getAuthStatus();

	// Update login/user display
	if (userIsAuth) {
		await actualizeIndexPage('toggle-login', routes['user']);
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
	}

	// Render the view
	try {
		await actualizeIndexPage('main-content', view);
	} catch (error) {
		console.error('Error loading template:', error);
		document.getElementById('main-content').innerHTML =
			'<h2>Unable to load the page</h2>';
	}
}