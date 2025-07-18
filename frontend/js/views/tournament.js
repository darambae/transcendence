import {
	actualizeIndexPage,
	fetchWithRefresh,
	fetchWithRefreshNoCash,
} from '../utils.js';
import { getCookie } from '../utils.js';
import { handleInvitSubmit } from './invits.js';
import { localGameTr } from './tournamentLocalGame.js';
import { onlineGameTr } from './tournamentOnlineGaame.js';
import { getOtherUserAvatar } from './card_profile.js';
import { routes } from '../routes.js';

const csrf = getCookie('csrftoken');
import { launchTournamentChat, sendMessage } from './chat.js';

let sseTournament;
let launchbool = false;

export function setSSE(sseObj) {
	sseTournament = sseObj;
}

export function getSSE() {
	return sseTournament;
}

export let routesTr = {
	matchSp: {
		template: 'singlePlayTournament',
		controller: localGameTr,
	},
	matchOnline: (key, playerID, isAiGame, JWTid, tkey, round) => ({
		template: 'multiplayerTournament',
		controller: () => onlineGameTr(key, playerID, isAiGame, JWTid, tkey, round),
	}),
	tournament: {
		template: 'tournament',
		controller: tournamentController,
	},
};

export function invitsController() {
	const modalContainer = document.getElementById('modal-container');

	let form = document.getElementById('log-form');
	if (form) {
		form.addEventListener('submit', (e) => {
			handleInvitSubmit(e, form);
			e.preventDefault();
		});
	}
}

export async function refreshTournament() {
	const ulElem = document.getElementById('trnmt-list-ul');
	let trnmt;

	if (!ulElem) return;

	await fetchWithRefreshNoCash('tournament/tournament', {
		headers: {
			'X-CSRFToken': csrf,
		},
		credentials: 'include',
	})
		.then((response) => {
			if (!response.ok) throw new Error('https Error: ' + response.status);
			return response.json();
		})
		.then((data) => {
			// console.log("Données reçues TrnmtKey:", data["list"]);
			trnmt = data['list'];
		})
		.catch((error) => {
			console.error('Erreur de requête :', error);
			throw error;
		});

	ulElem.innerHTML = '';

	for (const key in trnmt) {
		console.log('entreee');
		const html = `
          <tr>
            <td id="${key}">
              <button  class="profile-btn dropdown-item" data-view="${key}">
                ${key} - ${trnmt[key]}
              </button>
            </td>
          </tr>
        `;

		ulElem.innerHTML += html;
	}
}

async function createEvent(csrf, ulElem) {
	// // console.log("Hey 3")

	await fetchWithRefreshNoCash('tournament/tournament', {
		method: 'POST',
		headers: {
			'X-CSRFToken': csrf,
			'Content-Type': 'application/json',
		},
		credentials: 'include',
		body: JSON.stringify({ action: 'create' }),
	})
		.then((response) => {
			if (!response.ok) throw new Error('https Error: ' + response.status);
			return response.json();
		})
		// .then(data => {
		//   // // console.log("Données reçues TrnmtCreate:", data);
		//   // let trnmt = data["list"];
		// })
		.catch((error) => {
			console.error('Erreur de requête :', error);
			throw error;
		});
	refreshTournament();
}

// function diplayListStatus(status) {
//   const statusList = document.getElementById("divlistTournament")

//   statusList.style.display = status;
// }

function setPositionTournamentList(pos) {
	const container = document.getElementById('listPlayerGameTournament');

	container.style.position = pos;
	if (pos == 'relative') {
		container.style.display = 'none';
	} else {
		container.style.display = 'block';
	}
	localStorage.setItem('container-position-tournamentList', pos);
}

function listTournament(csrf, ulElem) {
	const createButton = document.getElementById('create-trnmt');
	const container = document.getElementById('listPlayerGameTournament');

	refreshTournament();

	const savedPos = localStorage.getItem('container-position-tournamentList');

	if (savedPos) {
		container.style.position = savedPos || 'relative';
		affichUserTournament();
	}

	createButton.addEventListener('click', () => {
		createEvent(csrf, ulElem);
	});
}

async function LaunchGameIntournament(data) {
	const idNBtournament = document.getElementById('idNBtournament');
	let seconds = 5;

	const interval = setInterval(() => {
		idNBtournament.textContent = seconds;

		if (seconds <= 0) {
			clearInterval(interval);
			launchGame(data);
		}
		seconds--;
	}, 1000);
}

