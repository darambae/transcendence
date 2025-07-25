import { fetchWithRefresh, getCookie } from '../utils.js';
import { checkwin, guideTouch, drawCenterTextP } from './localGame.js';
import { drawCenterText } from './multiplayer.js';
import { drawMap } from './gameCanvas.js';

let multiplayerGameInterval = null;
let multiplayerKeydownHandler = null;
let multiplayerSSEConnection = null;
let multiplayerGameStarted = false;
let multiplayerGameEnded = false;
let currentMultiplayerApiKey = null;
let currentMultiplayerPostUrl = null;
let gameReadyCheckAbortController = null;
let currentPlayerId = null;

export async function getMultiplayerKey() {
	return currentMultiplayerApiKey;
}

export async function setMultiplayerKey(value) {
	currentMultiplayerApiKey = value
}

export async function getCurrentPlayerId() {
	return currentPlayerId;
}

export async function setCurrentPlayerId(value) {
	currentPlayerId = value
}

export async function handleGame2Players(key, playerID, isAiGame, JWTid) {
	console.log('Starting handleGame2Players with:', {
		key,
		playerID,
		isAiGame,
		JWTid,
	});

	currentMultiplayerApiKey = key;
	currentMultiplayerPostUrl = `server-pong/send-message`;
	multiplayerGameStarted = false;
	multiplayerGameEnded = false;

	let game_stats;
	let a, b, c, username;
	const csrf = getCookie('csrftoken');

	const canvas = document.getElementById('gameCanvas');
	const ctx = canvas ? canvas.getContext('2d') : null;
	if (ctx) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}

	if (playerID == 2) {
		drawCenterText('waiting for the player to start the match');
		guideTouch();
	} else {
		guideTouch();
		drawCenterTextP();
	}

	// Load game state UI
	try {
		let mulTxt = ''
		let gameState = document.getElementById('idfooterCanvas');
		if (gameState) {
			gameState.innerHTML = mulTxt;
		}
	} catch (error) {
		console.error('Error loading game UI:', error);
	}

	// Get player info
	try {
		const response = await fetchWithRefresh(`server-pong/check-sse`, {
			headers: { 'X-CSRFToken': csrf },
			credentials: 'include',
		});

		if (!response.ok) throw new Error('HTTP Error: ' + response.status);

		const data = await response.json();
		console.log('Player data:', data);

		const guestArray = Array.isArray(data.guest) ? data.guest : [];
		[a, b, c] = guestArray;
		username = data.username || 'anonymous';
	} catch (error) {
		console.error('Error fetching player info:', error);
		username = 'anonymous';
	}

	// Register this player in the game room first
	try {
		console.log('Registering player in game room...');
		const registerResponse = await fetchWithRefresh(`server-pong/api-key`, {
			method: 'POST',
			headers: {
				'X-CSRFToken': csrf,
				'Content-Type': 'application/json',
			},
			credentials: 'include',
			body: JSON.stringify({ apiKey: key }),
		});

		if (!registerResponse.ok) {
			throw new Error('HTTP Error: ' + registerResponse.status);
		}

		const registerData = await registerResponse.json();
		console.log('Player registration result:', registerData.playable);
	} catch (error) {
		console.error('Error registering player:', error);
		alert('Failed to join game room. Please try again.');
		return;
	}

	console.log('Waiting for game to be ready...');

	window.addEventListener('beforeunload', cleanupMultiplayerGame);
	window.addEventListener('hashchange', cleanupMultiplayerGame);
	window.addEventListener('pagehide', cleanupMultiplayerGame);

	if (isAiGame == 0) {
		await waitForGameReady(
			key,
			playerID,
			isAiGame,
			JWTid,
			username,
			a,
			b,
			c,
			csrf
		);
	} else {
		await establishSSEConnection(
			key,
			playerID,
			isAiGame,
			JWTid,
			username,
			a,
			b,
			c,
			csrf
		);
	}
}

