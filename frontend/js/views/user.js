import { attachLoginListener, fetchWithRefresh } from '../utils.js';

export function userController() {
	userInfo();
	document.getElementById('logout-btn').onclick = async function (event) {
		if (!confirm('You are about to log out, are you sure ?')) {
			event.preventDefault();
		} else {
			try {
				const response = await fetchWithRefresh(
					`auth/logout/?_=${Date.now()}`,
					{
						method: 'PATCH',
						credentials: 'include',
					}
				);

				const respData = await response.json();

				// Handle successful logout
				if (response.ok) {
					const toggleLogin = document.getElementById('toggle-login');
					if (toggleLogin) {
						toggleLogin.innerHTML =
							'<button type="button" class="login-link"><i class="bi bi-person fs-5"></i> Log In </button>';
					}
					attachLoginListener(false);
					const chatContainer = document.getElementById('chat-container');
					if (chatContainer) {
						chatContainer.innerHTML = '';
					}
					window.location.href = '/#home';
				} else {
					console.log('Logout error: ', respData);
					// If logout fails for any reason, still clear local state and redirect
					const toggleLogin = document.getElementById('toggle-login');
					if (toggleLogin) {
						toggleLogin.innerHTML =
							'<button type="button" class="login-link"><i class="bi bi-person fs-5"></i> Log In </button>';
					}
					attachLoginListener(false);
					const chatContainer = document.getElementById('chat-container');
					if (chatContainer) {
						chatContainer.innerHTML = '';
					}
					window.location.href = '/#home';
				}
			} catch (err) {
				// If there's any error, still clear local state and redirect
				console.log('Logout error (network/auth issue): ', err);
				const toggleLogin = document.getElementById('toggle-login');
				if (toggleLogin) {
					toggleLogin.innerHTML =
						'<button type="button" class="login-link"><i class="bi bi-person fs-5"></i> Log In </button>';
				}
				attachLoginListener(false);
				const chatContainer = document.getElementById('chat-container');
				if (chatContainer) {
					chatContainer.innerHTML = '';
				}
				window.location.href = '/#home';
			}
		}
	};
}

export function userInfo() {
	const dropdownBtn = document.getElementById('avatarDropdownBtn');
	const dropdownMenu = document.getElementById('customDropdownMenu');

	fetchWithRefresh('/user-service/avatar/', {
		method: 'GET',
		credentials: 'include',
	})
		.then((res) => {
			if (!res.ok) throw new Error('No avatar found');
			return res.blob();
		})
		.then((blob) => {
			const imgUrl = URL.createObjectURL(blob);
			document.getElementById('user-avatar').src = imgUrl;
		})
		.catch((err) => {
			console.error('Erreur:', err);
		});
	if (dropdownBtn && dropdownMenu) {
		dropdownBtn.addEventListener('click', () => {
			dropdownMenu.classList.toggle('show');
		});

		document.addEventListener('click', (e) => {
			if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
				dropdownMenu.classList.remove('show');
			}
		});
	} else {
		console.error('Dropdown button or menu not found');
	}
}
