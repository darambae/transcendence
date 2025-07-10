import { userInfo } from './user.js';
import { fetchWithRefresh } from '../utils.js';
import * as Friends from './friends.js';

export async function settingsProfileController() {
	await getUserInfo();
	getUserAvatar();
	setupAvatarUpload();
	SaveImg();
	SavePrivateInfo();
	SavePrivateProfile();
	changePassword();
	animationPassword();
	Friends.searchFriends();
	Friends.listennerFriends();

	// Add real-time username validation
	setupUsernameValidation();

	// Add real-time name validation
	setupNameValidation();
}

// Add username validation for real-time feedback
function setupUsernameValidation() {
	const usernameInput = document.getElementById('inputUsername');

	if (usernameInput) {
		usernameInput.addEventListener('input', function () {
			const value = this.value;
			const errorDiv = document.getElementById('errorMessageProfile');

			// Check for whitespace and maximum length
			if (/\s/.test(value)) {
				this.style.borderColor = 'red';
				this.title = 'Username cannot contain spaces or whitespace';

				// Show immediate feedback
				if (errorDiv) {
					errorDiv.textContent =
						'Username cannot contain spaces or whitespace characters.';
					errorDiv.classList.remove('text-success');
					errorDiv.classList.add('text-danger');
					errorDiv.style.display = 'block';

					// Hide after 2 seconds
					setTimeout(() => {
						if (errorDiv.textContent.includes('whitespace')) {
							errorDiv.style.display = 'none';
						}
					}, 2000);
				}
			} else if (value.length > 15) {
				this.style.borderColor = 'red';
				this.title = 'Username cannot exceed 15 characters';

				// Show immediate feedback
				if (errorDiv) {
					errorDiv.textContent = 'Username cannot exceed 15 characters.';
					errorDiv.classList.remove('text-success');
					errorDiv.classList.add('text-danger');
					errorDiv.style.display = 'block';

					// Hide after 2 seconds
					setTimeout(() => {
						if (errorDiv.textContent.includes('exceed 15')) {
							errorDiv.style.display = 'none';
						}
					}, 2000);
				}
			} else {
				this.style.borderColor = '';
				this.title = '';

				// Clear error if it was about whitespace or length
				if (
					errorDiv &&
					(errorDiv.textContent.includes('whitespace') ||
						errorDiv.textContent.includes('exceed 15'))
				) {
					errorDiv.style.display = 'none';
				}
			}
		});

		// Prevent pasting content with whitespace and enforce character limit
		usernameInput.addEventListener('paste', function (e) {
			setTimeout(() => {
				let value = this.value;
				const errorDiv = document.getElementById('errorMessageProfile');
				let message = '';
				let modified = false;

				// Check and remove whitespace
				if (/\s/.test(value)) {
					value = value.replace(/\s/g, '');
					message = 'Whitespace characters were removed from username.';
					modified = true;
				}

				// Check and truncate length
				if (value.length > 15) {
					value = value.substring(0, 15);
					message = modified
						? 'Whitespace removed and username truncated to 15 characters.'
						: 'Username truncated to 15 characters.';
					modified = true;
				}

				// Update the input value if modifications were made
				if (modified) {
					this.value = value;

					if (errorDiv) {
						errorDiv.textContent = message;
						errorDiv.classList.remove('text-success');
						errorDiv.classList.add('text-danger');
						errorDiv.style.display = 'block';
						setTimeout(() => {
							errorDiv.style.display = 'none';
						}, 2000);
					}
				}
			}, 10);
		});
	}
}

// Add first and last name validation for real-time feedback
function setupNameValidation() {
	const firstNameInput = document.getElementById('inputFirstName');
	const lastNameInput = document.getElementById('inputLastName');
	const errorDiv = document.getElementById('errorMessagePrivateInfo');

	// First name validation
	if (firstNameInput) {
		firstNameInput.addEventListener('input', function () {
			const value = this.value;

			if (value.length > 15) {
				this.style.borderColor = 'red';
				this.title = 'First name cannot exceed 15 characters';

				if (errorDiv) {
					errorDiv.textContent = 'First name cannot exceed 15 characters.';
					errorDiv.classList.remove('text-success');
					errorDiv.classList.add('text-danger');
					errorDiv.style.display = 'block';

					setTimeout(() => {
						if (errorDiv.textContent.includes('First name')) {
							errorDiv.style.display = 'none';
						}
					}, 2000);
				}
			} else {
				this.style.borderColor = '';
				this.title = '';

				if (errorDiv && errorDiv.textContent.includes('First name')) {
					errorDiv.style.display = 'none';
				}
			}
		});
	}

	// Last name validation
	if (lastNameInput) {
		lastNameInput.addEventListener('input', function () {
			const value = this.value;

			if (value.length > 15) {
				this.style.borderColor = 'red';
				this.title = 'Last name cannot exceed 15 characters';

				if (errorDiv) {
					errorDiv.textContent = 'Last name cannot exceed 15 characters.';
					errorDiv.classList.remove('text-success');
					errorDiv.classList.add('text-danger');
					errorDiv.style.display = 'block';

					setTimeout(() => {
						if (errorDiv.textContent.includes('Last name')) {
							errorDiv.style.display = 'none';
						}
					}, 2000);
				}
			} else {
				this.style.borderColor = '';
				this.title = '';

				if (errorDiv && errorDiv.textContent.includes('Last name')) {
					errorDiv.style.display = 'none';
				}
			}
		});
	}
}

