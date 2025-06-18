

export function settingsProfileController() {
	const token = sessionStorage.getItem("accessToken");
	if (!token) {
		console.error("Token manquant !");
		return;
	}
	
	getUserInfo(token);
	getUserAvatar(token);
	setupAvatarUpload();
	postSaveImg(token)

}

	//  get user info end affich
  function displayUserInfo(data) {
	document.getElementById('usernameLabel').textContent = data.user_name;
	document.getElementById('mailLabel').textContent = data.mail;
	document.getElementById('firstNameLabel').textContent = data.first_name;
	document.getElementById('lastNameLabel').textContent = data.last_name;
  }

  function getUserInfo(token) {
	fetch("https://localhost:8443/user-service/infoUser/", {
	  method: "GET",
	  headers: {
		"Authorization": `Bearer ${token}`,
		"Content-Type": "application/json",
	  },
	})
	  .then(handleResponse)
	  .then(data => {
		displayUserInfo(data);
	  })
	  .catch(error => {
		console.error("Erreur lors de la récupération des infos utilisateur :", error);
	  });
  }
  
	//  get avatar end affich
  function getUserAvatar(token) {
	fetch("https://localhost:8443/user-service/avatar/", {
	  method: "GET",
	  headers: {
		"Authorization": `Bearer ${token}`,
	  },
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
		console.error("Erreur lors du chargement de l'avatar :", err);
	  });
  }
  
	//  modifi view frond avatar end save img
  function setupAvatarUpload() {
	const uploadInput = document.getElementById("uploadImg");
	  const avatar = document.getElementById("avatar");
	  const saveBtnContainer = document.getElementById("saveImageContainer");
  
	if (uploadInput && avatar) {
	  uploadInput.addEventListener("change", function (e) {
		const file = e.target.files[0];
		  if (file) {
			  avatar.src = URL.createObjectURL(file);
			  if (saveBtnContainer) {
				  saveBtnContainer.style.display = "block";
			  }
		  } else {
			  if (saveBtnContainer) {
				  saveBtnContainer.style.display = "none";
			  }
		  }
	  });
	}
  }

	function postSaveImg(token) {
		const form = document.getElementById('uploadForm');
		const errorDiv = document.getElementById('errorMessage');
		const saveBtnContainer = document.getElementById("saveImageContainer")
	
		if (!form || !errorDiv) return;
	
		form.addEventListener('submit', async function(e) {
		e.preventDefault();
	
		const fileInput = document.getElementById('uploadImg');
			if (!fileInput.files.length) {
			errorDiv.textContent = 'Choose an image!';
			errorDiv.style.display = 'block';
			return;
		}
	
		const formData = new FormData();
		formData.append('image', fileInput.files[0]);
	
		try {
			const response = await fetch("user-service/saveImg/", {
				method: 'POST',
				headers: {
					"Authorization": `Bearer ${token}`,
				},
				body: formData
			});
	
			if (!response.ok) {
				errorDiv.textContent = 'Sending error.';
				errorDiv.style.display = 'block';
			}
			const data = await response.json();
			console.log(data)
	
			if (data.success) {
				errorDiv.textContent = data.success;
				errorDiv.classList.remove('text-danger');
				errorDiv.classList.add('text-success');
				errorDiv.style.display = 'block';
				setTimeout(() => {errorDiv.style.display = 'none';}, 2200);
			} else {
			errorDiv.textContent = data.error;
				errorDiv.style.display = 'block';
				setTimeout(() => {errorDiv.style.display = 'none';}, 2200);
			}
			saveBtnContainer.style.display = "none";

		} catch (err) {
			errorDiv.textContent = 'Network error.';
			errorDiv.style.display = 'block';
		}
		});
	}
  
	
  function handleResponse(response) {
	if (!response.ok) {
	  throw new Error("Erreur réseau ou serveur");
	}
	return response.json();
  }
  