export function cleanupMultiplayerGame() {
	console.log('cleanupMultiplayerGame() called');

	if (gameReadyCheckAbortController) {
		gameReadyCheckAbortController.abort();
		gameReadyCheckAbortController = null;
		console.log('Game ready check aborted');
	}

	// If game is in progress and we have an API key, forfeit the game
	if (
		multiplayerGameStarted &&
		!multiplayerGameEnded &&
		currentMultiplayerApiKey
	) {
		console.log('Player leaving during active game - forfeiting...');

		const csrf = getCookie('csrftoken');

		// Try to forfeit as player 1 first
		console.log(`server-pong/forfait-game?apikey=${currentMultiplayerApiKey}&idplayer=${currentPlayerId}`)
		fetch(
			`server-pong/forfait-game?apikey=${currentMultiplayerApiKey}&idplayer=${currentPlayerId}`,
			{
				headers: { 'X-CSRFToken': csrf },
				credentials: 'include',
			}
		).catch((error) => {
			console.error(`Error forfeiting as player ${currentPlayerId}:`, error);
		});
	}

	// Destroy the API key if we have one
	if (currentMultiplayerApiKey) {
		destroyApiKey(currentMultiplayerApiKey);
	}

	multiplayerGameStarted = false;
	multiplayerGameEnded = false;
	currentMultiplayerApiKey = null;
	currentMultiplayerPostUrl = null;

	gameReadyCheckAbortController = null;

	if (
		multiplayerSSEConnection &&
		multiplayerSSEConnection.readyState !== EventSource.CLOSED
	) {
		multiplayerSSEConnection.close();
		multiplayerSSEConnection = null;
		console.log('Multiplayer SSE connection closed');
	}

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

	if (multiplayerKeydownHandler) {
		document.removeEventListener('keydown', multiplayerKeydownHandler);
		if (multiplayerKeydownHandler.keyupHandler) {
			document.removeEventListener(
				'keyup',
				multiplayerKeydownHandler.keyupHandler
			);
		}
		multiplayerKeydownHandler = null;
		console.log('Multiplayer keydown listeners removed');
	}

	window.removeEventListener('beforeunload', cleanupMultiplayerGame);
	window.removeEventListener('hashchange', cleanupMultiplayerGame);
	window.removeEventListener('pagehide', cleanupMultiplayerGame);
}

