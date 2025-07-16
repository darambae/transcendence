import { fetchWithRefresh, getCookie } from '../utils.js';

// API key management functions
let keySp = null;

export function setPlayersLocalName(apikey) {
	keySp = apikey;
}

export function getPlayersLocalName() {
	return keySp;
}

// Game status API functions
export async function loadGamePlayable(apikey, signal = null) {
	let isPlayable;
	const csrf = getCookie('csrftoken');

	const fetchOptions = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': csrf,
		},
		credentials: 'include',
		body: JSON.stringify({ apiKey: apikey }),
	};

	// Add signal if provided
	if (signal) {
		fetchOptions.signal = signal;
	}

	await fetchWithRefresh(`server-pong/game-status?apikey=${apikey}`, fetchOptions)
		.then((response) => {
			if (!response.ok) throw new Error('HTTP Error: ' + response.status);
			return response.json();
		})
		.then((data) => {
			console.log('Game playable status:', data['playable']);
			isPlayable = data['playable'];
		})
		.catch((error) => {
			console.error('Error checking game status:', error);
			throw error;
		});
	return isPlayable;
}

export async function setApiKeyWeb(apikey) {
	const csrf = getCookie('csrftoken');
	return fetchWithRefresh(`server-pong/api-key`, {
		method: 'POST',
		headers: {
			'X-CSRFToken': csrf,
			'Content-Type': 'application/json',
		},
		credentials: 'include',
		body: JSON.stringify({ apiKey: apikey }),
	})
		.then((response) => {
			if (!response.ok) throw new Error('HTTP Error: ' + response.status);
			return response.json();
		})
		.then((data) => {
			console.log('API key set:', data['playable']);
			return data['playable'];
		})
		.catch((error) => {
			console.error('Error setting API key:', error);
			throw error;
		});
}

export async function setApiKeyWebSP(apikey) {
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
			if (!response.ok) throw new Error('HTTP Error: ' + response.status);
			return response.json();
		})
		.then((data) => {
			console.log('Single player API key set:', data['playable']);
			return data['playable'];
		})
		.catch((error) => {
			console.error('Error setting single player API key:', error);
			throw error;
		});
}