function displayUserInfo(data) {
	console.log(data);
	document.getElementById('usernameLabel').textContent = data.user_name;
	document.getElementById('mailLabel').textContent = data.mail;
	document.getElementById('firstNameLabel').textContent = data.first_name;
	document.getElementById('lastNameLabel').textContent = data.last_name;
	document.getElementById('createdAt').textContent = data.created_at;
	document.getElementById('lastActive').textContent = data.last_login;
}

function removElemAccount() {
	document.getElementById('inputUsername').value = '';
	document.getElementById('inputFirstName').value = '';
	document.getElementById('inputLastName').value = '';
}

function removElemPassword() {
	const ruleLength = document.getElementById('rule-length');
	const ruleUppercase = document.getElementById('rule-uppercase');
	const ruleNumber = document.getElementById('rule-number');
	const ruleSpecial = document.getElementById('rule-special-char');
	const matchMessage = document.getElementById('passwordMatchMessage');

	document.getElementById('inputPasswordCurrent').value = '';
	document.getElementById('inputPasswordNew').value = '';
	document.getElementById('inputPasswordNew2').value = '';
	ruleLength.textContent = '❌ 8 characters minimum';
	ruleUppercase.textContent = '❌ 1 uppercase letter';
	ruleNumber.textContent = '❌ 1 number';
	ruleSpecial.textContent = '❌ 1 special character';
	matchMessage.textContent = '';
	matchMessage.classList.remove('text-success');
	matchMessage.classList.add('text-danger');
}

function animationPassword() {
	const passwordInput = document.getElementById('inputPasswordNew');
	const passwordVerify = document.getElementById('inputPasswordNew2');
	const ruleLength = document.getElementById('rule-length');
	const ruleUppercase = document.getElementById('rule-uppercase');
	const ruleNumber = document.getElementById('rule-number');
	const ruleSpecial = document.getElementById('rule-special-char');
	const matchMessage = document.getElementById('passwordMatchMessage');

	function validatePasswordStrength(value) {
		if (value.length >= 8) {
			ruleLength.classList.replace('text-danger', 'text-success');
			ruleLength.textContent = '✅ 8 characters minimum';
		} else {
			ruleLength.classList.replace('text-success', 'text-danger');
			ruleLength.textContent = '❌ 8 characters minimum';
		}

		if (/[A-Z]/.test(value)) {
			ruleUppercase.classList.replace('text-danger', 'text-success');
			ruleUppercase.textContent = '✅ 1 uppercase letter';
		} else {
			ruleUppercase.classList.replace('text-success', 'text-danger');
			ruleUppercase.textContent = '❌ 1 uppercase letter';
		}

		if (/\d/.test(value)) {
			ruleNumber.classList.replace('text-danger', 'text-success');
			ruleNumber.textContent = '✅ 1 number';
		} else {
			ruleNumber.classList.replace('text-success', 'text-danger');
			ruleNumber.textContent = '❌ 1 number';
		}

		if (/[^A-Za-z0-9]/.test(value)) {
			ruleSpecial.classList.replace('text-danger', 'text-success');
			ruleSpecial.textContent = '✅ 1 special character';
		} else {
			ruleSpecial.classList.replace('text-success', 'text-danger');
			ruleSpecial.textContent = '❌ 1 special character';
		}
	}

	function checkPasswordMatch() {
		if (passwordVerify.value === '') {
			matchMessage.textContent = '';
			return;
		}

		if (passwordInput.value === passwordVerify.value) {
			matchMessage.textContent = '✔ Passwords match';
			matchMessage.classList.remove('text-danger');
			matchMessage.classList.add('text-success');
		} else {
			matchMessage.textContent = '❌ Passwords do not match';
			matchMessage.classList.remove('text-success');
			matchMessage.classList.add('text-danger');
		}
	}

	passwordInput.addEventListener('input', () => {
		validatePasswordStrength(passwordInput.value);
		checkPasswordMatch();
	});

	passwordVerify.addEventListener('input', checkPasswordMatch);
}

