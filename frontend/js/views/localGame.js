import { fetchWithRefresh, getCookie } from '../utils.js';
import {
	getPlayersLocalName,
	setPlayersLocalName,
	setApiKeyWebSP,
} from './gameApi.js';
import { drawMap } from './gameCanvas.js';
import { drawCenterText } from './multiplayer.js';

// Global variables to track the game interval, event handlers, SSE connection, and game state
let gameInterval = null;
let keydownHandler = null;
let keyupHandler = null;
let sseConnection = null;
let replayHandler = null;
let gameStarted = false;
let currentApiKey = null;
let currentPostUrl = null;
let gameEnded = false;

function drawRoundedRect(x, y, width, height, radius) {
	const canvas = document.getElementById('gameCanvas');
	const ctx = canvas.getContext('2d');
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
	const canvas = document.getElementById('gameCanvas');
	const ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	const x = canvas.width / 2;
	const y = canvas.height / 2;

	ctx.fillStyle = '#ffffff';
	ctx.strokeStyle = '#ffffff';
	ctx.lineWidth = 3;
	drawRoundedRect(x - 100 / 2, y - 100 / 2, 100, 100, 16);

	ctx.fillStyle = '#000000';
	ctx.font = 'bold 48px Arial';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText('P', x, y);

	ctx.font = '16px Arial';
	ctx.fillText('keyboard', x, y + 32);

	ctx.fillStyle = 'white';
	ctx.font = '20px Arial';
}

export function guideTouch() {
	const idEEndD = document.getElementById('idEEndD');
	const idUpendDown = document.getElementById('idUpendDown');
	const wallUp = document.getElementById('wallUp');
	const wallDown = document.getElementById('wallDown');
	const verticalStadeUp = document.getElementById('verticalStadeUp');
	const roundStade = document.getElementById('roundStade');
	const verticalStadeDown = document.getElementById('verticalStadeDown');
	const roundStadePongCenter = document.getElementById('roundStadePongCenter');
	const SinglePlayerGameInfo1 = document.getElementById(
		'SinglePlayerGameInfo1'
	);
	const SinglePlayerGameInfo2 = document.getElementById(
		'SinglePlayerGameInfo2'
	);
	const dataScore = document.getElementById('data-score');

	if (idEEndD) {
		idEEndD.style.display = 'block';
	}
	if (idUpendDown) {
		idUpendDown.style.display = 'block';
	}
	if (wallUp) {
		wallUp.style.display = 'block';
	}
	if (wallDown) {
		wallDown.style.display = 'block';
	}
	if (verticalStadeUp) {
		verticalStadeUp.style.display = 'block';
	}
	if (roundStade) {
		roundStade.style.display = 'block';
	}
	if (verticalStadeDown) {
		verticalStadeDown.style.display = 'block';
	}
	if (roundStadePongCenter) {
		roundStadePongCenter.style.display = 'block';
	}
	if (SinglePlayerGameInfo1) {
		SinglePlayerGameInfo1.style.display = 'flex';
	}
	if (SinglePlayerGameInfo2) {
		SinglePlayerGameInfo2.style.display = 'flex';
	}
	if (dataScore) {
		dataScore.style.display = 'block';
	}
}

export function checkwin() {
	// If game has already ended, don't check again
	if (gameEnded) {
		return;
	}

	const player1Score = document.getElementById('player1score');
	const player2Score = document.getElementById('player2score');
	const player1Name = document.getElementById('player1Username');
	const player2Name = document.getElementById('player2Username');
	const replaySinglePlayer = document.getElementById('replaySinglePlayer');

	// Add null checks to prevent errors when navigating away from page
	if (
		!player1Score ||
		!player2Score ||
		!player1Name ||
		!player2Name ||
		!replaySinglePlayer
	) {
		return; // Exit early if any required elements don't exist
	}

	if (player2Score.getAttribute('data-score') == 5) {
		gameEnded = true; // Mark game as ended
		console.log('Game ended - Player 2 wins');
		player1Score.style.setProperty('--score-color', 'red');
		player1Name.style.color = 'red';
		player2Score.style.setProperty('--score-color', 'green');
		player2Name.style.color = 'green';
		replaySinglePlayer.style.display = 'block';
	} else if (player1Score.getAttribute('data-score') == 5) {
		gameEnded = true; // Mark game as ended
		console.log('Game ended - Player 1 wins');
		player2Score.style.setProperty('--score-color', 'red');
		player2Name.style.color = 'red';
		player1Score.style.setProperty('--score-color', 'green');
		player1Name.style.color = 'green';
		replaySinglePlayer.style.display = 'block';
	}
}