async function launchTournament(data) {
	const avatarother0 = document.getElementById('avatarother0');
	const avatarother2 = document.getElementById('avatarother2');
	const avatarother4 = document.getElementById('avatarother4');
	const avatarother6 = document.getElementById('avatarother6');

	const nameAvatarother0 = avatarother0.getAttribute('data-username');
	const nameAvatarother2 = avatarother2.getAttribute('data-username');
	const nameAvatarother4 = avatarother4.getAttribute('data-username');
	const nameAvatarother6 = avatarother6.getAttribute('data-username');

	if (data.match1) {
		if (data.match1.player1 == nameAvatarother0) {
			avatarother0.style.order = 0;
		} else if (data.match1.player1 == nameAvatarother2) {
			avatarother2.style.order = 0;
		} else if (data.match1.player1 == nameAvatarother4) {
			avatarother4.style.order = 0;
		} else if (data.match1.player1 == nameAvatarother6) {
			avatarother6.style.order = 0;
		}

		if (data.match1.player2 == nameAvatarother0) {
			avatarother0.style.order = 2;
		} else if (data.match1.player2 == nameAvatarother2) {
			avatarother2.style.order = 2;
		} else if (data.match1.player2 == nameAvatarother4) {
			avatarother4.style.order = 2;
		} else if (data.match1.player2 == nameAvatarother6) {
			avatarother6.style.order = 2;
		}
	}
	if (data.match2) {
		if (data.match2.player1 == nameAvatarother0) {
			avatarother0.style.order = 4;
		} else if (data.match2.player1 == nameAvatarother2) {
			avatarother2.style.order = 4;
		} else if (data.match1.player1 == nameAvatarother4) {
			avatarother4.style.order = 4;
		} else if (data.match2.player1 == nameAvatarother6) {
			avatarother6.style.order = 4;
		}

		if (data.match2.player2 == nameAvatarother0) {
			avatarother0.style.order = 6;
		} else if (data.match2.player2 == nameAvatarother2) {
			avatarother2.style.order = 6;
		} else if (data.match2.player2 == nameAvatarother4) {
			avatarother4.style.order = 6;
		} else if (data.match2.player2 == nameAvatarother6) {
			avatarother6.style.order = 6;
		}
	}
}

async function startTournament(data) {
	const idplayerInTournament = document.getElementById('idplayerInTournament');
	const tournamentLeave = document.getElementById('Tournament-leave');

	tournamentLeave.innerHTML = '';
	idplayerInTournament.innerHTML = '';

	const view = data.Tournament;

	await fetchWithRefresh('tournament/match', {
		method: 'POST',
		headers: {
			'X-CSRFToken': csrf,
			'Content-Type': 'application/json',
		},
		credentials: 'include',
		body: JSON.stringify({ tKey: view }),
	})
		.then((response) => {
			if (!response.ok) throw new Error('https Error: ' + response.status);
			return response.json();
		})
		.then((data) => {
			//tournamentInfo.innerHTML = `<h6>${data["Info"]}</h6>`;
		})
		.catch((error) => {
			console.error('Erreur de requête :', error);
			throw error;
		});
}