let userInfoCache = null;
let userInfoCacheTime = 0;
const USER_INFO_CACHE_DURATION = 60000; // 60 seconds

async function getUserInfo() {
	try {
		const timestamp = Date.now();
		const response = await fetch(`user-service/infoUser/?t=${timestamp}`, {
			method: 'GET',
			credentials: 'include',
			headers: {
				'Cache-Control': 'no-cache',
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			throw new Error(`Erreur HTTP ! status: ${response.status}`);
		}
		// Cache the response
		const clonedResponse = response.clone();
		const data = await clonedResponse.json();

		displayUserInfo(data);
		return data;
	} catch (error) {
		console.error(
			'Erreur lors de la récupération des infos utilisateur:',
			error
		);
	}
}

function handleResponse(response) {
	if (!response.ok) {
		throw new Error('Erreur réseau ou serveur');
	}
	return response.json();
}

//  get avatar end affich
async function getUserAvatar() {
	try {
		const timestamp = Date.now();
		const res = await fetch(`user-service/avatar/?t=${timestamp}`, {
			method: 'GET',
			credentials: 'include',
		});

		if (!res.ok) throw new Error('Error retrieving avatar');

		const blob = await res.blob();
		const imgUrl = URL.createObjectURL(blob);
		document.getElementById('avatar').src = imgUrl;
	} catch (err) {
		console.error('Error loading avatar:', err);
		document.getElementById('avatar').src = 'img/default.png';
	}
}

//  modifi view frond avatar end save img
function setupAvatarUpload() {
	const uploadInput = document.getElementById('uploadImg');
	const avatar = document.getElementById('avatar');
	const saveBtnContainer = document.getElementById('saveImageContainer');

	if (uploadInput && avatar) {
		uploadInput.addEventListener('change', function (e) {
			const file = e.target.files[0];
			if (file) {
				avatar.src = URL.createObjectURL(file);
				if (saveBtnContainer) {
					saveBtnContainer.style.display = 'block';
				}
			} else {
				if (saveBtnContainer) {
					saveBtnContainer.style.display = 'none';
				}
			}
		});
	}
}

function SaveImg() {
	const form = document.getElementById('uploadForm');
	const errorDiv = document.getElementById('errorMessageImgAvatar');
	const saveBtnContainer = document.getElementById('saveImageContainer');

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
			const response = await fetchWithRefresh('user-service/saveImg/', {
				method: 'PATCH',
				credentials: 'include',
				body: formData,
			});

			const data = await response.json();
			//console.log(data)
			if (data.status === 'error') {
				console.log('Error in response:', data);
				errorDiv.textContent = `Error: ${data.message}`;
				errorDiv.style.display = 'block';
				setTimeout(() => {
					errorDiv.style.display = 'none';
				}, 2200);
				return;
			}
			if (data.success) {
				errorDiv.textContent = data.success;
				errorDiv.classList.remove('text-danger');
				errorDiv.classList.add('text-success');
				errorDiv.style.display = 'block';
				userInfo();
				setTimeout(() => {
					errorDiv.style.display = 'none';
					errorDiv.classList.remove('text-success');
					errorDiv.classList.add('text-danger');
				}, 2200);
			} else {
				errorDiv.textContent = data.error;
				errorDiv.style.display = 'block';
				setTimeout(() => {
					errorDiv.style.display = 'none';
				}, 2200);
			}
			saveBtnContainer.style.display = 'none';
		} catch (err) {
			errorDiv.classList.remove('text-success');
			errorDiv.classList.add('text-danger');
			errorDiv.textContent = err;
			errorDiv.style.display = 'block';
		}
	});
}

