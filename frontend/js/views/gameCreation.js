import { fetchWithRefresh, getCookie } from '../utils.js';
import { handleGame2Players, cleanupMultiplayerGame } from './multiplayerGameSession.js';
import { loadGamePlayable, setApiKeyWeb } from './gameApi.js';
import { sleep } from './gameCanvas.js';

// Variable to track game creation abort controller
let gameCreationAbortController = null;

// Cleanup function for game creation
export function cleanupGameCreation() {
	if (gameCreationAbortController) {
		gameCreationAbortController.abort();
		gameCreationAbortController = null;
		console.log('Game creation polling aborted');
	}
}

export async function copySeckeyGame() {
	const keyBtn = document.getElementById('keygame');

	keyBtn.addEventListener('click', () => {
		const key = keyBtn.textContent;

		navigator.clipboard
			.writeText(key)
			.then(() => {
				keyBtn.textContent = 'Copied!';
				setTimeout(() => {
					keyBtn.textContent = key;
				}, 1000);
			})
			.catch((err) => {
				console.error('error to copi id key :', err);
			});
	});
}

export async function sendGameCreation() {
	let apiKey;
	const csrf = getCookie('csrftoken');
	const mul = await fetch('./templates/matchCreation.html');
	const mulTxt = await mul.text();

	// Create abort controller for game creation polling
	gameCreationAbortController = new AbortController();
	const signal = gameCreationAbortController.signal;

	window.addEventListener('beforeunload', cleanupGameCreation);
	window.addEventListener('hashchange', cleanupGameCreation);
	window.addEventListener('pagehide', cleanupGameCreation);

	let keepGoing = true;
	let gameState = document.getElementById('idfooterCanvas');
	gameState.innerHTML = '';
	gameState.innerHTML = mulTxt;
	gameState = document.getElementById('gameid');
	
	await fetchWithRefresh(`server-pong/api-key`, {
		headers: {
			'X-CSRFToken': csrf,
		},
		credentials: 'include',
		signal: signal, // Add abort signal
	})
		.then((response) => {
			if (!response.ok) throw new Error('https Error: ' + response.status);
			return response.json();
		})
		.then((data) => {
			let html = `<div>
    <h3 class="title">Share the invitation key: </h3>
    <button class="btn btn-sm btn-success me-1" id="keygame">${data.api_key}</button>
    </div>`;
			gameState.innerHTML = html;
			copySeckeyGame();
			console.log('key get : ', data['api_key']);
			apiKey = data['api_key'];
		})
		.catch((error) => {
			if (error.name === 'AbortError') {
				console.log('Game creation was aborted due to page navigation');
				return;
			}
			console.error('Erreur de requête :', error);
			throw error;
		});

	// Return early if aborted during initial setup
	if (signal.aborted) {
		console.log('Game creation aborted before polling started');
		return;
	}

	let isGamePlayable = await setApiKeyWeb(apiKey);
	
	while (keepGoing) {
		if (signal.aborted) {
			console.log('Game creation polling was aborted');
			window.removeEventListener('beforeunload', cleanupGameCreation);
			window.removeEventListener('hashchange', cleanupGameCreation);
			window.removeEventListener('pagehide', cleanupGameCreation);
			return;
		}

		try {
			isGamePlayable = await loadGamePlayable(apiKey, signal);
			if (isGamePlayable == 'Game can start') {
				keepGoing = false;
				window.removeEventListener('beforeunload', cleanupGameCreation);
				window.removeEventListener('hashchange', cleanupGameCreation);
				window.removeEventListener('pagehide', cleanupGameCreation);
				gameCreationAbortController = null;
				return handleGame2Players(apiKey, 1, 0, -1);
			}
		} catch (error) {
			if (error.name === 'AbortError') {
				console.log('Game creation polling was aborted during loadGamePlayable');
				window.removeEventListener('beforeunload', cleanupGameCreation);
				window.removeEventListener('hashchange', cleanupGameCreation);
				window.removeEventListener('pagehide', cleanupGameCreation);
				return;
			}
			console.error('Error checking game status:', error);
		}

		// Wait with abort check
		try {
			await new Promise((resolve, reject) => {
				const timeout = setTimeout(resolve, 500);
				signal.addEventListener('abort', () => {
					clearTimeout(timeout);
					reject(new Error('AbortError'));
				});
			});
		} catch (error) {
			if (error.message === 'AbortError') {
				console.log('Game creation sleep was aborted');
				window.removeEventListener('beforeunload',cleanupGameCreation);
				window.removeEventListener('hashchange', cleanupGameCreation);
				window.removeEventListener('pagehide', cleanupGameCreation);
				return;
			}
		}
	}
	
	copySeckeyGame();
}