export async function affichUserTournament(exit = false) {
	const idtournament = document.getElementById('idtournament');
	const idNBtournament = document.getElementById('idNBtournament');
	const idplayerInTournament = document.getElementById('idplayerInTournament');
	const divGuest = document.getElementById('guest-add');

	if (
		(!idtournament || !idNBtournament || !idplayerInTournament) &&
		exit == false
	) {
		console.log('exit');
		console.log(idtournament);
		console.log(idNBtournament);
		console.log(idplayerInTournament);
		return;
	}

	const response = await fetchWithRefreshNoCash('tournament/me', {
		headers: {
			'X-CSRFToken': csrf,
		},
		credentials: 'include',
	});
	const data = await response.json();

	console.log(data.number, launchbool);
	if (data.number == 4 && exit == false) {
		divGuest.innerHTML = '';
		divGuest.style.display = 'none';
		if (launchbool == false) {
			launchbool = true;
			await startTournament(data);
		} else {
			console.log('error tournamentLaunch not found');
		}
	} else if (data.number >= 1 && exit == false) {
		let text = await fetchWithRefreshNoCash('./templates/invits.html');
		text = await text.text();
		divGuest.innerHTML = text;
		divGuest.style.display = 'block';
	}

	if (response.ok) {
		idtournament.textContent = data.Tournament;
		idNBtournament.textContent = data.number + ' / 4';

		if (data.players) {
			console.log('=================================');
			console.log(data.players);
			console.log('=================================');
			let i = 0;
			let html = '';
			idplayerInTournament.innerHTML = '';
			for (const pl of data.players) {
				html = `
              <button
                id="avatarother${i}"
                class="profile-btn section"
                data-username="${pl}"
                style="cursor: pointer;
                      background-color: rgba(0, 33, 83, 0);
                      border: none; padding: 0;
                      color: rgb(255, 255, 255);
                      order: ${i};
                ">
                
                <h6 class="mb-2">${pl}</h6>
                <img
                  alt=""
                  src=""
                  class="rounded-circle img-responsive"
                  width="128"
                  height="128"
                />
              </button>
        `;
				idplayerInTournament.innerHTML += html;
				fetchWithRefresh(`user-service/avatarOther/${pl}`, {
					method: 'GET',
					credentials: 'include',
				})
					.then((res) => {
						if (!res.ok) throw new Error('Error retrieving other Avatar');
						return res.blob();
					})
					.then((blob) => {
						const imgUrl = URL.createObjectURL(blob);
						console.log('avatarother' + (i - 2));
						const bt = document.getElementById('avatarother' + (i - 2));
						const img = bt.querySelector('img');
						img.src = imgUrl;
					})
					.catch((err) => {
						console.error('Error loading other avatar :', err);
					});
				if (i == 6) {
					html = `
              <div
                id="idVS2"
                class="section"
                style="
                      background-color: rgba(0, 33, 83, 0);
                      border: none; padding: 0;
                      color: rgb(255, 255, 255);
                      order: 5;
                      display: block;
                "> VS
              </div>
              <div
                id="idVS1"
                class="section"
                style="
                    background-color: rgba(0, 33, 83, 0);
                    border: none; padding: 0;
                    color: rgb(255, 255, 255);
                    order: 1;
                    display: block;
                "> VS
              </div>
            `;
					idplayerInTournament.innerHTML += html;
				}
				i += 2;
			}

			document.querySelectorAll('.profile-btn').forEach((btn) => {
				btn.addEventListener('click', async function () {
					const username = btn.dataset.username;
					await actualizeIndexPage(
						'modal-container',
						routes.card_profile(username)
					);
				});
			});
			invitsController();
		}
	}
}

export async function afficheWinnerTournament(data) {
	const avatarother0 = document.getElementById('avatarother0');
	const nameAvatarother0 = avatarother0.getAttribute('data-username');
	const avatarother2 = document.getElementById('avatarother2');
	const nameAvatarother2 = avatarother2.getAttribute('data-username');
	const avatarother4 = document.getElementById('avatarother4');
	const nameAvatarother4 = avatarother4.getAttribute('data-username');
	const avatarother6 = document.getElementById('avatarother6');
	const nameAvatarother6 = avatarother6.getAttribute('data-username');
	const idVS1 = document.getElementById('idVS1');
	const idVS2 = document.getElementById('idVS2');
	const leave = document.getElementById('Tournament-leave');

	console.log(
		'qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'
	);
	if (leave) {
		leave.style.display = 'block';
	}
	if (idVS1) {
		idVS1.style.display = 'none';
	}
	if (idVS2) {
		idVS2.style.display = 'none';
	}
	if (data.first == nameAvatarother0) {
		avatarother0.style.order = 0;
		avatarother0.innerHTML += '1';
	} else if (data.first == nameAvatarother2) {
		avatarother2.style.order = 0;
		avatarother2.innerHTML += '1';
	}
	if (data.first == nameAvatarother4) {
		avatarother4.style.order = 0;
		avatarother4.innerHTML += '1';
	} else if (data.first == nameAvatarother6) {
		avatarother6.style.order = 0;
		avatarother6.innerHTML += '1';
	}

	if (data.second == nameAvatarother0) {
		avatarother0.style.order = 2;
		avatarother0.innerHTML += '2';
	} else if (data.second == nameAvatarother2) {
		avatarother2.style.order = 2;
		avatarother2.innerHTML += '2';
	}
	if (data.second == nameAvatarother4) {
		avatarother4.style.order = 2;
		avatarother4.innerHTML += '2';
	} else if (data.second == nameAvatarother6) {
		avatarother6.style.order = 2;
		avatarother6.innerHTML += '2';
	}

	if (data.third == nameAvatarother0) {
		avatarother0.style.order = 4;
		avatarother0.innerHTML += '3';
	} else if (data.third == nameAvatarother2) {
		avatarother2.style.order = 4;
		avatarother2.innerHTML += '3';
	}
	if (data.third == nameAvatarother4) {
		avatarother4.style.order = 4;
		avatarother4.innerHTML += '3';
	} else if (data.third == nameAvatarother6) {
		avatarother6.style.order = 4;
		avatarother6.innerHTML += '3';
	}

	if (data.fourth == nameAvatarother0) {
		avatarother0.style.order = 6;
		avatarother0.innerHTML += '4';
	} else if (data.fourth == nameAvatarother2) {
		avatarother2.style.order = 6;
		avatarother2.innerHTML += '4';
	}
	if (data.fourth == nameAvatarother4) {
		avatarother4.style.order = 6;
		avatarother4.innerHTML += '4';
	} else if (data.fourth == nameAvatarother6) {
		avatarother6.style.order = 6;
		avatarother6.innerHTML += '4';
	}
}

