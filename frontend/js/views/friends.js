


export function searchFriends(token) {
	
	document.getElementById("userSearch").addEventListener("input", async function () {
		const resultsBox = document.getElementById("resultsSearch");
		const query = this.value;
		
		const response = await fetch(`user-service/searchUsers?q=${encodeURIComponent(query)}`, {
			method: "GET",
			headers: {
				"Authorization": `Bearer ${token}`,
				"Content-Type": "application/json",
			},
		})

		const data = await response.json();

		console.log("Résultat JSON :", data);
		
		const users = data.results ?? [];
		
		resultsBox.innerHTML = users
		.map(user => `<li class="list-group-item user-link"><a href="/#card_profile/${user.username}" data-username="${user.username}">${user.username}</a></li>`)
			.join('');
		console.log(query);
	})
}

export async function listennerFriends(token) {
	const resultsBox = document.getElementById("resultsListFriends");

	const response = await fetch("user-service/listennerFriends/", {
		method: "GET",
		headers: {
			"Authorization": `Bearer ${token}`,
			"Content-Type": "application/json",
		},
	});

	const data = await response.json();
	console.log("Résultat JSON :", data);

	const users = data.results ?? [];

	resultsBox.innerHTML = users
		.map(user => `<li class="list-group-item user-link">
			<a href="/#card_profile/${user.username}" data-username="${user.username}">
				${user.username}
			</a>
		</li>`)
		.join('');
}

