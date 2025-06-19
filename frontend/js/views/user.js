export function userController() {
	
	userInfo()
}

export function userInfo()
{
	const dropdownBtn = document.getElementById('avatarDropdownBtn');
	const dropdownMenu = document.getElementById('customDropdownMenu');
	
	const token = sessionStorage.getItem("accessToken");
	

	fetch("user-service/avatar/", {
		method: "GET",
		headers: {
		  "Authorization": `Bearer ${token}`,
		}
	  })
	  .then(res => {
		if (!res.ok) throw new Error("Erreur lors de la récupération de l'avatar");
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