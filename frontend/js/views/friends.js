import { actualizeIndexPage, fetchWithRefresh } from "../utils.js";
import { routes } from "../routes.js"


export function searchFriends() {
	
	document.getElementById("userSearch").addEventListener("input", async function () {
		const resultsBox = document.getElementById("resultsSearch");
		const query = this.value;
		
		const response = await fetchWithRefresh(`user-service/searchUsers?q=${encodeURIComponent(query)}`, {
			method: "GET",
			credentials: 'include',
			headers: {
				"Content-Type": "application/json",
			},
		})

		const data = await response.json();

		const users = data.results ?? [];
		
		resultsBox.innerHTML = users
		.map(user => `<li class="list-group-item user-link"><button class="profile-btn" data-username="${user.username}">${user.username}</button></li>`)
			.join('');

		document.querySelectorAll('.profile-btn').forEach(btn => {
			btn.addEventListener('click', function() {
				const username = btn.dataset.username;
				actualizeIndexPage('modal-container', routes.card_profile(username))
			})
		})
	})
}

export async function listennerFriends() {
	const resultsBox = document.getElementById("resultsListFriends");
	resultsBox.innerHTML = "";  // CORRECTION ici

	let html = "";

	const response = await fetchWithRefresh("user-service/listennerFriends/", {
		method: "GET",
		credentials: 'include',
		headers: {
			"Content-Type": "application/json",
		},
	});

	const data = await response.json();
	console.log("Résultat JSON :", data);

	const users = data.results ?? [];

	for (const user of users) {
		const statusColor = user.online ? 'bg-success' : 'bg-danger';

		html += `<li class="list-group-item user-link">
			<div class="d-flex justify-content-between align-items-center">
				<div class="d-flex align-items-center gap-2">
					<span class="rounded-circle ${statusColor}" style="width: 10px; height: 10px; display: inline-block;"></span>
					<button class="profile-btn text-decoration-none" data-username="${user.username}">
						${user.username}
					</button>
				</div>`;

		if (user.direction === 'sent' && user.status === "pending") {
			html += `<span class="badge bg-warning text-dark">${user.status}</span>`;
		} else if (user.direction === 'received' && user.status === "pending") {
			html += `<div>
				<button class="btn btn-sm btn-success me-1" onclick="acceptInvite('${user.username}')">
					Accepter
				</button>
				<button class="btn btn-sm btn-danger" onclick="declineInvite('${user.username}')">
					Refuser
				</button>
			</div>`;
		} else {
			const badgeClass = user.status === 'accepted' ? 'bg-success' : 'bg-secondary';
			html += `<span class="badge ${badgeClass}">${user.status}</span>`;
		}

		html += `
			</div>
		</li>`;
	}

	resultsBox.innerHTML = html;

	document.querySelectorAll('.profile-btn').forEach(btn => {
		btn.addEventListener('click', function () {
			const username = btn.dataset.username;
			actualizeIndexPage('modal-container', routes.card_profile(username));
		});
	});
}


export async function acceptInvite(username) {
	
	try {
		const data_body = {
			username: username
		}

		const response = await fetchWithRefresh("user-service/acceptInvite/", {
			method: "PATCH",
			credentials: 'include',
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data_body),
		})

		const data = await response.json();
		console.log("Résultat JSON :", data);
		if (data.message) {
			listennerFriends()
		}


	} catch (err) {
		console.error("Erreur réseau acceptInvite :", err);
	}
}


export async function declineInvite(username) {
	
	try {
		const data_body = {
			username: username
		}

		const response = await fetchWithRefresh("user-service/declineInvite/", {
			method: "PATCH",
			credentials: 'include',
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data_body),
		})

		const data = await response.json();
		console.log("Résultat JSON :", data);
		if (data.message) {
			listennerFriends()
		}


	} catch (err) {
		console.error("declineInvite network error :", err);
	}
}

window.acceptInvite  = acceptInvite;
window.declineInvite = declineInvite;