export async function tournamentController() {
	const ulDropdown = document.getElementById('trnmt-list-ul');
	const ulElem = document.getElementById('trnmt-list-ul');
	listTournament(csrf, ulElem);

	let SSEStream;
	let leaveButton = undefined;
	let launchButton = undefined;
	//const tournamentInfo = document.getElementById("Tournament-info");
	const tournamentLeave = document.getElementById('Tournament-leave');
	const tournamentGame = document.getElementById('Tournament-game');
	const tournamentLaunch = document.getElementById('Tournament-launch');
	const refreshButton = document.getElementById('refresh-trnmt');
	const divGuest = document.getElementById('guest-add');

	try {
		await fetchWithRefreshNoCash('tournament/me', {
			headers: {
				'X-CSRFToken': csrf,
			},
			credentials: 'include',
		})
			.then((response) => {
				if (!response.ok) throw new Error('https Error: ' + response.status);
				return response.json();
			})
			.then(async (data) => {
				// console.log("dat : ", data);
				if (data.Tournament != 'None') {
					let usernameJwt;
					let jwtInfo;
					let guestJwt;
					let userId;
					const trId = data.Tournament;

					// Check if the clicked element is an <a> tag
					await fetchWithRefreshNoCash('tournament/check-sse', {
						headers: {
							'X-CSRFToken': csrf,
						},
						credentials: 'include',
					})
						.then(async (response) => {
							if (!response.ok)
								throw new Error('https Error: ' + response.status);
							jwtInfo = await response.json();
							// console.log("inf : ", jwtInfo);
							usernameJwt = jwtInfo['key'];
							guestJwt = jwtInfo['guests'];
							userId = jwtInfo['userId'];
						})
						.then(async (data) => {
							// Put here !!!
							//    -> ID               = userId
							//    -> username         = usernameJwt
							//    -> tournament key   = data["key"]

							const url_sse = `tournament/events?tKey=${trId}&name=${usernameJwt}&guests=${guestJwt}`;
							SSEStream = getSSE();
							// console.log(SSEStream);
							if (SSEStream === undefined) {
								SSEStream = new EventSource(url_sse);
								setSSE(SSEStream);
							}
							SSEStream.onmessage = async function (event) {
								try {
									// console.log("ggg", event.data);
									const data = JSON.parse(event.data);
									console.log('eee :', data);
									// console.log("fff", data.t_state);
									if (data.t_state == 'game-start') {
										// LaunchGameIntournament(data)

										tournamentLeave.innerHTML = '';

										console.log(
											'------------------------------------------------------------------------------------------------->>>>>LLLL ',
											data
										);
										console.log('SSE 1');
										const buttonGame = document.createElement('button');
										console.log('SSE 2');
										buttonGame.className = 'btn btn-outline-primary';
										console.log('SSE 3');
										buttonGame.textContent = 'Launch game';
										console.log('SSE 4');
										buttonGame.dataset.type = data.mode;
										console.log('SSE 5');
										if (data.mode == 'local') {
											console.log('SSE 6');
											buttonGame.dataset.p1 = data.player1;
											console.log('SSE 7');
											buttonGame.dataset.p2 = data.player2;
										} else {
											buttonGame.dataset.player = data.player;
											buttonGame.dataset.playerId = data.playerId;
											console.log('done');
										}
										console.log('SSE 8');
										buttonGame.dataset.key = data.key;
										buttonGame.dataset.tkey = data.tkey;
										buttonGame.dataset.round = data.round;
										console.log('SSE 9');
										tournamentGame.innerHTML = '';
										console.log('SSE 10');
										tournamentGame.appendChild(buttonGame);
										console.log('SSE 11');
									} else if (data.t_state == 'game-finished') {
										await actualizeIndexPage(
											'contentTournementPage',
											routesTr['tournament']
										);
										// console.log("sse data: ", data.next)
										if (data.next == 'final-rounds') {
											await fetchWithRefreshNoCash('tournament/finals', {
												method: 'POST',
												headers: {
													'X-CSRFToken': csrf,
													'Content-Type': 'application/json',
												},
												credentials: 'include',
												body: JSON.stringify({ tKey: data.tkey }),
											});
										}
										//else if (data.next == "set-results") {
										//  SSEStream.close();
										//  fetchWithRefresh(`tournament/${data.tkey}/results/`, {
										//    credentials: 'include'
										//  })
										//}
										else {
											await fetchWithRefreshNoCash('tournament/next', {
												method: 'POST',
												headers: {
													'X-CSRFToken': csrf,
													'Content-Type': 'application/json',
												},
												credentials: 'include',
												body: JSON.stringify({ tKey: data.tkey }),
											}).then((response) => {
												if (!response.ok)
													throw new Error('https Error: ' + response.status);
												return response.json();
											});
											// .then(data => {
											//   console.log("NEXT : ", data)
											// })
										}
									}
									if (data.t_state == 'results') {
										afficheWinnerTournament(data);
										console.log('============================>>', data);
									} else if (data.t_state == 'Back-to-main') {
										console.log('detected BTM2');
										await fetch('tournament/guests', {
											credentials: 'include',
										});
										await actualizeIndexPage(
											'contentTournementPage',
											routesTr['tournament']
										);
									} else if (data.t_state == 'firsts-match-preview') {
										const message_1 = '⚠️ First matchs annoncement ⚠️';
										const message_2 = `Match 1 : ${data.match1.player1} VS ${data.match1.player2}`;
										const message_3 = `Match 2 : ${data.match2.player1} VS ${data.match2.player2}`;
										msgInfo.content = message_1;
										sendMessage(msgInfo);
										msgInfo.content = message_2;
										sendMessage(msgInfo);
										msgInfo.content = message_3;
										sendMessage(msgInfo);
										await affichUserTournament();
										await launchTournament(data);

										console.log('data firsts match : ', data);
									} else if (data.t_state == 'final-match-preview') {
										console.log('data final match : ', data);
										await affichUserTournament();
										await launchTournament(data);
										// SEND MESSAGE KELLY
										//    -> id       : data.tkey
										//    -> content  : "⚠️ Final matchs annoncement ⚠️
										//    -> content2 : `Match 1 : ${data.match1.player1 VS ${data.match1.player2}`
										//    -> content3 : `Match 1 : ${data.match2.player1 VS ${data.match2.player2}`
									} else if (data.t_state == 'Someone-joined-left') {
										console.log(
											'ccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
										);
										console.log('Someone joined left : ', data);
										await affichUserTournament();
										await launchTournament(data);
										listTournament();
									}
								} catch (error) {
									console.log('Error', error);
								}
							};

							leaveButton = document.createElement('button');
							leaveButton.id = trId;
							leaveButton.className = 'btn btn-outline-secondary';
							leaveButton.textContent = 'Leave';

							//launchButton = document.createElement("button");
							//launchButton.id = trId;
							//launchButton.className = "btn btn-outline-secondary";
							//launchButton.textContent = "Start";

							tournamentLeave.appendChild(leaveButton);
							//tournamentLaunch.appendChild(launchButton);

							await fetchWithRefreshNoCash('tournament/next', {
								method: 'POST',
								headers: {
									'X-CSRFToken': csrf,
									'Content-Type': 'application/json',
								},
								credentials: 'include',
								body: JSON.stringify({ tKey: trId }),
							}).then((response) => {
								if (!response.ok)
									throw new Error('https Error: ' + response.status);
								return response.json();
							});
							// .then(data => {
							//   console.log("NEXT : ", data)
							// });

							return invitsController();
						})
						.catch((error) => {
							console.log('Erreur de requête :', error);
						});
				} else {
					setPositionTournamentList('relative');
				}
			});
	} catch (error) {
		console.log('Error : ', error);
	}

	// console.log("csrf:", csrf);
	// console.log("HEY 1")

	ulDropdown.addEventListener('click', async (event) => {
		const target = event.target;
		let usernameJwt;
		let jwtInfo;
		let guestJwt;
		let userId;

		// console.log("entree")

		// Check if the clicked element is an <a> tag
		if (target.tagName === 'BUTTON') {
			event.preventDefault();
			const view = target.dataset.view;
			// console.log("aaaaa", view);
			const btnId = document.getElementById(view);

			try {
				await fetchWithRefreshNoCash('tournament/check-sse', {
					headers: {
						'X-CSRFToken': csrf,
					},
					credentials: 'include',
				}).then(async (response) => {
					if (!response.ok) throw new Error('https Error: ' + response.status);
					// console.log("response : ", response)
					jwtInfo = await response.json();
					// console.log("------------------------->>> ", jwtInfo);
					usernameJwt = jwtInfo['key'];
					guestJwt = jwtInfo['guests'];
					userId = jwtInfo['userId'];
				});
			} catch (error) {
				console.log('Error : ', error);
			}

			await fetchWithRefreshNoCash('tournament/tournament', {
				method: 'POST',
				headers: {
					'X-CSRFToken': csrf,
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify({ action: 'join', tKey: view }),
			})
				.then((response) => {
					// console.log("aaa1", response)
					btnId.style.backgroundColor = 'red';
					if (!response.ok) throw new Error('https Error: ' + response.status);
					return response.json();
				})
				.then(async (data) => {
					btnId.style.backgroundColor = 'green';

					await launchTournamentChat(data['key']);

					const url_sse = `tournament/events?tKey=${data['key']}&name=${usernameJwt}&guests=${guestJwt}`;
					SSEStream = new EventSource(url_sse);
					setSSE(SSEStream);
					SSEStream.onmessage = async function (event) {
						try {
							// console.log("iii", event.data);
							const data = JSON.parse(event.data);
							// console.log("jjj", data);
							// console.log("kkk", data.t_state);
							if (data.t_state == 'game-start') {
								// LaunchGameIntournament(data)
								tournamentLeave.innerHTML = '';

								console.log(
									'------------------------------------------------------------------------------------------------->>>>>LLLL ',
									data
								);

								console.log('SSE 1');
								const buttonGame = document.createElement('button');
								console.log('SSE 2');
								buttonGame.className = 'btn btn-outline-primary';
								console.log('SSE 3');
								buttonGame.textContent = 'Launch game';
								console.log('SSE 4');
								buttonGame.dataset.type = data.mode;
								console.log('SSE 5');
								if (data.mode == 'local') {
									console.log('SSE 6');
									buttonGame.dataset.p1 = data.player1;
									console.log('SSE 7');
									buttonGame.dataset.p2 = data.player2;
								} else {
									buttonGame.dataset.player = data.player;
									buttonGame.dataset.playerId = data.playerId;
									console.log('done');
								}
								console.log('SSE 8');
								buttonGame.dataset.round = data.round;
								buttonGame.dataset.key = data.key;
								buttonGame.dataset.tkey = data.tkey;
								console.log('SSE 9');
								tournamentGame.innerHTML = '';
								console.log('SSE 10');
								tournamentGame.appendChild(buttonGame);
								console.log('SSE 11');
							} else if (data.t_state == 'Back-to-main') {
								console.log('detected BTM1');
								await fetch('tournament/guests', {
									credentials: 'include',
								})
									.then((response) => {
										return response.json();
									})
									.then((data) => {
										console.log(data);
									});
								await actualizeIndexPage(
									'contentTournementPage',
									routesTr['tournament']
								);
							} else if (data.t_state == 'game-finished') {
								await actualizeIndexPage(
									'contentTournementPage',
									routesTr['tournament']
								);
								// console.log("sse data: ", data.next)
								if (data.next == 'final-rounds') {
									await fetchWithRefreshNoCash('tournament/finals', {
										method: 'POST',
										headers: {
											'X-CSRFToken': csrf,
											'Content-Type': 'application/json',
										},
										credentials: 'include',
										body: JSON.stringify({ tKey: data.tkey }),
									});
								} else {
									await fetchWithRefreshNoCash('tournament/match', {
										method: 'POST',
										headers: {
											'X-CSRFToken': csrf,
											'Content-Type': 'application/json',
										},
										credentials: 'include',
										body: JSON.stringify({ tKey: data.tkey }),
									});
								}
							}
							//if (data.t_state == "results") {
							//  afficheWinnerTournament(data)
							//  console.log("============================>>", data);
							//}
							if (data.t_state == 'firsts-match-preview') {
								const msgInfo = {
									content: null,
									group_id: null,
									sender_username: 'server',
									sender_id: data.tkey, // Utiliser l'ID du tournoi
								};

								await affichUserTournament();
								await launchTournament(data);

								console.log('trying to send message for the first match');
								const message_1 = '⚠️ First matchs annoncement ⚠️';
								const message_2 = `Match 1 : ${data.match1.player1} VS ${data.match1.player2}`;
								const message_3 = `Match 2 : ${data.match2.player1} VS ${data.match2.player2}`;
								msgInfo.content = message_1;
								sendMessage(msgInfo);
								msgInfo.content = message_2;
								sendMessage(msgInfo);
								msgInfo.content = message_3;
								sendMessage(msgInfo);

								console.log('data firsts match : ', data);
							} else if (data.t_state == 'final-match-preview') {
								console.log('data final match : ', data);
								const msgInfo = {
									content: null,
									group_id: null,
									sender_username: 'server',
									sender_id: data.tkey, // Utiliser l'ID du tournoi
								};
								console.log('trying to send message for the final match');
								const message_1 = '⚠️ Final match annoncement ⚠️';
								const message_2 = `Final : ${data.match1.player1} VS ${data.match1.player2}`;
								const message_3 = `Final Loser : ${data.match2.player1} VS ${data.match2.player2}`;
								msgInfo.content = message_1;
								sendMessage(msgInfo);
								msgInfo.content = message_2;
								sendMessage(msgInfo);
								msgInfo.content = message_3;
								sendMessage(msgInfo);
								await affichUserTournament();
								await launchTournament(data);
							} else if (data.t_state == 'Someone-joined-left') {
								console.log(
									'ddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd'
								);
								console.log('Someone joined left : ', data);
								await affichUserTournament();
								await launchTournament(data);
								listTournament();
							}
						} catch (error) {
							console.log('Error', error);
						}
					};

					leaveButton = document.createElement('button');
					leaveButton.id = view;
					leaveButton.className = 'btn btn-outline-secondary';
					leaveButton.textContent = 'Leave';

					//launchButton = document.createElement("button");
					//launchButton.id = view;
					//launchButton.className = "btn btn-outline-secondary";
					//launchButton.textContent = "Start";

					tournamentLeave.appendChild(leaveButton);
					//tournamentLaunch.appendChild(launchButton);
					refreshTournament();

					setPositionTournamentList('absolute');
					// affichUserTournament()

					return invitsController();
				})
				.catch((error) => {
					console.error('Erreur de requête :', error);
					throw error;
				});
		}
	});

	tournamentLeave.addEventListener('click', async (event) => {
		const target = event.target;

		if (target.tagName === 'BUTTON') {
			event.preventDefault();
			await fetchWithRefreshNoCash('tournament/tournament', {
				method: 'POST',
				headers: {
					'X-CSRFToken': csrf,
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify({ action: 'leave', tKey: target.id }),
			})
				.then((response) => {
					if (!response.ok) throw new Error('https Error: ' + response.status);
					return response.json();
				})
				.then((data) => {
					SSEStream.close();
					//tournamentInfo.innerHTML = "";
					//tournamentLaunch.innerHTML = ""
					tournamentLeave.innerHTML = '';
					divGuest.innerHTML = '';
					listTournament(csrf, ulElem);
					setPositionTournamentList('relative');
				})
				.catch((error) => {
					console.error('Erreur de requête :', error);
					throw error;
				});
		}
	});

	tournamentGame.addEventListener('click', async (event) => {
		const target = event.target;

		if (target.tagName === 'BUTTON') {
			event.preventDefault();

			const KeepInfo = document.getElementById('contentTournementPage');
			// const contentInfo = KeepInfo.innerHTML;

			if (target.dataset.type == 'local') {
				localStorage.setItem('p1', target.dataset.p1);
				localStorage.setItem('p2', target.dataset.p2);
				localStorage.setItem('key', target.dataset.key);
				localStorage.setItem('tkey', target.dataset.tkey);
				// console.log("Target.dataset", target.dataset);
				await fetchWithRefreshNoCash(
					`tournament/supervise?key=${target.dataset.key}&tkey=${target.dataset.tkey}&round=${target.dataset.round}`,
					{
						credentials: 'include',
					}
				).then((response) => {
					if (!response.ok) throw new Error('https Error: ' + response.status);
					return response.json();
				});
				// .then(data => {
				//   console.log(data);
				// })

				return actualizeIndexPage('contentTournementPage', routesTr['matchSp']);
			} else {
				let idJWT;
				try {
					const response = await fetchWithRefreshNoCash(
						'server-pong/check-sse',
						{
							headers: { 'X-CSRFToken': csrf },
							credentials: 'include',
						}
					);

					console.log('data', response.status);
					if (!response.ok) throw new Error('HTTP Error: ' + response.status);

					const data = await response.json();
					let username;
					let a;
					let b;
					let c;

					const guestArray = Array.isArray(data.guest) ? data.guest : [];
					[a, b, c] = guestArray;
					console.log(data);
					username = data.username || 'anonymous';

					console.log(target.dataset);
					console.log(username);

					if (target.dataset.player == username) {
						idJWT = -1;
					} else if (target.dataset.player == a) {
						idJWT = 0;
					} else if (target.dataset.player == b) {
						idJWT = 1;
					} else {
						idJWT = 2;
					}
				} catch (error) {
					console.error('Request error:', error);
					// Could set default values for a, b, c if needed
				}
				return actualizeIndexPage(
					'contentTournementPage',
					routesTr['matchOnline'](
						target.dataset.key,
						target.dataset.playerId,
						0,
						idJWT,
						target.dataset.tkey,
						target.dataset.round
					)
				);
			}
		}
	});
}

async function launchGame(data_game) {
	const KeepInfo = document.getElementById('contentTournementPage');
	// const contentInfo = KeepInfo.innerHTML;

	console.log('==========================');
	console.log(data_game);
	console.log('==========================');

	if (data_game.mode == 'local') {
		localStorage.setItem('p1', data_game.player1);
		localStorage.setItem('p2', data_game.player2);
		localStorage.setItem('key', data_game.key);
		localStorage.setItem('tkey', data_game.tkey);
		await fetchWithRefreshNoCash(
			`tournament/supervise?key=${data_game.key}&tkey=${data_game.tkey}&round=${data_game.round}`,
			{
				credentials: 'include',
			}
		).then((response) => {
			if (!response.ok) throw new Error('https Error: ' + response.status);
			return response.json();
		});
		// .then(data => {
		//   console.log(data);
		// })

		return actualizeIndexPage('contentTournementPage', routesTr['matchSp']);
	} else {
		let idJWT;
		try {
			const response = await fetchWithRefreshNoCash('server-pong/check-sse', {
				headers: { 'X-CSRFToken': csrf },
				credentials: 'include',
			});

			console.log('data', response.status);
			if (!response.ok) throw new Error('HTTP Error: ' + response.status);

			const data = await response.json();
			let username;
			let a;
			let b;
			let c;

			// Safely extract values with defaults
			const guestArray = Array.isArray(data.guest) ? data.guest : [];
			[a, b, c] = guestArray;
			console.log(data);
			username = data.username || 'anonymous';

			console.log('==========================');
			console.log(data);
			console.log(username);
			console.log('==========================');

			if (data_game.player == username) {
				idJWT = -1;
			} else if (data_game.player == a) {
				idJWT = 0;
			} else if (data_game.player == b) {
				idJWT = 1;
			} else {
				idJWT = 2;
			}
		} catch (error) {
			console.error('Request error:', error);
			// Could set default values for a, b, c if needed
		}
		return actualizeIndexPage(
			'contentTournementPage',
			routesTr['matchOnline'](
				data_game.key,
				data_game.playerId,
				0,
				idJWT,
				data_game.tkey,
				data_game.round
			)
		);
	}
}

//                      +-------------------+
//                      |  TOURNAMENT INFO  |
//                      +-------------------+
//                      |                   |
//                      |   MATCH PREVIEW   |
// +--------------------+                   +--------------------+
// |     Match 1        |   Firsts matchs   |       Match 2      |
// +--------------------+-------------------+--------------------+
// |      Player 1      |                   |      Player 1      |
// |  Bob               |                   |  Bob               |
// +--------------------+                   +--------------------+
// |      Player 2      |                   |      Player 2      |
// |  Bob2              |                   |  Bob2              |
// +--------------------+                   +--------------------+
// |  ${format_name(data.match1.player1)}|                   |  ${format_name(data.match1.player2)}|
