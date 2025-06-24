import { sendGameCreation } from './utils/createGame.js'
import { sendGameJoining } from './utils/joinGame.js'
import {setCanvasAndContext} from './utils/commonFunctions.js'


// function launchGame() {
//   return (sendGameCreation());
// }

export function multiplayerController() {
	setCanvasAndContext();
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
