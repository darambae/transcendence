
import { userInfo } from './user.js';
import * as Friends from './friends.js';

export function settingsProfileController() {
	const token = sessionStorage.getItem("accessToken");
	if (!token) {
		console.error("Token manquant !");
		return;
	}
	
	getUserInfo(token);
	getUserAvatar(token);
	setupAvatarUpload();
	SaveImg(token)
	SavePrivateInfo(token)
	SavePrivateProfile(token)
	changePassword(token)
	animationPassword()
	Friends.searchFriends(token)
}

//  get user info end affich
function displayUserInfo(data) {
	document.getElementById('usernameLabel').textContent = data.user_name;
	document.getElementById('mailLabel').textContent = data.mail;
	document.getElementById('firstNameLabel').textContent = data.first_name;
	document.getElementById('lastNameLabel').textContent = data.last_name;
	document.getElementById('createdAt').textContent = data.created_at;
	document.getElementById('lastActive').textContent = data.last_login;
}

function removElemAccount(token) {
	document.getElementById('inputUsername').value = '';
	document.getElementById('inputFirstName').value = '';
	document.getElementById('inputLastName').value = '';
}

function removElemPassword(token) {
	const ruleLength = document.getElementById("rule-length");
	const ruleUppercase = document.getElementById("rule-uppercase");
	const ruleNumber = document.getElementById("rule-number");
	const ruleSpecial = document.getElementById("rule-special-char");
	const matchMessage = document.getElementById("passwordMatchMessage");

	document.getElementById('inputPasswordCurrent').value = '';
	document.getElementById('inputPasswordNew').value = '';
	document.getElementById('inputPasswordNew2').value = '';
	ruleLength.textContent = "❌ 8 characters minimum";
	ruleUppercase.textContent = "❌ 1 uppercase letter";
	ruleNumber.textContent = "❌ 1 number";
	ruleSpecial.textContent = "❌ 1 special character";
	matchMessage.textContent = "";
	matchMessage.classList.remove("text-success");
	matchMessage.classList.add("text-danger");

}


function animationPassword() {
	const passwordInput = document.getElementById("inputPasswordNew");
	const passwordVerify = document.getElementById("inputPasswordNew2");
	const ruleLength = document.getElementById("rule-length");
	const ruleUppercase = document.getElementById("rule-uppercase");
	const ruleNumber = document.getElementById("rule-number");
	const ruleSpecial = document.getElementById("rule-special-char");
	const matchMessage = document.getElementById("passwordMatchMessage");
  
	function validatePasswordStrength(value) {
	  if (value.length >= 8) {
		ruleLength.classList.replace("text-danger", "text-success");
		ruleLength.textContent = "✅ 8 characters minimum";
	  } else {
		ruleLength.classList.replace("text-success", "text-danger");
		ruleLength.textContent = "❌ 8 characters minimum";
	  }

	  if (/[A-Z]/.test(value)) {
		ruleUppercase.classList.replace("text-danger", "text-success");
		ruleUppercase.textContent = "✅ 1 uppercase letter";
	  } else {
		ruleUppercase.classList.replace("text-success", "text-danger");
		ruleUppercase.textContent = "❌ 1 uppercase letter";
	  }

	  if (/\d/.test(value)) {
		ruleNumber.classList.replace("text-danger", "text-success");
		ruleNumber.textContent = "✅ 1 number";
	  } else {
		ruleNumber.classList.replace("text-success", "text-danger");
		ruleNumber.textContent = "❌ 1 number";
	  }

	  if (/[^A-Za-z0-9]/.test(value)) {
		ruleSpecial.classList.replace("text-danger", "text-success");
		ruleSpecial.textContent = "✅ 1 special character";
	  } else {
		ruleSpecial.classList.replace("text-success", "text-danger");
		ruleSpecial.textContent = "❌ 1 special character";
	  }
	}
  
	function checkPasswordMatch() {
	  if (passwordVerify.value === "") {
		matchMessage.textContent = "";
		return;
	  }
  
	  if (passwordInput.value === passwordVerify.value) {
		matchMessage.textContent = "✔ Passwords match";
		matchMessage.classList.remove("text-danger");
		matchMessage.classList.add("text-success");
	  } else {
		matchMessage.textContent = "❌ Passwords do not match";
		matchMessage.classList.remove("text-success");
		matchMessage.classList.add("text-danger");
	  }
	}
  
	passwordInput.addEventListener("input", () => {
	  validatePasswordStrength(passwordInput.value);
	  checkPasswordMatch();
	});
  
	passwordVerify.addEventListener("input", checkPasswordMatch);
}


async function getUserInfo(token) {
	try {
	  const response = await fetch("user-service/infoUser/", {
		method: "GET",
		headers: {
		  "Authorization": `Bearer ${token}`,
		  "Content-Type": "application/json",
		},
	  });
	  if (!response.ok) {
		throw new Error(`Erreur HTTP ! status: ${response.status}`);
	  }
	  const data = await response.json();
	  displayUserInfo(data);
  
	} catch (error) {
	  console.error("Erreur lors de la récupération des infos utilisateur :", error);
	}
  }

function handleResponse(response) {
	if (!response.ok) {
		throw new Error("Erreur réseau ou serveur");
	}
	return response.json();
}

