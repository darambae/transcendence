import { versusController } from "../versusGame.js";
import { homeController } from "../home.js";
import { localGameController } from "../localGame.js";
import { loginController } from "../login.js";
import { getCookie, fetchWithRefresh } from "../../utils.js";
import { guideTouch, drawCenterTextP, checkwin } from "../localGame.js";
import { drawCenterText } from "../multiplayer.js"

let sseTournament;
export let adress = "10.18.161"
let canvas;
let ctx;

export function setSSE(sseObj) {
  sseTournament = sseObj;
}

export function getSSE() {
  return sseTournament;
}

export const routesSp = {
	home: {
		template: 'home',
		controller: homeController,
	},
  playerSelection: {
    template: 'versusGame',
    controller: versusController,
  },
  game : {
    template: 'localGame',
    controller: localGameController,
  },
  multiplayerGame : {
    template: 'localGame',
  },
  invit : {
    template : 'login',
    controller: loginController,
  }
  };

let keySp;
export function setPlayersLocalName(apikey) {
  keySp = apikey;
};

export function getPlayersLocalName() {
  return (keySp)
}

export function setCanvasAndContext() {

  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");
  ctx.font = "20px Arial";
	ctx.fillStyle = "blue";
}


function updateServerPosition(newX, newY) {
  currentPos.x = targetPos.x;
  currentPos.y = targetPos.y;
  targetPos.x = newX;
  targetPos.y = newY;
  lastUpdateTime = performance.now();
}

function roundRect(ctx, x, y, width, height, radius) {
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

function fillCircle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = "white";
  ctx.fill();
  ctx.closePath();
}


export function drawMap(ballPos, Racket1Pos, Racket2Pos) {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  
  const fieldWidth = 1000;
  const fieldHeight = 600;
  const offsetX = (canvas.width - fieldWidth) / 2;
  const offsetY = (canvas.height - fieldHeight) / 2;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const dx1 = Racket1Pos[1][0] - Racket1Pos[0][0];
  const dy1 = Racket1Pos[1][1] - Racket1Pos[0][1];
  const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  ctx.fillStyle = "white";
  roundRect(ctx, Racket1Pos[0][0] + offsetX, Racket1Pos[0][1] + offsetY, 4, d1, 3);
  
  const dx2 = Racket2Pos[1][0] - Racket2Pos[0][0];
  const dy2 = Racket2Pos[1][1] - Racket2Pos[0][1];
  const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
  ctx.fillStyle = "white";
  roundRect(ctx, Racket2Pos[0][0] + offsetX, Racket2Pos[0][1] + offsetY, 4, d2, 3);

  let ballX = Math.min(Math.max(ballPos[0], 10), fieldWidth - 10);
  let ballY = Math.min(Math.max(ballPos[1], 10), fieldHeight - 10);

  fillCircle(ctx, ballX + offsetX, ballY + offsetY, 10);
}


