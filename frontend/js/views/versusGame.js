import { setApiKeyWebSP, setPlayersLocalName } from './gameApi.js';
import { actualizeIndexPage, fetchWithRefresh } from '../utils.js';
import { drawCenterText } from './multiplayer.js';
import { routes } from '../routes.js';

export async function versusController() {
	drawCenterText('click "GO"');
	let startButton = document.getElementById('getTextBtn');
	const replayBtnSinglePlayer = document.getElementById('replaySinglePlayer');
	let apiKey;

	startButton.addEventListener('click', async (event) => {
		await fetchWithRefresh(`/server-pong/api-key`, {
			headers: {
				Authorization: `bearer ${sessionStorage.getItem('accessToken')}`,
			},
		})
			.then((response) => {
				if (!response.ok) throw new Error('https Error: ' + response.status);
				return response.json();
			})
			.then((data) => {
				apiKey = data['api_key'];
			})
			.catch((error) => {
				console.error('Erreur de requête :', error);
			});
		await setApiKeyWebSP(apiKey);
		setPlayersLocalName(apiKey);
		await actualizeIndexPage('idfooterCanvas', routes['game'](-1, 0));
	});
}
