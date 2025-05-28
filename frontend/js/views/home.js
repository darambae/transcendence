
// 	const content = document.getElementById("content");
// 	content.className = "home-view";

// 	console.log("home function called");	
// 	//view content
// 	link.onload = () => {
// 		fetch('/api/data/')
// 		.then(resp => resp.json())
// 		.then(data => {
// 			content.innerHTML = `
// 			<h2>Home</h2>
// 			<p>${data.message}</p>`;
// 		});
// 	}
// }

export function homeController() {
	console.log("here in home function");

	function getCookie(name) {
		let cookieValue = null;
		if (document.cookie && document.cookie !== '') {
			const cookies = document.cookie.split(';');
			for (let i = 0; i < cookies.length; i++) {
				const cookie = cookies[i].trim();
				if (cookie.substring(0, name.length + 1) === (name + '=')) {
					cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
					break;
				}
			}
		}
		return cookieValue;
	}

	const csrf = getCookie('csrf');

	if (!csrf) {
		fetch('user-service/csrf/', {
			method: 'GET',
			credentials: 'include',
		});
	}
}