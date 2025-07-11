
export async function waintTournamentController() {

	//const ulDropdown = document.getElementById("trnmt-list-ul");
	const tournamentLeave = document.getElementById("Tournament-leave");

	console.log('eee')

	//addTournament()
	tournamentLeave.addEventListener('click', async (event) => {
		const target = event.target;
	
		if (target.tagName === "BUTTON") {
		  event.preventDefault();
		  await fetch("tournament/tournament", {
			method : 'POST',
			headers : {
			  'X-CSRFToken': csrf,
			  'Content-Type': 'application/json',
			},
			credentials : "include",
			body: JSON.stringify({"action": "leave", "tKey" : target.id})
		  })
		  .then(response => {
			if (!response.ok) throw new Error("https Error: " + response.status);
			return response.json();
		  })
			.then(data => {
			  SSEStream.close();
			  tournamentInfo.innerHTML = "<h4>No tournament Joined</h4>";
			  tournamentLaunch.innerHTML = ""
			  tournamentLeave.innerHTML = ""
			  divGuest.innerHTML = "<h4>Waiting for tournament</h4>";
			})
			.catch(error => {
			  console.error("Erreur de requête :", error);
			  throw error;
			});
		}
	  })
}


//function addTournament() {

//	const ulDropdown = document.getElementById("trnmt-list-ul");

//	ulDropdown.addEventListener('click', async (event) => {
//		const target = event.target;
//		let usernameJwt;
//		let jwtInfo;
//		let guestJwt;
		
		
//		console.log("entree")
		
//		// Check if the clicked element is an <a> tag
//		if (target.tagName === "BUTTON") {
//			event.preventDefault();
//			const view = target.dataset.view;
//			console.log("aaaaa", view);
//			const btnId = document.getElementById(view)
//			btnId.style.backgroundColor = "green";
			

//			try {
//				await fetch("tournament/check-sse", {
//					headers: {
//						'X-CSRFToken': csrf,
//					},
//					credentials: "include",
//				})
//				.then(response => {
//					if (!response.ok) throw new Error("https Error: " + response.status);
//					jwtInfo = response.json();
//					console.log(jwtInfo);
//					usernameJwt = jwtInfo["key"];
//					guestJwt = jwtInfo["guests"]
//				})
//			}
//			catch (error) {
//				console.log("Error : ", error);
//			}
			
//			await fetch("tournament/tournament", {
//				method: 'POST',
//				headers: {
//					'X-CSRFToken': csrf,
//					'Content-Type': 'application/json',
//				},
//				credentials: "include",
//				body: JSON.stringify({ "action": "join", "tKey": view })
//			})
//			.then(response => {
//				console.log("aaa1", response)
//				if (!response.ok) throw new Error("https Error: " + response.status);
//				return response.json();
//			})
//			.then(async data => {
//				console.log("Données reçues Join:", data["key"]);
//				const url_sse = `tournament/events?tKey=${data["key"]}&name=${usernameJwt}&guests=${guestJwt}`;
//				SSEStream = new EventSource(url_sse);
//				setSSE(SSEStream);
//				SSEStream.onmessage = function (event) {
//					try {
//						console.log("iii", event.data);
//						const data = JSON.parse(event.data);
//						console.log("jjj", data);
//						console.log("kkk", data.t_state);
//						if (data.t_state == "game-start") {
//							console.log("SSE 1")
//							const buttonGame = document.createElement("button");
//							console.log("SSE 2")
//							buttonGame.className = "btn btn-outline-primary";
//							console.log("SSE 3")
//							buttonGame.textContent = "Launch game";
//							console.log("SSE 4")
//							buttonGame.dataset.type = data.mode;
//							console.log("SSE 5")
//							if (data.mode == "local") {
//								console.log("SSE 6")
//								buttonGame.dataset.p1 = data.player1;
//								console.log("SSE 7")
//								buttonGame.dataset.p2 = data.player2;
//							}
//							else {
//								buttonGame.dataset.player = data.player;
//								buttonGame.dataset.playerId = data.playerId;
//								console.log("done");
//							}
//							console.log("SSE 8")
//							buttonGame.dataset.round = data.round;
//							buttonGame.dataset.key = data.key;
//							buttonGame.dataset.tkey = data.tkey
//							console.log("SSE 9")
//							tournamentGame.innerHTML = "";
//							console.log("SSE 10")
//							tournamentGame.appendChild(buttonGame);
//						}
//						else if (data.t_state == "game-finished") {
//							actualizeIndexPage("Tournament-Lobby", routesTr['tournament'])
//							console.log("sse data: ", data.next)
//							if (data.next == "final-rounds") {
//								fetch("tournament/finals", {
//									method: "POST",
//									headers: {
//										'X-CSRFToken': csrf,
//										'Content-Type': 'application/json',
//									},
//									credentials: 'include',
//									body: JSON.stringify({ "tKey": data.tkey })
//								})
//							}
//							else {
//								fetch("tournament/match", {
//									method: "POST",
//									headers: {
//										'X-CSRFToken': csrf,
//										'Content-Type': 'application/json',
//									},
//									credentials: 'include',
//									body: JSON.stringify({ "tKey": data.tkey })
//								})
//							}
//						}
//					}
//					catch (error) {
//						console.log("Error", error);
//					}
//				};
//				return invitsController()
//			})
//			.catch(error => {
//				console.error("Erreur de requête :", error);
//				throw error;
//			});
//		};
		
		
//	})
//}