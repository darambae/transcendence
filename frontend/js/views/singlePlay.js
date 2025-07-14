import { setCanvasAndContext } from './gameCanvas.js';
import { routes } from '../routes.js';
import { actualizeIndexPage } from '../utils.js';
import { drawCenterText } from './multiplayer.js';

export function singlePlayController() {
	drawCenterText('Select a mode');

	setCanvasAndContext();
	const aiButton = document.getElementById('AI-game');
	const versusButton = document.getElementById('versus-game');

	aiButton.addEventListener('click', (event) => {
		sendGameCreation();
	});

	versusButton.addEventListener('click', async (event) => {
		await actualizeIndexPage('idfooterCanvas', routes['playerSelection']);
	});
	console.log('here in single Play');
}
