import { cleanupMultiplayerGame } from './multiplayerGameSession.js';
import { setCanvasAndContext } from './gameCanvas.js';
import { sendGameCreation, cleanupGameCreation } from './gameCreation.js';
import { sendGameJoining } from './gameJoining.js';

let multiplayerGameActive = false;
let createButtonHandler = null;
let joinButtonHandler = null;

export function drawCenterText(text) {
	const canvas = document.getElementById('gameCanvas');
	if (!canvas) return;

	const ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.fillStyle = 'white';
	ctx.font = '36px Arial';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	const x = canvas.width / 2;
	const y = canvas.height / 2;

	ctx.fillText(text, x, y);
}

export function multiplayerController() {
	console.log('Multiplayer controller started');

	// Reset game state
	multiplayerGameActive = false;

	// Set up canvas and context
	setCanvasAndContext();
	drawCenterText('Choose to create or join a game...');

	const createButton = document.getElementById('create-game');
	const joinButton = document.getElementById('join-game');

	// Clean up any existing event listeners before adding new ones
	if (createButtonHandler && createButton) {
		createButton.removeEventListener('click', createButtonHandler);
	}
	if (joinButtonHandler && joinButton) {
		joinButton.removeEventListener('click', joinButtonHandler);
	}

	// Create and store references to event handlers
	createButtonHandler = async (event) => {
		event.preventDefault();
		if (multiplayerGameActive) {
			console.log('Game already active, ignoring create button click');
			return;
		}

		multiplayerGameActive = true;
		console.log('Creating multiplayer game...');

		// Disable buttons during game setup
		if (createButton) createButton.disabled = true;
		if (joinButton) joinButton.disabled = true;

		try {
			drawCenterText("Waiting for player 2 to connect...")
			await sendGameCreation();
		} catch (error) {
			console.error('Error creating game:', error);
			multiplayerGameActive = false;
			if (createButton) createButton.disabled = false;
			if (joinButton) joinButton.disabled = false;
		}
	};

	joinButtonHandler = async (event) => {
		event.preventDefault();
		if (multiplayerGameActive) {
			console.log('Game already active, ignoring join button click');
			return;
		}

		multiplayerGameActive = true;
		console.log('Joining multiplayer game...');

		if (createButton) createButton.disabled = true;
		if (joinButton) joinButton.disabled = true;

		try {
			await sendGameJoining();
		} catch (error) {
			console.error('Error joining game:', error);
			multiplayerGameActive = false;
			if (createButton) createButton.disabled = false;
			if (joinButton) joinButton.disabled = false;
		}
	};

	if (createButton) {
		createButton.addEventListener('click', createButtonHandler);
	} else {
		console.warn('Create game button not found');
	}

	if (joinButton) {
		joinButton.addEventListener('click', joinButtonHandler);
	} else {
		console.warn('Join game button not found');
	}

	const cleanupAllMultiplayerOperations = () => {
		cleanupMultiplayerGame();
		cleanupGameCreation();
	};
	
	window.addEventListener('beforeunload', cleanupAllMultiplayerOperations);
	window.addEventListener('hashchange', cleanupAllMultiplayerOperations);

	console.log('Multiplayer controller setup complete');
}

export function isMultiplayerGameActive() {
	return multiplayerGameActive;
}

export function setMultiplayerGameActive(active) {
	multiplayerGameActive = active;
}

// Export handlers for cleanup
export { createButtonHandler, joinButtonHandler };
