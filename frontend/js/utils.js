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
		view.controller();
	}
}

export async function closeModal(loc = "#home") {
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
	const response = await fetch('user-service/infoUser/', {
		method: 'GET',
		credentials: 'include'
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

export function attachLoginListener() {
	const toggleLogin = document.querySelector('.login-link');
	if (toggleLogin) {
		toggleLogin.addEventListener('click', async (event) => {
			let userIsAuth = await isUserAuthenticated();
			console.log(" is user auth : ", userIsAuth);
			if (userIsAuth == false) {
				actualizeIndexPage('modal-container', routes.login);
			}
		});
	}
}

export async function fetchWithRefresh(url, options = {}) {

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
	}

	return response;
}

// export async function fetchWithRefresh(url, options = {}) {
// 	try {
// 		// Add timeout to avoid hanging requests
// 		const controller = new AbortController();
// 		let timeoutDuration = 30000; // 10 seconds default
// 		// if (url.includes('/auth/')) {
// 		// 	timeoutDuration = 30000; // 30 seconds for auth endpoints
// 		// }

// 		const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

// 		const fetchOptions = {
// 			...options,
// 			signal: controller.signal,
// 		};

// 		let response = await fetch(url, fetchOptions);
// 		clearTimeout(timeoutId);

// 		// Handle authentication errors
// 		if (response.status === 401) {
// 			console.log('Authentication failed, trying to refresh token...');

// 			try {
// 				const refreshResponse = await fetch('auth/refresh-token/', {
// 					method: 'GET',
// 					credentials: 'include',
// 					headers: {
// 						'Content-Type': 'application/json',
// 					},
// 				});

// 				if (refreshResponse.ok) {
// 					console.log(
// 						'Token refreshed successfully, retrying original request'
// 					);
// 					const newResponse = await fetch(url, options);

// 					// If we still get 401 after refresh, something is wrong with auth
// 					if (newResponse.status === 401) {
// 						console.error('Authentication failed even after token refresh');
// 						sessionStorage.setItem(
// 							'auth_error',
// 							'Session expired. Please log in again.'
// 						);
// 						window.location.href = '/#home';
// 						return newResponse;
// 					}

// 					return newResponse;
// 				} else {
// 					console.error('Token refresh failed');
// 					sessionStorage.setItem(
// 						'auth_error',
// 						'Session expired. Please log in again.'
// 					);
// 					window.location.href = '/#home';
// 					return response;
// 				}
// 			} catch (refreshError) {
// 				console.error('Error during token refresh:', refreshError);
// 				window.location.href = '/#home';
// 				return response;
// 			}
// 		}

// 		// Handle server errors (like 502)
// 		if (response.status >= 500) {
// 			console.error(`Server error (${response.status}) for ${url}`);
// 		}

// 		return response;
// 	} catch (error) {
// 		// Handle network errors and timeouts
// 		console.error(`Network error with ${url}:`, error);
// 		if (error.name === 'AbortError') {
// 			return new Response(
// 				JSON.stringify({
// 					status: 'error',
// 					message: 'Request timed out',
// 				}),
// 				{ status: 408 }
// 			);
// 		}

// 		return new Response(
// 			JSON.stringify({
// 				status: 'error',
// 				message: 'Network error, please check your connection',
// 			}),
// 			{ status: 0 }
// 		);
// 	}
// }

// export async function fetchWithRefresh(url, options = {}) {
//  try {
//      // Add timeout to avoid hanging requests
//      const controller = new AbortController();
//      let timeoutDuration = 10000; // 10 seconds default
//      if (url.includes('/auth/')) {
//       timeoutDuration = 30000; // 30 seconds for auth endpoints
//      }

//      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

//      const fetchOptions = {
//          ...options,
//          signal: controller.signal,
//      };

//      let response = await fetch(url, fetchOptions);
//      clearTimeout(timeoutId);

//      // Handle authentication errors
//      if (response.status === 401) {
//          console.log('Authentication failed, trying to refresh token...');

//          try {
//              const refreshResponse = await fetch('auth/refresh-token/', {
//                  method: 'GET',
//                  credentials: 'include',
//                  headers: {
//                      'Content-Type': 'application/json',
//                  },
//              });

//              if (refreshResponse.ok) {
//                  console.log(
//                      'Token refreshed successfully, retrying original request'
//                  );
//                  const newResponse = await fetch(url, options);

//                  // If we still get 401 after refresh, something is wrong with auth
//                  if (newResponse.status === 401) {
//                      console.error('Authentication failed even after token refresh');
//                      sessionStorage.setItem(
//                          'auth_error',
//                          'Session expired. Please log in again.'
//                      );
//                      window.location.href = '/#home';
//                      return newResponse;
//                  }

//                  return newResponse;
//              } else {
//                  console.error('Token refresh failed');
//                  sessionStorage.setItem(
//                      'auth_error',
//                      'Session expired. Please log in again.'
//                  );
//                  window.location.href = '/#home';
//                  return response;
//              }
//          } catch (refreshError) {
//              console.error('Error during token refresh:', refreshError);
//              window.location.href = '/#home';
//              return response;
//          }
//      }

//      // Handle server errors (like 502)
//      if (response.status >= 500) {
//          console.error(`Server error (${response.status}) for ${url}`);
//      }

//      return response;
//  } catch (error) {
//      // Handle network errors and timeouts
//      console.error(`Network error with ${url}:`, error);
//      if (error.name === 'AbortError') {
//          return new Response(
//              JSON.stringify({
//                  status: 'error',
//                  message: 'Request timed out',
//              }),
//              { status: 408 }
//          );
//      }

//      return new Response(
//          JSON.stringify({
//              status: 'error',
//              message: 'Network error, please check your connection',
//          }),
//          { status: 0 }
//      );
//  }
// }
