export function signupController() {
	const loginForm = document.getElementById("login-form");
	const modalContainer = document.getElementById("modal-container");

	modalContainer.style.display = "none";
	loginForm.classList.remove("active");
}