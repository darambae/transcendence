export function userController() {
	const dropdownBtn = document.getElementById('avatarDropdownBtn');
	const dropdownMenu = document.getElementById('customDropdownMenu');

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
		console.error("Dropdown button or menu not found");
	}
	}