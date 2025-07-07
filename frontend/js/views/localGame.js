import { fetchWithRefresh, getCookie } from "../utils.js";
import { getPlayersLocalName } from "./utils/commonFunctions.js"
import { adress } from "./utils/commonFunctions.js";
import { drawMap } from "./utils/commonFunctions.js";
import { drawCenterText } from "./multiplayer.js"


function drawRoundedRect(x, y, width, height, radius) {
	const canvas = document.getElementById("gameCanvas");
	const ctx = canvas.getContext("2d");
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + width - radius, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
	ctx.lineTo(x + width, y + height - radius);
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	ctx.lineTo(x + radius, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
	ctx.fill();
}

export function drawCenterTextP() {
	const canvas = document.getElementById("gameCanvas");
	const ctx = canvas.getContext("2d");
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	const x = canvas.width / 2;
	const y = canvas.height / 2;

	ctx.fillStyle = "#ffffff";
	ctx.strokeStyle = "#ffffff";
	ctx.lineWidth = 3;
	drawRoundedRect(x - 100 / 2, y - 100 / 2, 100, 100, 16);


	ctx.fillStyle = "#000000";
	ctx.font = "bold 48px Arial";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("P", x, y);

	ctx.font = "16px Arial";
	ctx.fillText("keyboard", x, y + 32);
	
	ctx.fillStyle = "white";
	ctx.font = "20px Arial";
}

export function guideTouch() {
	const idEEndD = document.getElementById("idEEndD");
	const idUpendDown = document.getElementById("idUpendDown");
	const wallUp = document.getElementById("wallUp")
	const wallDown = document.getElementById("wallDown")
	const verticalStadeUp = document.getElementById("verticalStadeUp")
	const roundStade = document.getElementById("roundStade")
	const verticalStadeDown = document.getElementById("verticalStadeDown")
	const roundStadePongCenter = document.getElementById("roundStadePongCenter")
	const SinglePlayerGameInfo1 = document.getElementById("SinglePlayerGameInfo1")
	const SinglePlayerGameInfo2 = document.getElementById("SinglePlayerGameInfo2")

	if (idEEndD) {
		idEEndD.style.display = "block";
	}
	if (idUpendDown) {
		idUpendDown.style.display = "block";
	}
	if (wallUp) {
		wallUp.style.display = "block";
	}
	if (wallDown) {
		wallDown.style.display = "block";
	}
	if (verticalStadeUp) {
		verticalStadeUp.style.display = "block";
	}
	if (roundStade) {
		roundStade.style.display = "block";
	}
	if (verticalStadeDown) {
		verticalStadeDown.style.display = "block";
	}
	if (roundStadePongCenter) {
		roundStadePongCenter.style.display = "block";
	}
	if (SinglePlayerGameInfo1) {
		SinglePlayerGameInfo1.style.display = "flex";
	}
	if (SinglePlayerGameInfo2) {
		SinglePlayerGameInfo2.style.display = "flex";
	}
}

export async function localGameController() {
	guideTouch()
	drawCenterTextP();

	let key_game = getPlayersLocalName();

	let url_post = `server-pong/send-message`;
	let started = false;
	let game_stats;
	const csrf = getCookie("csrftoken");
	let username;
	let a;
	let b;
	let c;

	// ctx.clearRect(0, 0, canvas.width, canvas.height);

	let score1 = document.getElementById("player1score")
	let score2 = document.getElementById("player2score")
	await fetchWithRefresh(`server-pong/check-sse`, {
		headers: {
			'X-CSRFToken': csrf,
		},
		credentials: 'include',
	})
		.then(response => {
			if (!response.ok) throw new Error("https Error: " + response.status);
			return response.json();
		})
		.then(data => {
			console.log("data", data);
			([a, b, c] = data["guest"])
			username = data["username"]
		})
		.catch(error => {
			console.error("Erreur de requête :", error);
		})
	console.log("results: ", username, a, b, c)
	let url_sse = `server-pong/events?apikey=${key_game}&idplayer=0&ai=0&JWTidP1=-1&JWTidP2=0&username=${username}`;
	if (a !== undefined) {
		url_sse += `&guest1=${a}`
	}
	if (b !== undefined) {
		url_sse += `&guest2=${b}`
	}
	if (c !== undefined) {
		url_sse += `&guest3=${c}`
	}

	console.log("url_sse ->->-> ", url_sse);

	const SSEStream = new EventSource(url_sse);
	SSEStream.onmessage = function (event) {
		try {
			// const data = JSON.parse(event.data);
			// // console.log("Received data: ", data);
			// console.log("Heyyo");
			const data = JSON.parse(event.data);

			let sc1 = document.getElementById("player1score");
			let sc2 = document.getElementById("player2score");

			// console.log(data);
			game_stats = data["game_stats"]
			if (game_stats["State"] != "Waiting for start") {
				if (started == false) {
					started = true;
				}
				if (game_stats["State"] != "playersInfo") {
					// console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
					drawMap(game_stats["ball"]["position"], game_stats["player1"], game_stats["player2"]);
					sc1.innerHTML = game_stats["team1Score"];
					sc2.innerHTML = game_stats["team2Score"];
				}
				else {
					// console.log("BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB")
					let p1 = document.getElementById("player1Username");
					let p2 = document.getElementById("player2Username");

					p1.innerHTML = game_stats["p1"][0]
					p2.innerHTML = game_stats["p2"][0]
				}
			}
		} catch (error) {
			// console.log("ParsingError: ", error)
		}
	}

	window.onbeforeunload = function (event) {
		// console.log("Détection du rechargement ou fermeture de la page");
		if (SSEStream.readyState !== EventSource.CLOSED) {
			// console.log("La connexion SSE va être fermée lors du rechargement.");
			logErrorToLocalStorage("La connexion SSE va être fermée lors du rechargement.");
			// Tu peux aussi essayer de fermer proprement la connexion ici si tu veux
			SSEStream.close();
		}
		else {
			// console.log("Yes");
		}
	};





	const keysPressed = new Set();
	const intervalDelay = 33;
	let lastSent = 0;

	document.addEventListener('keydown', (event) => {
		const key = event.key;
		const keysToPrevent = ['ArrowUp', 'ArrowDown', 'e', 'd', 'l', 'p', 'q'];
		if (keysToPrevent.includes(key)) {
			event.preventDefault();
			keysPressed.add(key);
		}
	});


	document.addEventListener('keyup', (event) => {
		keysPressed.delete(event.key);
	});


	setInterval(async () => {
		const now = Date.now();

		if (now - lastSent < intervalDelay) return;
		lastSent = now;

		for (let key of keysPressed) {

			switch (key) {
				case "p":
					if (started == false) {
						started = true;
						fetchWithRefresh(url_post, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json'
							},
							body: JSON.stringify({ "apiKey": key_game, "message": '{"action": "start"}' })
						});
					};
					break;
				case "q":
					// console.log("Started : ", started);
					if (started == true) {
						await fetchWithRefresh(`server-pong/forfait-game?apikey=${key_game}&idplayer=${2}`, {
							headers: {
								"Authorization": `bearer ${sessionStorage.getItem("accessToken")}`
							}
						});
					}
					break;
				case "l":
					// console.log("Started : ", started);
					if (started == true) {
						await fetchWithRefresh(`server-pong/forfait-game?apikey=${key_game}&idplayer=${1}`, {
							headers: {
								"Authorization": `bearer ${sessionStorage.getItem("accessToken")}`
							}
						});
					}
					break;
				case "ArrowUp":
					fetchWithRefresh(url_post, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({ "apiKey": key_game, "message": '{"action": "move", "player2": "up"}' })
					});
					break;
				case "e":
					fetchWithRefresh(url_post, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({ "apiKey": key_game, "message": '{"action": "move", "player1": "up"}' })
					});
					break;
				case "ArrowDown":
					fetchWithRefresh(url_post, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({ "apiKey": key_game, "message": '{"action": "move", "player2": "down"}' })
					});
					break;
				case "d":
					fetchWithRefresh(url_post, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({ "apiKey": key_game, "message": '{"action": "move", "player1": "down"}' })
					});
					break;
			}
		}
	})
}
