
import { routes } from './routes.js';
import { actualizeIndexPage } from './utils.js';

window.addEventListener('hashchange', navigate);
window.addEventListener('DOMContentLoaded', navigate);


export async function navigate() {
	const hash = location.hash.slice(1);
	console.log('navigating to: ', hash);

	let view;
	if (!hash || hash === 'home') {
		view = routes['home'];
	} else {
		view = routes[hash];
	}

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