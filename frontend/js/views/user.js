import { attachLoginListener } from "../utils.js";

export function userController() {
	userInfo();
	document.getElementById('logout-btn').onclick = async function(event) {
		if (!confirm('You are about to log out, are you sure ?')) {
			event.preventDefault();
		} else {
			try {
				const response = await fetch('auth/logout/', {
					method: 'PATCH',
					credentials: 'include'
				});

				const respData = await response.json();
				if (response.ok) {
					const toggleLogin = document.getElementById('toggle-login');
					if (toggleLogin) {
						toggleLogin.innerHTML = '<button type="button" class="login-link"><i class="bi bi-person fs-5"></i> Log In </button>'
					}
					attachLoginListener();
					const chatContainer = document.getElementById('chat-container');
					if (chatContainer){
						chatContainer.innerHTML = "";
					}
					window.location.href = '/#home';
				} else {
					console.log("error: ", respData);
				}
			} catch (err) {
				console.log('error: ', err)
			}
		}
	};
}

export function userInfo() {
	const dropdownBtn = document.getElementById('avatarDropdownBtn');
	const dropdownMenu = document.getElementById('customDropdownMenu');

	fetch('user-service/avatar/', {
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
