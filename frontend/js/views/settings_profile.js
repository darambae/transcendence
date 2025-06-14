

export function settingsProfileController() {

	const token = sessionStorage.getItem("accessToken");

	fetch("https://localhost:8443/user-service/InfoUser/", {
	  method: "GET",
	  headers: {
		"Authorization": `Bearer ${token}`,
		"Content-Type": "application/json"
	  }
	})

	.then(response => {
	  if (!response.ok) throw new Error("Erreur lors de la récupération");
	  return response.json();
	})

	.then(data => {
		console.log("User info reçue :", data);
		document.getElementById('usernameLabel').textContent = data.user_name;
		document.getElementById('mailLabel').textContent = data.mail;
		document.getElementById('firstNameLabel').textContent = data.first_name;
		document.getElementById('lastNameLabel').textContent = data.last_name;

		/*fetch(data.avatar, {
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
			document.getElementById("avatar").src = imgUrl;
		  })
		  .catch(err => {
			console.error("Erreur:", err);
		  });*/
	})

	.catch(error => {
	  console.error("Erreur :", error);
	});

	document.getElementById("uploadImg").addEventListener("change", function (e) {
		const file = e.target.files[0];
		const avatar = document.getElementById("avatar");
	
		if (file) {
		  avatar.src = URL.createObjectURL(file);
		}
	  });
}

