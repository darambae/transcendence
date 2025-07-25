import { attachLoginListener, fetchWithRefresh } from '../utils.js';
import { resetAuthCache } from '../router.js';
import { cleanupChatOnLogout } from './chat.js';

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
					cleanupChatOnLogout();
					resetAuthCache();

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
					cleanupChatOnLogout();

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
					resetAuthCache();
					window.location.href = '/#home';
				}
			} catch (err) {
				console.log('Logout error (network/auth issue): ', err);
				cleanupChatOnLogout();

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
