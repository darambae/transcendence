
import { routes } from './routes.js';
import { actualizeIndexPage, getCookie, isUserAuthenticated } from './utils.js';

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

	let view;
	if (!hash || hash === 'home' /* || (userIsAuth && (hash === 'login' || hash === 'signup'))*/) {
		view = routes['home'];
	} else {
		view = routes[hash];
	}

	console.log(view);
	
	if (!view) {
		content.innerHTML = `<h2>404</h2><p>Page not Found</p>`;
		return;
	}



	try {
		if (view.isModal) {
			actualizeIndexPage('modal-container', view);
		} else {
			actualizeIndexPage('main-content', view);
		}
	} catch (error) {
		console.error('Error loading template ', error);
		const content = document.getElementById("main-content");
		content.innerHTML = '<h2> Unable to load the page </h2>';
	}
}