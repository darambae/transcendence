
import { routes } from './routes.js';
import { actualizeIndexPage, getCookie, isUserAuthenticated, attachLoginListener, fetchWithRefresh } from './utils.js';
import { renderChatButtonIfAuthenticated } from './views/chat.js';

let navigationBlocked = false;

if (!location.hash) {
	const path = location.pathname;
	if (path === '/' || path === '') {
		location.replace(location.origin + location.pathname + '#home');
	} else {
		navigationBlocked = true;
		window.addEventListener('DOMContentLoaded', () => {
			const mainContent = document.getElementById('main-content');
			if (mainContent) {
				mainContent.innerHTML = `<h2>404 Page not found</h2>`;
			}
			history.replaceState(null, '', '/');
		});
	}
}


// window.addEventListener('DOMContentLoaded', renderChatButtonIfAuthenticated);
window.addEventListener('DOMContentLoaded', async () => {
	attachLoginListener();
	renderChatButtonIfAuthenticated();
});

window.addEventListener('hashchange', navigate);
window.addEventListener('DOMContentLoaded', navigate);


export async function navigate() {
	if (navigationBlocked) {
		navigationBlocked = false;
		return;
	}

	const hash = location.hash.slice(1);
	console.log('navigating to: ', hash);

	//check if csrf present
	const csrf = getCookie('csrftoken');
	if (!csrf) {
		fetch('user-service/csrf/', {
			method: 'GET',
			credentials: 'include',
		});
	}
	console.log("csrf home: ", csrf);

//-----------------------------
	
	let routeName = hash;
	let param = null;
	
	if (!hash || hash === '') {
		routeName = 'home';
		history.replaceState(null, '', '/'); // clean URL
	}

	/* if (hash.includes('/')) {
		[routeName, param] = hash.split('/');
	} */
	
	let view;
	let userIsAuth = await isUserAuthenticated();
	console.log('is User Auth : ', userIsAuth);
	if (userIsAuth) {
		actualizeIndexPage('toggle-login', routes['user']);
	}
	/* if (typeof routes[routeName] === 'function') {
		view = routes[routeName](param);
	} else  */
	if (routes[routeName]) {
		view = routes[routeName];
	} else {
		const mainContent = document.getElementById('main-content');
		if (mainContent) {
			mainContent.innerHTML = `<h2>404 Page not found</h2>`;
		}
		history.replaceState(null, '', location.pathname + location.search);
		return;
	}
	//-----------------------------

	console.log("routeName:", routeName, "view:", view);
	
	//check if user is trying to access a page forbidden if not authenticated
	if (!userIsAuth && routeName !== 'signup' && routeName !== 'home') {
		const mainContent = document.getElementById('main-content');
		if (mainContent) {
			mainContent.innerHTML = `<div class='route-error-msg'>You need to be logged in to access this page.</div>`;
			history.replaceState(null, '', '/'); // clean URL
		}
		return;
	} else if (userIsAuth && routeName === 'signup') {
		const mainContent = document.getElementById('main-content');
		if (mainContent) {
			mainContent.innerHTML = `<div class='route-error-msg'>You cannot access this page while logged in. Please log out first</div>`;
			history.replaceState(null, '', '/'); // clean URL
		}
		return;
	}

//-------------------------------
try {
	await actualizeIndexPage('main-content', view);
} catch (error) {
	console.error('Error loading template ', error);
	const content = document.getElementById("main-content");
	content.innerHTML = '<h2> Unable to load the page </h2>';
}
//-------------------------------
}
