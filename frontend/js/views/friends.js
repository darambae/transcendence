
export function searchFriends(token) {
	
	document.getElementById("userSearch").addEventListener("input", async function () {
		const resultsBox = document.getElementById("resultsSearch");
		const query = this.value;

		if (query.length < 2) {
			resultsBox.innerHTML = "sssss";
			return;
		}
		
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
		.map(user => `<li class="list-group-item"><a href="/profile/${user.id}" class="user-link">${user.username}</a></li>`)
			.join('');
		
		console.log(query);
	})
}