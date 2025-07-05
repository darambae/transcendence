import { sendGameCreation } from './utils/createGame.js'
import { sendGameJoining } from './utils/joinGame.js'
import {setCanvasAndContext} from './utils/commonFunctions.js'


// function launchGame() {
//   return (sendGameCreation());
// }





export function drawCenterText(text) {
	const canvas = document.getElementById("gameCanvas");
	const ctx = canvas.getContext("2d");
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
	setCanvasAndContext();
	drawCenterText("Waiting for a game...");
	const createButton = document.getElementById("create-game")
	const joinButton = document.getElementById("join-game")

	createButton.addEventListener("click", (event) => {
		sendGameCreation();
	});

  joinButton.addEventListener("click", (event) => {
    	sendGameJoining();
  })

	console.log("here in multiplayer ")
}
