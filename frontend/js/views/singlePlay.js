import { setCanvasAndContext } from './gameCanvas.js';
import { routes } from '../routes.js';
import { actualizeIndexPage, fetchWithRefresh, getCookie } from '../utils.js';
import { drawCenterText } from './multiplayer.js';
import { navigate } from '../router.js';
import { setApiKeyWeb } from './gameApi.js';
import { handleGame2Players } from './multiplayerGameSession.js';

export function singlePlayController() {
	drawCenterText('Select a mode');

	setCanvasAndContext();
	const aiButton = document.getElementById('AI-game');
	const versusButton = document.getElementById('versus-game');

	aiButton.addEventListener('click', async (event) => {
		let apiKey;
		const csrf = getCookie("csrftoken")
		await fetchWithRefresh(`server-pong/api-key`, {
			headers: {
				'X-CSRFToken': csrf,
			},
			credentials: 'include',
		})
			.then(async (response) => {
				if (!response.ok) throw new Error('https Error: ' + response.status);
				return await response.json();
			})
			.then((data) => {
				console.log('key get : ', data['api_key']);
				apiKey = data['api_key'];
			})
		await setApiKeyWeb(apiKey);
		return handleGame2Players(apiKey, 1, 1, -1)
	});

	versusButton.addEventListener('click', async (event) => {
		await actualizeIndexPage('idfooterCanvas', routes['playerSelection']);
	});
	console.log('here in single Play');
}