function SavePrivateInfo() {
	const form = document.getElementById('submitPrivateInfo');
	const errorDiv = document.getElementById('errorMessagePrivateInfo');

	if (!form || !errorDiv) {
		console.log('form or erroDiv is empty');
		return;
	}
	form.addEventListener('submit', async function (e) {
		e.preventDefault();

		// Get form data
		const firstName = form.elements['inputFirstName'].value;
		const lastName = form.elements['inputLastName'].value;

		// Validate name lengths before submitting
		if (firstName.length > 15) {
			errorDiv.textContent = 'First name cannot exceed 15 characters.';
			errorDiv.classList.remove('text-success');
			errorDiv.classList.add('text-danger');
			errorDiv.style.display = 'block';
			setTimeout(() => {
				errorDiv.style.display = 'none';
			}, 3000);
			return;
		}

		if (lastName.length > 15) {
			errorDiv.textContent = 'Last name cannot exceed 15 characters.';
			errorDiv.classList.remove('text-success');
			errorDiv.classList.add('text-danger');
			errorDiv.style.display = 'block';
			setTimeout(() => {
				errorDiv.style.display = 'none';
			}, 3000);
			return;
		}

		const data = {
			firstName: firstName,
			lastName: lastName,
		};

		try {
			const response = await fetchWithRefresh('user-service/savePrivateInfo/', {
				method: 'PATCH',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});
			const result = await response.json();

			if (result.success) {
				errorDiv.textContent = result.success;
				errorDiv.classList.remove('text-danger');
				errorDiv.classList.add('text-success');
				errorDiv.style.display = 'block';
				setTimeout(() => {
					errorDiv.style.display = 'none';
				}, 2200);
				getUserInfo();
				userInfoCache = null;
			} else if (result.error) {
				errorDiv.textContent = result.error;
				errorDiv.style.display = 'block';
				setTimeout(() => {
					errorDiv.style.display = 'none';
				}, 5000);
			}
			removElemAccount();
		} catch (error) {
			errorDiv.textContent = 'Error network : ';
			errorDiv.style.display = 'block';
			setTimeout(() => {
				errorDiv.style.display = 'none';
			}, 5000);
			removElemAccount();
		}
	});
}

function SavePrivateProfile() {
	const form = document.getElementById('profileForm');
	const errorDiv = document.getElementById('errorMessageProfile');

	if (!form || !errorDiv) {
		console.log('form or erroDiv is empty');
		return;
	}
	form.addEventListener('submit', async function (e) {
		e.preventDefault();

		// Username validation - check for whitespace and length
		const usernameValue = form.elements['inputUsername'].value;
		if (/\s/.test(usernameValue)) {
			errorDiv.textContent =
				'Username cannot contain spaces or whitespace characters.';
			errorDiv.classList.remove('text-success');
			errorDiv.classList.add('text-danger');
			errorDiv.style.display = 'block';
			setTimeout(() => {
				errorDiv.style.display = 'none';
			}, 3000);
			return;
		}

		if (usernameValue.length > 15) {
			errorDiv.textContent = 'Username cannot exceed 15 characters.';
			errorDiv.classList.remove('text-success');
			errorDiv.classList.add('text-danger');
			errorDiv.style.display = 'block';
			setTimeout(() => {
				errorDiv.style.display = 'none';
			}, 3000);
			return;
		}

		const data = {
			userName: form.elements['inputUsername'].value,
			//mail: form.elements["inputEmail4"].value,
		};

		try {
			const response = await fetchWithRefresh('user-service/saveProfile/', {
				method: 'PATCH',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});
			const result = await response.json();

			if (result.success) {
				// Clear cache completely
				userInfoCache = null;
				userInfoCacheTime = 0;

				// Get fresh data with a new request
				await getUserInfo();
				errorDiv.textContent = result.success;
				errorDiv.classList.remove('text-danger');
				errorDiv.classList.add('text-success');
				errorDiv.style.display = 'block';
				setTimeout(() => {
					errorDiv.style.display = 'none';
				}, 2200);
			} else if (result.error) {
				errorDiv.textContent = result.error;
				errorDiv.style.display = 'block';
				setTimeout(() => {
					errorDiv.style.display = 'none';
				}, 2200);
			}
			removElemAccount();
		} catch (error) {
			errorDiv.textContent = 'Error network : ';
			errorDiv.style.display = 'block';
			setTimeout(() => {
				errorDiv.style.display = 'none';
			}, 2200);
			removElemAccount();
		}
	});
}

function changePassword() {
	const form = document.getElementById('changeMdp');
	const errorDiv = document.getElementById('errorMessageMdp');

	if (!form) {
		console.log('form or erroDiv is empty');
		return;
	}

	animationPassword();
	form.addEventListener('submit', async function (e) {
		e.preventDefault();

		const data = {
			inputPasswordCurrent: form.elements['inputPasswordCurrent'].value,
			inputPasswordNew: form.elements['inputPasswordNew'].value,
			inputPasswordNew2: form.elements['inputPasswordNew2'].value,
		};
		if (
			data.inputPasswordNew === data.inputPasswordNew2 &&
			data.inputPasswordNew.length >= 8
		) {
			try {
				const response = await fetchWithRefresh(
					'user-service/saveNewPassword/',
					{
						method: 'PATCH',
						credentials: 'include',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(data),
					}
				);
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
					setTimeout(() => {
						errorDiv.style.display = 'none';
					}, 2200);
				}
				removElemPassword();
			} catch (error) {
				errorDiv.textContent = 'Error network : ';
				errorDiv.style.display = 'block';
				setTimeout(() => {
					errorDiv.style.display = 'none';
				}, 2200);
				removElemPassword();
			}
		}
	});
}