export async function localGameController() {
	guideTouch();
	drawCenterTextP();

	let key_game = getPlayersLocalName();
	currentApiKey = key_game; // Store globally
	currentPostUrl = `/server-pong/send-message`; // Store globally

	gameStarted = false; // Reset global game state
	gameEnded = false; // Reset game ended state
	let game_stats;
	const csrf = getCookie('csrftoken');
	let username;
	let a;
	let b;
	let c;

	document.addEventListener('keydown', keydownHandler);
	document.addEventListener('keyup', keyupHandler);

	// ctx.clearRect(0, 0, canvas.width, canvas.height);

	let score1 = document.getElementById('player1score');
	let score2 = document.getElementById('player2score');
	try {
		const response = await fetchWithRefresh('/server-pong/check-sse', {
			headers: { 'X-CSRFToken': csrf },
			credentials: 'include',
		});

		if (!response.ok) throw new Error('HTTP Error: ' + response.status);

		const data = await response.json();
		console.log('data', data);

		// Safely extract values with defaults
		const guestArray = Array.isArray(data.guest) ? data.guest : [];
		[a, b, c] = guestArray;
		username = data.username || 'anonymous';
	} catch (error) {
		console.error('Request error:', error);
		// Set default values to prevent undefined issues
		username = 'anonymous';
		// Could set default values for a, b, c if needed
	}
	console.log('results: ', username, a, b, c);
	let url_sse = `/server-pong/events?apikey=${key_game}&idplayer=0&ai=0&JWTidP1=-1&JWTidP2=0&username=${username}`;
	if (a !== undefined) {
		url_sse += `&guest1=${a}`;
	}
	if (b !== undefined) {
		url_sse += `&guest2=${b}`;
	}
	if (c !== undefined) {
		url_sse += `&guest3=${c}`;
	}

	console.log('url_sse ->->-> ', url_sse);

	// Close any existing SSE connection before creating a new one
	if (sseConnection && sseConnection.readyState !== EventSource.CLOSED) {
		sseConnection.close();
		console.log('Closed existing SSE connection');
	}

	// Common SSE message handler function
	const handleSSEMessage = (event) => {
		try {
			const data = JSON.parse(event.data);
			let sc1 = document.getElementById('player1score');
			let sc2 = document.getElementById('player2score');

			//console.log(data);
			game_stats = data['game_stats'];
			if (game_stats['State'] != 'Waiting for start') {
				if (gameStarted == false) {
					gameStarted = true;
				}
				if (game_stats['State'] != 'playersInfo') {
					drawMap(
						game_stats['ball']['position'],
						game_stats['player1'],
						game_stats['player2']
					);
					sc1.setAttribute('data-score', game_stats['team1Score']);
					sc2.setAttribute('data-score', game_stats['team2Score']);
				} else {
					let p1 = document.getElementById('player1Username');
					let p2 = document.getElementById('player2Username');

					p1.innerHTML = game_stats['p1'][0];
					p2.innerHTML = game_stats['p2'][0];
				}
			}
		} catch (error) {
			// console.log("ParsingError: ", error)
		}
	};

	const SSEStream = new EventSource(url_sse);
	sseConnection = SSEStream; // Store reference for cleanup
	SSEStream.onmessage = handleSSEMessage;

	// Add error handling for SSE connection
	SSEStream.onerror = function (error) {
		console.error('SSE connection error:', error);
		if (SSEStream.readyState === EventSource.CLOSED) {
			console.log('SSE connection was closed');
			sseConnection = null;
		}
	};

	// Add close handler
	SSEStream.addEventListener('close', function () {
		console.log('SSE connection closed by server');
		sseConnection = null;
	});

	window.onbeforeunload = function (event) {
		// console.log("Détection du rechargement ou fermeture de la page");
		if (sseConnection && sseConnection.readyState !== EventSource.CLOSED) {
			console.log('SSE connection will be closed on page unload');
			sseConnection.close();
		}
	};

	const keysPressed = new Set();
	const intervalDelay = 33;
	let lastSent = 0;

	// Clean up any existing event listeners before adding new ones
	if (keydownHandler) {
		document.removeEventListener('keydown', keydownHandler);
	}
	if (keyupHandler) {
		document.removeEventListener('keyup', keyupHandler);
	}

	// Create and store references to event handlers
	keydownHandler = (event) => {
		const key = event.key;
		const keysToPrevent = ['ArrowUp', 'ArrowDown', 'e', 'd', 'l', 'p', 'q'];
		if (keysToPrevent.includes(key)) {
			//console.log('Local game keydown handler activated for key:', key);
			event.preventDefault();
			keysPressed.add(key);
		}
	};

	keyupHandler = (event) => {
		const key = event.key;
		const keysToPrevent = ['ArrowUp', 'ArrowDown', 'e', 'd', 'l', 'p', 'q'];
		if (keysToPrevent.includes(key)) {
			//console.log('Local game keyup handler activated for key:', key);
		}
		keysPressed.delete(event.key);
	};

	// Add event listeners
	document.addEventListener('keydown', keydownHandler);
	document.addEventListener('keyup', keyupHandler);

	// Add replay button functionality
	const replayButton = document.getElementById('replaySinglePlayer');
	if (replayButton) {
		// Remove any existing replay handler
		if (replayHandler) {
			replayButton.removeEventListener('click', replayHandler);
		}

		replayHandler = async () => {
			console.log('Replay button clicked - restarting game');

			// Reset game state
			gameStarted = false;
			gameEnded = false; // Reset game ended state

			// Reset scores
			const player1Score = document.getElementById('player1score');
			const player2Score = document.getElementById('player2score');
			const player1Name = document.getElementById('player1Username');
			const player2Name = document.getElementById('player2Username');

			if (player1Score && player2Score && player1Name && player2Name) {
				// Reset scores to 0
				player1Score.setAttribute('data-score', '0');
				player2Score.setAttribute('data-score', '0');

				// Reset colors to default
				player1Score.style.removeProperty('--score-color');
				player2Score.style.removeProperty('--score-color');
				player1Name.style.color = '';
				player2Name.style.color = '';
			}

			// Hide the replay button
			replayButton.style.display = 'none';

			// Clear and redraw the canvas
			drawCenterTextP();

			// Close existing SSE connection
			if (sseConnection && sseConnection.readyState !== EventSource.CLOSED) {
				sseConnection.close();
				sseConnection = null;
				console.log('Closed SSE connection for replay');
			}

			// Generate a new API key for the new game
			try {
				// First, get a new API key from the backend
				const response = await fetchWithRefresh('/server-pong/api-key', {
					headers: { 'X-CSRFToken': csrf },
					credentials: 'include',
				});

				if (!response.ok) throw new Error('Failed to get new API key');
				const data = await response.json();
				const newApiKey = data.api_key;

				// Register the new API key with the backend for single player
				await setApiKeyWebSP(newApiKey);

				// Set the new API key in our global state
				setPlayersLocalName(newApiKey);
				currentApiKey = newApiKey;
				console.log(
					'Generated and registered new API key for replay:',
					newApiKey
				);

				// Create new SSE connection with the new API key
				let url_sse = `/server-pong/events?apikey=${newApiKey}&idplayer=0&ai=0&JWTidP1=-1&JWTidP2=0&username=${username}`;
				if (a !== undefined) {
					url_sse += `&guest1=${a}`;
				}
				if (b !== undefined) {
					url_sse += `&guest2=${b}`;
				}
				if (c !== undefined) {
					url_sse += `&guest3=${c}`;
				}

				console.log('Creating new SSE connection for replay:', url_sse);
				const newSSEStream = new EventSource(url_sse);
				sseConnection = newSSEStream;

				// Set up the same event handlers as before
				newSSEStream.onmessage = handleSSEMessage;

				newSSEStream.onerror = function (error) {
					console.error('SSE connection error:', error);
					if (newSSEStream.readyState === EventSource.CLOSED) {
						console.log('SSE connection was closed');
						sseConnection = null;
					}
				};

				newSSEStream.addEventListener('close', function () {
					console.log('SSE connection closed by server');
					sseConnection = null;
				});
			} catch (error) {
				console.error('Error setting up replay:', error);
			}

			// Don't auto-start the game, let the player press 'P'
			console.log('Game reset. Press P to start playing.');
		};

		replayButton.addEventListener('click', replayHandler);
	}

	// Clear any existing interval before starting a new one
	if (gameInterval) {
		clearInterval(gameInterval);
	}

	gameInterval = setInterval(async () => {
		checkwin();
		const now = Date.now();

		if (now - lastSent < intervalDelay) return;
		lastSent = now;

		for (let key of keysPressed) {
			switch (key) {
				case 'p':
					if (gameStarted == false) {
						gameStarted = true;
						console.log('Starting game with P key');
						fetch(currentPostUrl, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								apiKey: currentApiKey,
								message: '{"action": "start"}',
							}),
						}).catch((error) => {
							console.error('Error starting game:', error);
							gameStarted = false;
						});
					}
					break;
				case 'q':
					// console.log("Started : ", gameStarted);
					if (gameStarted == true) {
						await fetchWithRefresh(
							`/server-pong/forfait-game?apikey=${currentApiKey}&idplayer=${1}`,
							{
								headers: {
									Authorization: `bearer ${sessionStorage.getItem(
										'accessToken'
									)}`,
								},
							}
						);
					}
					break;
				case 'l':
					// console.log("Started : ", gameStarted);
					if (gameStarted == true) {
						await fetchWithRefresh(
							`/server-pong/forfait-game?apikey=${currentApiKey}&idplayer=${2}`,
							{
								// headers: {
								// 	Authorization: `bearer ${sessionStorage.getItem(
								// 		'accessToken'
								// 	)}`,
								// },
								credentials: 'include',
							}
						);
					}
					break;
				case 'ArrowUp':
					fetch(currentPostUrl, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							apiKey: currentApiKey,
							message: '{"action": "move", "player2": "up"}',
						}),
					});
					break;
				case 'e':
					fetch(currentPostUrl, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							apiKey: currentApiKey,
							message: '{"action": "move", "player1": "up"}',
						}),
					});
					break;
				case 'ArrowDown':
					fetch(currentPostUrl, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							apiKey: currentApiKey,
							message: '{"action": "move", "player2": "down"}',
						}),
					});
					break;
				case 'd':
					fetch(currentPostUrl, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							apiKey: currentApiKey,
							message: '{"action": "move", "player1": "down"}',
						}),
					});
					break;
			}
		}
	});

	// Add cleanup listeners for page unload/refresh
	window.addEventListener('beforeunload', cleanupLocalGame);
	window.addEventListener('hashchange', cleanupLocalGame);
}

