import { versusController } from '../versusGame.js';
import { homeController } from '../home.js';
import { loginController } from '../login.js';
import { getCookie, fetchWithRefresh } from '../../utils.js';
import {
	checkwin,
	guideTouch,
	drawCenterTextP,
	localGameController,
} from '../localGame.js';
import { drawCenterText, multiplayerController } from '../multiplayer.js';


// Global variables for multiplayer game management
let multiplayerGameInterval = null;
let multiplayerKeydownHandler = null;
let multiplayerSSEConnection = null;
let multiplayerGameStarted = false;
let multiplayerGameEnded = false;
let currentMultiplayerApiKey = null;
let currentMultiplayerPostUrl = null;

export let sseTournament;
export let adress = '10.18.161';
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
	game: {
		template: 'localGame',
		controller: localGameController,
	},
	multiplayerGame: {
		template: 'localGame',
		controller: multiplayerController,
	},
	invit: {
		template: 'login',
		controller: loginController,
	},
};

let keySp;
export function setPlayersLocalName(apikey) {
	keySp = apikey;
}

export function getPlayersLocalName() {
	return keySp;
}

export function setCanvasAndContext() {
	canvas = document.getElementById('gameCanvas');
	ctx = canvas.getContext('2d');
	ctx.font = '20px Arial';
	ctx.fillStyle = 'blue';
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
	ctx.fillStyle = 'white';
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
	ctx.fillStyle = 'white';
	roundRect(
		ctx,
		Racket1Pos[0][0] + offsetX,
		Racket1Pos[0][1] + offsetY,
		4,
		d1,
		3
	);

	const dx2 = Racket2Pos[1][0] - Racket2Pos[0][0];
	const dy2 = Racket2Pos[1][1] - Racket2Pos[0][1];
	const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
	ctx.fillStyle = 'white';
	roundRect(
		ctx,
		Racket2Pos[0][0] + offsetX,
		Racket2Pos[0][1] + offsetY,
		4,
		d2,
		3
	);

	let ballX = Math.min(Math.max(ballPos[0], 10), fieldWidth - 10);
	let ballY = Math.min(Math.max(ballPos[1], 10), fieldHeight - 10);

	fillCircle(ctx, ballX + offsetX, ballY + offsetY, 10);
}

export function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
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
	
	// Variables pour vérifier la connexion des joueurs
	let bothPlayersConnected = false;
	let playersConnectedCount = 0;

	let game_stats;
	let a, b, c, username;
	const csrf = getCookie('csrftoken');

	// Clear canvas
	if (ctx) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}

	// Show initial game state
	if (playerID === 2) {
		drawCenterText('Connecting to game...');
		guideTouch();
	} else {
		drawCenterText('Connecting to game...');
		guideTouch();
	}

	// Load game state UI
	try {
		let mul = await fetch('./templates/localGame.html');
		let mulTxt = await mul.text();
		let gameState = document.getElementById('idfooterCanvas');
		if (gameState) {
			gameState.innerHTML = mulTxt;
		}
	} catch (error) {
		console.error('Error loading game UI:', error);
	}

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

			game_stats = data['game_stats'];

			// Debug: Afficher les données reçues pour identifier la structure
			console.log('SSE data received:', data);
			console.log('Game stats:', game_stats);

			// Vérifier si la partie est terminée
			if (game_stats['State'] === 'Game Over' || game_stats['State'] === 'GameOver' || 
				game_stats['State'] === 'Finished' || game_stats['gameEnded'] === true) {
				console.log('Game ended, cleaning up multiplayer game...');
				multiplayerGameEnded = true;
				
				// Afficher le message de fin de partie
				if (game_stats['winner']) {
					drawCenterText(`Game Over! Winner: ${game_stats['winner']}`);
				} else {
					drawCenterText('Game Over!');
				}
				
				// Nettoyer la connexion après un délai pour laisser le temps de voir le résultat
				setTimeout(() => {
					cleanupMultiplayerGame();
					// Rediriger vers la page multiplayer après le nettoyage
					window.location.hash = '#multiplayer';
				}, 3000);
				
				return;
			}

			// Vérification du nombre de joueurs connectés - essayer différentes propriétés possibles
			if (game_stats['playersConnected'] !== undefined) {
				playersConnectedCount = game_stats['playersConnected'];
				bothPlayersConnected = playersConnectedCount >= 2;
			} else if (game_stats['player1'] && game_stats['player2']) {
				// Si les données des deux joueurs sont présentes, considérer qu'ils sont connectés
				bothPlayersConnected = true;
				playersConnectedCount = 2;
			} else {
				// Par défaut, considérer que les joueurs sont connectés si on reçoit des données de jeu
				bothPlayersConnected = true;
				playersConnectedCount = 2;
				console.log('Assuming both players connected - no playersConnected field found');
			}
			
			if (!bothPlayersConnected) {
				drawCenterText(`waiting for players... (${playersConnectedCount}/2 connected)`);
				return; // Ne pas traiter le reste si tous les joueurs ne sont pas connectés
			}

			// Afficher un message quand les deux joueurs sont connectés
			if (bothPlayersConnected && game_stats['State'] === 'Waiting for start') {
				if (playerID === 1) {
					drawCenterText("Players are connected. Press 'P' to start");
				} else {
					drawCenterText('Players are connected ! Waiting for 1st player to start the game...');
				}
				guideTouch();
			}

			if (game_stats['State'] !== 'Waiting for start' && bothPlayersConnected) {
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
		
		// Si la partie est terminée, ne pas essayer de reconnecter
		if (multiplayerGameEnded) {
			console.log('Game ended, not reconnecting SSE');
			cleanupMultiplayerGame();
			return;
		}
		
		if (SSEStream.readyState === EventSource.CLOSED) {
			console.log('Multiplayer SSE connection was closed');
			multiplayerSSEConnection = null;
			window.currentGameSSE = null;
			
			// Si on a eu trop d'erreurs de reconnexion, arrêter
			if (!window.sseReconnectCount) {
				window.sseReconnectCount = 0;
			}
			window.sseReconnectCount++;
			
			if (window.sseReconnectCount > 5) {
				console.warn('Too many SSE reconnection attempts, stopping');
				drawCenterText('Connection lost. Please refresh the page.');
				cleanupMultiplayerGame();
				return;
			}
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
					// Vérification simplifiée - si on reçoit des données SSE, les joueurs sont connectés
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
					} else if (playerID !== 1) {
						drawCenterText('Only player 1 can start the game');
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
					// Permettre les mouvements dès que la connexion SSE est établie
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
					// Permettre les mouvements dès que la connexion SSE est établie
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
		body: JSON.stringify({ apiKey: apikey }),
	})
		.then((response) => {
			if (!response.ok) throw new Error('https Error: ' + response.status);
			return response.json();
		})
		.then((data) => {
			console.log('Données reçues loadPlayable:', data['playable']);
			isPlayable = data['playable'];
		})
		.catch((error) => {
			console.error('Erreur de requête :', error);
		});
	// console.log("isPlayable :", isPlayable);
	return isPlayable;
}

