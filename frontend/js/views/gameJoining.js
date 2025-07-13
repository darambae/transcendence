import { handleGame2Players } from './multiplayerGameSession.js';
import { setApiKeyWeb } from './gameApi.js';

export async function sendGameJoining() {
	const mul = await fetch('./templates/matchJoining.html');
	const mulTxt = await mul.text();
	// // console.log(mulTxt)
	let gameState = document.getElementById('idfooterCanvas');
	gameState.innerHTML = mulTxt;

	let btnJoin = document.getElementById('getTextBtn');
	let txtApiKey;
	let isGamePlayable;
	let isJoining = false; // Prevent multiple simultaneous join attempts

	btnJoin.addEventListener('click', async (event) => {
		if (isJoining) {
			console.log('Join already in progress, please wait...');
			return;
		}

		isJoining = true;
		btnJoin.disabled = true;
		btnJoin.textContent = 'Joining...';

		try {
			txtApiKey = document.getElementById('myTextInput').value;
			isGamePlayable = await setApiKeyWeb(txtApiKey);
			// console.log(`api key : ${txtApiKey}`)
			// console.log(`state : ${isGamePlayable}`)
			if (isGamePlayable == 'Game can start') {
				return handleGame2Players(txtApiKey, 2, 0, -1);
			} else {
				console.log('Game status:', isGamePlayable);
			}
		} catch (error) {
			console.error('Error joining game:', error);
		} finally {
			isJoining = false;
			btnJoin.disabled = false;
			btnJoin.textContent = 'Join Game';
		}
	});
}
