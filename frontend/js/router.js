
import { routes } from './routes.js';


export async function loadTemplate(viewName) {
	const response = await fetch(`templates/${viewName}.html`);
	if (!response.ok) {
	  throw new Error(`Unable to load template ${viewName}`);
	}
	return await response.text();
  }
  

export async function navigate() {
	const hash = location.hash.slice(1);
	console.log('navigating to: ', hash);

	let view;
	if (!hash || hash === 'home') {
		view = routes['home'];
	} else {
		view = routes[hash];
	}
	
	const content = document.getElementById("content");
	const modalContainer = document.getElementById("modal-container");

	if (!view) {
		content.innerHTML = `<h2>404</h2><p>Page not Found</p>`;
		return;
	}

	try {
		//load html file of the corresponding route
		const html = await loadTemplate(view.template);

		if(view.isModal) {
			modalContainer.innerHTML = html;
			modalContainer.style.display = 'block';

			if (typeof view.controller === 'function') {
				view.controller();
			}
		} else {
			content.innerHTML = html;
			if (typeof view.controller === 'function') {
				view.controller();
			}
		}
	} catch (error) {
		console.error('Error loading template ', error);
		content.innerHTML = '<h2> Unable to load the page </h2>';
	}
}

// if (!hash || hash === 'home') {
// 	routes.home();
// 	return;
// }

// const page = routes[hash];
// if (page) {
// 	page(); // Appelle la fonction de la page
// } else {
// 	content.innerHTML = `<h2>404</h2><p>Page not Found</p>`
// }