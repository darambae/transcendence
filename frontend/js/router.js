
import { routes } from './routes.js';
import { actualizeIndexPage, getCookie, isUserAuthenticated, attachLoginListener, fetchWithRefresh } from './utils.js';
import { renderChatButtonIfAuthenticated } from './views/chat.js';

window.addEventListener('DOMContentLoaded', renderChatButtonIfAuthenticated);
window.addEventListener('DOMContentLoaded', async () => {
	attachLoginListener();
});

window.addEventListener('hashchange', navigate);
window.addEventListener('DOMContentLoaded', navigate);


export async function navigate() {
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

	let userIsAuth = await isUserAuthenticated();
	console.log("is User Auth : ", userIsAuth);
	if (userIsAuth) {
		actualizeIndexPage('toggle-login', routes['user']);
	}

	//let view;
	//if (!hash || hash === 'home' /* || (userIsAuth && (hash === 'login' || hash === 'signup'))*/) {
	//	view = routes['home'];
	//} else {
	//	view = routes[hash];
	//}
	
//-----------------------------
	let routeName = hash;
	let param = null;

	if (hash.includes('/')) {
		[routeName, param] = hash.split('/');
	}

	let view;
	if (!routeName || routeName === 'home') {
		view = routes['home'];
	} else if (typeof routes[routeName] === 'function') {
		view = routes[routeName](param);
	} else {
		view = routes[routeName];
	}
//-----------------------------
	console.log("view: ", view);
	
	if (!view) {
		content.innerHTML = `<h2>404</h2><p>Page not Found</p>`;
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