//  get avatar end affich
function getUserAvatar(token) {
	fetch("user-service/avatar/", {
		method: "GET",
		headers: {
			"Authorization": `Bearer ${token}`,
		},
	})
		.then(res => {
			if (!res.ok) throw new Error("Error retrieving avatar");
			return res.blob();
		})
		.then(blob => {
			const imgUrl = URL.createObjectURL(blob);
			document.getElementById("avatar").src = imgUrl;
		})
		.catch(err => {
			console.error("Error loading avatar :", err);
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

function SaveImg(token) {
	const form = document.getElementById('uploadForm');
	const errorDiv = document.getElementById('errorMessageImgAvatar');
	const saveBtnContainer = document.getElementById("saveImageContainer")

	if (!form || !errorDiv) return;

	form.addEventListener('submit', async function (e) {
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
				method: 'PATCH',
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
				userInfo()
				setTimeout(() => {
					errorDiv.style.display = 'none';
					errorDiv.classList.remove('text-success');
					errorDiv.classList.add('text-danger');
				}, 2200);
			} else {
				errorDiv.textContent = data.error;
				errorDiv.style.display = 'block';
				setTimeout(() => { errorDiv.style.display = 'none'; }, 2200);
			}
			saveBtnContainer.style.display = "none";

		} catch (err) {
			errorDiv.classList.remove('text-success');
			errorDiv.classList.add('text-danger');
			errorDiv.textContent = err;
			errorDiv.style.display = 'block';
		}
	});
}

function SavePrivateInfo(token) {
	const form = document.getElementById('submitPrivateInfo');
	const errorDiv = document.getElementById('errorMessagePrivateInfo');

	if (!form || !errorDiv) {
		console.log("form or erroDiv is empty");
		return;
	}
	form.addEventListener('submit', async function (e) {
		e.preventDefault();

		const data = {
			firstName: form.elements["inputFirstName"].value,
			lastName: form.elements["inputLastName"].value,
		}

		try {
			const response = await fetch("user-service/savePrivateInfo/", {
				method: 'PATCH',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data)
			});
			const result = await response.json();

			if (result.success) {
				errorDiv.textContent = result.success;
				errorDiv.classList.remove('text-danger');
				errorDiv.classList.add('text-success');
				errorDiv.style.display = 'block';
				setTimeout(() => { errorDiv.style.display = 'none'; }, 2200);
				getUserInfo(token)
			} else if (result.error) {
				errorDiv.textContent = result.error;
				errorDiv.style.display = 'block';
				setTimeout(() => { errorDiv.style.display = 'none'; }, 2200);
			}
			removElemAccount(token)
		} catch (error) {
			errorDiv.textContent = "Error network : ";
			errorDiv.style.display = 'block';
			setTimeout(() => { errorDiv.style.display = 'none'; }, 2200);
			removElemAccount(token)
		}
	});

};

function SavePrivateProfile(token) {
	const form = document.getElementById('profileForm');
	const errorDiv = document.getElementById('errorMessageProfile');

	if (!form || !errorDiv) {
		console.log("form or erroDiv is empty");
		return;
	}
	form.addEventListener('submit', async function (e) {
		e.preventDefault();

		const data = {
			userName: form.elements["inputUsername"].value,
			//mail: form.elements["inputEmail4"].value,
		}

		try {
			const response = await fetch("user-service/saveProfile/", {
				method: 'PATCH',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data)
			});
			const result = await response.json();

			if (result.success) {
				errorDiv.textContent = result.success;
				errorDiv.classList.remove('text-danger');
				errorDiv.classList.add('text-success');
				errorDiv.style.display = 'block';
				setTimeout(() => { errorDiv.style.display = 'none'; }, 2200);
				getUserInfo(token)
			} else if (result.error) {
				errorDiv.textContent = result.error;
				errorDiv.style.display = 'block';
				setTimeout(() => { errorDiv.style.display = 'none'; }, 2200);
			}
			removElemAccount(token)
		} catch (error) {
			errorDiv.textContent = "Error network : ";
			errorDiv.style.display = 'block';
			setTimeout(() => { errorDiv.style.display = 'none'; }, 2200);
			removElemAccount(token)
		}
	});

};


function changePassword(token) {
	const form = document.getElementById('changeMdp')
	const errorDiv = document.getElementById('errorMessageMdp')

	if (!form) {
		console.log("form or erroDiv is empty");
		return;
	}

	animationPassword()
	form.addEventListener('submit', async function (e) {
		e.preventDefault();

		const data = {
			inputPasswordCurrent: form.elements["inputPasswordCurrent"].value,
			inputPasswordNew: form.elements["inputPasswordNew"].value,
			inputPasswordNew2: form.elements["inputPasswordNew2"].value,
		}
		if (
			data.inputPasswordNew === data.inputPasswordNew2 &&
			data.inputPasswordNew.length >= 8
		) {
			try {
				const response = await fetch("user-service/saveNewPassword/", {
					method: 'PATCH',
					headers: {
						'Authorization': `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(data)
				});
				const result = await response.json();
				console.log(result);

				if (result.success) {
					errorDiv.textContent = result.success;
					errorDiv.classList.remove('text-danger');
					errorDiv.classList.add('text-success');
					errorDiv.style.display = 'block';
					setTimeout(() => {
						errorDiv.style.display = 'none';
						errorDiv.textContent = '';
						errorDiv.classList.remove('text-success');
						errorDiv.classList.add('text-danger');
					  }, 2200);
				} else if (result.error) {
					errorDiv.textContent = result.error;
					errorDiv.style.display = 'block';
					setTimeout(() => { errorDiv.style.display = 'none'; }, 2200);
				}
				removElemPassword()

			} catch (error) {
				errorDiv.textContent = "Error network : ";
				errorDiv.style.display = 'block';
				setTimeout(() => { errorDiv.style.display = 'none'; }, 2200);
				removElemPassword();
			}
		}
	});
}

