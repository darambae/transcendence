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

			if (!txtApiKey.trim()) {
				alert('Please enter a valid invitation code');
				return;
			}

			isGamePlayable = await setApiKeyWeb(txtApiKey);
			console.log('Game status:', isGamePlayable);

			if (isGamePlayable === 'Game can start') {
				btnJoin.textContent = 'Starting Game...';
				return handleGame2Players(txtApiKey, 2, 0, -1);
			} else if (isGamePlayable === 'Need more player') {
				// Player registered successfully, now wait for game to be ready
				btnJoin.textContent = 'Waiting for Host...';
				// Directly call handleGame2Players which will wait for the game to be ready
				return handleGame2Players(txtApiKey, 2, 0, -1);
			} else {
				// Handle other error cases
				alert(`Unable to join game: ${isGamePlayable}`);
			}
		} catch (error) {
			console.error('Error joining game:', error);
			alert(
				'Error joining game. Please check the invitation code and try again.'
			);
		} finally {
			// Only reset if we're not proceeding to the game
			if (
				isGamePlayable !== 'Game can start' &&
				isGamePlayable !== 'Need more player'
			) {
				isJoining = false;
				btnJoin.disabled = false;
				btnJoin.textContent = 'Join Game';
			}
		}
	});
}