// Cleanup function to clear intervals and prevent memory leaks
export function cleanupLocalGame() {
	console.log('cleanupLocalGame() called');

	// Reset game state
	gameStarted = false;
	gameEnded = false;
	currentApiKey = null;
	currentPostUrl = null;

	// Close SSE connection
	if (sseConnection && sseConnection.readyState !== EventSource.CLOSED) {
		sseConnection.close();
		sseConnection = null;
		console.log('SSE connection closed');
	}

	if (gameInterval) {
		clearInterval(gameInterval);
		gameInterval = null;
		console.log('Local game interval cleared');
	}

	// Remove key event listeners
	if (keydownHandler) {
		document.removeEventListener('keydown', keydownHandler);
		keydownHandler = null;
		console.log('Keydown listener removed');
	}
	if (keyupHandler) {
		document.removeEventListener('keyup', keyupHandler);
		keyupHandler = null;
		console.log('Keyup listener removed');
	}

	// Remove replay button event listener
	if (replayHandler) {
		const replayButton = document.getElementById('replaySinglePlayer');
		if (replayButton) {
			replayButton.removeEventListener('click', replayHandler);
		}
		replayHandler = null;
		console.log('Replay listener removed');
	}

	// Remove event listeners to prevent memory leaks
	window.removeEventListener('beforeunload', cleanupLocalGame);
	window.removeEventListener('hashchange', cleanupLocalGame);
}