// Function to wait for game to be ready before establishing SSE
async function waitForGameReady(
	key,
	playerID,
	isAiGame,
	JWTid,
	username,
	a,
	b,
	c,
	csrf
) {
	console.log(`Player ${playerID} waiting for game to be ready...`);

	// Create an AbortController to stop the polling when user leaves
	gameReadyCheckAbortController = new AbortController();
	const signal = gameReadyCheckAbortController.signal;

	const maxAttempts = 90;
	let attempts = 0;

	while (attempts < maxAttempts) {
		if (signal.aborted) {
			console.log('Game ready check was aborted');
			return;
		}

		try {
			const delay = attempts < 5 ? 500 : 1000;

			// Check if game is ready by calling the game status endpoint
			const response = await fetchWithRefresh(
				`server-pong/game-status?apikey=${key}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-CSRFToken': csrf,
					},
					credentials: 'include',
					body: JSON.stringify({ apiKey: key }),
					signal: signal,
				}
			);

			if (response.ok) {
				const data = await response.json();
				console.log(
					'Game status check:',
					data.playable,
					`(attempt ${attempts + 1})`
				);

				if (data.playable === 'Game can start') {
					console.log('Game is ready! Establishing SSE connection...');

					drawCenterTextP();

					await establishSSEConnection(
						key,
						playerID,
						isAiGame,
						JWTid,
						username,
						a,
						b,
						c,
						csrf
					);
					return;
				}
			}
		} catch (error) {
			if (error.name === 'AbortError') {
				console.log('Game ready check was aborted due to page navigation');
				return;
			}
			console.error('Error checking game status:', error);
		}

		attempts++;
		if (playerID == 1) {
			drawCenterText(
				`Waiting for second player... (${attempts}/${maxAttempts})`
			);
		} else {
			drawCenterText(
				`Waiting for game to start... (${attempts}/${maxAttempts})`
			);
		}

		const delay = attempts < 5 ? 500 : 1000;
		try {
			await new Promise((resolve, reject) => {
				const timeout = setTimeout(resolve, delay);
				signal.addEventListener('abort', () => {
					clearTimeout(timeout);
					reject(new Error('AbortError'));
				});
			});
		} catch (error) {
			if (error.message === 'AbortError') {
				console.log('Game ready check timeout was aborted');
				return;
			}
		}
	}

	console.error('Game did not become ready within timeout period');
	drawCenterText('Game setup timeout. Please try again.');
}

// Set up multiplayer key handler
function setupMultiplayerKeyHandler(apiKey) {
	if (multiplayerKeydownHandler) {
		document.removeEventListener('keydown', multiplayerKeydownHandler);
		multiplayerKeydownHandler = null;
	}

	const keysPressed = new Set();
	let lastSent = 0;
	const intervalDelay = 50;

	// Keydown handler
	multiplayerKeydownHandler = async (event) => {
		const key = event.key.toLowerCase();
		keysPressed.add(key);

		const now = Date.now();
		if (now - lastSent < intervalDelay) return;
		lastSent = now;

		for (let pressedKey of keysPressed) {
			switch (pressedKey) {
				case 'p':
					if (!multiplayerGameStarted) {
						multiplayerGameStarted = true;
						console.log('Starting multiplayer game with P key');
						try {
							await fetch(currentMultiplayerPostUrl, {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json',
								},
								body: JSON.stringify({
									apiKey: apiKey,
									message: '{"action": "start"}',
								}),
							});
						} catch (error) {
							console.error('Error starting multiplayer game:', error);
							multiplayerGameStarted = false;
						}
					}
					break;
				case 'q':
					if (multiplayerGameStarted) {
						try {
							await fetchWithRefresh(
								`/server-pong/forfait-game?apikey=${apiKey}&idplayer=1`,
								{
									credentials: 'include',
								}
							);
						} catch (error) {
							console.error('Error forfeiting as player 1:', error);
						}
					}
					break;
				case 'l':
					if (multiplayerGameStarted) {
						try {
							await fetchWithRefresh(
								`/server-pong/forfait-game?apikey=${apiKey}&idplayer=2`,
								{
									credentials: 'include',
								}
							);
						} catch (error) {
							console.error('Error forfeiting as player 2:', error);
						}
					}
					break;
				case 'arrowup':
					if (multiplayerGameStarted) {
						try {
							await fetch(currentMultiplayerPostUrl, {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json',
								},
								body: JSON.stringify({
									apiKey: apiKey,
									message: '{"action": "move", "player1": "up"}',
								}),
							});
						} catch (error) {
							console.error('Error sending up movement:', error);
						}
					}
					break;
				case 'arrowdown':
					if (multiplayerGameStarted) {
						try {
							await fetch(currentMultiplayerPostUrl, {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json',
								},
								body: JSON.stringify({
									apiKey: apiKey,
									message: '{"action": "move", "player1": "down"}',
								}),
							});
						} catch (error) {
							console.error('Error sending down movement:', error);
						}
					}
					break;
				case 'w':
					if (multiplayerGameStarted) {
						try {
							await fetch(currentMultiplayerPostUrl, {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json',
								},
								body: JSON.stringify({
									apiKey: apiKey,
									message: '{"action": "move", "player2": "up"}',
								}),
							});
						} catch (error) {
							console.error('Error sending W movement:', error);
						}
					}
					break;
				case 's':
					if (multiplayerGameStarted) {
						try {
							await fetch(currentMultiplayerPostUrl, {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json',
								},
								body: JSON.stringify({
									apiKey: apiKey,
									message: '{"action": "move", "player2": "down"}',
								}),
							});
						} catch (error) {
							console.error('Error sending S movement:', error);
						}
					}
					break;
			}
		}
	};

	// Keyup handler to remove keys from set
	const keyupHandler = (event) => {
		const key = event.key.toLowerCase();
		keysPressed.delete(key);
	};

	document.addEventListener('keydown', multiplayerKeydownHandler);
	document.addEventListener('keyup', keyupHandler);

	multiplayerKeydownHandler.keyupHandler = keyupHandler;
}

// Multiplayer-specific checkwin function
function checkwinMultiplayer() {
	if (multiplayerGameEnded) {
		return;
	}

	const player1Score = document.getElementById('player1score');
	const player2Score = document.getElementById('player2score');
	const player1Name = document.getElementById('player1Username');
	const player2Name = document.getElementById('player2Username');

	// Add null checks to prevent errors when navigating away from page
	if (!player1Score || !player2Score || !player1Name || !player2Name) {
		return;
	}

	if (player2Score.getAttribute('data-score') == 5) {
		multiplayerGameEnded = true;
		console.log('Multiplayer game ended - Player 2 wins');
		player1Score.style.setProperty('--score-color', 'red');
		player1Name.style.color = 'red';
		player2Score.style.setProperty('--score-color', 'green');
		player2Name.style.color = 'green';
	} else if (player1Score.getAttribute('data-score') == 5) {
		multiplayerGameEnded = true;
		console.log('Multiplayer game ended - Player 1 wins');
		player2Score.style.setProperty('--score-color', 'red');
		player2Name.style.color = 'red';
		player1Score.style.setProperty('--score-color', 'green');
		player1Name.style.color = 'green';
	}
}

// Function to establish SSE connection once game is ready
async function establishSSEConnection(
	key,
	playerID,
	isAiGame,
	JWTid,
	username,
	a,
	b,
	c,
	csrf
) {
	setupMultiplayerKeyHandler(key);
	
	currentPlayerId = playerID;

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
			if (
				event.data === 'heartbeat' ||
				event.data.trim() === ''
			) {
				return;
			}
			const data = JSON.parse(event.data);
			let sc1 = document.getElementById('player1score');
			let sc2 = document.getElementById('player2score');

			const game_stats = data['game_stats'];

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
					checkwinMultiplayer();
				} else {
					let p1 = document.getElementById('player1Username');
					let p2 = document.getElementById('player2Username');
					if (p1 && game_stats['p1'] && game_stats['p1'][0]) {
						p1.innerHTML = game_stats['p1'][0];
					}
					if (p2 && game_stats['p2'] && game_stats['p2'][0]) {
						p2.innerHTML = game_stats['p2'][0];
					}
					else if (p2 && !game_stats['p2']) {
						p2.innerHTML = 'AI';
					}
				}
			}
		} catch (error) {
			console.warn('Error parsing SSE message:', error);
		}
	};

	// Create new SSE connection
	const SSEStream = new EventSource(url_sse);
	multiplayerSSEConnection = SSEStream;
	window.currentGameSSE = SSEStream;

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

	SSEStream.addEventListener('close', function () {
		console.log('Multiplayer SSE connection closed by server');
		multiplayerSSEConnection = null;
		window.currentGameSSE = null;
	});

	setupMultiplayerKeyboardControls(key, playerID, csrf);

	console.log('Multiplayer SSE connection established successfully');
}

// Function to set up keyboard controls
function setupMultiplayerKeyboardControls(key, playerID, csrf) {
	if (multiplayerKeydownHandler) {
		document.removeEventListener('keydown', multiplayerKeydownHandler);
	}

	// Create and store reference to event handler
	multiplayerKeydownHandler = (event) => {
		const keysToPrevent = ['ArrowUp', 'ArrowDown', 'p', 'q'];
		if (keysToPrevent.includes(event.key)) {
			event.preventDefault();

			switch (event.key) {
				case 'p':
					if (playerID == 1 && !multiplayerGameStarted) {
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
					if (playerID == 1) {
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
					if (playerID == 1) {
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

	document.addEventListener('keydown', multiplayerKeydownHandler);

	// Also add visibility change detection for when user switches tabs
	document.addEventListener('visibilitychange', () => {
		if (document.hidden && multiplayerGameStarted && !multiplayerGameEnded) {
			console.log('Player switched away from tab during game');
			setTimeout(() => {
				if (
					document.hidden &&
					multiplayerGameStarted &&
					!multiplayerGameEnded
				) {
					console.log('Player away too long - forfeiting game');
					cleanupMultiplayerGame();
				}
			}, 5000);
		}
	});
}

// Function to destroy API key on the backend
async function destroyApiKey(apiKey) {
	if (!apiKey) {
		console.log('No API key to destroy');
		return;
	}

	const csrf = getCookie('csrftoken');

	try {
		console.log(`Destroying API key: ${apiKey}`);
		const response = await fetchWithRefresh(
			`server-pong/${apiKey}/delete-key/`,
			{
				method: 'POST',
				headers: {
					'X-CSRFToken': csrf,
					'Content-Type': 'application/json',
				},
				credentials: 'include',
			}
		);

		if (response.ok) {
			const result = await response.json();
			console.log('API key destroyed successfully:', result);
		} else {
			console.warn('Failed to destroy API key:', response.status);
		}
	} catch (error) {
		console.error('Error destroying API key:', error);
	}
}
