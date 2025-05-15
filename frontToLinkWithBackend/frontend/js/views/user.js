
export function userController() {
	const modalContainer = document.getElementById("modal-container");
	const loginForm = document.getElementById("login-form");
	const closeBtn = document.getElementById("close-login-form");

	const closeModal = () => {
		modalContainer.style.display = "none";
		loginForm.classList.remove("active");
		window.location = "#home";
	};

	closeBtn.addEventListener("click", (event) => {
		closeModal();
	});

	modalContainer.addEventListener("click", (event) => {
		if(event.target.id === "modal-container") {
			closeModal();
		}
	});

	// // add specific event to the form
	// const form = document.querySelector("#login-form form");
	// if (form) {
	//   form.addEventListener("submit", (event) => {
	// 	event.preventDefault();
	// 	console.log("Form submitted!");
	// 	// add here logic to treat the form
	//   });
	// }
}