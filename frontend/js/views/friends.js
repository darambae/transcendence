import { actualizeIndexPage } from "../utils.js";
import { routes } from "../routes.js"


export function searchFriends() {
	
	document.getElementById("userSearch").addEventListener("input", async function () {
		const resultsBox = document.getElementById("resultsSearch");
		const query = this.value;
		
		const response = await fetch(`user-service/searchUsers?q=${encodeURIComponent(query)}`, {
			method: "GET",
			credentials: 'include',
			headers: {
				"Content-Type": "application/json",
			},
		})

		const data = await response.json();

		console.log("Résultat JSON :", data);
		
		const users = data.results ?? [];
		
		resultsBox.innerHTML = users
		.map(user => `<li class="list-group-item user-link"> <button class="profile-btn" data-username="${user.username}">${user.username}</button>						</li>`)
			.join('');
		console.log(query);

		document.querySelectorAll('.profile-btn').forEach(btn => {
			btn.addEventListener('click', function() {
				const username = btn.dataset.username;
				actualizeIndexPage('modal-container', routes.card_profile(username))
			})
		})
	})
}

