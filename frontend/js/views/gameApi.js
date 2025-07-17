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
	try {
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

		const response = await fetchWithRefresh(
			`server-pong/game-status?apikey=${apikey}`,
			fetchOptions
		);

		if (!response.ok) {
			console.error(
				`Game status request failed: ${response.status} ${response.statusText}`
			);
			const errorText = await response.text();
			console.error('Error response body:', errorText);
			throw new Error(
				`HTTP Error: ${response.status} - ${response.statusText}`
			);
		}

		const data = await response.json();
		console.log('Game playable status:', data['playable']);
		return data['playable'];
	} catch (error) {
		console.error('Error checking game status:', error);
		throw error;
	}
}

export async function setApiKeyWeb(apikey) {
	try {
		const csrf = getCookie('csrftoken');

		const response = await fetchWithRefresh(`server-pong/api-key`, {
			method: 'POST',
			headers: {
				'X-CSRFToken': csrf,
				'Content-Type': 'application/json',
			},
			credentials: 'include',
			body: JSON.stringify({ apiKey: apikey }),
		});

		if (!response.ok) {
			console.error(
				`API key request failed: ${response.status} ${response.statusText}`
			);
			const errorText = await response.text();
			console.error('Error response body:', errorText);
			throw new Error(
				`HTTP Error: ${response.status} - ${response.statusText}`
			);
		}

		const data = await response.json();
		console.log('API key set:', data['playable']);
		return data['playable'];
	} catch (error) {
		console.error('Error setting API key:', error);
		throw error;
	}
}

export async function setApiKeyWebSP(apikey) {
	try {
		const csrf = getCookie('csrftoken');

		const response = await fetchWithRefresh(`server-pong/api-key-alone`, {
			method: 'POST',
			headers: {
				'X-CSRFToken': csrf,
				'Content-Type': 'application/json',
			},
			credentials: 'include',
			body: JSON.stringify({ apiKey: apikey }),
		});

		if (!response.ok) {
			console.error(
				`Single player API key request failed: ${response.status} ${response.statusText}`
			);
			const errorText = await response.text();
			console.error('Error response body:', errorText);
			throw new Error(
				`HTTP Error: ${response.status} - ${response.statusText}`
			);
		}

		const data = await response.json();
		console.log('Single player API key set:', data['playable']);
		return data['playable'];
	} catch (error) {
		console.error('Error setting single player API key:', error);
		throw error;
	}
}