export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function handleGame2Players(key, playerID, isAiGame, JWTid) {
	console.log('Starting handleGame2Players with:', {
		key,
		playerID,
		isAiGame,
		JWTid,
	});

	// Store multiplayer game globals (similar to localGame.js)
	currentMultiplayerApiKey = key;
	currentMultiplayerPostUrl = `server-pong/send-message`;
	multiplayerGameStarted = false;
	multiplayerGameEnded = false;

	let game_stats;
	let a, b, c, username;
	const csrf = getCookie('csrftoken');

	// Clear canvas
	if (ctx) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}

	// Show initial game state
	if (playerID === 2) {
		drawCenterText('waiting for the player to start the match');
		guideTouch();
	} else {
		guideTouch();
		drawCenterTextP();
	}

	// Load game state UI
	// try {
	// 	let mul = await fetch('./templates/localGame.html');
	// 	let mulTxt = await mul.text();
	// 	let gameState = document.getElementById('idfooterCanvas');
	// 	if (gameState) {
	// 		gameState.innerHTML = mulTxt;
	// 	}
	// } catch (error) {
	// 	console.error('Error loading game UI:', error);
	// }

	// Get player info (with error handling like localGame.js)
	try {
		const response = await fetchWithRefresh(`server-pong/check-sse`, {
			headers: { 'X-CSRFToken': csrf },
			credentials: 'include',
		});

		if (!response.ok) throw new Error('HTTP Error: ' + response.status);

		const data = await response.json();
		console.log('Player data:', data);

		// Safely extract values with defaults
		const guestArray = Array.isArray(data.guest) ? data.guest : [];
		[a, b, c] = guestArray;
		username = data.username || 'anonymous';
	} catch (error) {
		console.error('Error fetching player info:', error);
		// Set default values to prevent undefined issues
		username = 'anonymous';
	}

	// Build SSE URL
	let url_sse = `server-pong/events?apikey=${key}&idplayer=${playerID}&ai=${isAiGame}&JWTid=${JWTid}&username=${username}`;
	if (a !== undefined) url_sse += `&guest1=${a}`;
	if (b !== undefined) url_sse += `&guest2=${b}`;
	if (c !== undefined) url_sse += `&guest3=${c}`;

	console.log('Multiplayer SSE URL:', url_sse);

	// Close any existing SSE connection before creating a new one (like localGame.js)
	if (
		multiplayerSSEConnection &&
		multiplayerSSEConnection.readyState !== EventSource.CLOSED
	) {
		multiplayerSSEConnection.close();
		console.log('Closed existing multiplayer SSE connection');
	}

	// Also clean up global SSE if it exists
	if (
		window.currentGameSSE &&
		window.currentGameSSE.readyState !== EventSource.CLOSED
	) {
		window.currentGameSSE.close();
		console.log('Closed existing global SSE connection');
	}

	// Common SSE message handler function (like localGame.js)
	const handleMultiplayerSSEMessage = (event) => {
		try {
			const data = JSON.parse(event.data);
			let sc1 = document.getElementById('player1score');
			let sc2 = document.getElementById('player2score');

			console.log('Multiplayer SSE data:', data);
			game_stats = data['game_stats'];

			if (game_stats['State'] !== 'Waiting for start') {
				if (!multiplayerGameStarted) {
					multiplayerGameStarted = true;
					console.log('Multiplayer game started');
				}
				if (game_stats['State'] !== 'playersInfo') {
					drawMap(
						game_stats['ball']['position'],
						game_stats['player1'],
						game_stats['player2']
					);
					if (sc1) sc1.setAttribute('data-score', game_stats['team1Score']);
					if (sc2) sc2.setAttribute('data-score', game_stats['team2Score']);
					checkwin();
				} else {
					let p1 = document.getElementById('player1Username');
					let p2 = document.getElementById('player2Username');
					if (p1 && game_stats['p1'] && game_stats['p1'][0]) {
						p1.innerHTML = game_stats['p1'][0];
					}
					if (p2 && game_stats['p2'] && game_stats['p2'][0]) {
						p2.innerHTML = game_stats['p2'][0];
					}
				}
			}
		} catch (error) {
			// Ignore parse errors silently like localGame.js
		}
	};

	// Create new SSE connection
	const SSEStream = new EventSource(url_sse);
	multiplayerSSEConnection = SSEStream;
	window.currentGameSSE = SSEStream; // Also store globally for compatibility

	SSEStream.onmessage = handleMultiplayerSSEMessage;

	// Add error handling for SSE connection (like localGame.js)
	SSEStream.onerror = function (error) {
		console.error('Multiplayer SSE connection error:', error);
		if (SSEStream.readyState === EventSource.CLOSED) {
			console.log('Multiplayer SSE connection was closed');
			multiplayerSSEConnection = null;
			window.currentGameSSE = null;
		} else if (SSEStream.readyState === EventSource.CONNECTING) {
			console.warn('Multiplayer SSE reconnecting...');
		} else {
			console.warn('Unknown multiplayer SSE state:', SSEStream.readyState);
		}
	};

	// Add close handler
	SSEStream.addEventListener('close', function () {
		console.log('Multiplayer SSE connection closed by server');
		multiplayerSSEConnection = null;
		window.currentGameSSE = null;
	});

	// Clean up any existing event listeners before adding new ones (like localGame.js)
	if (multiplayerKeydownHandler) {
		document.removeEventListener('keydown', multiplayerKeydownHandler);
	}

	// Create and store reference to event handler
	multiplayerKeydownHandler = (event) => {
		const keysToPrevent = ['ArrowUp', 'ArrowDown', 'p', 'q'];
		if (keysToPrevent.includes(event.key)) {
			console.log('Multiplayer keydown handler activated for key:', event.key);
			event.preventDefault();

			switch (event.key) {
				case 'p':
					if (playerID === 1 && !multiplayerGameStarted) {
						multiplayerGameStarted = true;
						console.log('Starting multiplayer game with P key');
						fetch(currentMultiplayerPostUrl, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								'X-CSRFToken': csrf,
							},
							credentials: 'include',
							body: JSON.stringify({
								apiKey: key,
								message: '{"action": "start"}',
							}),
						}).catch((error) => {
							console.error('Error starting multiplayer game:', error);
							multiplayerGameStarted = false;
						});
					}
					break;
				case 'q':
					if (multiplayerGameStarted) {
						console.log('Player forfeit in multiplayer game');
						fetch(
							`server-pong/forfait-game?apikey=${key}&idplayer=${playerID}`,
							{
								headers: { 'X-CSRFToken': csrf },
								credentials: 'include',
							}
						).catch((error) => {
							console.error('Error forfeiting multiplayer game:', error);
						});
					}
					break;
				case 'ArrowUp':
					if (playerID === 1) {
						fetch(currentMultiplayerPostUrl, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								'X-CSRFToken': csrf,
							},
							credentials: 'include',
							body: JSON.stringify({
								apiKey: key,
								message: '{"action": "move", "player1": "up"}',
								player: '1',
							}),
						});
					} else {
						fetch(currentMultiplayerPostUrl, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								'X-CSRFToken': csrf,
							},
							credentials: 'include',
							body: JSON.stringify({
								apiKey: key,
								message: '{"action": "move", "player2": "up"}',
								player: '2',
							}),
						});
					}
					break;
				case 'ArrowDown':
					if (playerID === 1) {
						fetch(currentMultiplayerPostUrl, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								'X-CSRFToken': csrf,
							},
							credentials: 'include',
							body: JSON.stringify({
								apiKey: key,
								message: '{"action": "move", "player1": "down"}',
								player: '1',
							}),
						});
					} else {
						fetch(currentMultiplayerPostUrl, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								'X-CSRFToken': csrf,
							},
							credentials: 'include',
							body: JSON.stringify({
								apiKey: key,
								message: '{"action": "move", "player2": "down"}',
								player: '2',
							}),
						});
					}
					break;
			}
		}
	};

	// Add event listener
	document.addEventListener('keydown', multiplayerKeydownHandler);

	// Add cleanup listeners for page unload/refresh (like localGame.js)
	window.addEventListener('beforeunload', cleanupMultiplayerGame);
	window.addEventListener('hashchange', cleanupMultiplayerGame);

	console.log('Multiplayer game setup complete');
}


