export function userController() {
	
	userInfo()
}

export function userInfo()
{
	const dropdownBtn = document.getElementById('avatarDropdownBtn');
	const dropdownMenu = document.getElementById('customDropdownMenu');

	fetch("https://transcendence.42.fr/user-service/avatar/", { //Need to test if this works
		method: "GET",
		credentials: 'include'
	  })
	  .then(res => {
		if (!res.ok) throw new Error("No avatar found");
		return res.blob();
	  })
	  .then(blob => {
		const imgUrl = URL.createObjectURL(blob);
		document.getElementById("user-avatar").src = imgUrl;
	  })
	  .catch(err => {
		console.error("Erreur:", err);
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
		console.error("Dropdown button or menu not found");
	}
}