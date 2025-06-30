import { actualizeIndexPage, fetchWithRefresh } from "../utils.js";
import { routes } from "../routes.js"


export async function dashboardsController() {
	const matchBody = document.getElementById("match-history-body");
	const matchTotal = document.getElementById("matchTotal");
	const matchWin = document.getElementById("matchWin");
	const matchLost = document.getElementById("matchLost");
	matchBody.innerHTML = "";

	try {
		const response = await fetchWithRefresh("user-service/matchHistory/", {
			method: "GET",
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			throw new Error(`Erreur HTTPS ! status for get match hystori: ${response.status}`);
		}

		const data = await response.json();
		console.log(data);
		
		const users = data ?? [];

		matchTotal.textContent = data[0].total_games
		matchWin.textContent = data[0].game_wins
		matchLost.textContent = data[0].game_losses

		for (const user of users.slice(1)) {
			
			let Adversary = user.username1
			let result = "Victory"
			let bg = "bg-success"
			if (user.user !== user.winner) {
				result = "lost"
				bg = "bg-danger"
			}
			if (user.user === user.username1) {
				Adversary = user.username2
			}

			const html = `
				<tr>
				  <td>${user.date}</td>
				  <td class="list-group-item user-link"> <button class="profile-btn" data-username="${Adversary}">${Adversary}</button></td>				
				  <td>${user.score1 + " - " + user.score2}</td>
				  <td><span class="badge ${bg}">${result}</span></td>
				</tr>
			`;
			matchBody.innerHTML += html;
		}
		document.querySelectorAll('.profile-btn').forEach(btn => {
			btn.addEventListener('click', function() {
				const username = btn.dataset.username;
				actualizeIndexPage('modal-container', routes.card_profile(username))
			})
		})

	} catch (error) {
		console.error("Erreur lors de la récupération de l'historique des matchs :", error);
	}
}
