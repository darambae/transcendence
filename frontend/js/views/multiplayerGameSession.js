import { fetchWithRefresh, getCookie } from '../utils.js';
import { checkwin, guideTouch, drawCenterTextP } from './localGame.js';
import { drawCenterText } from './multiplayer.js';
import { drawMap } from './gameCanvas.js';

// Global variables for multiplayer game management
let multiplayerGameInterval = null;
let multiplayerKeydownHandler = null;
let multiplayerSSEConnection = null;
let multiplayerGameStarted = false;
let multiplayerGameEnded = false;
let currentMultiplayerApiKey = null;
let currentMultiplayerPostUrl = null;

export async function handleGame2Players(key, playerID, isAiGame, JWTid) {
	console.log('Starting handleGame2Players with:', {
		key,
		playerID,
		isAiGame,
		JWTid,
	});

	// Store multiplayer game globals
	currentMultiplayerApiKey = key;
	currentMultiplayerPostUrl = `server-pong/send-message`;
	multiplayerGameStarted = false;
	multiplayerGameEnded = false;

	let game_stats;
	let a, b, c, username;
	const csrf = getCookie('csrftoken');

	// Clear canvas
	const canvas = document.getElementById('gameCanvas');
	const ctx = canvas ? canvas.getContext('2d') : null;
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

	// Close any existing SSE connection before creating a new one
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

	// Common SSE message handler function
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
			// Ignore parse errors silently
		}
	};

	// Create new SSE connection
	const SSEStream = new EventSource(url_sse);
	multiplayerSSEConnection = SSEStream;
	window.currentGameSSE = SSEStream; // Also store globally for compatibility

	SSEStream.onmessage = handleMultiplayerSSEMessage;

	// Add error handling for SSE connection
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

	// Clean up any existing event listeners before adding new ones
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

	// Add cleanup listeners for page unload/refresh
	window.addEventListener('beforeunload', cleanupMultiplayerGame);
	window.addEventListener('hashchange', cleanupMultiplayerGame);

	console.log('Multiplayer game setup complete');
}

// Cleanup function for multiplayer games
export function cleanupMultiplayerGame() {
	console.log('cleanupMultiplayerGame() called');

	// Reset game state
	multiplayerGameStarted = false;
	multiplayerGameEnded = false;
	currentMultiplayerApiKey = null;
	currentMultiplayerPostUrl = null;

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
