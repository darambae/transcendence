import {setCanvasAndContext} from './utils/commonFunctions.js'
import { routesSp } from './utils/commonFunctions.js';
import { actualizeIndexPage } from '../utils.js';
import { drawCenterText } from "./multiplayer.js"


export function singlePlayController() {

	drawCenterText("Select a mode")

	setCanvasAndContext();
	const aiButton = document.getElementById("AI-game")
	const versusButton = document.getElementById("versus-game")

	aiButton.addEventListener("click", (event) => {
		sendGameCreation();
	});

	versusButton.addEventListener("click", (event) => {
    	actualizeIndexPage("idfooterCanvas", routesSp["playerSelection"]);
	})
	console.log("here in single Play");
}

