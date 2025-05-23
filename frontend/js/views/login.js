
export async function handleLoginSubmit(event) {
	event.preventDefault();
	
	const form = event.target;
	const submitButton = form.querySelector("button[type='submit']");
	const loadingMessage = form.querySelector("#loading-message");

	const formData = new FormData(form);
	const data = Object.fromEntries(formData.entries());

	try {
		submitButton.disabled = true;
		if (loadingMessage) 
			loadingMessage.style.display = "inline";

		const response = await fetch("/user_service/login/", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(data)
		});

		if (response.ok) {
			console.log("successfully connected");
		} else {
			console.log("Couldn't connect");
			//Error handling (wrong password, mail address not known, etc...)
		}
	} catch (error) {
		console.error("Connection error: ", error);
	} finally {
		submitButton.disabled = false;
		if (loadingMessage)
			loadingMessage.style.display = "none";
	}
}


export function loginController() {
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

	// add specific event to the form
	const form = document.querySelector("#login-form form");
	if (form) {
	  form.addEventListener("submit", handleLoginSubmit);
	}
}