export async function setApiKeyWeb(apikey) {
	console.log('apikey Set : ', apikey);
	const csrf = getCookie('csrftoken');
	return await fetchWithRefresh(`server-pong/api-key`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': csrf,
		},
		credentials: 'include',
		body: JSON.stringify({ apiKey: apikey }),
	})
		.then((response) => {
			if (!response.ok) throw new Error('https Error: ' + response.status);
			return response.json();
		})
		.then((data) => {
			console.log('Données reçues SetKey:', data['playable']);
			return data['playable'];
		})
		.catch((error) => {
			console.error('Erreur de requête :', error);
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
		body: JSON.stringify({ apiKey: apikey }),
	})
		.then((response) => {
			if (!response.ok) throw new Error('https Error: ' + response.status);
			return response.json();
		})
		.then((data) => {
			// console.log("Données reçues SetKey:", data["playable"]);
			return data['playable'];
		})
		.catch((error) => {
			console.error('Erreur de requête :', error);
			throw error;
		});
}

// Cleanup function for multiplayer games (similar to cleanupLocalGame)
export function cleanupMultiplayerGame() {
	console.log('cleanupMultiplayerGame() called');

	// Reset game state
	multiplayerGameStarted = false;
	multiplayerGameEnded = false;
	currentMultiplayerApiKey = null;
	currentMultiplayerPostUrl = null;

	// Reset SSE reconnection counter
	if (window.sseReconnectCount) {
		window.sseReconnectCount = 0;
	}

	// Close SSE connection
	if (
		multiplayerSSEConnection &&
		multiplayerSSEConnection.readyState !== EventSource.CLOSED
	) {
		multiplayerSSEConnection.close();
		multiplayerSSEConnection = null;
		console.log('Multiplayer SSE connection closed');
	}

	// Also clean up the global window SSE if it exists
	if (
		window.currentGameSSE &&
		window.currentGameSSE.readyState !== EventSource.CLOSED
	) {
		window.currentGameSSE.close();
		window.currentGameSSE = null;
		console.log('Global game SSE connection closed');
	}

	if (multiplayerGameInterval) {
		clearInterval(multiplayerGameInterval);
		multiplayerGameInterval = null;
		console.log('Multiplayer game interval cleared');
	}

	// Remove key event listeners
	if (multiplayerKeydownHandler) {
		document.removeEventListener('keydown', multiplayerKeydownHandler);
		multiplayerKeydownHandler = null;
		console.log('Multiplayer keydown listener removed');
	}

	// Remove event listeners to prevent memory leaks
	window.removeEventListener('beforeunload', cleanupMultiplayerGame);
	window.removeEventListener('hashchange', cleanupMultiplayerGame);
}