export async function loadGamePlayable(apikey) {
  let isPlayable;
  const csrf = getCookie('csrftoken');

    await fetchWithRefresh(`server-pong/game-status?apikey=${apikey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrf,
        },
        credentials: 'include',
        body: JSON.stringify({"apiKey": apikey})
      })
      .then(response => {
          if (!response.ok) throw new Error("https Error: " + response.status);
          return response.json();
        })
        .then(data => {
          console.log("Données reçues loadPlayable:", data["playable"]);
          isPlayable =  data["playable"]
        })
        .catch(error => {
          console.error("Erreur de requête :", error);
        })
    // console.log("isPlayable :", isPlayable);
    return isPlayable;
}

export async function setApiKeyWeb(apikey) {
  console.log("apikey Set : ", apikey);
  const csrf = getCookie('csrftoken');
  return await fetchWithRefresh(`server-pong/api-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrf,
    },
    credentials: 'include',
    body: JSON.stringify({ "apiKey": apikey })
  })
  .then(response => {
    if (!response.ok) throw new Error("https Error: " + response.status);
    return response.json();
  })
  .then(data => {
    console.log("Données reçues SetKey:", data["playable"]);
    return data["playable"];
  })
  .catch(error => {
    console.error("Erreur de requête :", error);
    throw error;
  });
}

export async function setApiKeyWebSP(apikey) {
  // console.log("apikey Set : ", apikey);
  const csrf = getCookie('csrftoken');
  return fetchWithRefresh(`server-pong/api-key-alone`, {
    method: 'POST',
    headers: {
      'X-CSRFToken': csrf,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ "apiKey": apikey })
  })
  .then(response => {
    if (!response.ok) throw new Error("https Error: " + response.status);
    return response.json();
  })
  .then(data => {
    // console.log("Données reçues SetKey:", data["playable"]);
    return data["playable"];
  })
  .catch(error => {
    console.error("Erreur de requête :", error);
    throw error;
  });
}
